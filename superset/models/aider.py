from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import json
import re
from datetime import datetime, date

from flask import g, request
from flask_appbuilder import Model
from flask_appbuilder.security.sqla.models import User

import sqlalchemy as sqla
from sqlalchemy import (
    Column, Integer, String, ForeignKey, Text, Boolean,
    DateTime, Date, Numeric,  and_, or_
)
from sqlalchemy.orm import backref, relationship

from superset import app, db
from .base import QueryStatus
from .dataset import Database, Dataset, HDFSConnection
from .core import Slice, Dashboard

config = app.config

str_to_model = {
    'slice': Slice,
    'dashboard': Dashboard,
    'dataset': Dataset,
    'database': Database,
    'hdfsconnection': HDFSConnection
}


class Log(Model):
    """ORM object used to log Superset actions to the database
       Object type: ['slice', 'dashboard', 'dataset', database', 'hdfsconnection']
       Action type: ['add', 'edit', 'delete', 'online', 'offline', 'import',
                      'export', 'like', 'dislike']
    """
    __tablename__ = 'logs'

    id = Column(Integer, primary_key=True)
    action = Column(String(512))
    action_type = Column(String(200))
    obj_type = Column(String(50))
    obj_id = Column(Integer)
    user_id = Column(Integer, ForeignKey('ab_user.id'))
    json = Column(Text)
    user = relationship('User', backref='logs', foreign_keys=[user_id])
    dttm = Column(DateTime, default=datetime.now)
    dt = Column(Date, default=date.today())
    duration_ms = Column(Integer)
    referrer = Column(String(1024))

    record_action_types = ['online', 'offline']

    @classmethod
    def log_action(cls, action_type, action, obj_type, obj_id):
        if action_type not in cls.record_action_types:
            return
        d = request.args.to_dict()
        post_data = request.form or {}
        d.update(post_data)
        params = ""
        try:
            params = json.dumps(d)
        except:
            pass
        sesh = db.session()
        log = cls(
            action=action,
            action_type=action_type,
            obj_type=obj_type,
            obj_id=obj_id,
            json=params,
            referrer=request.referrer[:1000] if request.referrer else None,
            user_id=g.user.get_id() if g.user else None)
        sesh.add(log)
        sesh.commit()


class FavStar(Model):
    __tablename__ = 'favstar'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('ab_user.id'))
    class_name = Column(String(50))
    obj_id = Column(Integer)
    dttm = Column(DateTime, default=datetime.utcnow)


class Query(Model):

    """ORM model for SQL query"""

    __tablename__ = 'query'
    id = Column(Integer, primary_key=True)
    client_id = Column(String(11), unique=True, nullable=False)

    database_id = Column(Integer, ForeignKey('dbs.id'), nullable=False)

    # Store the tmp table into the DB only if the user asks for it.
    tmp_table_name = Column(String(256))
    user_id = Column(
        Integer, ForeignKey('ab_user.id'), nullable=True)
    status = Column(String(16), default=QueryStatus.PENDING)
    tab_name = Column(String(256))
    sql_editor_id = Column(String(256))
    schema = Column(String(256))
    sql = Column(Text)
    # Query to retrieve the results,
    # used only in case of select_as_cta_used is true.
    select_sql = Column(Text)
    executed_sql = Column(Text)
    # Could be configured in the superset config.
    limit = Column(Integer)
    limit_used = Column(Boolean, default=False)
    limit_reached = Column(Boolean, default=False)
    select_as_cta = Column(Boolean)
    select_as_cta_used = Column(Boolean, default=False)

    progress = Column(Integer, default=0)  # 1..100
    # # of rows in the result set or rows modified.
    rows = Column(Integer)
    error_message = Column(Text)
    # key used to store the results in the results backend
    results_key = Column(String(64))

    # Using Numeric in place of DateTime for sub-second precision
    # stored as seconds since epoch, allowing for milliseconds
    start_time = Column(Numeric(precision=3))
    end_time = Column(Numeric(precision=3))
    changed_on = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)

    database = relationship(
        'Database',
        foreign_keys=[database_id],
        backref=backref('queries', cascade='all, delete-orphan')
    )
    user = relationship(
        'User',
        backref=backref('queries', cascade='all, delete-orphan'),
        foreign_keys=[user_id])

    __table_args__ = (
        sqla.Index('ti_user_id_changed_on', user_id, changed_on),
    )

    @property
    def limit_reached(self):
        return self.rows == self.limit if self.limit_used else False

    def to_dict(self):
        return {
            'changedOn': self.changed_on,
            'changed_on': self.changed_on.isoformat(),
            'dbId': self.database_id,
            'db': self.database.database_name,
            'endDttm': self.end_time,
            'errorMessage': self.error_message,
            'executedSql': self.executed_sql,
            'id': self.client_id,
            'limit': self.limit,
            'progress': self.progress,
            'rows': self.rows,
            'schema': self.schema,
            'ctas': self.select_as_cta,
            'serverId': self.id,
            'sql': self.sql,
            'sqlEditorId': self.sql_editor_id,
            'startDttm': self.start_time,
            'state': self.status.lower(),
            'tab': self.tab_name,
            'tempTable': self.tmp_table_name,
            'userId': self.user_id,
            'user': self.user.username,
            'limit_reached': self.limit_reached,
            'resultsKey': self.results_key,
        }

    @property
    def name(self):
        ts = datetime.now().isoformat()
        ts = ts.replace('-', '').replace(':', '').split('.')[0]
        tab = self.tab_name.replace(' ', '_').lower() if self.tab_name else 'notab'
        tab = re.sub(r'\W+', '', tab)
        return "sqllab_{tab}_{ts}".format(**locals())


class DailyNumber(Model):
    """ORM object used to log the daily number of objects.
       object type string: [slice, dashboard, dataset, connection].
       connection is the set of database and hdfsconnection
    """
    __tablename__ = 'daily_number'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('ab_user.id'))
    obj_type = Column(String(32), nullable=False)
    count = Column(Integer, nullable=False)
    dt = Column(Date, default=date.today())

    type_convert = {
        'dashboard': 'dashboard',
        'slice': 'slice',
        'dataset': 'dataset',
        'table': 'dataset',
        'sqlatable': 'dataset',
        'connection': 'connection',
        'databae': 'connection',
        'hdfsconnection': 'connection'
    }

    def __str__(self):
        return '{} {}s on {}'.format(self.count, self.type, self.dt)

    @classmethod
    def do_log(cls, obj_type, user_id):
        today_count = cls.object_present_count(obj_type, int(user_id))
        today_record = (
            db.session.query(cls)
                .filter(and_(
                cls.obj_type.ilike(obj_type),
                cls.dt == date.today(),
                cls.user_id == user_id)
            )
                .first()
        )
        if today_record:
            today_record.count = today_count
        else:
            new_record = cls(
                obj_type=obj_type.lower(),
                user_id=user_id,
                count=today_count,
                dt=date.today()
            )
            db.session.add(new_record)
        db.session.commit()

    @classmethod
    def object_present_count(cls, obj_type, user_id):
        if obj_type == 'connection':
            model_db = str_to_model['database']
            model_hdfs = str_to_model['hdfsconnection']
            return cls.query_count(model_db, user_id) + \
                   cls.query_count(model_hdfs, user_id)
        else:
            model = str_to_model[obj_type.lower()]
            return cls.query_count(model, user_id)

    @staticmethod
    def query_count(model, user_id):
        if hasattr(model, 'online'):
            count = (
                db.session.query(model).filter(or_(
                    model.created_by_fk == user_id,
                    model.online == 1))
                    .count())
        else:
            count = (
                db.session.query(model).filter(
                    model.created_by_fk == user_id)
                    .count()
            )
        return count

    @classmethod
    def log_number(cls, obj_type, all_user, user_id=None):
        obj_type = cls.type_convert.get(obj_type.lower())
        if all_user is True:
            users = db.session.query(User).all()
            for user in users:
                cls.do_log(obj_type, user.id)
        else:
            cls.do_log(obj_type, user_id)

    @classmethod
    def log_related_number(cls, obj_type, all_user, user_id=None):
        if obj_type == 'dashboard':
            cls.log_number(obj_type, all_user, user_id)
            obj_type = 'slice'
        if obj_type == 'slice':
            cls.log_number(obj_type, all_user, user_id)
            obj_type = 'dataset'
        if obj_type == 'dataset':
            cls.log_number(obj_type, all_user, user_id)
            obj_type = 'connection'
        if obj_type == 'connection':
            cls.log_number(obj_type, all_user, user_id)