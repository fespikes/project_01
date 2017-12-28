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

from flask_babel import lazy_gettext as _
from flask_appbuilder import Model

import sqlalchemy as sqla
from sqlalchemy.orm import backref, relationship
from sqlalchemy_utils import EncryptedType
from sqlalchemy import (
    Column, Integer, String, ForeignKey, Text, Boolean, Table,
    LargeBinary, create_engine, MetaData, select, UniqueConstraint,
    or_
)
from sqlalchemy.engine.url import make_url
from sqlalchemy.sql import text
from sqlalchemy.sql.expression import TextAsFrom

from superset import db, app, db_engine_specs, conf
from superset.exception import ParameterException
from superset.message import MISS_PASSWORD_FOR_GUARDIAN, NO_USER
from .base import AuditMixinNullable, Count

config = app.config


class Database(Model, AuditMixinNullable, Count):
    __tablename__ = 'dbs'
    type = "table"

    id = Column(Integer, primary_key=True)
    database_name = Column(String(128), nullable=False)
    description = Column(Text)
    online = Column(Boolean, default=False)
    # database_type = Column(String(32), nullable=False)
    sqlalchemy_uri = Column(String(1024))
    password = Column(EncryptedType(String(1024), config.get('SECRET_KEY')))
    cache_timeout = Column(Integer)
    select_as_create_table_as = Column(Boolean, default=False)
    expose = Column(Boolean, default=True)
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

    database_types = ['INCEPTOR', 'MYSQL', 'ORACLE', 'MSSQL']
    addable_types = database_types

    def __repr__(self):
        return self.database_name

    @property
    def name(self):
        return self.database_name

    @property
    def database_type(self):
        return self.backend.upper()

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

    def get_sqla_engine(self, schema=None):
        url = make_url(self.sqlalchemy_uri_decrypted)
        connect_args = self.args_append_keytab(self.get_args().get('connect_args', {}))
        url = self.db_engine_spec.adjust_database_uri(url, schema)
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
        return db_engine_specs.engines.get(
            self.backend, db_engine_specs.BaseEngineSpec)

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
        return '/p/sql/{}/'.format(self.id)

    def get_dialect(self):
        sqla_url = make_url(self.sqlalchemy_uri_decrypted)
        return sqla_url.get_dialect()()

    @classmethod
    def args_append_keytab(cls, connect_args):
        if connect_args.get('mech', '').lower() == 'kerberos':
            dir = config.get('KETTAB_TMP_DIR', '/tmp/keytab')
            username = g.user.username
            password = g.user.password2
            if not password:
                raise ParameterException(MISS_PASSWORD_FOR_GUARDIAN)
            connect_args['keytab'] = cls.get_keytab(username, password, dir)
        return connect_args

    @classmethod
    def get_keytab(cls, user, passwd, dir):
        if not os.path.exists(dir):
            os.makedirs(dir)
        path = os.path.join(dir, 'tmp.keytab')
        if conf.get('GUARDIAN_AUTH'):
            from superset.guardian import guardian_client
            guardian_client.login(user, passwd)
            keytab = guardian_client.getKeytab(user)
        else:
            keytab = b''
        file = open(path, "wb")
        file.write(keytab)
        file.close()
        return path

    @classmethod
    def count(cls, user_id):
        return (
            db.session.query(cls)
            .filter(
                or_(cls.created_by_fk == user_id,
                    cls.online == 1),
                cls.database_name != config.get("METADATA_CONN_NAME")
                )
            .count()
        )


class HDFSConnection(Model, AuditMixinNullable, Count):
    __tablename__ = 'hdfs_connection'
    type = 'table'

    id = Column(Integer, primary_key=True)
    connection_name = Column(String(128), nullable=False)
    description = Column(Text)
    online = Column(Boolean, default=False)
    database_id = Column(Integer, ForeignKey('dbs.id'), nullable=True)
    httpfs = Column(String(64), nullable=False)
    database = relationship(
        'Database',
        backref=backref('hdfs_connection', lazy='dynamic'),
        foreign_keys=[database_id])

    __table_args__ = (
        UniqueConstraint('connection_name', 'created_by_fk', name='connection_name_owner_uc'),
    )

    connection_types = ['HDFS', ]
    addable_types = connection_types

    def __repr__(self):
        return self.connection_name


class Connection(object):
    connection_types = Database.database_types + HDFSConnection.connection_types

    @classmethod
    def count(cls, user_id):
        return Database.count(user_id) + HDFSConnection.count(user_id)


# class DatabaseAccount(Model):
#     """ORM object to store the account info of database"""
#     __tablename__ = 'database_account'
#     type = "table"
#
#     id = Column(Integer, primary_key=True)
#     user_id = Column(Integer, ForeignKey('ab_user.id'), nullable=True)
#     database_id = Column(Integer, ForeignKey('dbs.id'))
#     username = Column(String(64))
#     password = Column(EncryptedType(String(1024), config.get('SECRET_KEY')))
#     database = relationship(
#         'Database',
#         backref=backref('database_account', cascade='all, delete-orphan'),
#         foreign_keys=[database_id]
#     )
#
#     @classmethod
#     def insert_or_update_account(cls, user_id, db_id, username, password):
#         record = (
#             db.session.query(cls)
#                 .filter(cls.user_id == user_id,
#                         cls.database_id == db_id)
#                 .first()
#         )
#         if record:
#             record.username = username if username else record.username
#             record.password = password if password else record.password
#             db.session.commit()
#         else:
#             if not username or not password:
#                 logging.error("The username or password of database account can't be none.")
#                 return False
#             new_record = cls(user_id=user_id,
#                              database_id=db_id,
#                              username=username,
#                              password=password)
#             db.session.add(new_record)
#         db.session.commit()
#         logging.info("Update username or password of user:{} and database:{} success."
#                      .format(user_id, db_id))
#         return True