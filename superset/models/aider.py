from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import json
import re
from datetime import datetime, date

from flask import request
from flask_appbuilder import Model

import sqlalchemy as sqla
from sqlalchemy import (
    Column, Integer, String, ForeignKey, Text, Boolean, DateTime, Date, Numeric,
)
from sqlalchemy.orm import backref, relationship

from superset import app, db
from .base import QueryStatus
from .dataset import Dataset
from .connection import Database, HDFSConnection, Connection
from .core import Slice, Dashboard
from .story import Story

config = app.config

str_to_model = {
    'slice': Slice,
    'dashboard': Dashboard,
    'dataset': Dataset,
    'database': Database,
    'hdfsconnection': HDFSConnection,
    'connection': Connection,
    'story': Story
}


class Log(Model):
    """ORM object used to log Superset actions to the database
       Object type: ['story', 'slice', 'dashboard', 'dataset', database', 'hdfsconnection']
       Action type: ['add', 'update', 'delete', 'online', 'offline', 'import',
                      'export', 'like', 'dislike']
    """
    __tablename__ = 'logs'

    id = Column(Integer, primary_key=True)
    action = Column(String(512))
    action_type = Column(String(32))
    obj_type = Column(String(32))
    obj_id = Column(Integer)
    user_id = Column(Integer, ForeignKey('ab_user.id'))
    json = Column(Text)
    user = relationship('User', backref='logs', foreign_keys=[user_id])
    dttm = Column(DateTime, default=datetime.now)
    dt = Column(Date, default=date.today())
    duration_ms = Column(Integer)
    referrer = Column(String(1024))

    record_action_types = ['online', 'offline', 'add', 'delete']

    @classmethod
    def log_action(cls, action_type, action, obj_type, obj_id, user_id):
        if action_type not in cls.record_action_types:
            return
        log = cls(
            action=action,
            action_type=action_type,
            obj_type=obj_type,
            obj_id=obj_id,
            user_id=user_id)
        db.session().add(log)
        db.session().commit()

    @classmethod
    def log(cls, action_type, obj, obj_type, user_id):
        uniform_type = cls.convert_type(obj_type)
        action_str = '{} {}: [{}]'.format(action_type.capitalize(), uniform_type, repr(obj))
        cls.log_action(action_type, action_str, obj_type, obj.id, user_id)

    @classmethod
    def log_add(cls, obj, obj_type, user_id):
        if hasattr(obj, 'online') and obj.online is True:
            cls.log_online(obj, obj_type, user_id)
        cls.log('add', obj, obj_type, user_id)

    @classmethod
    def log_update(cls, obj, obj_type, user_id):
        cls.log('update', obj, obj_type, user_id)

    @classmethod
    def log_delete(cls, obj, obj_type, user_id):
        if hasattr(obj, 'online') and obj.online is True:
            cls.log_offline(obj, obj_type, user_id)
        cls.log('delete', obj, obj_type, user_id)

    @classmethod
    def log_online(cls, obj, obj_type, user_id):
        cls.log('online', obj, obj_type, user_id)

    @classmethod
    def log_offline(cls, obj, obj_type, user_id):
        cls.log('offline', obj, obj_type, user_id)

    @classmethod
    def convert_type(cls, obj_type):
        if obj_type in ['database', 'hdfsconnection']:
            return 'connection'
        else:
            return obj_type


class FavStar(Model):
    __tablename__ = 'favstar'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('ab_user.id'))
    class_name = Column(String(32))
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
