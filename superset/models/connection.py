from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import os
import json
import textwrap
import logging
import sqlparse
import pandas as pd
from flask import g
from itertools import groupby
from collections import OrderedDict

from flask_appbuilder import Model
from flask_appbuilder.security.sqla.models import User
from flask_appbuilder.security.views import AuthDBView

import sqlalchemy as sqla
from sqlalchemy.orm import backref, relationship
from sqlalchemy_utils import EncryptedType
from sqlalchemy import (
    Column, Integer, String, ForeignKey, Text, Boolean, Table,
    LargeBinary, create_engine, MetaData, select, UniqueConstraint
)
from sqlalchemy.engine.url import make_url
from sqlalchemy.sql import text
from sqlalchemy.sql.expression import TextAsFrom

from guardian_client_python.GuardianClientFactory import guardianClientFactory
from guardian_common_python.conf.GuardianConfiguration import GuardianConfiguration
from guardian_common_python.conf.GuardianVars import GuardianVars

from superset import db, app, db_engine_specs
from superset.utils import SupersetException
from superset.message import NEED_PASSWORD_FOR_KEYTAB
from .base import AuditMixinNullable

config = app.config


class Database(Model, AuditMixinNullable):
    __tablename__ = 'dbs'
    type = "table"

    id = Column(Integer, primary_key=True)
    database_name = Column(String(128), nullable=False)
    description = Column(Text)
    online = Column(Boolean, default=False)
    sqlalchemy_uri = Column(String(1024))
    password = Column(EncryptedType(String(1024), config.get('SECRET_KEY')))
    cache_timeout = Column(Integer)
    select_as_create_table_as = Column(Boolean, default=False)
    expose_in_sqllab = Column(Boolean, default=True)
    allow_run_sync = Column(Boolean, default=True)
    allow_run_async = Column(Boolean, default=False)
    allow_ctas = Column(Boolean, default=False)
    allow_dml = Column(Boolean, default=True)
    force_ctas_schema = Column(String(64))
    args = Column(Text, default=textwrap.dedent("""\
    {
        "connect_args": {}
    }
    """))

    __table_args__ = (
        UniqueConstraint('database_name', 'created_by_fk', name='database_name_owner_uc'),
    )

    def __repr__(self):
        return self.database_name

    @property
    def name(self):
        return self.database_name

    @property
    def backend(self):
        url = make_url(self.sqlalchemy_uri_decrypted)
        return url.get_backend_name()

    @property
    def perm(self):
        return "[{obj.database_name}].(id:{obj.id})".format(obj=self)

    def set_sqlalchemy_uri(self, uri):
        password_mask = "X" * 10
        conn = sqla.engine.url.make_url(uri)
        if conn.password != password_mask:
            # do not over-write the password with the password mask
            self.password = conn.password
        conn.password = password_mask if conn.password else None
        self.sqlalchemy_uri = str(conn)  # hides the password

    def fill_sqlalchemy_uri(self, user_id=None):
        try:
            if not user_id:
                user_id = g.user.get_id()
        except Exception:
            msg = "Unable to get user's id when fill sqlalchmy uri"
            logging.error(msg)
            # todo show in the frontend
            raise Exception(msg)
        url = make_url(self.sqlalchemy_uri)
        account = (
            db.session.query(DatabaseAccount)
            .filter(DatabaseAccount.user_id == user_id,
                    DatabaseAccount.database_id == self.id)
            .first()
        )
        if not account:
            user = db.session.query(User).filter(User.id == user_id).first()
            msg = "User:{} do not have account for connection:{}" \
                .format(user.username, self.database_name)
            logging.error(msg)
            # todo the frontend need to mention user to add account
            raise Exception(msg)
        url.username = account.username
        url.password = account.password
        if not self.test_uri(str(url)):
            msg = "Test connection failed, maybe need to modify your " \
                  "account for connection:{}".format(self.database_name)
            logging.error(msg)
            # todo the frontend need to mention user to add account
            raise Exception(msg)
        return str(url)

    def get_sqla_engine(self, schema=None):
        # if self.database_name == 'main':
        #     url = make_url(self.sqlalchemy_uri_decrypted)
        # else:
        #     url = make_url(self.fill_sqlalchemy_uri())
        url = make_url(self.sqlalchemy_uri_decrypted)
        connect_args = self.args_append_keytab(self.get_args().get('connect_args', {}))
        if self.backend == 'presto' and schema:
            if '/' in url.database:
                url.database = url.database.split('/')[0] + '/' + schema
            else:
                url.database += '/' + schema
        elif schema:
            url.database = schema
        return create_engine(url, connect_args=connect_args)

    def get_reserved_words(self):
        return self.get_sqla_engine().dialect.preparer.reserved_words

    def get_quoter(self):
        return self.get_sqla_engine().dialect.identifier_preparer.quote

    def get_df(self, sql, schema):
        sql = sql.strip().strip(';')
        eng = self.get_sqla_engine(schema=schema)
        cur = eng.execute(sql)
        cols = [col[0] for col in cur.cursor.description]
        df = pd.DataFrame(cur.fetchall(), columns=cols)
        return df

    def compile_sqla_query(self, qry, schema=None):
        eng = self.get_sqla_engine(schema=schema)
        compiled = qry.compile(eng, compile_kwargs={"literal_binds": True})
        return '{}'.format(compiled)

    def select_star(
            self, table_name, schema=None, limit=100, show_cols=False,
            indent=True):
        """Generates a ``select *`` statement in the proper dialect"""
        quote = self.get_quoter()
        fields = '*'
        table = self.get_table(table_name, schema=schema)
        if show_cols:
            fields = [quote(c.name) for c in table.columns]
        if schema:
            table_name = schema + '.' + table_name
        qry = select(fields).select_from(text(table_name))
        if limit:
            qry = qry.limit(limit)
        sql = self.compile_sqla_query(qry)
        if indent:
            sql = sqlparse.format(sql, reindent=True)
        return sql

    def wrap_sql_limit(self, sql, limit=1000):
        qry = (
            select('*')
                .select_from(TextAsFrom(text(sql), ['*'])
                             .alias('inner_qry')).limit(limit)
        )
        return self.compile_sqla_query(qry)

    def safe_sqlalchemy_uri(self):
        return self.sqlalchemy_uri

    @property
    def inspector(self):
        engine = self.get_sqla_engine()
        return sqla.inspect(engine)

    def all_table_names(self, schema=None):
        return sorted(self.inspector.get_table_names(schema))

    def all_view_names(self, schema=None):
        views = []
        try:
            views = self.inspector.get_view_names(schema)
        except Exception as e:
            pass
        return views

    def all_schema_names(self):
        return sorted(self.inspector.get_schema_names())

    def all_schema_table_names(self):
        st_list = self.inspector.get_schema_and_table_names()
        # from sqlalchemy.dialects.inceptor.base import InceptorDialect
        # inceptor = InceptorDialect()
        # engine = self.get_sqla_engine()
        # conn = engine.connect()
        # st_list = inceptor.get_schema_and_table_names(conn)

        st_group = groupby(st_list, lambda item: item[0])
        st = {}
        for schema, tb_group in st_group:
            tables = []
            for i in list(tb_group):
                tables.append(i[1])
            st[schema] = tables
        return OrderedDict(sorted(st.items(), key=lambda s: s[0]))

    @property
    def db_engine_spec(self):
        engine_name = self.get_sqla_engine().name or 'base'
        return db_engine_specs.engines.get(
            engine_name, db_engine_specs.BaseEngineSpec)

    def grains(self):
        """Defines time granularity database-specific expressions.

        The idea here is to make it easy for users to change the time grain
        form a datetime (maybe the source grain is arbitrary timestamps, daily
        or 5 minutes increments) to another, "truncated" datetime. Since
        each database has slightly different but similar datetime functions,
        this allows a mapping between database engines and actual functions.
        """
        return self.db_engine_spec.time_grains

    def grains_dict(self):
        return {grain.name: grain for grain in self.grains()}

    def get_args(self):
        args = {}
        if self.args:
            try:
                args = json.loads(self.args)
            except Exception as e:
                logging.error(e)
        return args

    def get_table(self, table_name, schema=None):
        args = self.get_args()
        meta = MetaData(**args.get('metadata_params', {}))
        return Table(
            table_name, meta,
            schema=schema or None,
            autoload=True,
            autoload_with=self.get_sqla_engine())

    def get_columns(self, table_name, schema=None):
        return self.inspector.get_columns(table_name, schema)

    def get_indexes(self, table_name, schema=None):
        return self.inspector.get_indexes(table_name, schema)

    def get_pk_constraint(self, table_name, schema=None):
        return self.inspector.get_pk_constraint(table_name, schema)

    def get_foreign_keys(self, table_name, schema=None):
        return self.inspector.get_foreign_keys(table_name, schema)

    @property
    def sqlalchemy_uri_decrypted(self):
        conn = sqla.engine.url.make_url(self.sqlalchemy_uri)
        conn.password = self.password
        return str(conn)

    @property
    def sql_url(self):
        return '/pilot/sql/{}/'.format(self.id)

    @classmethod
    def release(cls, database):
        if str(database.created_by_fk) == str(g.user.get_id()):
            database.online = True
            db.session.commit()

    @classmethod
    def args_append_keytab(cls, connect_args):
        if connect_args.get('mech', '').lower() == 'kerberos':
            dir = config.get('KETTAB_TMP_DIR', '/tmp/keytab')
            server = config.get('GUARDIAN_SERVER')
            username = g.user.username
            password = AuthDBView.mock_user.get(g.user.username)
            if not password:
                raise SupersetException(NEED_PASSWORD_FOR_KEYTAB)
            connect_args['keytab'] = cls.get_keytab(username, password, server, dir)
        return connect_args

    @classmethod
    def get_keytab(cls, user, passwd, guardian_server, dir):
        if not os.path.exists(dir):
            os.makedirs(dir)
        path = os.path.join(dir, 'tmp.keytab')
        conf = GuardianConfiguration()
        conf.set(GuardianVars.GUARDIAN_SERVER_ADDRESS.varname, guardian_server)
        client = guardianClientFactory.getInstance(conf)
        client.login(user, passwd)
        keytab = client.getKeytab(user)

        file = open(path, "wb")
        file.write(keytab)
        file.close()
        return path


class HDFSConnection(Model, AuditMixinNullable):
    __tablename__ = 'hdfs_connection'
    type = 'table'

    id = Column(Integer, primary_key=True)
    connection_name = Column(String(128), nullable=False)
    description = Column(Text)
    online = Column(Boolean, default=False)
    database_id = Column(Integer, ForeignKey('dbs.id'))
    httpfs = Column(String(64))
    webhdfs_url = Column(String(64))
    fs_defaultfs = Column(String(64))
    logical_name = Column(String(64))
    principal = Column(String(64))
    hdfs_user = Column(String(64))
    keytab_file = Column(LargeBinary)
    database = relationship(
        'Database',
        backref=backref('hdfs_connection', lazy='dynamic'),
        foreign_keys=[database_id])

    __table_args__ = (
        UniqueConstraint('connection_name', 'created_by_fk', name='connection_name_owner_uc'),
    )

    def __repr__(self):
        return self.connection_name

    @classmethod
    def release(cls, conn):
        if str(conn.created_by_fk) == str(g.user.get_id()):
            conn.online = True
            db.session.commit()


class Connection(object):
    connection_type_dict = {
        'inceptor': 'INCEPTOR',
        'hdfs': 'HDFS'}


class DatabaseAccount(Model):
    """ORM object to store the account info of database"""
    __tablename__ = 'database_account'
    type = "table"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('ab_user.id'), nullable=True)
    database_id = Column(Integer, ForeignKey('dbs.id'))
    username = Column(String(64))
    password = Column(EncryptedType(String(1024), config.get('SECRET_KEY')))
    database = relationship(
        'Database',
        backref=backref('database_account', cascade='all, delete-orphan'),
        foreign_keys=[database_id]
    )

    @classmethod
    def insert_or_update_account(cls, user_id, db_id, username, password):
        record = (
            db.session.query(cls)
                .filter(cls.user_id == user_id,
                        cls.database_id == db_id)
                .first()
        )
        if record:
            record.username = username if username else record.username
            record.password = password if password else record.password
            db.session.commit()
        else:
            if not username or not password:
                logging.error("The username or password of database account can't be none.")
                return False
            new_record = cls(user_id=user_id,
                             database_id=db_id,
                             username=username,
                             password=password)
            db.session.add(new_record)
        db.session.commit()
        logging.info("Update username or password of user:{} and database:{} success."
                     .format(user_id, db_id))
        return True