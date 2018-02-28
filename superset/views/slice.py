from flask import g, redirect
from flask_babel import lazy_gettext as _
from flask_appbuilder import expose
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_appbuilder.security.sqla.models import User

from superset import app, db, utils
from superset.exception import ParameterException, PropertyException, GuardianException
from superset.models import Database, Dataset, Slice, Dashboard, FavStar
from superset.message import *
from superset.viz import viz_verbose_names
from .base import (
    SupersetModelView, PermissionManagement, catch_exception, json_response
)


config = app.config
QueryStatus = utils.QueryStatus


class SliceModelView(SupersetModelView, PermissionManagement):
    model = Slice
    model_type = model.model_type
    datamodel = SQLAInterface(Slice)
    route_base = '/slice'
    can_add = False
    list_columns = ['id', 'slice_name', 'description', 'slice_url', 'viz_type',
                    'changed_on']
    edit_columns = ['slice_name', 'description']
    show_columns = ['id', 'slice_name', 'description', 'created_on', 'changed_on']

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

    def get_show_attributes(self, obj, user_id=None):
        attributes = super(SliceModelView, self).get_show_attributes(obj, user_id)
        attributes['dashboards'] = self.dashboards_to_dict(obj.dashboards)
        return attributes

    def get_edit_attributes(self, data, user_id):
        attributes = super(SliceModelView, self).get_edit_attributes(data, user_id)
        attributes['dashboards'] = self.get_dashs_in_list(data.get('dashboards'))
        return attributes

    def get_dashs_in_list(self, dashs_list):
        ids = [dash_dict.get('id') for dash_dict in dashs_list]
        objs = db.session.query(Dashboard) \
            .filter(Dashboard.id.in_(ids)).all()
        if len(ids) != len(objs):
            msg = _("Error parameter ids: {ids}, queried {num} dashboard(s)") \
                .format(ids=ids, num=len(objs))
            self.handle_exception(404, Exception, msg)
        return objs

    def post_delete(self, obj):
        super(SliceModelView, self).post_delete(obj)
        db.session.query(FavStar) \
            .filter(FavStar.class_name.ilike(self.model_type),
                    FavStar.obj_id == obj.id) \
            .delete(synchronize_session=False)
        db.session.commit()

    def check_column_values(self, obj):
        if not obj.slice_name:
            raise ParameterException(NONE_SLICE_NAME)
        self.model.check_name(obj.slice_name)

    @catch_exception
    @expose("/online_info/<id>/", methods=['GET'])
    def online_info(self, id):  # Deprecated
        slice = self.get_object(id)
        self.check_release_perm(slice.guardian_datasource)
        objects = self.online_affect_objects(id)
        info = _("Releasing slice {slice} will release these too: "
                 "\nDataset: {dataset}, \nConnection: {conn}, "
                 "\nand make it invisible in these dashboards: {dashboard}") \
            .format(slice=objects.get('slice'),
                    dataset=objects.get('dataset'),
                    conn=objects.get('connection'),
                    dashboard=objects.get('dashboard'),
                    )
        return json_response(data=info)

    def online_affect_objects(self, slice):  # Deprecated
        """
        Changing slice to online will make offline dataset and connections online,
        and make it usable in others' dashboard.
        Changing slice to offline will make it unusable in others' dashboard.
        """
        user_id = g.user.id
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
    def offline_info(self, id):  # Deprecated
        slice = self.get_object(id)
        self.check_release_perm(slice.guardian_datasource)
        dashboards = [d for d in slice.dashboards
                      if d.online is True and d.created_by_fk != g.user.id]
        info = _("Changing slice {slice} to offline will make it invisible "
                 "in these dashboards: {dashboard}") \
            .format(slice=[slice, ], dashboard=dashboards)
        return json_response(data=info)

    @catch_exception
    @expose("/delete_info/<id>/", methods=['GET'])
    def delete_info(self, id):
        slice = self.get_object(id)
        self.check_delete_perm(slice.guardian_datasource)
        objects = self.delete_affect_objects([id, ])
        info = _("Deleting slice {slice} will remove from these "
                 "dashboards too: {dashboard}") \
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
            raise ParameterException(_(
                'Error parameter ids: {ids}, queried {num} slice(s)')
                                     .format(ids=ids, num=len(slices))
                                     )
        dashs = []
        for s in slices:
            for d in s.dashboards:
                if d.created_by_fk == g.user.id or d.online == 1:
                    dashs.append(d)
        return {'slice': slices, 'dashboard': dashs}

    @catch_exception
    @expose("/grant_info/<id>/", methods=['GET'])
    def grant_info(self, id):
        slice = self.get_object(id)
        self.check_grant_perm(slice.guardian_datasource)
        objects = self.grant_affect_objects(slice)
        info = _("Granting permissions of [{slice}] to this user, will grant "
                 "permissions of dependencies to this user too: "
                 "\nDataset: {dataset}, \nConnection: {connection}") \
            .format(slice=slice,
                    dataset=objects.get('dataset'),
                    connection=objects.get('connection'))
        return json_response(data=info)

    def grant_affect_objects(self, slice):
        dataset = None
        if slice.datasource_id and slice.datasource:
            dataset = slice.datasource

        conns = []
        main_db = self.get_main_db()
        if slice.database_id and slice.database_id != main_db.id:
            database = db.session.query(Database) \
                .filter(Database.id == slice.database_id).first()
            conns.append(database)
        if dataset and dataset.database and dataset.database.id != main_db.id:
            conns.append(dataset.database)
        if dataset and dataset.hdfs_table and dataset.hdfs_table.hdfs_connection:
            conns.append(dataset.hdfs_table.hdfs_connection)
        return {'dataset': [dataset, ] if dataset else [],
                'connection': set(conns)}

    @catch_exception
    @expose('/add/', methods=['GET'])
    def add(self):
        if self.guardian_auth:
            from superset.guardian import guardian_client
            readable_names = \
                guardian_client.search_model_permissions(g.user.username, self.model_type)
            if not readable_names:
                raise GuardianException(NO_USEABLE_DATASETS)
            dataset = db.session.query(Dataset) \
                .filter(Dataset.dataset_name.in_(readable_names)) \
                .order_by(Dataset.id.asc()) \
                .first()
        else:
            dataset = db.session.query(Dataset).order_by(Dataset.id).first()

        if dataset:
            return redirect(dataset.explore_url)
        else:
            raise PropertyException(NO_USEABLE_DATASETS)

    def get_object_list_data(self, **kwargs):
        """
        Return the slices with column 'favorite' and 'online'
        """
        order_column = kwargs.get('order_column')
        order_direction = kwargs.get('order_direction')
        page = kwargs.get('page')
        page_size = kwargs.get('page_size')
        only_favorite = kwargs.get('only_favorite')

        query = self.query_with_favorite(self.model_type, **kwargs)

        readable_names = None
        if self.guardian_auth:
            from superset.guardian import guardian_client
            readable_names = \
                guardian_client.search_model_permissions(g.user.username, self.model_type)
            count = len(readable_names)
        else:
            count = query.count()
            if page is not None and page >= 0 and page_size and page_size > 0:
                query = query.limit(page_size).offset(page * page_size)

        rs = query.all()
        data = []
        index = 0
        for obj, username, fav_id in rs:
            if self.guardian_auth:
                if obj.name in readable_names:
                    index += 1
                    if index <= page * page_size:
                        continue
                    elif index > (page+1) * page_size:
                        break
                else:
                    continue
            line = {}
            for col in self.list_columns:
                if col in self.str_columns:
                    line[col] = str(getattr(obj, col, None))
                else:
                    line[col] = getattr(obj, col, None)

            viz_type = line.get('viz_type', None)
            viz_type = viz_verbose_names.get(viz_type) if viz_type else None
            line['viz_type'] = str(viz_type) if viz_type else None
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
