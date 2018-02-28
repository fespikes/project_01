import json
import pickle
from flask import g, request, Response
from flask_babel import lazy_gettext as _
from flask_appbuilder import expose
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_appbuilder.security.sqla.models import User

from superset import app, db, utils
from superset.exception import ParameterException, GuardianException
from superset.models import (
    Database, Dataset, Slice, Dashboard, Log, FavStar, str_to_model,
    model_name_columns
)
from superset.message import *
from .base import (
    SupersetModelView, PermissionManagement, catch_exception, json_response
)


config = app.config
QueryStatus = utils.QueryStatus


class DashboardModelView(SupersetModelView, PermissionManagement):
    model = Dashboard
    model_type = 'dashboard'
    datamodel = SQLAInterface(Dashboard)
    route_base = '/dashboard'
    list_columns = ['id', 'dashboard_title', 'url', 'description', 'changed_on']
    edit_columns = ['dashboard_title', 'description']
    show_columns = ['id', 'dashboard_title', 'description', 'table_names']
    add_columns = edit_columns
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

    def pre_add(self, obj):
        self.check_column_values(obj)
        utils.validate_json(obj.json_metadata)
        utils.validate_json(obj.position_json)

    def pre_update(self, old_obj, new_obj):
        self.check_edit_perm([self.model_type, old_obj.dashboard_title])
        self.pre_add(new_obj)

    def post_delete(self, obj):
        super(DashboardModelView, self).post_delete(obj)
        db.session.query(FavStar) \
            .filter(FavStar.class_name.ilike(self.model_type),
                    FavStar.obj_id == obj.id) \
            .delete(synchronize_session=False)
        db.session.commit()

    def check_column_values(self, obj):
        if not obj.dashboard_title:
            raise ParameterException(NONE_DASHBOARD_NAME)
        self.model.check_name(obj.dashboard_title)

    def get_object_list_data(self, **kwargs):
        """
        Return the dashbaords with column 'favorite' and 'online'
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
            image_bytes = getattr(obj, 'image', None)
            image_bytes = b'' if image_bytes is None else image_bytes
            line['image'] = str(image_bytes, encoding='utf8')
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
        attributes = super(DashboardModelView, self).get_show_attributes(obj)
        attributes['slices'] = self.slices_to_dict(obj.slices)
        return attributes

    def get_add_attributes(self, data, user_id):
        attributes = super(DashboardModelView, self).get_add_attributes(data, user_id)
        attributes['slices'] = self.get_slices_in_list(data.get('slices'))
        return attributes

    def get_edit_attributes(self, data, user_id):
        attributes = super(DashboardModelView, self).get_edit_attributes(data, user_id)
        attributes['slices'] = self.get_slices_in_list(data.get('slices'))
        attributes['need_capture'] = True
        return attributes

    def get_slices_in_list(self, slices_list):
        ids = [slice_dict.get('id') for slice_dict in slices_list]
        objs = db.session.query(Slice) \
            .filter(Slice.id.in_(ids)).all()
        if len(ids) != len(objs):
            msg = _("Error parameter ids: {ids}, queried {num} slice(s)") \
                .format(ids=ids, num=len(objs))
            self.handle_exception(404, Exception, msg)
        return objs

    @catch_exception
    @expose("/online_info/<id>/", methods=['GET'])
    def online_info(self, id):  # Deprecated
        """
        Changing dashboard to online will make myself slices,_datasets and
        connections online.
        """
        dashboard = self.get_object(id)
        self.check_release_perm([self.model_type, dashboard.dashboard_title])

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
        databases = db.session.query(Database) \
            .filter(Database.id.in_(database_ids)) \
            .all()
        connections.extend(databases)

        offline_slices = [s for s in slices
                          if s.online is False and s.created_by_fk == g.user.id]
        offline_datasets = [d for d in datasets
                            if d.online is False and d.created_by_fk == g.user.id]
        offline_connections = [c for c in connections
                               if c.online is False and c.created_by_fk == g.user.id]

        info = _("Releasing dashboard {dashboard} will release these too: "
                 "\nSlice: {slice}, \nDataset: {dataset}, \nConnection: {connection}") \
            .format(dashboard=[dashboard, ],
                    slice=offline_slices,
                    dataset=offline_datasets,
                    connection=offline_connections)
        return json_response(data=info)

    @catch_exception
    @expose("/offline_info/<id>/", methods=['GET'])
    def offline_info(self, id):  # Deprecated
        dash = self.get_object(id)
        self.check_release_perm([self.model_type, dash.dashboard_title])
        info = _("Changing dashboard {dashboard} to offline will make it invisible "
                 "for other users").format(dashboard=[dash, ])
        return json_response(data=info)

    @catch_exception
    @expose("/delete_info/<id>/", methods=['GET'])
    def delete_info(self, id):
        dash = self.get_object(id)
        self.check_delete_perm([self.model_type, dash.dashboard_title])
        return json_response(data='')

    @catch_exception
    @expose("/muldelete_info/", methods=['POST'])
    def muldelete_info(self):
        return json_response(data='')

    @catch_exception
    @expose("/grant_info/<id>/", methods=['GET'])
    def grant_info(self, id):
        dash = self.get_object(id)
        self.check_grant_perm([self.model_type, dash.dashboard_title])
        objects = self.grant_affect_objects(dash)
        info = _("Granting permissions of [{dashboard}] to this user, will grant "
                 "permissions of dependencies to this user too: "
                 "\nSlice: {slice}, \nDataset: {dataset}, \nConnection: {connection}") \
            .format(dashboard=dash,
                    slice=objects.get('slice'),
                    dataset=objects.get('dataset'),
                    connection=objects.get('connection'))
        return json_response(data=info)

    def grant_affect_objects(self, dash):
        slices = dash.slices
        datasets = []
        database_ids = []
        for s in slices:
            if s.datasource_id and s.datasource:
                datasets.append(s.datasource)
            elif s.database_id:
                database_ids.append(s.database_id)

        connections = []
        for d in datasets:
            if d.database and d.database.name != self.main_db_name:
                connections.append(d.database)
            if d.hdfs_table and d.hdfs_table.hdfs_connection:
                connections.append(d.hdfs_table.hdfs_connection)
        databases = db.session.query(Database) \
            .filter(Database.id.in_(database_ids),
                    Database.database_name != self.main_db_name) \
            .all()
        connections.extend(databases)
        return {'slice': set(slices),
                'dataset': set(datasets),
                'connection': set(connections)}

    @catch_exception
    @expose("/upload_image/<id>/", methods=['POST'])
    def upload_image(self, id):
        dash = self.get_object(id)
        data = request.form.get('image')
        dash.image = bytes(data, encoding='utf8')
        dash.need_capture = False
        db.session.merge(dash)
        db.session.commit()
        Log.log_update(dash, 'dashboard', g.user.id)
        return json_response(message="Update dashboard [{}] success".format(dash))

    @catch_exception
    @expose("/before_import/", methods=['POST'])
    def before_import(self):
        """Before import, check same names of objects in file and database.
        #:return {'dashboard': {'order': 1,
                                'abbr': 'Dashboard',  # translation
                                'names': {'n1': {'can_overwrite': true},
                                          'n2': {'can_overwrite': false},
                                        }
                                }
                'slice' : {...}
                 }
        """
        f = request.data
        data = pickle.loads(f)
        import_objs, same_objs = {}, {}
        for obj_type in self.OBJECT_TYPES:
            import_objs[obj_type] = []
        same_objs = {'dashboard': {'order': 1, 'abbr': str(_('Dashboard')), 'names': {}},
                     'slice': {'order': 2, 'abbr': str(_('Slice')), 'names': {}},
                     'dataset': {'order': 3, 'abbr': str(_('Dataset')), 'names': {}},
                     'database': {'order': 4, 'abbr': str(_('DB connection')), 'names': {}},
                     'hdfsconnection': {'order': 5, 'abbr': str(_('HDFS connection')), 'names': {}},
                     }

        for dataset in data['datasets']:
            import_objs[self.OBJECT_TYPES[2]].append(dataset.name)
            if dataset.database:
                import_objs[self.OBJECT_TYPES[0]].append(dataset.database.name)
            if dataset.hdfs_table and dataset.hdfs_table.hdfs_connection:
                import_objs[self.OBJECT_TYPES[1]].append(
                    dataset.hdfs_table.hdfs_connection.name)
        for dashboard in data['dashboards']:
            import_objs[self.OBJECT_TYPES[4]].append(dashboard.name)
            for slice in dashboard.slices:
                import_objs[self.OBJECT_TYPES[3]].append(slice.name)
                if slice.database_id and slice.database:
                    import_objs[self.OBJECT_TYPES[0]].append(slice.database.name)

        for obj_type, obj_names in import_objs.items():
            if obj_names:
                model = str_to_model[obj_type]
                name_column = model_name_columns[obj_type]
                sames = db.session.query(model).filter(name_column.in_(obj_names)).all()
                for o in sames:
                    editable = self.check_edit_perm([obj_type, o.name],
                                                    raise_if_false=False)
                    same_objs[obj_type]['names'][o.name] = {'can_overwrite': editable}

        same_objs = dict((k, v) for k, v in same_objs.items() if v['names'])
        return json_response(data=same_objs)

    @catch_exception
    @expose("/import/", methods=['GET', 'POST'])
    def import_dashboards(self):
        """Import dashboards and dependencies"""
        solution = json.loads(request.args.get('param', '{}'))
        session = db.session
        Dashboard.check_solution(solution, db.session, str_to_model)

        f = request.data
        objects = pickle.loads(f)
        for dataset in objects['datasets']:
            Dataset.import_obj(
                session, dataset, solution, self.grant_owner_permissions)
        for dashboard in objects['dashboards']:
            Dashboard.import_obj(
                session, dashboard, solution, self.grant_owner_permissions)
            Log.log('import', dashboard, 'dashboard', g.user.id)
        return json_response('Import success')

    @catch_exception
    @expose("/export/")
    def export_dashboards(self):
        ids = request.args.get('ids')
        ids = eval(ids)
        if isinstance(ids, int):
            ids = [ids, ]
        return Response(
            Dashboard.export_dashboards(ids),
            headers=self.generate_download_headers("pickle"),
            mimetype="application/text")
        # data = Dashboard.export_dashboards(ids)
        # return json_response(data=data)

    def add_slices_api(self, dashboard_id, slice_ids):
        """Add and save slices to a dashboard"""
        session = db.session()
        dash = session.query(Dashboard).filter_by(id=dashboard_id).first()
        self.check_edit_perm([self.model_type, dash.dashboard_title])
        new_slices = session.query(Slice).filter(
            Slice.id.in_(slice_ids))
        dash.slices += new_slices
        session.merge(dash)
        session.commit()
        session.close()
        return True
