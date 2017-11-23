from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals


import json
import logging
import pickle
import sys
import time
import zlib
from datetime import datetime, timedelta

from flask import g, request, redirect, flash, Response, render_template
from flask_babel import lazy_gettext as _
from flask_appbuilder import expose
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_appbuilder.security.sqla.models import User

from sqlalchemy import create_engine, or_

from superset import (
    app, cache, db, sql_lab, sql_parse, results_backend, viz, utils
)
from superset.timeout_decorator import connection_timeout
from superset.source_registry import SourceRegistry
from superset.sql_parse import SupersetQuery
from superset.utils import (
    get_database_access_error_msg, get_datasource_access_error_msg,
    SupersetException, json_error_response
)
from superset.models import (
    Database, Dataset, Slice, Dashboard, Story, TableColumn, SqlMetric,
    Query, Log, FavStar, str_to_model
)
from superset.message import *
from .base import (
    SupersetModelView, BaseSupersetView, catch_exception, get_user_id,
    check_ownership, generate_download_headers, json_response, get_error_msg
)


config = app.config
can_access = utils.can_access
QueryStatus = utils.QueryStatus


class SliceModelView(SupersetModelView):  # noqa
    model = Slice
    datamodel = SQLAInterface(Slice)
    route_base = '/slice'
    can_add = False
    list_columns = ['id', 'slice_name', 'description', 'slice_url',
                    'viz_type', 'online', 'changed_on']
    edit_columns = ['slice_name', 'description']
    show_columns = ['id', 'slice_name', 'description', 'created_on', 'changed_on']
    base_order = ('changed_on', 'desc')
    description_columns = {}

    list_template = "superset/list.html"

    str_to_column = {
        'title': Slice.slice_name,
        'description': Slice.description,
        'viz_type': Slice.viz_type,
        'table': Slice.datasource_name,
        'changed_on': Slice.changed_on,
        'owner': User.username,
        'created_by_user': User.username
    }
    int_columns = ['id', 'datasource_id', 'database_id', 'cache_timeout',
                   'created_by_fk', 'changed_by_fk']
    bool_columns = ['online']
    str_columns = ['datasource', 'created_on', 'changed_on']

    def get_addable_choices(self):
        data = super().get_addable_choices()
        dashs = self.get_available_dashboards(get_user_id())
        data['available_dashboards'] = self.dashboards_to_dict(dashs)
        return data

    def get_show_attributes(self, obj, user_id=None):
        attributes = super().get_show_attributes(obj, user_id)
        attributes['dashboards'] = self.dashboards_to_dict(obj.dashboards)
        dashs = self.get_available_dashboards(user_id)
        available_dashs = self.dashboards_to_dict(dashs)
        attributes['available_dashboards'] = available_dashs
        return attributes

    def get_edit_attributes(self, data, user_id):
        attributes = super().get_edit_attributes(data, user_id)
        attributes['dashboards'] = self.get_dashs_in_list(data.get('dashboards'))
        return attributes

    def get_dashs_in_list(self, dashs_list):
        ids = [dash_dict.get('id') for dash_dict in dashs_list]
        objs = db.session.query(Dashboard) \
            .filter(Dashboard.id.in_(ids)).all()
        if len(ids) != len(objs):
            msg = _("Error parameter ids: {ids}, queried {num} dashboard(s)")\
                .format(ids=ids, num=len(objs))
            self.handle_exception(404, Exception, msg)
        return objs

    def pre_update(self, obj):
        # check_ownership(obj)
        self.check_column_values(obj)

    def post_update(self, obj):
        Log.log_update(obj, 'slice', get_user_id())

    def pre_delete(self, obj):
        check_ownership(obj)

    def post_delete(self, obj):
        db.session.query(FavStar) \
            .filter(FavStar.class_name.ilike('slice'),
                    FavStar.obj_id == obj.id) \
            .delete(synchronize_session=False)
        db.session.commit()
        Log.log_delete(obj, 'slice', get_user_id())

    @staticmethod
    def check_column_values(obj):
        if not obj.slice_name:
            raise SupersetException(NONE_SLICE_NAME)

    @catch_exception
    @expose("/online_info/<id>/", methods=['GET'])
    def online_info(self, id):
        objects = self.online_affect_objects(id)
        info = _("Releasing slice {slice} will release these too: "
                 "\nDataset: {dataset}, \nConnection: {conn}, "
                 "\nand make it invisible in these dashboards: {dashboard}")\
            .format(slice=objects.get('slice'),
                    dataset=objects.get('dataset'),
                    conn=objects.get('connection'),
                    dashboard=objects.get('dashboard'),
                    )
        return json_response(data=info)

    def online_affect_objects(self, id):
        """
        Changing slice to online will make offline dataset and connections online,
        and make it usable in others' dashboard.
        Changing slice to offline will make it unusable in others' dashboard.
        """
        slice = self.get_object(id)
        user_id = get_user_id()
        dashboards = [d for d in slice.dashboards
                      if d.online is True and d.created_by_fk != user_id]
        dataset = None
        if slice.datasource_id and slice.datasource:
            dataset = slice.datasource

        conns = []
        if slice.database_id:
            database = db.session.query(Database) \
                .filter(Database.id == slice.database_id).first()
            if database and database.online is False:
                conns.append(database)
        if dataset and dataset.database:
            conns.append(dataset.database)
        if dataset and dataset.hdfs_table and dataset.hdfs_table.hdfs_connection:
            conns.append(dataset.hdfs_table.hdfs_connection)
        connections = [c for c in set(conns) if c.online is False]
        return {'slice': [slice, ],
                'dashboard': dashboards,
                'dataset': [dataset, ] if dataset else [],
                'connection': connections}

    @catch_exception
    @expose("/offline_info/<id>/", methods=['GET'])
    def offline_info(self, id):
        slice = self.get_object(id)
        user_id = get_user_id()
        dashboards = [d for d in slice.dashboards
                      if d.online is True and d.created_by_fk != user_id]
        info = _("Changing slice {slice} to offline will make it invisible "
                 "in these dashboards: {dashboard}")\
            .format(slice=[slice, ], dashboard=dashboards)
        return json_response(data=info)

    @catch_exception
    @expose("/delete_info/<id>/", methods=['GET'])
    def delete_info(self, id):
        objects = self.delete_affect_objects([id, ])
        info = _("Deleting slice {slice} will remove from these "
                 "dashboards too: {dashboard}")\
            .format(slice=objects.get('slice'), dashboard=objects.get('dashboard'))
        return json_response(data=info)

    @catch_exception
    @expose("/muldelete_info/", methods=['POST'])
    def muldelete_info(self):
        json_data = self.get_request_data()
        ids = json_data.get('selectedRowKeys')
        objects = self.delete_affect_objects(ids)
        info = _("Deleting slice {slice} will remove from these "
                 "dashboards too: {dashboard}") \
            .format(slice=objects.get('slice'), dashboard=objects.get('dashboard'))
        return json_response(data=info)

    def delete_affect_objects(self, ids):
        """
        Deleting slice will remove if from myself and online dashboards.
        """
        slices = db.session.query(Slice).filter(Slice.id.in_(ids)).all()
        if len(slices) != len(ids):
            raise SupersetException(
                _('Error parameter ids: {ids}, queried {num} slice(s)')
                .format(ids=ids, num=len(slices))
            )
        dashs = []
        user_id = get_user_id()
        for s in slices:
            for d in s.dashboards:
                if d.created_by_fk == user_id or d.online == 1:
                    dashs.append(d)
        return {'slice': slices, 'dashboard': dashs}

    @expose('/add/', methods=['GET', 'POST'])
    def add(self):
        dataset = (
            db.session.query(Dataset)
            .filter(
                or_(Dataset.created_by_fk == get_user_id(),
                    Dataset.online == 1))
            .order_by(Dataset.id)
            .first()
        )
        if dataset:
            redirect_url = dataset.explore_url
        else:
            redirect_url = '/p/explore/table/0/?datasource_id=datasource_type=table'
        return redirect(redirect_url)

    def get_object_list_data(self, **kwargs):
        """ Return the slices with column 'favorite' and 'online' """
        user_id = kwargs.get('user_id')
        order_column = kwargs.get('order_column')
        order_direction = kwargs.get('order_direction')
        page = kwargs.get('page')
        page_size = kwargs.get('page_size')
        filter = kwargs.get('filter')
        only_favorite = kwargs.get('only_favorite')

        query = self.query_own_or_online('slice', user_id, only_favorite)
        if filter:
            filter_str = '%{}%'.format(filter.lower())
            query = query.filter(
                or_(
                    Slice.slice_name.ilike(filter_str),
                    Slice.description.ilike(filter_str),
                    Slice.viz_type.ilike(filter_str),
                    Slice.datasource_name.ilike(filter_str),
                    User.username.ilike(filter_str)
                )
            )
        count = query.count()

        if order_column:
            try:
                column = self.str_to_column.get(order_column)
            except KeyError:
                msg = 'Error order column name: \'{}\''.format(order_column)
                self.handle_exception(404, KeyError, msg)
            else:
                if order_direction == 'desc':
                    query = query.order_by(column.desc())
                else:
                    query = query.order_by(column)

        if page is not None and page >= 0 and page_size and page_size > 0:
            query = query.limit(page_size).offset(page * page_size)

        rs = query.all()
        data = []
        for obj, username, fav_id in rs:
            line = {}
            for col in self.list_columns:
                if col in self.str_columns:
                    line[col] = str(getattr(obj, col, None))
                else:
                    line[col] = getattr(obj, col, None)

            viz_type = line.get('viz_type', None)
            line['viz_type'] = str(_(viz_type)) if viz_type else viz_type
            if obj.database_id and obj.full_table_name:
                line['datasource'] = obj.full_table_name
                line['explore_url'] = obj.source_table_url
            elif obj.datasource_id and obj.datasource:
                line['datasource'] = str(obj.datasource)
                line['explore_url'] = obj.datasource.explore_url
            else:
                line['datasource'] = None
                line['explore_url'] = None
            line['created_by_user'] = username
            line['favorite'] = True if fav_id else False
            data.append(line)

        response = {}
        response['count'] = count
        response['order_column'] = order_column
        response['order_direction'] = 'desc' if order_direction == 'desc' else 'asc'
        response['page'] = page
        response['page_size'] = page_size
        response['only_favorite'] = only_favorite
        response['data'] = data
        return response


class DashboardModelView(SupersetModelView):  # noqa
    model = Dashboard
    datamodel = SQLAInterface(Dashboard)
    route_base = '/dashboard'
    list_columns = ['id', 'dashboard_title', 'url', 'description',
                    'online',  'changed_on']
    edit_columns = ['dashboard_title', 'description']
    show_columns = ['id', 'dashboard_title', 'description', 'table_names']
    add_columns = edit_columns
    base_order = ('changed_on', 'desc')
    description_columns = {}
    list_template = "superset/partials/dashboard/dashboard.html"

    str_to_column = {
        'title': Dashboard.dashboard_title,
        'description': Dashboard.description,
        'changed_on': Dashboard.changed_on,
        'owner': User.username,
        'created_by_user': User.username
    }
    int_columns = ['id', 'created_by_fk', 'changed_by_fk']
    bool_columns = ['online']
    str_columns = ['created_on', 'changed_on']

    def get_addable_choices(self):
        data = super().get_addable_choices()
        slices = self.get_available_slices(get_user_id())
        data['available_slices'] = self.slices_to_dict(slices)
        return data

    def pre_add(self, obj):
        self.check_column_values(obj)
        utils.validate_json(obj.json_metadata)
        utils.validate_json(obj.position_json)

    def post_add(self, obj):
        Log.log_add(obj, 'dashboard', get_user_id())

    def pre_update(self, obj):
        # check_ownership(obj)
        self.pre_add(obj)

    def post_update(self, obj):
        Log.log_update(obj, 'dashboard', get_user_id())

    def pre_delete(self, obj):
        check_ownership(obj)

    def post_delete(self, obj):
        db.session.query(FavStar) \
            .filter(FavStar.class_name.ilike('dashboard'),
                    FavStar.obj_id == obj.id) \
            .delete(synchronize_session=False)
        db.session.commit()
        Log.log_delete(obj, 'dashboard', get_user_id())

    @staticmethod
    def check_column_values(obj):
        if not obj.dashboard_title:
            raise SupersetException(NONE_DASHBOARD_NAME)

    def get_object_list_data(self, **kwargs):
        """Return the dashbaords with column 'favorite' and 'online'"""
        user_id = kwargs.get('user_id')
        order_column = kwargs.get('order_column')
        order_direction = kwargs.get('order_direction')
        page = kwargs.get('page')
        page_size = kwargs.get('page_size')
        filter = kwargs.get('filter')
        only_favorite = kwargs.get('only_favorite')

        query = self.query_own_or_online('dashboard', user_id, only_favorite)
        if filter:
            filter_str = '%{}%'.format(filter.lower())
            query = query.filter(
                or_(
                    Dashboard.dashboard_title.ilike(filter_str),
                    Dashboard.description.ilike(filter_str),
                    #str(Slice.changed_on).contains(filter_str),
                    User.username.ilike(filter_str)
                )
            )
        count = query.count()

        if order_column:
            try:
                column = self.str_to_column.get(order_column)
            except KeyError:
                msg = _('Error order column name: [{name}]').format(name=order_column)
                self.handle_exception(404, KeyError, msg)
            else:
                if order_direction == 'desc':
                    query = query.order_by(column.desc())
                else:
                    query = query.order_by(column)

        if page is not None and page >= 0 and page_size and page_size > 0:
            query = query.limit(page_size).offset(page * page_size)

        rs = query.all()
        data = []
        for obj, username, fav_id in rs:
            line = {}
            for col in self.list_columns:
                if col in self.str_columns:
                    line[col] = str(getattr(obj, col, None))
                else:
                    line[col] = getattr(obj, col, None)
            line['created_by_user'] = username
            line['favorite'] = True if fav_id else False
            data.append(line)

        response = {}
        response['count'] = count
        response['order_column'] = order_column
        response['order_direction'] = 'desc' if order_direction == 'desc' else 'asc'
        response['page'] = page
        response['page_size'] = page_size
        response['only_favorite'] = only_favorite
        response['data'] = data
        return response

    def get_show_attributes(self, obj, user_id=None):
        attributes = super().get_show_attributes(obj)
        attributes['slices'] = self.slices_to_dict(obj.slices)
        available_slices = self.get_available_slices(user_id)
        attributes['available_slices'] = self.slices_to_dict(available_slices)
        return attributes

    def get_add_attributes(self, data, user_id):
        attributes = super().get_add_attributes(data, user_id)
        attributes['slices'] = self.get_slices_in_list(data.get('slices'))
        return attributes

    def get_edit_attributes(self, data, user_id):
        attributes = super().get_edit_attributes(data, user_id)
        attributes['slices'] = self.get_slices_in_list(data.get('slices'))
        return attributes

    def get_slices_in_list(self, slices_list):
        ids = [slice_dict.get('id') for slice_dict in slices_list]
        objs = db.session.query(Slice) \
            .filter(Slice.id.in_(ids)).all()
        if len(ids) != len(objs):
            msg = _("Error parameter ids: {ids}, queried {num} slice(s)")\
                .format(ids=ids, num=len(objs))
            self.handle_exception(404, Exception, msg)
        return objs

    @catch_exception
    @expose("/online_info/<id>/", methods=['GET'])
    def online_info(self, id):
        """
        Changing dashboard to online will make myself slices,_datasets and
        connections online.
        """
        dashboard = db.session.query(Dashboard).filter_by(id=id).first()
        if not dashboard:
            raise SupersetException(
                _("Error parameter ids: {ids}, queried {num} dashboard(s)")
                .format(ids=[id, ], num=0)
            )
        slices = dashboard.slices
        datasets = []
        database_ids = []
        for s in slices:
            if s.datasource_id and s.datasource:
                datasets.append(s.datasource)
            elif s.database_id:
                database_ids.append(s.database_id)

        connections = []
        for d in datasets:
            if d.database:
                connections.append(d.database)
            if d.hdfs_table and d.hdfs_table.hdfs_connection:
                connections.append(d.hdfs_table.hdfs_connection)
        databases = db.session.query(Database)\
            .filter(Database.id.in_(database_ids))\
            .all()
        connections.extend(databases)

        user_id = get_user_id()
        offline_slices = [s for s in slices
                          if s.online is False and s.created_by_fk == user_id]
        offline_datasets = [d for d in datasets
                            if d.online is False and d.created_by_fk == user_id]
        offline_connections = [c for c in connections
                               if c.online is False and c.created_by_fk == user_id]

        info = _("Releasing dashboard {dashboard} will release these too: "
                 "\nSlice: {slice}, \nDataset: {dataset}, \nConnection: {connection}")\
            .format(dashboard=[dashboard, ],
                    slice=offline_slices,
                    dataset=offline_datasets,
                    connection=offline_connections)
        return json_response(data=info)

    @catch_exception
    @expose("/offline_info/<id>/", methods=['GET'])
    def offline_info(self, id):
        dash = self.get_object(id)
        user_id = get_user_id()
        stories = [story for story in dash.stories
                   if story.online is True and story.created_by_fk != user_id]
        info = _("Changing dashboard {dashboard} to offline will make it invisible "
                 "in these stories: {story}") \
            .format(dashboard=[dash, ], story=stories)
        return json_response(data=info)

    @catch_exception
    @expose("/delete_info/<id>/", methods=['GET'])
    def delete_info(self, id):
        objects = self.delete_affect_objects([id, ])
        info = _("Deleting dashboard {dashboard} will remove from these "
                 "stories too: {story}") \
            .format(dashboard=objects.get('dashboard'), story=objects.get('story'))
        return json_response(data=info)

    @catch_exception
    @expose("/muldelete_info/", methods=['POST'])
    def muldelete_info(self):
        json_data = self.get_request_data()
        ids = json_data.get('selectedRowKeys')
        objects = self.delete_affect_objects(ids)
        info = _("Deleting dashboard {dashboard} will remove from these "
                 "stories too: {story}") \
            .format(dashboard=objects.get('dashboard'), story=objects.get('story'))
        return json_response(data=info)

    @staticmethod
    def delete_affect_objects(ids):
        """Deleting dashboard will remove if from myself and online stories.
        """
        dashs = db.session.query(Dashboard).filter(Dashboard.id.in_(ids)).all()
        if len(dashs) != len(ids):
            raise SupersetException(
                _('Error parameter ids: {ids}, queried {num} dashboard(s)')
                .format(ids=ids, num=len(dashs))
            )
        stories = []
        user_id = get_user_id()
        for dash in dashs:
            for story in dash.stories:
                if story.created_by_fk == user_id or story.online == 1:
                    stories.append(story)
        return {'dashboard': dashs, 'story': stories}

    @catch_exception
    @expose("/import/", methods=['GET', 'POST'])
    def import_dashboards(self):
        """Overrides the dashboards using pickled instances from the file."""
        f = request.data
        if request.method == 'POST' and f:
            current_tt = int(time.time())
            data = pickle.loads(f)
            for table in data['datasources']:
                if table.type == 'table':
                    Dataset.import_obj(table, import_time=current_tt)
                else:
                    pass
            db.session.commit()
            for dashboard in data['dashboards']:
                Dashboard.import_obj(
                    dashboard, import_time=current_tt)
                Log.log('import', dashboard, 'dashboard', get_user_id())
            db.session.commit()
        return redirect('/dashboard/list/')

    @catch_exception
    @expose("/export/")
    def export_dashboards(self):
        ids = request.args.getlist('id')
        return Response(
            Dashboard.export_dashboards(ids),
            headers=generate_download_headers("pickle"),
            mimetype="application/text")

    @staticmethod
    def add_slices_api(dashboard_id, slice_ids):
        """Add and save slices to a dashboard"""
        session = db.session()
        dash = session.query(Dashboard).filter_by(id=dashboard_id).first()
        check_ownership(dash, raise_if_false=True)
        new_slices = session.query(Slice).filter(
            Slice.id.in_(slice_ids))
        dash.slices += new_slices
        session.merge(dash)
        session.commit()
        session.close()
        return True


class Superset(BaseSupersetView):
    route_base = '/p'

    def get_viz(self, slice_id=None, args=None,
                datasource_type=None, datasource_id=None,
                database_id=None, full_tb_name=None):
        if slice_id:
            slc = db.session.query(Slice).filter_by(id=slice_id).one()
            return slc.get_viz()
        else:
            viz_type = args.get('viz_type', 'table')
            if database_id and full_tb_name:
                datasource = Dataset.temp_dataset(database_id, full_tb_name)
            else:
                datasource = SourceRegistry.get_datasource(
                    datasource_type, datasource_id, db.session)
            if not datasource.database:
                raise SupersetException('Missing connection for dataset: [{}]'.format(datasource))
            viz_obj = viz.viz_types[viz_type](
                datasource, request.args if request.args else args)
            return viz_obj

    @catch_exception
    @expose("/release/<model>/<action>/<id>/", methods=['GET'])
    def release_object(self, model, action, id):
        """model: dashboard, slice, dataset, database, hdfsconnection
           action: online, offline
           """
        cls = str_to_model.get(model)
        obj = db.session.query(cls).filter_by(id=id).first()
        if not obj:
            msg = _("Not found the object: model={model}, id={id}")\
                .format(model=cls.__name__, id=id)
            logging.error(msg)
            return json_response(status=400, message=msg)
        check_ownership(obj, raise_if_false=True)

        if action.lower() == 'online':
            if obj.online is True:
                return json_response(message=OBJECT_IS_ONLINE)
            else:
                self.release_relations(obj, model, get_user_id())
                return json_response(message=ONLINE_SUCCESS)
        elif action.lower() == 'offline':
            if obj.online is False:
                return json_response(message=OBJECT_IS_OFFLINE)
            else:
                obj.online = False
                db.session.commit()
                Log.log_offline(obj, model, get_user_id())
                return json_response(message=OFFLINE_SUCCESS)
        else:
            msg = _('Error request url: [{url}]').format(url=request.url)
            return json_response(status=400, message=msg)

    @classmethod
    def release_relations(cls, obj, model, user_id):
        if str(obj.created_by_fk) == str(user_id) and obj.online is False:
            obj.online = True
            db.session.commit()
            Log.log_online(obj, model, user_id)
        if model == 'story':
            for dash in obj.dashboards:
                cls.release_relations(dash, 'dashboard', user_id)
        if model == 'dashboard':
            for slice in obj.slices:
                cls.release_relations(slice, 'slice', user_id)
        elif model == 'slice':
            if obj.datasource_id and obj.datasource:
                cls.release_relations(obj.datasource, 'dataset', user_id)
            elif obj.database_id:
                database = db.session.query(Database).filter_by(id=obj.database_id).first()
                if database and database.online is False:
                    cls.release_relations(database, 'database', user_id)
        elif model == 'dataset':
            if obj.database:
                cls.release_relations(obj.database, 'database', user_id)
            if obj.hdfs_table and obj.hdfs_table.hdfs_connection:
                cls.release_relations(obj.hdfs_table.hdfs_connection, 'hdfsconnection', user_id)

    @catch_exception
    @expose("/slice/<slice_id>/")
    def slice(self, slice_id):
        viz_obj = self.get_viz(slice_id)
        return redirect(viz_obj.get_url(**request.args))

    @catch_exception
    @expose("/explore_json/<datasource_type>/<datasource_id>/")
    def explore_json(self, datasource_type, datasource_id):
        """render the chart of slice"""
        database_id = request.args.get('database_id')
        full_tb_name = request.args.get('full_tb_name')
        slice_id = request.args.get('slice_id')
        try:
            viz_obj = self.get_viz(
                datasource_type=datasource_type,
                datasource_id=datasource_id,
                database_id=database_id,
                full_tb_name=full_tb_name,
                args=request.args)
            Slice.check_online(slice_id)
            Dataset.check_online(viz_obj.datasource)
        except Exception as e:
            logging.exception(e)
            return Response(utils.error_msg_from_exception(e), status=500)

        payload = {}
        status = 200
        try:
            payload = viz_obj.get_payload()
        except Exception as e:
            logging.exception(e)
            return Response(utils.error_msg_from_exception(e), status=500)

        if payload.get('status') == QueryStatus.FAILED:
            status = 500

        return Response(
            viz_obj.json_dumps(payload),
            status=status,
            mimetype="application/json")

    @catch_exception
    @expose("/explore/<datasource_type>/<datasource_id>/")
    def explore(self, datasource_type, datasource_id):
        """render the parameters of slice"""
        viz_type = request.args.get("viz_type")
        slice_id = request.args.get('slice_id')
        database_id = request.args.get('database_id')
        full_tb_name = request.args.get('full_tb_name')
        user_id = get_user_id()

        slc = None
        if slice_id:
            slc = db.session.query(Slice).filter_by(id=slice_id).first()

        datasources = db.session.query(Dataset) \
            .filter(
                or_(Dataset.created_by_fk == user_id,
                    Dataset.online == 1)
            ).all()
        datasources = sorted(datasources, key=lambda ds: ds.full_name)
        databases = db.session.query(Database) \
            .filter(
                or_(Database.created_by_fk == user_id,
                    Database.online == 1)
            ).all()
        databases = sorted(databases, key=lambda d: d.name)
        viz_obj = None
        try:
            viz_obj = self.get_viz(
                datasource_type=datasource_type,
                datasource_id=datasource_id,
                database_id=database_id,
                full_tb_name=full_tb_name,
                args=request.args)
        except Exception as e:
            flash('{}'.format(e), "alert")

        # slc perms
        slice_add_perm = True
        slice_edit_perm = check_ownership(slc, raise_if_false=False)
        slice_download_perm = True

        # handle save or overwrite
        action = request.args.get('action')
        if action in ('saveas', 'overwrite'):
            return self.save_or_overwrite_slice(
                request.args, slc, slice_add_perm, slice_edit_perm)

        # find out if user is in explore v2 beta group
        # and set flag `is_in_explore_v2_beta`
        #is_in_explore_v2_beta = sm.find_role('explore-v2-beta') in get_user_roles()
        is_in_explore_v2_beta = False

        # handle different endpoints
        if request.args.get("csv") == "true":
            payload = viz_obj.get_csv()
            return Response(
                payload,
                status=200,
                headers=generate_download_headers("csv"),
                mimetype="application/csv")
        elif request.args.get("standalone") == "true":
            return self.render_template("superset/standalone.html", viz=viz_obj, standalone_mode=True)
        elif request.args.get("V2") == "true" or is_in_explore_v2_beta:
            # bootstrap data for explore V2
            bootstrap_data = {
                "can_add": slice_add_perm,
                "can_download": slice_download_perm,
                "can_edit": slice_edit_perm,
                # TODO: separate endpoint for fetching datasources
                "datasources": [(d.id, d.full_name) for d in datasources],
                "datasource_id": datasource_id,
                "datasource_name": viz_obj.datasource.name,
                "datasource_type": datasource_type,
                "user_id": user_id,
                "viz": json.loads(viz_obj.json_data),
                "filter_select": viz_obj.datasource.filter_select_enabled
            }
            table_name = viz_obj.datasource.table_name \
                if datasource_type == 'table' \
                else viz_obj.datasource.datasource_name
            return self.render_template(
                "superset/explorev2.html",
                bootstrap_data=json.dumps(bootstrap_data),
                slice=slc,
                table_name=table_name)
        else:
            return self.render_template(
                "superset/explore.html",
                viz=viz_obj,
                slice=slc,
                datasources=datasources,
                databases=databases,
                can_add=slice_add_perm,
                can_edit=slice_edit_perm,
                can_download=slice_download_perm,
                userid=user_id
            )

    @catch_exception
    @expose("/filter/<datasource_type>/<datasource_id>/<column>/")
    def filter(self, datasource_type, datasource_id, column):
        """
        Endpoint to retrieve values for specified column.

        :param datasource_type: Type of datasource e.g. table
        :param datasource_id: Datasource id
        :param column: Column name to retrieve values for
        :return:
        """
        # TODO: Cache endpoint by user, datasource and column
        error_redirect = '/slice/list/'
        datasource_class = Dataset

        datasource = db.session.query(
            datasource_class).filter_by(id=datasource_id).first()

        if not datasource:
            flash(DATASOURCE_MISSING_ERR, "alert")
            return json_error_response(DATASOURCE_MISSING_ERR)
        if not self.datasource_access(datasource):
            flash(get_datasource_access_error_msg(datasource.name), "danger")
            return json_error_response(DATASOURCE_ACCESS_ERR)

        viz_type = request.args.get("viz_type")
        if not viz_type and datasource.default_endpoint:
            return redirect(datasource.default_endpoint)
        if not viz_type:
            viz_type = "table"
        try:
            obj = viz.viz_types[viz_type](
                datasource,
                form_data=request.args,
                slice_=None)
        except Exception as e:
            flash(str(e), "danger")
            return redirect(error_redirect)
        status = 200
        payload = obj.get_values_for_column(column)
        return Response(
            payload,
            status=status,
            mimetype="application/json")

    def save_or_overwrite_slice(
            self, args, slc, slice_add_perm, slice_edit_perm):
        """Save or overwrite a slice"""
        slice_name = args.get('slice_name')
        action = args.get('action')

        # TODO use form processing form wtforms
        d = args.to_dict(flat=False)
        del d['action']
        if 'previous_viz_type' in d:
            del d['previous_viz_type']

        as_list = ('metrics', 'groupby', 'columns', 'all_columns',
                   'mapbox_label', 'order_by_cols')
        for k in d:
            v = d.get(k)
            if k in as_list and not isinstance(v, list):
                d[k] = [v] if v else []
            if k not in as_list and isinstance(v, list):
                d[k] = v[0]

        datasource_type = args.get('datasource_type')
        datasource_id = args.get('datasource_id')
        database_id = args.get('database_id')
        full_tb_name = args.get('full_tb_name')
        if database_id and full_tb_name:
            datasource_id = None

        if action in ('saveas'):
            d.pop('slice_id')  # don't save old slice_id
            slc = Slice()

        slc.params = json.dumps(d, indent=4, sort_keys=True)
        slc.datasource_name = args.get('datasource_name')
        slc.viz_type = args.get('viz_type')
        slc.datasource_type = datasource_type
        slc.datasource_id = datasource_id if datasource_id else None
        slc.slice_name = slice_name or slc.slice_name
        slc.database_id = database_id if database_id else None
        slc.full_table_name = full_tb_name
        SliceModelView.check_column_values(slc)

        if action in ('saveas') and slice_add_perm:
            self.save_slice(slc)
        elif action == 'overwrite' and slice_edit_perm:
            self.overwrite_slice(slc)

        # Adding slice to a dashboard if requested
        dash = None
        if request.args.get('add_to_dash') == 'existing':
            dash = (
                db.session.query(Dashboard)
                    .filter_by(id=int(request.args.get('save_to_dashboard_id')))
                    .one()
            )
            if dash and slc not in dash.slices:
                dash.slices.append(slc)
                db.session.commit()
                Log.log_update(dash, 'dashboard', get_user_id())
            flash(
                _("Slice [{slice}] was added to dashboard [{dashboard}]").format(
                    slice=slc.slice_name,
                    dashboard=dash.dashboard_title),
                "info")
        elif request.args.get('add_to_dash') == 'new':
            dash = Dashboard(dashboard_title=request.args.get('new_dashboard_name'))
            flash(
                _("Dashboard [{dashboard}] just got created and slice [{slice}] "
                "was added to it").format(
                    dashboard=dash.dashboard_title,
                    slice=slc.slice_name),
                "info")
            if dash and slc not in dash.slices:
                dash.slices.append(slc)
                db.session.add(dash)
                db.session.commit()
                Log.log_add(dash, 'dashboard', get_user_id())

        if request.args.get('goto_dash') == 'true':
            if request.args.get('V2') == 'true':
                return dash.url
            return redirect(dash.url)
        else:
            if request.args.get('V2') == 'true':
                return slc.slice_url
            return redirect(slc.slice_url)

    def save_slice(self, slc):
        db.session.expunge_all()
        db.session.add(slc)
        db.session.commit()
        flash(_("Slice [{slice}] has been saved").format(slice=slc.slice_name), "info")
        Log.log_add(slc, 'slice', get_user_id())

    def overwrite_slice(self, slc):
        can_update = check_ownership(slc, raise_if_false=False)
        if not can_update:
            flash(_("You cannot overwrite [{slice}]").format(slice=slc), "danger")
        else:
            db.session.expunge_all()
            db.session.merge(slc)
            db.session.commit()
            flash(_("Slice [{slice}] has been overwritten")
                  .format(slice=slc.slice_name),
                  "info")
            Log.log_update(slc, 'slice', get_user_id())

    @catch_exception
    @expose("/checkbox/<model_view>/<id_>/<attr>/<value>/", methods=['GET'])
    def checkbox(self, model_view, id_, attr, value):
        """endpoint for checking/unchecking any boolean in a sqla model"""
        views = sys.modules[__name__]
        model_view_cls = getattr(views, model_view)
        model = model_view_cls.datamodel.obj

        obj = db.session.query(model).filter_by(id=id_).first()
        if obj:
            setattr(obj, attr, value == 'true')
            db.session.commit()
        return Response("OK", mimetype="application/json")

    @catch_exception
    @expose("/all_tables/<db_id>/")
    def all_tables(self, db_id):
        """Endpoint that returns all tables and views from the database"""
        database = db.session.query(Database).filter_by(id=db_id).one()
        all_tables = []
        all_views = []
        schemas = database.all_schema_names()
        for schema in schemas:
            all_tables.extend(database.all_table_names(schema=schema))
            all_views.extend(database.all_view_names(schema=schema))
        if not schemas:
            all_tables.extend(database.all_table_names())
            all_views.extend(database.all_view_names())

        return Response(
            json.dumps({"tables": all_tables, "views": all_views}),
            mimetype="application/json")

    @catch_exception
    @expose("/tables/<db_id>/<schema>/")
    def tables(self, db_id, schema):
        """endpoint to power the calendar heatmap on the welcome page"""
        schema = None if schema in ('null', 'undefined') else schema
        database = db.session.query(Database).filter_by(id=db_id).one()
        tables = [t for t in database.all_table_names(schema) if
                  self.datasource_access_by_name(database, t, schema=schema)]
        views = [v for v in database.all_table_names(schema) if
                 self.datasource_access_by_name(database, v, schema=schema)]
        payload = {'tables': tables, 'views': views}
        return Response(
            json.dumps(payload), mimetype="application/json")

    @catch_exception
    @expose("/copy_dash/<dashboard_id>/", methods=['GET', 'POST'])
    def copy_dash(self, dashboard_id):
        """Copy dashboard"""
        session = db.session()
        data = json.loads(request.form.get('data'))
        dash = Dashboard()
        original_dash = session.query(Dashboard).filter_by(id=dashboard_id).first()
        dash.dashboard_title = data['dashboard_title']
        dash.slices = original_dash.slices
        dash.params = original_dash.params

        self._set_dash_metadata(dash, data)
        session.add(dash)
        session.commit()
        dash_json = dash.json_data
        Log.log_add(dash, 'dashboard', get_user_id())
        return Response(
            dash_json, mimetype="application/json")

    @catch_exception
    @expose("/save_dash/<dashboard_id>/", methods=['GET', 'POST'])
    def save_dash(self, dashboard_id):
        """Save a dashboard's metadata"""
        session = db.session()
        dash = session.query(Dashboard).filter_by(id=dashboard_id).first()
        # check_ownership(dash, raise_if_false=True)
        data = json.loads(request.form.get('data'))
        self._set_dash_metadata(dash, data)
        session.merge(dash)
        session.commit()
        Log.log_update(dash, 'dashboard', get_user_id())
        return "SUCCESS"

    @staticmethod
    def _set_dash_metadata(dashboard, data):
        positions = data['positions']
        slice_ids = [int(d['slice_id']) for d in positions]
        dashboard.slices = [o for o in dashboard.slices if o.id in slice_ids]
        positions = sorted(data['positions'], key=lambda x: int(x['slice_id']))
        dashboard.position_json = json.dumps(positions, indent=4, sort_keys=True)
        md = dashboard.params_dict
        dashboard.css = data['css']

        if 'filter_immune_slices' not in md:
            md['filter_immune_slices'] = []
        if 'filter_immune_slice_fields' not in md:
            md['filter_immune_slice_fields'] = {}
        md['expanded_slices'] = data['expanded_slices']
        dashboard.json_metadata = json.dumps(md, indent=4)

    @catch_exception
    @expose("/add_slices/<dashboard_id>/", methods=['POST'])
    def add_slices(self, dashboard_id):
        """Add and save slices to a dashboard"""
        data = json.loads(request.form.get('data'))
        session = db.session()
        dash = session.query(Dashboard).filter_by(id=dashboard_id).first()
        # check_ownership(dash, raise_if_false=True)
        new_slices = session.query(Slice).filter(
            Slice.id.in_(data['slice_ids']))
        dash.slices += new_slices
        session.merge(dash)
        session.commit()
        session.close()
        return "SLICES ADDED"

    @catch_exception
    @connection_timeout
    @expose("/testconn", methods=["POST", "GET"])
    def testconn(self):
        """Tests a sqla connection"""
        args = json.loads(str(request.data, encoding='utf-8'))
        uri = args.get('sqlalchemy_uri')
        db_name = args.get('database_name')
        if db_name:
            database = (
                db.session.query(Database).filter_by(database_name=db_name).first()
            )
            if database and uri == database.safe_sqlalchemy_uri():
                uri = database.sqlalchemy_uri_decrypted
        connect_args = eval(args.get('args', {})).get('connect_args', {})
        connect_args = Database.args_append_keytab(connect_args)
        engine = create_engine(uri, connect_args=connect_args)
        engine.connect()
        return json_response(data=engine.table_names())

    @catch_exception
    @expose("/favstar/<class_name>/<obj_id>/<action>/")
    def favstar(self, class_name, obj_id, action):
        """Toggle favorite stars on Slices and Dashboard"""
        session = db.session()
        count = 0
        favs = (
            session.query(FavStar)
            .filter_by(class_name=class_name, obj_id=obj_id, user_id=g.user.get_id())
            .all()
        )
        # get obj name to make log readable
        obj = (
            session.query(str_to_model[class_name.lower()])
            .filter_by(id=obj_id)
            .one()
        )

        if action == 'select':
            if not favs:
                session.add(
                    FavStar(
                        class_name=class_name,
                        obj_id=obj_id,
                        user_id=g.user.get_id(),
                        dttm=datetime.now()
                    )
                )
            count = 1
            Log.log('like', obj, class_name.lower(), get_user_id())
        elif action == 'unselect':
            for fav in favs:
                session.delete(fav)
            Log.log('dislike', obj, class_name.lower(), get_user_id())
        else:
            count = len(favs)
        session.commit()
        return Response(
            json.dumps({'count': count}),
            mimetype="application/json")

    @catch_exception
    @expose('/if_online/<class_name>/<obj_id>')
    def if_online(self, class_name, obj_id):
        try:
            model = str_to_model.get(class_name.lower())
            if hasattr(model, 'online'):
                obj = db.session.query(model).filter_by(id=obj_id).first()
                return json.dumps({'online': obj.online})
            else:
                return json.dumps({'online': False})
        except Exception as e:
            return json_response(message=utils.error_msg_from_exception(e),
                                 status=500)

    @catch_exception
    @expose("/dashboard/<dashboard_id>/")
    def dashboard(self, dashboard_id):
        """Server side rendering for a dashboard"""
        session = db.session()
        qry = session.query(Dashboard)
        if dashboard_id.isdigit():
            qry = qry.filter_by(id=int(dashboard_id))
        else:
            qry = qry.filter_by(slug=dashboard_id)
        dash = qry.one()

        # Hack to log the dashboard_id properly, even when getting a slug
        def dashboard(**kwargs):  # noqa
            pass
        dashboard(dashboard_id=dash.id)
        dash_edit_perm = True
        dash_save_perm = dash_edit_perm
        standalone = request.args.get("standalone") == "true"
        context = dict(
            user_id=g.user.get_id(),
            dash_save_perm=dash_save_perm,
            dash_edit_perm=dash_edit_perm,
            standalone_mode=standalone,
        )
        return self.render_template(
            "superset/dashboard.html",
            dashboard=dash,
            context=json.dumps(context),
            standalone_mode=standalone,
        )

    @catch_exception
    @expose("/story/<story_id>/")
    def story(self, story_id):
        """Server side rendering for a story"""
        story = db.session.query(Story).filter_by(id=story_id).one()
        context = json.loads(story.order_json)

        user_id = g.user.get_id()
        dashs_dict = {}
        for dash in story.dashboards:
            dashs_dict[dash.id] = dash

        for one_dash_json in context:
            dash = dashs_dict.get(one_dash_json.get('dashboard_id'))
            if not dash:
                one_dash_json['dashboard_id'] = None
                one_dash_json['visible'] = False
                one_dash_json['url'] = None
            else:
                one_dash_json['url'] = dash.url
                if dash.created_by_fk != user_id and dash.online is False:
                    one_dash_json['visible'] = False
                else:
                    one_dash_json['visible'] = True

        return self.render_template(
            "superset/story.html",
            story=story,
            context=json.dumps(context),
        )

    @catch_exception
    @expose("/sqllab_viz/", methods=['POST'])
    def sqllab_viz(self):
        data = json.loads(request.form.get('data'))
        table_name = data.get('datasourceName')
        viz_type = data.get('chartType')
        table = (
            db.session.query(Dataset)
            .filter_by(dataset_name=table_name)
            .first()
        )
        if not table:
            table = Dataset(dataset_name=table_name)
        table.schema = data.get('schema')
        table.database_id = data.get('dbId')
        q = SupersetQuery(data.get('sql'))
        table.sql = q.stripped()
        db.session.add(table)
        db.session.commit()
        Log.log_add(table, 'dataset', get_user_id())

        cols = []
        dims = []
        metrics = []
        for column_name, config in data.get('columns').items():
            is_dim = config.get('is_dim', False)
            col = TableColumn(
                column_name=column_name,
                expression=column_name,
                filterable=is_dim,
                groupby=is_dim,
                is_dttm=config.get('is_date', False),
            )
            cols.append(col)
            if is_dim:
                dims.append(col)
            agg = config.get('agg')
            if agg:
                if agg == 'count_distinct':
                    metrics.append(SqlMetric(
                        metric_name="{agg}__{column_name}".format(**locals()),
                        expression="COUNT(DISTINCT {column_name})"
                            .format(**locals()),
                            ))
                else:
                    metrics.append(SqlMetric(
                        metric_name="{agg}__{column_name}".format(**locals()),
                        expression="{agg}({column_name})".format(**locals()),
                    ))
        if not metrics:
            metrics.append(SqlMetric(
                metric_name="count".format(**locals()),
                expression="count(*)".format(**locals()),
            ))
        table.ref_columns = cols
        table.ref_metrics = metrics
        db.session.commit()
        params = {
            'viz_type': viz_type,
            'groupby': dims[0].column_name if dims else None,
            'metrics': metrics[0].metric_name if metrics else None,
            'metric': metrics[0].metric_name if metrics else None,
            'since': '100 years ago',
            'limit': '0',
            'datasource_id': '{}'.format(table.id),
        }
        params = "&".join([k + '=' + v for k, v in params.items() if v])
        return '/p/explore/table/{table.id}/?{params}'.format(**locals())

    @catch_exception
    @expose("/table/<database_id>/<table_name>/<schema>/")
    def table(self, database_id, table_name, schema):
        schema = None if schema in ('null', 'undefined') else schema
        mydb = db.session.query(Database).filter_by(id=database_id).one()
        cols = []
        indexes = []
        t = mydb.get_columns(table_name, schema)
        try:
            t = mydb.get_columns(table_name, schema)
            indexes = mydb.get_indexes(table_name, schema)
            primary_key = mydb.get_pk_constraint(table_name, schema)
            foreign_keys = mydb.get_foreign_keys(table_name, schema)
        except Exception as e:
            return Response(
                json.dumps({'error': utils.error_msg_from_exception(e)}),
                mimetype="application/json")
        keys = []
        if primary_key and primary_key.get('constrained_columns'):
            primary_key['column_names'] = primary_key.pop('constrained_columns')
            primary_key['type'] = 'pk'
            keys += [primary_key]
        for fk in foreign_keys:
            fk['column_names'] = fk.pop('constrained_columns')
            fk['type'] = 'fk'
        keys += foreign_keys
        for idx in indexes:
            idx['type'] = 'index'
        keys += indexes

        for col in t:
            dtype = ""
            try:
                dtype = '{}'.format(col['type'])
            except:
                pass
            cols.append({
                'name': col['name'],
                'type': dtype.split('(')[0] if '(' in dtype else dtype,
                'longType': dtype,
                'keys': [
                    k for k in keys
                    if col['name'] in k.get('column_names')
                ],
            })
        tbl = {
            'name': table_name,
            'columns': cols,
            'selectStar': mydb.select_star(
                table_name, schema=schema, show_cols=True, indent=True),
            'primaryKey': primary_key,
            'foreignKeys': foreign_keys,
            'indexes': keys,
        }
        return Response(json.dumps(tbl), mimetype="application/json")

    @catch_exception
    @expose("/extra_table_metadata/<database_id>/<table_name>/<schema>/")
    def extra_table_metadata(self, database_id, table_name, schema):
        schema = None if schema in ('null', 'undefined') else schema
        mydb = db.session.query(Database).filter_by(id=database_id).one()
        payload = mydb.db_engine_spec.extra_table_metadata(
            mydb, table_name, schema)
        return Response(json.dumps(payload), mimetype="application/json")

    @catch_exception
    @expose("/select_star/<database_id>/<table_name>/")
    def select_star(self, database_id, table_name):
        mydb = db.session.query(Database).filter_by(id=database_id).first()
        quote = mydb.get_quoter()
        t = mydb.get_table(table_name)

        # Prevent exposing column fields to users that cannot access DB.
        if not self.datasource_access(t.perm):
            flash(get_datasource_access_error_msg(t.name), 'danger')
            return redirect("/table/list/")

        fields = ", ".join(
            [quote(c.name) for c in t.columns] or "*")
        s = "SELECT\n{}\nFROM {}".format(fields, table_name)
        return self.render_template(
            "superset/ajah.html",
            content=s
        )

    @expose("/theme/")
    def theme(self):
        return self.render_template('superset/theme.html')

    @catch_exception
    @expose("/cached_key/<key>/")
    def cached_key(self, key):
        """Returns a key from the cache"""
        resp = cache.get(key)
        if resp:
            return resp
        return "nope"

    @catch_exception
    @expose("/results/<key>/")
    def results(self, key):
        """Serves a key off of the results backend"""
        if not results_backend:
            return json_error_response("Results backend isn't configured")

        blob = results_backend.get(key)
        if blob:
            json_payload = zlib.decompress(blob)
            obj = json.loads(json_payload)
            db_id = obj['query']['dbId']
            mydb = db.session.query(Database).filter_by(id=db_id).one()

            if not self.database_access(mydb):
                return json_error_response(
                    get_database_access_error_msg(mydb.database_name))

            return Response(
                json_payload,
                status=200,
                mimetype="application/json")
        else:
            return Response(
                json.dumps({
                    'error': (
                        "Data could not be retrived. You may want to "
                        "re-run the query."
                    )
                }),
                status=410,
                mimetype="application/json")

    @catch_exception
    @expose("/sql_json/", methods=['POST', 'GET'])
    def sql_json(self):
        """Runs arbitrary sql and returns and json"""
        def table_accessible(database, full_table_name, schema_name=None):
            table_name_pieces = full_table_name.split(".")
            if len(table_name_pieces) == 2:
                table_schema = table_name_pieces[0]
                table_name = table_name_pieces[1]
            else:
                table_schema = schema_name
                table_name = table_name_pieces[0]
            return self.datasource_access_by_name(
                database, table_name, schema=table_schema)

        async = request.form.get('runAsync') == 'true'
        sql = request.form.get('sql')
        database_id = request.form.get('database_id')

        session = db.session()
        mydb = session.query(Database).filter_by(id=database_id).one()

        if not mydb:
            json_error_response(
                'Database with id {} is missing.'.format(database_id))

        superset_query = sql_parse.SupersetQuery(sql)
        schema = request.form.get('schema')
        schema = schema if schema else None

        # rejected_tables = [
        #     t for t in superset_query.tables if not
        #     table_accessible(mydb, t, schema_name=schema)]
        # if rejected_tables:
        #     return json_error_response(
        #         get_datasource_access_error_msg('{}'.format(rejected_tables)))
        session.commit()

        select_as_cta = request.form.get('select_as_cta') == 'true'
        tmp_table_name = request.form.get('tmp_table_name')
        if select_as_cta and mydb.force_ctas_schema:
            tmp_table_name = '{}.{}'.format(
                mydb.force_ctas_schema,
                tmp_table_name
            )

        query = Query(
            database_id=int(database_id),
            limit=int(app.config.get('SQL_MAX_ROW', None)),
            sql=sql,
            schema=schema,
            select_as_cta=request.form.get('select_as_cta') == 'true',
            start_time=utils.now_as_float(),
            tab_name=request.form.get('tab'),
            status=QueryStatus.PENDING if async else QueryStatus.RUNNING,
            sql_editor_id=request.form.get('sql_editor_id'),
            tmp_table_name=tmp_table_name,
            user_id=int(g.user.get_id()),
            client_id=request.form.get('client_id'),
        )
        session.add(query)
        session.commit()
        query_id = query.id

        # Async request.
        # if async:
        #     # Ignore the celery future object and the request may time out.
        #     sql_lab.get_sql_results.delay(
        #         query_id, return_results=False,
        #         store_results=not query.select_as_cta)
        #     return Response(
        #         json.dumps({'query': query.to_dict()},
        #                    default=utils.json_int_dttm_ser,
        #                    allow_nan=False),
        #         status=202,  # Accepted
        #         mimetype="application/json")

        # Sync request.
        try:
            SQLLAB_TIMEOUT = config.get("SQLLAB_TIMEOUT")
            with utils.timeout(
                    seconds=SQLLAB_TIMEOUT,
                    error_message=(
                            _("The query exceeded the {SQLLAB_TIMEOUT} seconds "
                            "timeout. You may want to run your query as a "
                            "`CREATE TABLE AS` to prevent timeouts.")
                    ).format(**locals())):
                data = sql_lab.get_sql_results(query_id, return_results=True)
        except Exception as e:
            logging.exception(e)
            return Response(
                json.dumps({'error': "{}".format(e)}),
                status=500,
                mimetype="application/json")
        return Response(
            data,
            status=200,
            mimetype="application/json")

    @catch_exception
    @expose("/csv/<client_id>/")
    def csv(self, client_id):
        """Download the query results as csv."""
        query = (
            db.session.query(Query)
            .filter_by(client_id=client_id)
            .one()
        )

        if not self.database_access(query.database):
            flash(get_database_access_error_msg(query.database.database_name))
            return redirect('/')

        sql = query.select_sql or query.sql
        df = query.database.get_df(sql, query.schema)
        # TODO(bkyryliuk): add compression=gzip for big files.
        csv = df.to_csv(index=False, encoding='utf-8')
        response = Response(csv, mimetype='text/csv')
        response.headers['Content-Disposition'] = (
            'attachment; filename={}.csv'.format(query.name))
        return response

    @catch_exception
    @expose("/fetch_datasource_metadata/")
    def fetch_datasource_metadata(self):
        datasource_type = request.args.get('datasource_type')
        datasource_class = SourceRegistry.sources[datasource_type]
        datasource = (
            db.session.query(datasource_class)
            .filter_by(id=request.args.get('datasource_id'))
            .first()
        )

        # Check if datasource exists
        if not datasource:
            return json_error_response(DATASOURCE_MISSING_ERR)

        # Check permission for datasource
        if not self.datasource_access(datasource):
            return json_error_response(DATASOURCE_ACCESS_ERR)

        return Response(
            json.dumps(datasource.data),
            mimetype="application/json"
        )

    @catch_exception
    @expose("/queries/<last_updated_ms>/")
    def queries(self, last_updated_ms):
        """Get the updated queries."""
        if not g.user.get_id():
            return Response(
                json.dumps({'error': "Please login to access the queries."}),
                status=403,
                mimetype="application/json")

        # Unix time, milliseconds.
        last_updated_ms_int = int(float(last_updated_ms)) if last_updated_ms else 0

        # UTC date time, same that is stored in the DB.
        last_updated_dt = utils.EPOCH + timedelta(seconds=last_updated_ms_int / 1000)

        sql_queries = (
            db.session.query(Query)
            .filter(
                Query.user_id == g.user.get_id(),
                Query.changed_on >= last_updated_dt,
                )
            .all()
        )
        dict_queries = {q.client_id: q.to_dict() for q in sql_queries}
        return Response(
            json.dumps(dict_queries, default=utils.json_int_dttm_ser),
            status=200,
            mimetype="application/json")

    @catch_exception
    @expose("/search_queries/")
    def search_queries(self):
        """Search for queries."""
        query = db.session.query(Query)
        search_user_id = request.args.get('user_id')
        database_id = request.args.get('database_id')
        search_text = request.args.get('search_text')
        status = request.args.get('status')
        # From and To time stamp should be Epoch timestamp in seconds
        from_time = request.args.get('from')
        to_time = request.args.get('to')

        if search_user_id:
            # Filter on db Id
            query = query.filter(Query.user_id == search_user_id)

        if database_id:
            # Filter on db Id
            query = query.filter(Query.database_id == database_id)

        if status:
            # Filter on status
            query = query.filter(Query.status == status)

        if search_text:
            # Filter on search text
            query = query \
                .filter(Query.sql.like('%{}%'.format(search_text)))

        if from_time:
            query = query.filter(Query.start_time > int(from_time))

        if to_time:
            query = query.filter(Query.start_time < int(to_time))

        query_limit = config.get('QUERY_SEARCH_LIMIT', 1000)
        sql_queries = (
            query.order_by(Query.start_time.asc())
            .limit(query_limit)
            .all()
        )

        dict_queries = [q.to_dict() for q in sql_queries]

        return Response(
            json.dumps(dict_queries, default=utils.json_int_dttm_ser),
            status=200,
            mimetype="application/json")

    @app.errorhandler(500)
    def show_traceback(self):
        return render_template(
            'superset/traceback.html',
            error_msg=get_error_msg(),
        ), 500

    @catch_exception
    @expose("/sqllab/")
    def sqllab(self):
        """SQL Editor"""
        d = {
            'defaultDbId': config.get('SQLLAB_DEFAULT_DBID'),
        }
        return self.render_template(
            'superset/sqllab.html',
            bootstrap_data=json.dumps(d, default=utils.json_iso_dttm_ser)
        )
