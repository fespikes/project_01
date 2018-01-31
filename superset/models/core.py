"""A collection of ORM sqlalchemy models for Superset"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import json
import logging
import pickle
from copy import copy
from werkzeug.datastructures import ImmutableMultiDict

from flask import g, escape, Markup
from flask_babel import lazy_gettext as _
from flask_appbuilder import Model
from flask_appbuilder.models.decorators import renders
from sqlalchemy import (
    Column, Integer, String, ForeignKey, Text, Boolean, LargeBinary, Table,
    MetaData, UniqueConstraint
)
from sqlalchemy.orm import relationship, subqueryload, backref
from sqlalchemy.orm.session import make_transient

from superset import app, db, utils
from superset.source_registry import SourceRegistry
from superset.viz import viz_types
from superset.exception import ParameterException, OfflineException
from .base import AuditMixinNullable, ImportMixin
from .dataset import Dataset
from .connection import Database, HDFSConnection

config = app.config


class Slice(Model, AuditMixinNullable, ImportMixin):
    """A slice is essentially a report or a view on data"""
    __tablename__ = 'slices'
    model_type = 'slice'

    id = Column(Integer, primary_key=True)
    slice_name = Column(String(128), unique=True)
    online = Column(Boolean, default=False)
    datasource_id = Column(Integer)
    datasource_type = Column(String(32))
    datasource_name = Column(String(128))
    database_id = Column(Integer, ForeignKey('dbs.id'), nullable=True)
    database = relationship('Database',
                            backref=backref('slice'),
                            foreign_keys=[database_id])
    full_table_name = Column(String(128))
    viz_type = Column(String(32))
    params = Column(Text)
    description = Column(Text)
    department = Column(String(256))
    cache_timeout = Column(Integer)

    __table_args__ = (
        UniqueConstraint('slice_name', name='slice_name_uc'),
    )

    export_fields = ('slice_name', 'online', 'datasource_id', 'datasource_type',
                     'datasource_name', 'database_id', 'full_table_name',
                     'viz_type', 'params', 'description', 'cache_timeout')

    def __repr__(self):
        return self.slice_name

    @property
    def name(self):
        return self.slice_name

    @classmethod
    def name_column(cls):
        return cls.slice_name

    @property
    def perm(self):
        return self.slice_name

    @property
    def datasource(self):
        return self.get_datasource

    @datasource.getter
    @utils.memoized
    def get_datasource(self):
        if self.database_id and self.full_table_name:
            return Dataset.temp_dataset(self.database_id, self.full_table_name)
        elif self.datasource_id:
            return db.session.query(Dataset).filter_by(id=self.datasource_id).first()
        else:
            return None

    @renders('datasource_name')
    def datasource_link(self):
        datasource = self.datasource
        if datasource:
            return self.datasource.link

    @property
    def datasource_edit_url(self):
        self.datasource.url

    @property
    @utils.memoized
    def viz(self):
        d = json.loads(self.params)
        viz_class = viz_types[self.viz_type]
        return viz_class(self.datasource, form_data=d)

    @property
    def description_markeddown(self):
        return utils.markdown(self.description)

    @property
    def data(self):
        """Data used to render slice in templates"""
        d = {}
        self.token = ''
        try:
            d = self.viz.data
            self.token = d.get('token')
        except Exception as e:
            logging.exception(e)
            d['error'] = str(e)
        d['slice_id'] = self.id
        d['slice_name'] = self.slice_name
        d['description'] = self.description
        d['slice_url'] = self.slice_url
        d['edit_url'] = self.edit_url
        d['description_markeddown'] = self.description_markeddown
        return d

    @property
    def json_data(self):
        return json.dumps(self.data)

    @property
    def slice_url(self):
        """Defines the url to access the slice"""
        try:
            slice_params = json.loads(self.params)
        except Exception as e:
            logging.exception(e)
            slice_params = {}
        slice_params['slice_id'] = self.id
        slice_params['json'] = "false"
        slice_params['slice_name'] = self.slice_name
        from werkzeug.urls import Href
        href = Href(
            "/p/explore/{obj.datasource_type}/"
            "{obj.datasource_id}/".format(obj=self))
        return href(slice_params)

    @property
    def source_table_url(self):
        if self.database_id and self.full_table_name:
            return "/p/explore/table/0/?database_id={}&full_tb_name={}"\
                .format(self.database_id, self.full_table_name)
        else:
            return None

    @property
    def slice_id_url(self):
        return (
            "/p/{slc.datasource_type}/{slc.datasource_id}/{slc.id}/"
        ).format(slc=self)

    @property
    def edit_url(self):
        return "/slice/edit/{}".format(self.id)

    @property
    def slice_link(self):
        url = self.slice_url
        name = escape(self.slice_name)
        return Markup('<a href="{url}">{name}</a>'.format(**locals()))

    def get_viz(self, url_params_multidict=None):
        """Creates :py:class:viz.BaseViz object from the url_params_multidict.

        :param werkzeug.datastructures.MultiDict url_params_multidict:
            Contains the visualization params, they override the self.params
            stored in the database
        :return: object of the 'viz_type' type that is taken from the
            url_params_multidict or self.params.
        :rtype: :py:class:viz.BaseViz
        """
        slice_params = json.loads(self.params)  # {}
        slice_params['slice_id'] = self.id
        slice_params['json'] = "false"
        slice_params['slice_name'] = self.slice_name
        slice_params['viz_type'] = self.viz_type if self.viz_type else "table"
        if url_params_multidict:
            slice_params.update(url_params_multidict)
            to_del = [k for k in slice_params if k not in url_params_multidict]
            for k in to_del:
                del slice_params[k]

        immutable_slice_params = ImmutableMultiDict(slice_params)
        return viz_types[immutable_slice_params.get('viz_type')](
            self.datasource,
            form_data=immutable_slice_params,
            slice_=self
        )

    @classmethod
    def import_obj(cls, session, i_slice, solution, grant_owner_permissions):
        """Inserts or overrides slc in the database.
        """
        def link_datasource(slice, database, dataset):
            if database:
                slice.database_id = database.id
                slice.database = database
            elif dataset:
                slice.datasource_id = dataset.id
                slice.datasource_name = dataset.name
            return slice

        make_transient(i_slice)
        i_slice.id = None
        i_slice.dashboards = []
        existed_slice = cls.get_object(name=i_slice.slice_name)
        new_slice = existed_slice

        new_database, new_dataset = None, None
        if i_slice.database_id and i_slice.database:
            i_database = i_slice.database
            new_database = Database.import_obj(
                session, i_database, solution, grant_owner_permissions)
        elif i_slice.datasource_name:
            new_dataset = Dataset.lookup_object(i_slice.datasource_name, solution)

        if not existed_slice:
            logging.info('Importing slice: [{}] (add)'.format(i_slice))
            new_slice = i_slice.copy()
            new_slice = link_datasource(new_slice, new_database, new_dataset)
            session.add(new_slice)
            session.commit()
            grant_owner_permissions([cls.model_type, new_slice.slice_name])
        else:
            policy, new_name = cls.get_policy(cls.model_type, i_slice.name, solution)
            if policy == cls.Policy.OVERWRITE:
                logging.info('Importing slice: [{}] (overwrite)'.format(i_slice))
                new_slice.override(i_slice)
                new_slice = link_datasource(new_slice, new_database, new_dataset)
                session.commit()
            elif policy == cls.Policy.RENAME:
                logging.info('Importing slice: [{}] (rename to [{}])'
                             .format(i_slice, new_name))
                new_slice = i_slice.copy()
                new_slice.slice_name = new_name
                new_slice = link_datasource(new_slice, new_database, new_dataset)
                session.add(new_slice)
                session.commit()
                grant_owner_permissions([cls.model_type, new_slice.slice_name])
            elif policy == cls.Policy.SKIP:
                logging.info('Importing slice: [{}] (skip)'.format(i_slice))

        return new_slice

    @classmethod
    def check_online(cls, slice_id, raise_if_false=True):
        def check(obj, user_id):
            user_id = int(user_id)
            if (hasattr(obj, 'online') and obj.online is True) or \
                            obj.created_by_fk == user_id:
                return True
            return False

        if not slice_id:
            logging.info("No slice_id is passed to check if slice is available")
            return True
        user_id = g.user.get_id()
        slice = db.session.query(Slice).filter_by(id=slice_id).first()
        if not slice:
            raise ParameterException(
                _("Not found slice by id [{id}]").format(id=slice_id))
        if check(slice, user_id) is False:
            if raise_if_false:
                raise OfflineException(
                    _("Slice [{slice}] is offline").format(slice=slice.slice_name))
            else:
                return False


dashboard_slices = Table(
    'dashboard_slices', Model.metadata,
    Column('id', Integer, primary_key=True),
    Column('dashboard_id', Integer, ForeignKey('dashboards.id')),
    Column('slice_id', Integer, ForeignKey('slices.id')),
)


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

        new_slices = session.query(Slice)\
            .filter(Slice.id.in_(old_to_new_slc_id_dict.values()))\
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
