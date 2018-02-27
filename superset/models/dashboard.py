"""A collection of ORM sqlalchemy models for Superset"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import json
import logging
import pickle
from copy import copy

from flask import escape, Markup
from flask_babel import lazy_gettext as _
from flask_appbuilder import Model
from sqlalchemy import (
    Column, Integer, String, ForeignKey, Text, Boolean, LargeBinary, Table,
    MetaData, UniqueConstraint
)
from sqlalchemy.orm import relationship, subqueryload, backref
from sqlalchemy.orm.session import make_transient

from superset import app, db
from superset.exception import ParameterException, PropertyException
from .base import AuditMixinNullable, ImportMixin, ValueRestrict
from .slice import Slice
from .dataset import Dataset


config = app.config

dashboard_slices = Table(
    'dashboard_slices', Model.metadata,
    Column('id', Integer, primary_key=True),
    Column('dashboard_id', Integer, ForeignKey('dashboards.id')),
    Column('slice_id', Integer, ForeignKey('slices.id')),
)


class Folder(Model, ValueRestrict):
    __tablename__ = 'folders'

    MAX_DEPTH = 4
    ROOT = '/'

    id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False)
    path = Column(String(128), nullable=False)  # Materialized path like /1/2/3

    def __repr__(self):
        return self.name

    @property
    def ancestors(self):
        if self.name == self.ROOT:
            return []
        ances = self.path.lstrip('/').split('/')
        del ances[-1]
        ances.insert(0, self.ROOT)
        return ances

    def get_parent_path(self):
        if self.name == self.ROOT:
            return None
        match_str = '/{}'.format(self.id)
        if not self.path.endswith(match_str):
            raise PropertyException(
                _('Error materialized path [{path}] for folder(id={id})')
                    .format(path=self.path, id=self.id))
        index = self.path.find(match_str)
        return self.path[:index]

    @classmethod
    def check_path_depth(cls, path):
        depth = path.count('/')
        if depth >= cls.MAX_DEPTH:
            raise ParameterException(
                _("Folders' depth is limited to [{depth}]").format(depth=cls.MAX_DEPTH))

    @classmethod
    def create_root_folder(cls):
        root = db.session.query(cls).filter_by(name=cls.ROOT).first()
        if not root:
            root = cls(name='/', path='/')
            db.session.add(root)
            db.session.commit()
            logging.info('Created dashboard root folder')
        return root

    @classmethod
    def get_root_folder(cls):
        return cls.create_root_folder()


class Dashboard(Model, AuditMixinNullable, ImportMixin):
    __tablename__ = 'dashboards'
    model_type = 'dashboard'

    id = Column(Integer, primary_key=True)
    dashboard_title = Column(String(128), unique=True)
    position_json = Column(Text)
    description = Column(Text)
    department = Column(String(256))
    css = Column(Text)
    online = Column(Boolean, default=False)
    json_metadata = Column(Text)
    slug = Column(String(128))
    image = Column(LargeBinary(length=(2**32)-1), nullable=True)  # dashboard thumbnail
    need_capture = Column(Boolean, default=True)  # if need new thumbnail
    folder_id = Column(Integer, ForeignKey('folders.id'), nullable=False)
    folder = relationship(
        'Folder', backref=backref('dashboards'), foreign_keys=[folder_id]
    )
    slices = relationship(
        'Slice', secondary=dashboard_slices, backref='dashboards')

    __table_args__ = (
        UniqueConstraint('dashboard_title', name='dashboard_title_uc'),
    )

    export_fields = ('dashboard_title', 'position_json', 'description', 'online',
                     'json_metadata', 'image', 'need_capture')

    def __repr__(self):
        return self.dashboard_title

    @property
    def name(self):
        return self.dashboard_title

    @classmethod
    def name_column(cls):
        return cls.dashboard_title

    @property
    def table_names(self):
        tables = []
        for s in self.slices:
            if s.datasource:
                tables.append(str(s.datasource))
        return ", ".join(set(tables))

    @property
    def url(self):
        return "/p/dashboard/{}/".format(self.id)

    @property
    def datasources(self):
        return {slc.datasource for slc in self.slices}

    @property
    def sqla_metadata(self):
        metadata = MetaData(bind=self.get_sqla_engine())
        return metadata.reflect()

    def dashboard_link(self):
        title = escape(self.dashboard_title)
        return Markup(
            '<a href="{self.url}">{title}</a>'.format(**locals()))

    @property
    def json_data(self):
        positions = self.position_json
        if positions:
            positions = json.loads(positions)
        d = {
            'id': self.id,
            'metadata': self.params_dict,
            'css': self.css,
            'dashboard_title': self.dashboard_title,
            'slug': self.slug,
            'slices': [slc.data for slc in self.slices],
            'position_json': positions,
        }
        return json.dumps(d)

    @property
    def params(self):
        return self.json_metadata

    @params.setter
    def params(self, value):
        self.json_metadata = value

    @property
    def position_array(self):
        if self.position_json:
            return json.loads(self.position_json)
        return []

    @classmethod
    def import_obj(cls, session, i_dash, solution, grant_owner_permissions):
        """Imports the dashboard from the object to the database.
        """
        def alter_positions(dashboard, old_to_new_slc_id_dict):
            """ Updates slice_ids in the position json.
            Sample position json:
            [{
                "col": 5,
                "row": 10,
                "size_x": 4,
                "size_y": 2,
                "slice_id": "3610"
            }]
            """
            position_array = dashboard.position_array
            for position in position_array:
                if 'slice_id' in position:
                    old_slice_id = int(position['slice_id'])
                    if old_slice_id in old_to_new_slc_id_dict:
                        position['slice_id'] = \
                            '{}'.format(old_to_new_slc_id_dict[old_slice_id])
            dashboard.position_json = json.dumps(position_array)

        slices = copy(i_dash.slices)
        old_to_new_slc_id_dict = {}
        new_filter_immune_slices = []
        new_expanded_slices = {}
        i_params_dict = i_dash.params_dict

        for slc in slices:
            old_slc_id = slc.id
            new_slice = Slice.import_obj(session, slc, solution, grant_owner_permissions)
            old_to_new_slc_id_dict[old_slc_id] = new_slice.id
            # update json metadata that deals with slice ids
            new_slc_id = '{}'.format(new_slice.id)
            old_slc_id = '{}'.format(old_slc_id)
            if 'filter_immune_slices' in i_params_dict \
                    and old_slc_id in i_params_dict['filter_immune_slices']:
                new_filter_immune_slices.append(new_slc_id)
            if 'expanded_slices' in i_params_dict \
                    and old_slc_id in i_params_dict['expanded_slices']:
                new_expanded_slices[new_slc_id] = \
                    (i_params_dict['expanded_slices'][old_slc_id])

        alter_positions(i_dash, old_to_new_slc_id_dict)
        if new_expanded_slices:
            i_dash.alter_params(expanded_slices=new_expanded_slices)
        if new_filter_immune_slices:
            i_dash.alter_params(filter_immune_slices=new_filter_immune_slices)

        new_slices = session.query(Slice) \
            .filter(Slice.id.in_(old_to_new_slc_id_dict.values())) \
            .all()

        i_dash.id = None
        existed_dash = cls.get_object(name=i_dash.name)
        new_dash = existed_dash

        if not existed_dash:
            logging.info('Importing dashboard: [{}] (add)'.format(i_dash))
            new_dash = i_dash.copy()
            new_dash.slices = new_slices
            session.commit()
            grant_owner_permissions([cls.model_type, new_dash.dashboard_title])
        else:
            policy, new_name = cls.get_policy(cls.model_type, i_dash.name, solution)
            if policy == cls.Policy.OVERWRITE:
                logging.info('Importing dashboard: [{}] (overwrite)'.format(i_dash))
                new_dash.override(i_dash)
                new_dash.slices = new_slices
                session.commit()
            elif policy == cls.Policy.RENAME:
                logging.info('Importing dashboard: [{}] (rename to [{}])'
                             .format(i_dash, new_name))
                new_dash = i_dash.copy()
                new_dash.dashboard_title = new_name
                new_dash.slices = new_slices
                session.commit()
                grant_owner_permissions([cls.model_type, new_dash.dashboard_title])
            elif policy == cls.Policy.SKIP:
                logging.info('Importing dashboard: [{}] (skip)'.format(i_dash))

        return new_dash

    @classmethod
    def export_dashboards(cls, dashboard_ids):
        copied_dashs, copied_datasets = [],  []
        dataset_ids = set()

        for dashboard_id in dashboard_ids:
            dashboard_id = int(dashboard_id)
            copied_dashboard = (
                db.session.query(Dashboard)
                    .options(subqueryload(Dashboard.slices))
                    .filter_by(id=dashboard_id).first()
            )
            make_transient(copied_dashboard)
            for slc in copied_dashboard.slices:
                if slc.datasource_id and slc.datasource:
                    dataset = slc.datasource
                    dataset_ids.add(dataset.id)

            copied_dashs.append(copied_dashboard)

        for id in dataset_ids:
            dataset = (
                db.session.query(Dataset)
                    .options(subqueryload(Dataset.ref_columns),
                             subqueryload(Dataset.ref_metrics))
                    .filter_by(id=id).first()
            )
            make_transient(dataset)
            copied_datasets.append(dataset)

        return pickle.dumps({
            'dashboards': copied_dashs,
            'datasets': copied_datasets,
        })

    @classmethod
    def set_default_folder(cls, folder_id):
        db.session.query(cls) \
            .filter(cls.folder_id == None) \
            .update({'folder_id': folder_id})
        db.session.commit()
