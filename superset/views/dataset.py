from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals


import json
import requests
from flask import request
from flask_babel import lazy_gettext as _
from flask_appbuilder import expose
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_appbuilder.security.sqla.models import User

from sqlalchemy import or_
from superset import app, db
from superset.utils import SupersetException
from superset.models import (
    Database, Dataset, HDFSTable, Log, TableColumn, SqlMetric, Slice
)
from superset.views.hdfs import HDFSBrowser, catch_hdfs_exception
from superset.message import *
from .base import (
    SupersetModelView, catch_exception, get_user_id, check_ownership,
    json_response
)

config = app.config


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
            self.handle_exception(404, Exception, COLUMN_MISS_DATASET)
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

    def pre_add(self, column):
        self.check_column_values(column)

    def pre_update(self, column):
        check_ownership(column)
        self.pre_add(column)

    def pre_delete(self, column):
        check_ownership(column)

    @staticmethod
    def check_column_values(obj):
        if not obj.column_name:
            raise SupersetException(NONE_COLUMN_NAME)


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
            self.handle_exception(404, Exception, METRIC_MISS_DATASET)
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

    def pre_add(self, metric):
        self.check_column_values(metric)

    def pre_update(self, metric):
        check_ownership(metric)
        self.pre_add(metric)

    def pre_delete(self, metric):
        check_ownership(metric)

    @staticmethod
    def check_column_values(obj):
        if not obj.metric_name:
            raise SupersetException(NONE_METRIC_NAME)
        if not obj.expression:
            raise SupersetException(NONE_METRIC_EXPRESSION)


class DatasetModelView(SupersetModelView):  # noqa
    model = Dataset
    datamodel = SQLAInterface(Dataset)
    route_base = '/table'
    list_columns = ['id', 'dataset_name', 'dataset_type', 'explore_url',
                    'connection', 'changed_on', 'online']
    add_columns = ['dataset_name', 'database_id', 'description',
                   'schema', 'table_name', 'sql']
    show_columns = add_columns + ['id', 'dataset_type']
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
        return json.dumps(Dataset.addable_types + HDFSTable.addable_types)

    @catch_exception
    @expose('/filter_dataset_types/', methods=['GET'])
    def filter_dataset_types(self):
        return json.dumps(['ALL'] + Dataset.filter_types + HDFSTable.filter_types)

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
            dataset = Dataset.temp_dataset(database_id, full_tb_name,
                                         need_columns=False)
            data = dataset.preview_data(limit=rows)
        else:
            json_response(status=400,
                          message=_("Error request parameters: [{params}]")
                          .format(params=request.args.to_dict()))
        return json_response(data=data)

    @catch_exception
    @expose("/online_info/<id>/", methods=['GET'])
    def online_info(self, id):
        dataset = db.session.query(Dataset).filter_by(id=id).first()
        if not dataset:
            raise SupersetException(
                _("Not found dataset by id [{id}]").format(id=id)
            )
        info = _("Releasing dataset [{dataset}] will release connection [{connection}]")\
            .format(dataset=dataset, connection=dataset.database)
        return json_response(data=info)

    @catch_exception
    @expose("/offline_info/<id>/", methods=['GET'])
    def offline_info(self, id):
        objects = self.associated_objects([id, ])
        info = _("Changing dataset {dataset} to offline will make these "
               "slices unusable: {slice}")\
            .format(dataset=objects.get('dataset'), slice=objects.get('slice'))
        return json_response(data=info)

    @catch_exception
    @expose("/delete_info/<id>/", methods=['GET'])
    def delete_info(self, id):
        objects = self.associated_objects([id, ])
        info = _("Deleting datasets {dataset} will make these slices unusable: {slice}")\
            .format(dataset=objects.get('dataset'), slice=objects.get('slice'))
        return json_response(data=info)

    @catch_exception
    @expose("/muldelete_info/", methods=['POST'])
    def muldelete_info(self):
        json_data = self.get_request_data()
        ids = json_data.get('selectedRowKeys')
        objects = self.associated_objects(ids)
        info = _("Deleting datasets {dataset} will make these slices unusable: {slice}") \
            .format(dataset=objects.get('dataset'), slice=objects.get('slice'))
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
        dataset_type = args.get('dataset_type')
        if dataset_type in Dataset.addable_types:
            dataset = self.populate_object(None, get_user_id(), args)
            self._add(dataset)
            return json_response(
                message=ADD_SUCCESS, data={'object_id': dataset.id})
        elif dataset_type in HDFSTable.addable_types:
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
            raise Exception(_("Error dataset type: [{type_}]").format(type_=dataset_type))

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
        dataset_type = dataset.dataset_type
        if dataset_type in Dataset.dataset_types:
            dataset = self.populate_object(pk, get_user_id(), args)
            self._edit(dataset)
            return json_response(message=UPDATE_SUCCESS)
        elif dataset_type in HDFSTable.hdfs_table_types:
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
            raise Exception(_("Error dataset type: [{type_}]").format(type_=dataset_type))

    def get_object_list_data(self, **kwargs):
        """Return the table list"""
        order_column = kwargs.get('order_column')
        order_direction = kwargs.get('order_direction')
        page = kwargs.get('page')
        page_size = kwargs.get('page_size')
        filter = kwargs.get('filter')
        dataset_type = kwargs.get('dataset_type')
        user_id = kwargs.get('user_id')

        query = (
            db.session.query(Dataset, User)
            .outerjoin(User, Dataset.created_by_fk == User.id)
        )
        if dataset_type and dataset_type != 'ALL':
            if dataset_type == HDFSTable.hdfs_table_type:
                query = query.join(HDFSTable, HDFSTable.dataset_id == Dataset.id)
            else:
                pattern = '{}%'.format(dataset_type)
                query = (
                    query.outerjoin(Database, Dataset.database_id == Database.id)
                    .outerjoin(HDFSTable, Dataset.id == HDFSTable.dataset_id)
                    .filter(Database.sqlalchemy_uri.ilike(pattern),
                            HDFSTable.id == None)
                )

        query = query.filter(
             or_(Dataset.created_by_fk == user_id,
                 Dataset.online == 1)
        )

        if filter:
            filter_str = '%{}%'.format(filter.lower())
            query = query.filter(
                or_(
                    Dataset.dataset_name.ilike(filter_str),
                    User.username.ilike(filter_str)
                )
            )
        count = query.count()

        if order_column:
            try:
                column = self.str_to_column.get(order_column)
            except KeyError:
                msg = _("Error order column name: [{name}]").format(name=order_column)
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
        database = db.session.query(Database) \
            .filter_by(id=data['database_id']) \
            .first()
        attributes['database'] = database
        return attributes

    def pre_add(self, table):
        self.check_column_values(table)
        table.get_sqla_table_object()

    def post_add(self, table):
        Log.log_add(table, 'dataset', get_user_id())
        table.fetch_metadata()

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
        Log.log_update(table, 'dataset', get_user_id())

    def pre_delete(self, table):
        check_ownership(table)

    def post_delete(self, table):
        Log.log_delete(table, 'dataset', get_user_id())

    @staticmethod
    def check_column_values(obj):
        if not obj.dataset_name:
            raise SupersetException(NONE_DATASET_NAME)
        if not obj.database_id:
            raise SupersetException(NONE_CONNECTION)
        if not obj.schema and not obj.table_namej and not obj.sql:
            raise SupersetException(NONE_CONNECTION)


class HDFSTableModelView(SupersetModelView):
    route_base = '/hdfstable'
    model = HDFSTable
    datamodel = SQLAInterface(HDFSTable)
    add_columns = ['hdfs_path', 'separator', 'file_type', 'quote',
                   'skip_rows', 'next_as_header', 'skip_more_rows',
                   'charset', 'hdfs_connection_id']
    show_columns = add_columns
    edit_columns = add_columns

    def _add(self, hdfs_table):
        self.pre_add(hdfs_table)
        if not self.datamodel.add(hdfs_table):
            db.session.query(Dataset) \
                .filter(Dataset.id == hdfs_table.dataset_id) \
                .delete(synchronize_session=False)
            db.session.commit()
            raise Exception(ADD_FAILED)
        self.post_add(hdfs_table)

    def pre_add(self, obj):
        self.check_column_values(obj)

    def pre_update(self, obj):
        self.pre_add(obj)

    @staticmethod
    def check_column_values(obj):
        if not obj.hdfs_path:
            raise SupersetException(NONE_HDFS_PATH)
        if not obj.hdfs_connection_id:
            raise SupersetException(NONE_HDFS_CONNECTION)

    @catch_hdfs_exception
    @expose('/files/', methods=['GET'])
    def list_hdfs_files(self):
        path = request.args.get('path', '/')
        page_size = request.args.get('page_size', 1000)
        hdfs_connection_id = request.args.get('hdfs_connection_id')
        client, _ = HDFSBrowser.login_filerobot(hdfs_connection_id)
        response = client.list(path, page_size=page_size)
        return json_response(data=json.loads(response.text))

    @catch_hdfs_exception
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
            client, _ = HDFSBrowser.login_filerobot(hdfs_conn_id)
            files = self.list_files(client, path, size)
            file_path = self.choice_one_file_path(files)
            file = self.download_file(client, file_path, size)
            HDFSTable.cached_file[cache_key] = file
        df = HDFSTable.parse_file(file, **args)
        return json_response(data=dict(records=df.to_dict(orient="records"),
                                       columns=list(df.columns))
                             )

    @catch_hdfs_exception
    @expose('/upload/', methods=['POST'])
    def upload(self):
        f = request.data
        dest_path = request.args.get('dest_path')
        file_name = request.args.get('file_name')
        hdfs_connection_id = request.args.get('hdfs_connection_id')

        client, _ = HDFSBrowser.login_filerobot(hdfs_connection_id)
        response = client.upload(dest_path, {'files': (file_name, f)})
        return json_response(message=response.text)

    @classmethod
    def list_files(cls, client, path, size):
        response = client.list(path, page_size=size)
        return response.text

    @classmethod
    def choice_one_file_path(cls, files_json):
        if not isinstance(files_json, dict):
            files_json = json.loads(files_json)
        files = files_json.get('files')
        file_path = ''
        for file in files:
            type_ = file.get('type')
            name = file.get('name')
            if name == '.' or name == '..':
                pass
            elif type_ == 'dir':
                raise SupersetException(
                    _('Should not exist folder [{folder}] in selected path [{path}] '
                    'to create external table')
                    .format(folder=file.get('path'), path=files_json.get('path')))
            elif type_ == 'file':
                file_path = file.get('path')
            else:
                raise SupersetException(
                    _('Error file type: [{type_}]').format(type_=type_))
        if not file_path:
            raise SupersetException(
                _('No files in selected path: [{path}]').format(path=files_json.get('path'))
            )
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
        raise SupersetException(
            _("Fetched {size} bytes file, but still not a complete line")
                .format(size=size)
        )
