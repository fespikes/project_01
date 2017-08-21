from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals


import json
import requests
from flask import g, request, Response
from flask_babel import gettext as __
from flask_appbuilder import expose
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_appbuilder.security.views import AuthDBView
from flask_appbuilder.security.sqla.models import User

from fileRobot_client.FileRobotClientFactory import fileRobotClientFactory
from fileRobot_common.conf.FileRobotConfiguration import FileRobotConfiguartion
from fileRobot_common.conf.FileRobotVars import FileRobotVars

from sqlalchemy import or_
from superset import app, db, appbuilder
from superset.utils import SupersetException
from superset.models import (
    Database, Dataset, HDFSTable, HDFSConnection, Log, DailyNumber,
    TableColumn, SqlMetric, Slice
)
from superset.message import *
from .base import (
    SupersetModelView, catch_exception, get_user_id, check_ownership,
    json_response
)

config = app.config
log_action = Log.log_action
log_number = DailyNumber.log_number


class TableColumnInlineView(SupersetModelView):  # noqa
    model = TableColumn
    datamodel = SQLAInterface(TableColumn)
    route_base = '/tablecolumn'
    can_delete = False
    list_columns = [
        'id', 'column_name', 'description', 'type', 'groupby', 'filterable',
        'count_distinct', 'sum', 'min', 'max', 'is_dttm', 'expression']
    edit_columns = [
        'column_name', 'description', 'groupby', 'filterable', 'is_dttm',
        'count_distinct', 'sum', 'min', 'max', 'expression', 'dataset_id']
    show_columns = edit_columns + ['id', 'dataset']
    add_columns = edit_columns
    readme_columns = ['is_dttm', 'expression']
    description_columns = {}

    bool_columns = ['is_dttm', 'is_active', 'groupby', 'count_distinct',
                    'sum', 'avg', 'max', 'min', 'filterable']
    str_columns = ['dataset', ]

    def get_object_list_data(self, **kwargs):
        dataset_id = kwargs.get('dataset_id')
        if not dataset_id:
            msg = "Need parameter 'dataset_id' to query columns"
            self.handle_exception(404, Exception, msg)
        rows = db.session.query(self.model) \
            .filter_by(dataset_id=dataset_id).all()
        data = []
        for row in rows:
            line = {}
            for col in self.list_columns:
                if col in self.str_columns:
                    line[col] = str(getattr(row, col, None))
                else:
                    line[col] = getattr(row, col, None)
            data.append(line)
        return {'data': data}

    def get_addable_choices(self):
        data = super().get_addable_choices()
        data['available_dataset'] = self.get_available_tables()
        return data

    def pre_update(self, column):
        check_ownership(column)

    def pre_delete(self, column):
        check_ownership(column)


class SqlMetricInlineView(SupersetModelView):  # noqa
    model = SqlMetric
    datamodel = SQLAInterface(SqlMetric)
    route_base = '/sqlmetric'
    list_columns = [
        'id', 'metric_name', 'description', 'metric_type', 'expression']
    show_columns = list_columns + ['dataset_id', 'dataset']
    edit_columns = [
        'metric_name', 'description', 'metric_type', 'expression', 'dataset_id']
    add_columns = edit_columns
    readme_columns = ['expression', 'd3format']
    description_columns = {}

    bool_columns = ['is_restricted', ]
    str_columns = ['dataset', ]

    def get_addable_choices(self):
        data = super().get_addable_choices()
        data['available_dataset'] = self.get_available_tables()
        return data

    def get_object_list_data(self, **kwargs):
        dataset_id = kwargs.get('dataset_id')
        if not dataset_id:
            msg = "Need parameter 'dataset_id' to query metrics"
            self.handle_exception(404, Exception, msg)
        rows = (
            db.session.query(self.model)
                .filter_by(dataset_id=dataset_id)
                .order_by(self.model.metric_name)
                .all()
        )
        data = []
        for row in rows:
            line = {}
            for col in self.list_columns:
                if col in self.str_columns:
                    line[col] = str(getattr(row, col, None))
                else:
                    line[col] = getattr(row, col, None)
            data.append(line)
        return {'data': data}

    def pre_update(self, metric):
        check_ownership(metric)

    def pre_delete(self, metric):
        check_ownership(metric)


class DatasetModelView(SupersetModelView):  # noqa
    model = Dataset
    datamodel = SQLAInterface(Dataset)
    route_base = '/table'
    list_columns = ['id', 'dataset_name', 'dataset_type', 'explore_url',
                    'connection', 'changed_on', 'online']
    add_columns = ['dataset_name', 'dataset_type', 'database_id', 'description',
                   'schema', 'table_name', 'sql']
    show_columns = add_columns + ['id']
    edit_columns = ['dataset_name', 'database_id', 'description', 'schema',
                    'table_name', 'sql']
    description_columns = {}
    str_to_column = {
        'title': Dataset.dataset_name,
        'time': Dataset.changed_on,
        'changed_on': Dataset.changed_on,
        'owner': User.username
    }

    int_columns = ['user_id', 'database_id', 'offset', 'cache_timeout']
    bool_columns = ['is_featured', 'filter_select_enabled']
    str_columns = ['database', 'created_on', 'changed_on']

    list_template = "superset/tableList.html"

    def get_addable_choices(self):
        data = super().get_addable_choices()
        data['available_databases'] = \
            self.get_available_connections(get_user_id())
        return data

    @catch_exception
    @expose('/databases/', methods=['GET', ])
    def addable_databases(self):
        return json.dumps(self.get_available_databases(get_user_id()))

    @catch_exception
    @expose('/schemas/<database_id>/', methods=['GET', ])
    def addable_schemas(self, database_id):
        d = db.session.query(Database).filter_by(id=database_id).first()
        return json.dumps(d.all_schema_names())

    @catch_exception
    @expose('/tables/<database_id>/<schema>/', methods=['GET', ])
    def addable_tables(self, database_id, schema):
        d = db.session.query(Database).filter_by(id=database_id).first()
        return json.dumps(d.all_table_names(schema=schema))

    @catch_exception
    @expose('/edit/hdfstable/<pk>/', methods=['GET', 'POST'])
    def edit_hdfs_table(self, pk):
        json_data = self.get_request_data()
        obj = self.get_object(pk)
        self.pre_update(obj)
        self.update_hdfs_table(obj, json_data)
        self.datamodel.edit(obj)
        self.post_update(obj)
        return json_response(message=UPDATE_SUCCESS)

    @catch_exception
    @expose('/add_dataset_types/', methods=['GET'])
    def add_dataset_types(self):
        return json.dumps(['INCEPTOR', 'HDFS', 'UPLOAD FILE'])

    @catch_exception
    @expose('/filter_dataset_types/', methods=['GET'])
    def filter_dataset_types(self):
        return json.dumps(['ALL', 'INCEPTOR', 'HDFS'])

    @catch_exception
    @expose('/preview_data/', methods=['GET', ])
    def preview_table(self):
        dataset_id = request.args.get('dataset_id', 0)
        database_id = request.args.get('database_id')
        full_tb_name = request.args.get('full_tb_name')
        rows = request.args.get('rows', 100)
        if int(dataset_id) > 0:
            data = self.get_object(dataset_id).preview_data(limit=rows)
        elif database_id and full_tb_name:
            dataset = Dataset.temp_table(database_id, full_tb_name,
                                         need_columns=False)
            data = dataset.preview_data(limit=rows)
        else:
            raise SupersetException('{}: {}'.format(ERROR_REQUEST_PARAM,
                                                    request.args.to_dict()))
        return json_response(data=data)

    @catch_exception
    @expose("/online_info/<id>/", methods=['GET'])
    def online_info(self, id):
        dataset = db.session.query(Dataset).filter_by(id=id).first()
        if not dataset:
            raise SupersetException(
                '{}: Dataset.id={}'.format(OBJECT_NOT_FOUND, id))
        info = "Releasing dataset [{}] will release all associated objects too:\n" \
               "Connection: [{}].".format(dataset, dataset.database)
        return json_response(data=info)

    @catch_exception
    @expose("/offline_info/<id>/", methods=['GET'])
    def offline_info(self, id):
        objects = self.associated_objects(id)
        info = "Changing dataset [{}] to be offline will make these slices " \
               "unusable: {}".format(objects.get('dataset'), objects.get('slice'))
        return json_response(data=info)

    @catch_exception
    @expose("/delete_info/<id>/", methods=['GET'])
    def delete_info(self, id):
        objects = self.associated_objects([id,])
        info = "Deleting dataset {} will make these and others' offline slices unusable: {}"\
            .format(objects.get('dataset'), objects.get('slice'))
        return json_response(data=info)

    @catch_exception
    @expose("/muldelete_info/", methods=['POST'])
    def muldelete_info(self):
        json_data = self.get_request_data()
        ids = json_data.get('ids')
        objects = self.associated_objects(ids)
        info = "Deleting datasets {} will make these and others' offline slices unusable: {}" \
            .format(objects.get('dataset'), objects.get('slice'))
        return json_response(data=info)

    def associated_objects(self, ids):
        dataset = db.session.query(Dataset).filter(Dataset.id.in_(ids)).all()
        if len(dataset) != len(ids):
            raise SupersetException('Not found all datasets by ids: {}'.format(ids))
        slices = (
            db.session.query(Slice)
            .filter(Slice.datasource_id.in_(ids),
                    or_(Slice.created_by_fk == get_user_id(),
                        Slice.online == 1)
                    )
            .all()
        )
        return {'dataset': dataset, 'slice': slices}

    @catch_exception
    @expose('/add', methods=['POST', ])
    def add(self):
        args = self.get_request_data()
        dataset_type = args.get('dataset_type').lower()
        if dataset_type == 'inceptor':
            dataset = self.populate_object(None, get_user_id(), args)
            self._add(dataset)
            return json_response(
                message=ADD_SUCCESS, data={'object_id': dataset.id})
        elif dataset_type == 'hdfs':
            HDFSTable.cached_file.clear()
            # create hdfs_table
            hdfs_table_view = HDFSTableModelView()
            hdfs_table = hdfs_table_view.populate_object(None, get_user_id(), args)
            database = db.session.query(Database) \
                .filter_by(id=args.get('database_id')) \
                .first()
            hdfs_table.create_external_table(
                database, args.get('dataset_name'),
                args.get('columns'), args.get('hdfs_path'), args.get('separator'))

            # create dataset
            dataset = self.model(
                dataset_type=self.model.dataset_type_dict.get('hdfs'),
                dataset_name=args.get('dataset_name'),
                table_name=args.get('dataset_name'),
                description=args.get('description'),
                database_id=args.get('database_id'),
                database=database,
                schema='default',
            )
            self._add(dataset)
            hdfs_table.dataset_id = dataset.id
            hdfs_table_view._add(hdfs_table)
            return json_response(message=ADD_SUCCESS, data={'object_id': dataset.id})
        else:
            raise Exception('{}: [{}]'.format(ERROR_DATASET_TYPE, dataset_type))

    @catch_exception
    @expose('/show/<pk>/', methods=['GET'])
    def show(self, pk):
        obj = self.get_object(pk)
        attributes = self.get_show_attributes(obj, get_user_id())
        if obj.dataset_type.lower() == 'hdfs':
            hdfs_tb_attr = HDFSTableModelView().get_show_attributes(obj.hdfs_table)
            hdfs_tb_attr.pop('created_by_user')
            hdfs_tb_attr.pop('changed_by_user')
            attributes.update(hdfs_tb_attr)
        return json.dumps(attributes)

    @catch_exception
    @expose('/edit/<pk>', methods=['POST', ])
    def edit(self, pk):
        # TODO rollback
        args = self.get_request_data()
        dataset = self.get_object(pk)
        dataset_type = dataset.dataset_type.lower()
        if dataset_type == 'inceptor':
            dataset = self.populate_object(pk, get_user_id(), args)
            self._edit(dataset)
            return json_response(message=UPDATE_SUCCESS)
        elif dataset_type == 'hdfs':
            HDFSTable.cached_file.clear()
            # edit hdfs_table
            hdfs_table = dataset.hdfs_table
            hdfs_table.separator = args.get('separator')
            hdfs_table.hdfs_path = args.get('hdfs_path')
            database = db.session.query(Database) \
                .filter_by(id=args.get('database_id')) \
                .first()
            dataset.hdfs_table.create_external_table(
                database, args.get('dataset_name'),
                args.get('columns'), hdfs_table.hdfs_path, hdfs_table.separator)
            HDFSTableModelView()._edit(hdfs_table)

            # edit dataset
            dataset.dataset_name = args.get('dataset_name')
            dataset.table_name = args.get('dataset_name')
            dataset.description = args.get('description')
            dataset.database_id = args.get('database_id')
            dataset.database = database
            self._edit(dataset)
            return json_response(message=UPDATE_SUCCESS)
        else:
            raise Exception('{}: [{}]'.format(ERROR_DATASET_TYPE, dataset_type))

    def get_object_list_data(self, **kwargs):
        """Return the table list"""
        order_column = kwargs.get('order_column')
        order_direction = kwargs.get('order_direction')
        page = kwargs.get('page')
        page_size = kwargs.get('page_size')
        filter = kwargs.get('filter')
        dataset_type = kwargs.get('dataset_type')
        user_id = kwargs.get('user_id')

        query = db.session.query(Dataset, User) \
            .filter(Dataset.created_by_fk == User.id,
                    or_(Dataset.created_by_fk == user_id,
                        Dataset.online == 1)
                    )

        if dataset_type:
            query = query.filter(Dataset.dataset_type.ilike(dataset_type))
        if filter:
            filter_str = '%{}%'.format(filter.lower())
            query = query.filter(
                or_(
                    Dataset.dataset_name.ilike(filter_str),
                    Dataset.dataset_type.ilike(filter_str),
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
        for obj, user in rs:
            line = {}
            for col in self.list_columns:
                if col in self.str_columns:
                    line[col] = str(getattr(obj, col, None))
                else:
                    line[col] = getattr(obj, col, None)
            line['created_by_user'] = obj.created_by.username \
                if obj.created_by else None
            data.append(line)

        response = {}
        response['count'] = count
        response['order_column'] = order_column
        response['order_direction'] = 'desc' if order_direction == 'desc' else 'asc'
        response['page'] = page
        response['page_size'] = page_size
        response['data'] = data
        return response

    def get_add_attributes(self, data, user_id):
        attributes = super().get_add_attributes(data, user_id)
        attributes['dataset_type'] = \
            self.model.dataset_type_dict.get('inceptor')
        database = db.session.query(Database) \
            .filter_by(id=data['database_id']) \
            .first()
        attributes['database'] = database
        return attributes

    def pre_add(self, table):
        table.get_sqla_table_object()

    def post_add(self, table):
        table.fetch_metadata()
        action_str = 'Add dataset: [{}]'.format(repr(table))
        log_action('add', action_str, 'dataset', table.id)
        log_number('dataset', table.online, get_user_id())

    def update_hdfs_table(self, table, json_date):
        hdfs_table = table.hdfs_table
        hdfs_table.separator = json_date.get('separator')
        db.session.commit()
        hdfs_table.create_out_table(table.table_name, json_date.get('column_desc'))
        db.session.delete(table.ref_columns)
        db.session.delete(table.ref_metrics)
        table.fetch_metadata()

    def pre_update(self, table):
        check_ownership(table)
        self.pre_add(table)
        TableColumnInlineView.datamodel.delete_all(table.ref_columns)
        SqlMetricInlineView.datamodel.delete_all(table.ref_metrics)

    def post_update(self, table):
        table.fetch_metadata()
        action_str = 'Edit dataset: [{}]'.format(repr(table))
        log_action('edit', action_str, 'dataset', table.id)

    def pre_delete(self, table):
        check_ownership(table)

    def post_delete(self, table):
        action_str = 'Delete dataset: [{}]'.format(repr(table))
        log_action('delete', action_str, 'dataset', table.id)
        log_number('dataset', table.online, get_user_id())


class HDFSTableModelView(SupersetModelView):
    route_base = '/hdfstable'
    model = HDFSTable
    datamodel = SQLAInterface(HDFSTable)
    add_columns = ['hdfs_path', 'separator', 'file_type', 'quote',
                   'skip_rows', 'next_as_header', 'skip_more_rows',
                   'charset', 'hdfs_connection_id']
    show_columns = add_columns
    edit_columns = add_columns

    @catch_exception
    @expose('/files/', methods=['GET'])
    def list_hdfs_files(self):
        path = request.args.get('path', '/')
        page_size = request.args.get('page_size', 1000)
        hdfs_connection_id = request.args.get('hdfs_connection_id')
        client = self.login_file_robot(hdfs_connection_id)
        response = client.list(path, page_size=page_size)
        return json_response(data=json.loads(response.text))

    @catch_exception
    @expose('/preview/', methods=['GET'])
    def preview_hdfs_file(self):
        """
        The 'path' is a folder, need to get and parse one file in the 'path'
        """
        args = request.args.to_dict()
        path = args.pop('path')
        size = args.pop('size', 4096)
        hdfs_conn_id = args.pop('hdfs_connection_id', None)

        cache_key = '{}-{}'.format(hdfs_conn_id, path)
        file = HDFSTable.cached_file.get(cache_key)
        if not file:
            client = self.login_file_robot(hdfs_conn_id)
            files = self.list_files(client, path, size)
            files = json.loads(files)
            file_path = self.choice_one_file_path(files)
            file = self.download_file(client, file_path, size)
            HDFSTable.cached_file[cache_key] = file
        df = HDFSTable.parse_file(file, **args)
        return json_response(data=dict(records=df.to_dict(orient="records"),
                                       columns=list(df.columns))
                             )

    @catch_exception
    @expose('/upload/', methods=['POST'])
    def upload(self):
        f = request.data
        dest_path = request.args.get('dest_path')
        file_name = request.args.get('file_name')
        hdfs_connection_id = request.args.get('hdfs_connection_id')
        client = self.login_file_robot(hdfs_connection_id)
        response = client.upload(dest_path, {'files': (file_name, f)})
        return json_response(message=response.text)

    @classmethod
    def login_file_robot(cls, hdfs_conn_id=None):
        def get_httpfs(hdfs_conn_id=None):
            if hdfs_conn_id:
                conn = db.session.query(HDFSConnection) \
                    .filter_by(id=hdfs_conn_id).first()
            else:
                conn = db.session.query(HDFSConnection) \
                    .order_by(HDFSConnection.id).first()
            if not conn:
                raise SupersetException(NO_HDFS_CONNECTION)
            return conn.httpfs

        httpfs = get_httpfs(hdfs_conn_id)
        server = app.config.get('FILE_ROBOT_SERVER')
        username = g.user.username
        password = g.user.password2
        if not server:
            raise SupersetException(NO_FILEROBOT_SERVER)
        if not password:
            raise SupersetException(NEED_PASSWORD_FOR_FILEROBOT)

        conf = FileRobotConfiguartion()
        conf.set(FileRobotVars.FILEROBOT_SERVER_ADDRESS.varname, server)
        client = fileRobotClientFactory.getInstance(conf)
        client.login(username, password, httpfs)
        return client

    @classmethod
    def list_files(cls, client, path, size):
        response = client.list(path, page_size=size)
        return response.text

    @classmethod
    def choice_one_file_path(cls, files_json):
        files = files_json.get('files')
        file_path = ''
        for file in files:
            type = file.get('type')
            name = file.get('name')
            if name == '.' or name == '..':
                pass
            elif type == 'dir':
                raise SupersetException('Should not exist folder [{}] in '
                                        'selected path [{}] to create external table'
                                        .format(file.get('path'), files_json.get('path')))
            elif type == 'file':
                file_path = file.get('path')
            else:
                raise SupersetException('Error file type: [{}]'.format(type))
        if not file_path:
            raise SupersetException('No files in selected path: [{}]'
                                    .format(files_json.get('path')))
        return file_path

    @classmethod
    def download_file(cls, client, path, size=4096):
        max_size = 1024 * 1024
        while size <= max_size:
            response = client.preview(path, length=size)
            if response.status_code != requests.codes.ok:
                response.raise_for_status()
            file = response.text
            index = file.rfind('\n')
            if index > 0:
                file = file[:index]
                return file
            size = size * 2
        raise SupersetException("Fetched {} bytes file, but still not a complete line")


appbuilder.add_view_no_menu(HDFSTableModelView)
appbuilder.add_view_no_menu(TableColumnInlineView)
appbuilder.add_view_no_menu(SqlMetricInlineView)
appbuilder.add_view(
    DatasetModelView,
    "Dataset",
    label=__("Dataset"),
    category="Sources",
    category_label=__("Sources"),
    icon='fa-table',)
