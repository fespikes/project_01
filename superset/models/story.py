"""A collection of ORM sqlalchemy models for Pilot"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

from flask_appbuilder import Model
from sqlalchemy import (
    Column, Integer, String, ForeignKey, Text, Boolean, Table,
    MetaData, UniqueConstraint
)
from sqlalchemy.orm import relationship

from superset import app
from .base import AuditMixinNullable, ImportMixin, Count

config = app.config


story_dashboards = Table(
    'story_dashboards', Model.metadata,
    Column('id', Integer, primary_key=True),
    Column('story_id', Integer, ForeignKey('stories.id')),
    Column('dashboard_id', Integer, ForeignKey('dashboards.id')),
)


class Story(Model, AuditMixinNullable, ImportMixin, Count):
    """A Story is a set of dashboards"""
    __tablename__ = 'stories'

    id = Column(Integer, primary_key=True)
    story_name = Column(String(128), nullable=False)
    description = Column(Text)
    online = Column(Boolean, default=False)
    order_json = Column(Text)
    dashboards = relationship(
        'Dashboard', secondary=story_dashboards, backref='stories')

    __table_args__ = (
        UniqueConstraint('story_name', 'created_by_fk', name='story_name_owner_uc'),
    )

    def __repr__(self):
        return self.story_name

    @property
    def dashboard_titles(self):
        return str(self.dashboards)

    @property
    def url(self):
        return "/p/story/{}/".format(self.id)

