from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals


import json
import requests
from flask import g, request
from flask_babel import lazy_gettext as _
from flask_appbuilder import expose
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_appbuilder.security.sqla.models import User

import sqlalchemy as sqla
from sqlalchemy import select, literal, cast, or_
from sqlalchemy.engine.url import make_url

from superset import app, db, models
from superset.models import Database, HDFSConnection, Connection, Slice, Log
from superset.utils import SupersetException
from superset.views.hdfs import HDFSBrowser, catch_hdfs_exception
from superset.message import *
from .base import (
    SupersetModelView, BaseSupersetView, PageMixin, catch_exception,
    get_user_id, check_ownership, json_response
)

config = app.config


class DatabaseView(SupersetModelView):  # noqa
    model = models.Database
    datamodel = SQLAInterface(models.Database)
    route_base = '/database'
    list_columns = ['id', 'database_name', 'description', 'backend', 'changed_on']
    show_columns = ['id', 'database_name', 'description', 'sqlalchemy_uri',
                    'args', 'backend',  'created_on', 'changed_on']
    add_columns = ['database_name', 'description', 'sqlalchemy_uri', 'args']
    edit_columns = add_columns
    readme_columns = ['sqlalchemy_uri']
    add_template = "superset/models/database/add.html"
    edit_template = "superset/models/database/edit.html"
    base_order = ('changed_on', 'desc')
    description_columns = {}

    str_to_column = {
        'title': Database.database_name,
        'time': Database.changed_on,
        'changed_on': Database.changed_on,
        'owner': User.username
    }

    int_columns = ['id']
    bool_columns = ['expose', 'allow_run_sync', 'allow_dml']
    str_columns = ['created_on', 'changed_on']

    list_template = "superset/databaseList.html"

    def pre_add(self, obj):
        self.check_column_values(obj)
        obj.set_sqlalchemy_uri(obj.sqlalchemy_uri)

    def post_add(self, obj):
        Log.log_add(obj, 'database', get_user_id())

    def pre_update(self, obj):
        check_ownership(obj)
        self.pre_add(obj)

    def post_update(self, obj):
        Log.log_update(obj, 'database', get_user_id())

    def pre_delete(self, obj):
        check_ownership(obj)

    def post_delete(self, obj):
        Log.log_delete(obj, 'database', get_user_id())

    @staticmethod
    def check_column_values(obj):
        if not obj.database_name:
            raise SupersetException(NONE_CONNECTION_NAME)
        if not obj.sqlalchemy_uri:
            raise SupersetException(NONE_SQLALCHEMY_URI)
        if not obj.args:
            raise SupersetException(NONE_CONNECTION_ARGS)

    def get_list_args(self, args):
        kwargs = super().get_list_args(args)
        kwargs['database_type'] = args.get('database_type')
        return kwargs

    def get_object_list_data(self, **kwargs):
        """Return the database(connection) list"""
        order_column = kwargs.get('order_column')
        order_direction = kwargs.get('order_direction')
        page = kwargs.get('page')
        page_size = kwargs.get('page_size')
        filter = kwargs.get('filter')
        database_type = kwargs.get('database_type')
        user_id = kwargs.get('user_id')

        query = db.session.query(Database, User) \
            .filter(Database.created_by_fk == User.id,
                    Database.created_by_fk == user_id)

        if database_type:
            match_str = '{}%'.format(database_type)
            query = query.filter(
                Database.sqlalchemy_uri.ilike(match_str)
            )

        if filter:
            filter_str = '%{}%'.format(filter.lower())
            query = query.filter(
                or_(
                    Database.database_name.ilike(filter_str),
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

    @catch_exception
    @expose("/online_info/<id>/", methods=['GET'])
    def online_info(self, id):
        objects = self.associated_objects([id, ])
        info = _("Releasing database connection {conn} will make these usable "
                 "for other users: \nDataset: {dataset}, \nSlice: {slice}")\
            .format(conn=objects.get('database'),
                    dataset=objects.get('dataset'),
                    slice=objects.get('slice'))
        return json_response(data=info)

    @catch_exception
    @expose("/offline_info/<id>/", methods=['GET'])
    def offline_info(self, id):
        objects = self.associated_objects([id, ])
        info = _("Changing database connection {conn} to offline will make these "
                 "unusable for other users: \nDataset: {dataset}, \nSlice: {slice}")\
            .format(conn=objects.get('database'),
                    dataset=objects.get('dataset'),
                    slice=objects.get('slice'))
        return json_response(data=info)

    @catch_exception
    @expose("/delete_info/<id>/", methods=['GET'])
    def delete_info(self, id):
        objects = self.associated_objects([id, ])
        info = _("Deleting database connection {conn} will make these unusable: "
               "\nDataset: {dataset}, \nSlice: {slice}")\
            .format(conn=objects.get('database'),
                    dataset=objects.get('dataset'),
                    slice=objects.get('slice'))
        return json_response(data=info)

    @classmethod
    def associated_objects(cls, ids):
        dbs = db.session.query(Database).filter(Database.id.in_(ids)).all()
        if len(dbs) != len(ids):
            raise SupersetException(
                _("Error parameter ids: {ids}, queried {num} database connection(s)")
                    .format(ids=ids, num=len(dbs))
            )

        datasets = []
        for d in dbs:
            datasets.extend(d.dataset)
        dataset_ids = [dataset.id for dataset in datasets]

        user_id = get_user_id()
        slices = db.session.query(Slice) \
            .filter(
                or_(Slice.datasource_id.in_(dataset_ids),
                    Slice.database_id.in_(ids)),
                or_(Slice.created_by_fk == user_id,
                    Slice.online == 1)
            ) \
            .all()
        return {'database': dbs, 'slice': slices, 'dataset': datasets}


class HDFSConnectionModelView(SupersetModelView):
    model = models.HDFSConnection
    datamodel = SQLAInterface(models.HDFSConnection)
    route_base = '/hdfsconnection'
    list_columns = ['id', 'connection_name']
    show_columns = ['id', 'connection_name', 'description', 'httpfs',
                    'database_id', 'database']
    add_columns = ['connection_name', 'description', 'httpfs', 'database_id']
    edit_columns = add_columns

    str_columns = ['database', ]

    def get_object_list_data(self, **kwargs):
        """Return the hdfs connections.
        There won't be a lot of hdfs conenctions, so just use 'page_size'
        """
        page_size = kwargs.get('page_size')
        user_id = kwargs.get('user_id')

        query = db.session.query(HDFSConnection, User) \
            .filter(HDFSConnection.created_by_fk == User.id,
                    or_(
                        HDFSConnection.created_by_fk == user_id,
                        HDFSConnection.online == 1)
                    )
        count = query.count()
        query = query.order_by(HDFSConnection.connection_name.desc()) \
            .limit(page_size)

        data = []
        for obj, user in query.all():
            line = {}
            for col in self.list_columns:
                if col in self.str_columns:
                    line[col] = str(getattr(obj, col, None))
                else:
                    line[col] = getattr(obj, col, None)
            data.append(line)

        response = {}
        response['count'] = count
        response['page_size'] = page_size
        response['data'] = data
        return response

    def pre_add(self, conn):
        self.check_column_values(conn)

    def post_add(self, conn):
        Log.log_add(conn, 'hdfsconnection', get_user_id())

    def pre_update(self, conn):
        check_ownership(conn)
        self.pre_add(conn)

    def post_update(self, conn):
        Log.log_update(conn, 'hdfsconnection', get_user_id())

    def pre_delete(self, conn):
        check_ownership(conn)

    def post_delete(self, conn):
        Log.log_delete(conn, 'hdfsconnection', get_user_id())

    @staticmethod
    def check_column_values(obj):
        if not obj.connection_name:
            raise SupersetException(NONE_CONNECTION_NAME)
        if not obj.httpfs:
            raise SupersetException(NONE_HTTPFS)
        if not obj.database_id:
            obj.database_id = None

    @catch_exception
    @expose("/online_info/<id>/", methods=['GET'])
    def online_info(self, id):
        objects = self.associated_objects([id, ])
        info = _("Releasing hdfs connection {hconn} will make these usable "
                 "for other users: \nDataset: {dataset},\nSlice: {slice}") \
            .format(hconn=objects.get('hdfs_connection'),
                    dataset=objects.get('dataset'),
                    slice=objects.get('slice'))
        return json_response(data=info)

    @catch_exception
    @expose("/offline_info/<id>/", methods=['GET'])
    def offline_info(self, id):
        objects = self.associated_objects([id, ])
        info = _("Changing hdfs connection {hconn} to offline will make these unusable "
               "for other users: \nDataset: {dataset},\n Slice: {slice}")\
            .format(hconn=objects.get('hdfs_connection'),
                    dataset=objects.get('dataset'),
                    slice=objects.get('slice'))
        return json_response(data=info)

    @catch_exception
    @expose("/delete_info/<id>/", methods=['GET'])
    def delete_info(self, id):
        objects = self.associated_objects([id, ])
        info = _("Deleting hdfs connection {hconn} will make these unusable: "
               "\nDataset: {dataset},\nSlice: {slice}")\
            .format(hconn=objects.get('hdfs_connection'),
                    dataset=objects.get('dataset'),
                    slice=objects.get('slice'))
        return json_response(data=info)

    @classmethod
    def associated_objects(cls, ids):
        hconns = db.session.query(HDFSConnection)\
            .filter(HDFSConnection.id.in_(ids))\
            .all()
        if len(hconns) != len(ids):
            raise SupersetException(
                _("Error parameter ids: {ids}, queried {num} hdfs connection(s)")
                    .format(ids=ids, num=len(hconns))
            )

        hdfs_tables = []
        for hconn in hconns:
            hdfs_tables.extend(hconn.hdfs_table)

        datasets = [t.dataset for t in hdfs_tables]
        dataset_ids = [d.id for d in datasets]
        user_id = get_user_id()
        slices = (
            db.session.query(Slice)
            .filter(Slice.datasource_id.in_(dataset_ids),
                    or_(Slice.created_by_fk == user_id,
                        Slice.online == 1))
            .all()
        )
        return {'hdfs_connection': hconns, 'dataset': datasets, 'slice': slices}

    @catch_hdfs_exception
    @expose('/test/', methods=['GET'])
    def test_hdfs_connection(self):
        httpfs = request.args.get('httpfs')
        client, response = HDFSBrowser.login_filerobot(httpfs=httpfs)
        response = client.list('/', 1, 3)
        if response.status_code == requests.codes.ok:
            return json_response(
                message=_('Httpfs [{httpfs}] is available').format(httpfs=httpfs))
        else:
            return json_response(
                message=_('Httpfs [{httpfs}] is unavailable').format(httpfs=httpfs),
                status=500)


class ConnectionView(BaseSupersetView, PageMixin):
    """Connection includes Database and HDFSConnection.
    This view just gets the list data of Database and HDFSConnection
    """
    model = models.Connection
    route_base = '/connection'

    def get_list_args(self, args):
        kwargs = super().get_list_args(args)
        kwargs['connection_type'] = args.get('connection_type')
        return kwargs

    @catch_exception
    @expose('/connection_types/', methods=['GET', ])
    def connection_types(self):
        return json.dumps(list(Connection.connection_types))

    @catch_exception
    @expose('/listdata/', methods=['GET', ])
    def get_list_data(self):
        kwargs = self.get_list_args(request.args)
        list_data = self.get_object_list_data(**kwargs)
        return json.dumps(list_data)

    @catch_exception
    @expose('/muldelete', methods=['POST', ])
    def muldelete(self):
        json_data = json.loads(str(request.data, encoding='utf-8'))
        json_data = {k.lower(): v for k, v in json_data.items()}
        #
        all_user = False
        db_ids = json_data.get('database')
        if db_ids:
            objs = db.session.query(Database) \
                .filter(Database.id.in_(db_ids)).all()
            if len(db_ids) != len(objs):
                raise Exception(
                    _("Error parameter ids: {ids}, queried {num} database connection(s)")
                    .format(ids=db_ids, num=len(objs))
                )
            for obj in objs:
                check_ownership(obj)
                db.session.delete(obj)
                Log.log_delete(obj, 'database', get_user_id())
        #
        hdfs_conn_ids = json_data.get('hdfs')
        if hdfs_conn_ids:
            objs = db.session.query(HDFSConnection) \
                .filter(HDFSConnection.id.in_(hdfs_conn_ids)).all()
            if len(hdfs_conn_ids) != len(objs):
                raise Exception(
                    _("Error parameter ids: {ids}, queried {num} hdfs connection(s)")
                    .format(ids=hdfs_conn_ids, num=len(objs))
                )
            for obj in objs:
                check_ownership(obj)
                db.session.delete(obj)
                Log.log_delete(obj, 'hdfsconnection', get_user_id())

        db.session.commit()
        return json_response(message=DELETE_SUCCESS)

    @catch_exception
    @expose("/muldelete_info/", methods=['POST'])
    def muldelete_info(self):
        json_data = json.loads(str(request.data, encoding='utf-8'))
        json_data = {k.lower(): v for k, v in json_data.items()}
        db_ids = json_data.get('database')
        hdfs_conn_ids = json_data.get('hdfs')

        dbs, hconns, datasets, slices = [], [], [], []
        if db_ids:
            objects = DatabaseView.associated_objects(db_ids)
            dbs = objects.get('database')
            datasets.extend(objects.get('dataset'))
            slices.extend(objects.get('slice'))
        if hdfs_conn_ids:
            objects = HDFSConnectionModelView.associated_objects(hdfs_conn_ids)
            hconns = objects.get('hdfs_connection')
            datasets.extend(objects.get('dataset'))
            slices.extend(objects.get('slice'))

        dataset_names = [d.dataset_name for d in datasets]
        slice_names = [s.slice_name for s in slices]
        dataset_names = list(set(dataset_names))
        slice_names = list(set(slice_names))
        info = _("Deleting database connections {dbs} and hdfs connections {hconns} "
                 "will make these objects unusable: "
                 "\nDataset: {dataset}, \nSlice: {slice}") \
            .format(dbs=dbs,
                    hconns=hconns,
                    dataset=dataset_names,
                    slice=slice_names)
        return json_response(data=info)

    def get_object_list_data(self, **kwargs):
        order_column = kwargs.get('order_column')
        order_direction = kwargs.get('order_direction')
        page = kwargs.get('page')
        page_size = kwargs.get('page_size')
        filter = kwargs.get('filter')
        user_id = kwargs.get('user_id')
        connection_type = kwargs.get('connection_type')

        s1 = select([Database.id.label('id'),
                     Database.database_name.label('name'),
                     Database.online.label('online'),
                     Database.created_by_fk.label('user_id'),
                     Database.changed_on.label('changed_on'),
                     Database.sqlalchemy_uri.label('connection_type'),
                     Database.expose.label('expose')])
        s2 = select([HDFSConnection.id.label('id'),
                     HDFSConnection.connection_name.label('name'),
                     HDFSConnection.online.label('online'),
                     HDFSConnection.created_by_fk.label('user_id'),
                     HDFSConnection.changed_on.label('changed_on'),
                     cast(literal('HDFS'), type_=sqla.String).label('connection_type'),
                     cast(literal(1), type_=sqla.Integer).label('expose')])
        union_q = s1.union_all(s2).alias('connection')
        query = (
            db.session.query(union_q, User.username)
            .outerjoin(User, User.id == union_q.c.user_id)
            .filter(
                or_(
                    union_q.c.user_id == user_id,
                    union_q.c.online == 1),
                union_q.c.expose == 1)
        )

        if connection_type:
            match_str = '{}%'.format(connection_type)
            query = query.filter(
                    union_q.c.connection_type.ilike(match_str)
            )

        if filter:
            filter_str = '%{}%'.format(filter.lower())
            query = query.filter(
                or_(
                    union_q.c.name.ilike(filter_str),
                    union_q.c.connection_type.ilike(filter_str),
                    User.username.ilike(filter_str)
                )
            )
        count = query.count()

        if order_column:
            try:
                column = self.str_to_column(union_q).get(order_column)
                if order_direction == 'desc':
                    query = query.order_by(column.desc())
                else:
                    query = query.order_by(column)
            except KeyError:
                msg = _('Error order column name: [{name}]').format(name=order_column)
                raise KeyError(msg)

        if page is not None and page >= 0 and page_size and page_size > 0:
            query = query.limit(page_size).offset(page * page_size)

        rs = query.all()
        data = []
        for row in rs:
            type_ = row[5]
            if type_ != 'HDFS':
                url = make_url(type_)
                type_ = url.get_backend_name().upper()
            data.append({
                'id': row[0],
                'name': row[1],
                'online': row[2],
                'changed_on': str(row[4]),
                'connection_type': type_,
                'owner': row[7],
            })

        response = {}
        response['count'] = count
        response['order_column'] = order_column
        response['order_direction'] = 'desc' if order_direction == 'desc' else 'asc'
        response['page'] = page
        response['page_size'] = page_size
        response['data'] = data
        return response

    @staticmethod
    def str_to_column(query):
        return {
            'name': query.c.name,
            'online': query.c.online,
            'changed_on': query.c.changed_on,
            'connection_type': query.c.connection_type,
            'owner': User.username
        }
