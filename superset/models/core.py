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

from flask import escape, g, Markup
from flask_appbuilder import Model
from flask_appbuilder.models.decorators import renders
from sqlalchemy import (
    Column, Integer, String, ForeignKey, Text, Boolean, Table,
    MetaData, UniqueConstraint
)
from sqlalchemy.orm import relationship, subqueryload
from sqlalchemy.orm.session import make_transient

from superset import app, db, utils
from superset.source_registry import SourceRegistry
from superset.viz import viz_types
from superset.utils import SupersetException
from .base import AuditMixinNullable, ImportMixin
from .dataset import Dataset

config = app.config


class Slice(Model, AuditMixinNullable, ImportMixin):
    """A slice is essentially a report or a view on data"""
    __tablename__ = 'slices'
    id = Column(Integer, primary_key=True)
    slice_name = Column(String(128))
    online = Column(Boolean, default=False)
    datasource_id = Column(Integer)
    datasource_type = Column(String(32))
    datasource_name = Column(String(128))
    database_id = Column(Integer)
    full_table_name = Column(String(128))
    viz_type = Column(String(32))
    params = Column(Text)
    description = Column(Text)
    department = Column(String(256))
    cache_timeout = Column(Integer)

    __table_args__ = (
        UniqueConstraint('slice_name', 'created_by_fk', name='slice_name_owner_uc'),
    )

    export_fields = ('slice_name', 'datasource_type', 'datasource_name',
                     'viz_type', 'params', 'cache_timeout')

    def __repr__(self):
        return self.slice_name

    @property
    def perm(self):
        return self.slice_name

    @property
    def datasource(self):
        return self.get_datasource

    @datasource.getter
    @utils.memoized
    def get_datasource(self):
        ds = db.session.query(Dataset) \
            .filter_by(id=self.datasource_id).first()
        return ds

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
    def import_obj(cls, slc_to_import, import_time=None):
        """Inserts or overrides slc in the database.

        remote_id and import_time fields in params_dict are set to track the
        slice origin and ensure correct overrides for multiple imports.
        Slice.perm is used to find the datasources and connect them.
        """
        session = db.session
        make_transient(slc_to_import)
        slc_to_import.dashboards = []
        slc_to_import.alter_params(
            remote_id=slc_to_import.id, import_time=import_time)

        # find if the slice was already imported
        slc_to_override = None
        for slc in session.query(Slice).all():
            if ('remote_id' in slc.params_dict and
                        slc.params_dict['remote_id'] == slc_to_import.id):
                slc_to_override = slc

        slc_to_import = slc_to_import.copy()
        params = slc_to_import.params_dict
        slc_to_import.datasource_id = SourceRegistry.get_datasource_by_name(
            session, slc_to_import.datasource_type, params['datasource_name'],
            params['schema'], params['database_name']).id
        if slc_to_override:
            slc_to_override.override(slc_to_import)
            session.flush()
            return slc_to_override.id
        session.add(slc_to_import)
        logging.info('Final slice: {}'.format(slc_to_import.to_json()))
        session.flush()
        return slc_to_import.id

    @classmethod
    def release(cls, slice):
        if slice.datasource:  # datasource may be deleted
            Dataset.release(slice.datasource)
        if str(slice.created_by_fk) == str(g.user.get_id()):
            slice.online = True
            db.session.commit()

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
            raise SupersetException("Not found slice by id: [{}]".format(slice_id))
        if check(slice, user_id) is False:
            if raise_if_false:
                raise SupersetException(
                    "Slice: [{}] is offline.".format(slice.slice_name))
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
    id = Column(Integer, primary_key=True)
    dashboard_title = Column(String(128), unique=True)
    position_json = Column(Text)
    description = Column(Text)
    department = Column(String(256))
    css = Column(Text)
    online = Column(Boolean, default=False)
    json_metadata = Column(Text)
    slug = Column(String(128))
    slices = relationship(
        'Slice', secondary=dashboard_slices, backref='dashboards')

    __table_args__ = (
        UniqueConstraint('dashboard_title', 'created_by_fk', name='dashboard_title_owner_uc'),
    )

    export_fields = ('dashboard_title', 'position_json', 'json_metadata',
                     'description', 'css', 'slug')

    def __repr__(self):
        return self.dashboard_title

    @property
    def table_names(self):
        tables = []
        for s in self.slices:
            if s.datasource:
                tables.append(s.datasource.name)
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
    def import_obj(cls, dashboard_to_import, import_time=None):
        """Imports the dashboard from the object to the database.

         Once dashboard is imported, json_metadata field is extended and stores
         remote_id and import_time. It helps to decide if the dashboard has to
         be overridden or just copies over. Slices that belong to this
         dashboard will be wired to existing tables. This function can be used
         to import/export dashboards between multiple superset instances.
         Audit metadata isn't copies over.
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
                if 'slice_id' not in position:
                    continue
                old_slice_id = int(position['slice_id'])
                if old_slice_id in old_to_new_slc_id_dict:
                    position['slice_id'] = '{}'.format(
                        old_to_new_slc_id_dict[old_slice_id])
            dashboard.position_json = json.dumps(position_array)

        logging.info('Started import of the dashboard: {}'
                     .format(dashboard_to_import.to_json()))
        session = db.session
        logging.info('Dashboard has {} slices'
                     .format(len(dashboard_to_import.slices)))
        # copy slices object as Slice.import_slice will mutate the slice
        # and will remove the existing dashboard - slice association
        slices = copy(dashboard_to_import.slices)
        old_to_new_slc_id_dict = {}
        new_filter_immune_slices = []
        new_expanded_slices = {}
        i_params_dict = dashboard_to_import.params_dict
        for slc in slices:
            logging.info('Importing slice {} from the dashboard: {}'.format(
                slc.to_json(), dashboard_to_import.dashboard_title))
            new_slc_id = Slice.import_obj(slc, import_time=import_time)
            old_to_new_slc_id_dict[slc.id] = new_slc_id
            # update json metadata that deals with slice ids
            new_slc_id_str = '{}'.format(new_slc_id)
            old_slc_id_str = '{}'.format(slc.id)
            if ('filter_immune_slices' in i_params_dict and
                        old_slc_id_str in i_params_dict['filter_immune_slices']):
                new_filter_immune_slices.append(new_slc_id_str)
            if ('expanded_slices' in i_params_dict and
                        old_slc_id_str in i_params_dict['expanded_slices']):
                new_expanded_slices[new_slc_id_str] = (
                    i_params_dict['expanded_slices'][old_slc_id_str])

        # override the dashboard
        existing_dashboard = None
        for dash in session.query(Dashboard).all():
            if ('remote_id' in dash.params_dict and
                        dash.params_dict['remote_id'] ==
                        dashboard_to_import.id):
                existing_dashboard = dash

        dashboard_to_import.id = None
        alter_positions(dashboard_to_import, old_to_new_slc_id_dict)
        dashboard_to_import.alter_params(import_time=import_time)
        if new_expanded_slices:
            dashboard_to_import.alter_params(
                expanded_slices=new_expanded_slices)
        if new_filter_immune_slices:
            dashboard_to_import.alter_params(
                filter_immune_slices=new_filter_immune_slices)

        new_slices = session.query(Slice).filter(
            Slice.id.in_(old_to_new_slc_id_dict.values())).all()

        if existing_dashboard:
            existing_dashboard.override(dashboard_to_import)
            existing_dashboard.slices = new_slices
            session.flush()
            return existing_dashboard.id
        else:
            # session.add(dashboard_to_import) causes sqlachemy failures
            # related to the attached users / slices. Creating new object
            # allows to avoid conflicts in the sql alchemy state.
            copied_dash = dashboard_to_import.copy()
            copied_dash.slices = new_slices
            session.add(copied_dash)
            session.flush()
            return copied_dash.id

    @classmethod
    def export_dashboards(cls, dashboard_ids):
        copied_dashboards = []
        eager_datasources = []
        datasource_ids = set()
        for dashboard_id in dashboard_ids:
            # make sure that dashboard_id is an integer
            dashboard_id = int(dashboard_id)
            copied_dashboard = (
                db.session.query(Dashboard)
                    .options(subqueryload(Dashboard.slices))
                    .filter_by(id=dashboard_id).first()
            )
            make_transient(copied_dashboard)
            for slc in copied_dashboard.slices:
                datasource_ids.add((slc.datasource_id, slc.datasource_type))
                # add extra params for the import
                slc.alter_params(
                    remote_id=slc.id,
                    datasource_name=slc.datasource.name,
                    schema=slc.datasource.name,
                    database_name=slc.datasource.database.name,
                )
            copied_dashboard.alter_params(remote_id=dashboard_id)
            copied_dashboards.append(copied_dashboard)

            eager_datasources = []
            for dashboard_id, dashboard_type in datasource_ids:
                eager_datasource = SourceRegistry.get_eager_datasource(
                    db.session, dashboard_type, dashboard_id)
                eager_datasource.alter_params(
                    remote_id=eager_datasource.id,
                    database_name=eager_datasource.database.name,
                )
                make_transient(eager_datasource)
                eager_datasources.append(eager_datasource)

        return pickle.dumps({
            'dashboards': copied_dashboards,
            'datasources': eager_datasources,
        })

    @classmethod
    def release(cls, dash):
        for slc in dash.slices:
            Slice.release(slc)
        if str(dash.created_by_fk) == str(g.user.get_id()):
            dash.online = True
            db.session.commit()
