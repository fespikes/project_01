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
from sqlalchemy import select, literal, cast, or_, and_
from sqlalchemy.engine.url import make_url

from superset import app, db, models
from superset.timeout_decorator import connection_timeout
from superset.models import Database, HDFSConnection, Connection, Slice, Log
from superset.exception import ParameterException
from superset.views.hdfs import HDFSBrowser, catch_hdfs_exception
from superset.message import *
from .base import (
    SupersetModelView, BaseSupersetView, PageMixin, catch_exception, json_response,
    PermissionManagement
)

config = app.config


class DatabaseView(SupersetModelView, PermissionManagement):  # noqa
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
        Log.log_add(obj, 'database', g.user.id)
        self.add_object_permissions(['database', obj.id])
        self.grant_owner_permissions(['database', obj.id])

    def pre_update(self, obj):
        self.check_edit_perm(['database', obj.id])
        self.pre_add(obj)

    def post_update(self, obj):
        Log.log_update(obj, 'database', g.user.id)

    def pre_delete(self, obj):
        self.check_delete_perm(['dashboard', obj.id])

    def post_delete(self, obj):
        Log.log_delete(obj, 'database', g.user.id)
        self.del_object_permissions(['dashboard', obj.id])

    @staticmethod
    def check_column_values(obj):
        if not obj.database_name:
            raise ParameterException(NONE_CONNECTION_NAME)
        if not obj.sqlalchemy_uri:
            raise ParameterException(NONE_SQLALCHEMY_URI)
        if not obj.args:
            raise ParameterException(NONE_CONNECTION_ARGS)

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

        query = db.session.query(Database, User) \
                .outerjoin(User, Database.created_by_fk == User.id)

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
        if order_column:
            try:
                column = self.str_to_column.get(order_column)
            except KeyError:
                msg = _('Error order column name: [{name}]').format(name=order_column)
                raise ParameterException(msg)
            else:
                if order_direction == 'desc':
                    query = query.order_by(column.desc())
                else:
                    query = query.order_by(column)

        guardian_auth = config.get('GUARDIAN_AUTH', False)
        readable_ids = None
        if guardian_auth:
            from superset.guardian import guardian_client
            readable_ids = \
                guardian_client.search_model_permissions(g.user.username, 'database')
            count = len(readable_ids)
        else:
            count = query.count()
            if page is not None and page >= 0 and page_size and page_size > 0:
                query = query.limit(page_size).offset(page * page_size)

        rs = query.all()
        data = []
        index = 0
        for obj, user in rs:
            if guardian_auth:
                if obj.id in readable_ids:
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
        objects = self.release_affect_objects(id)
        info = _("Releasing connection {conn} will make these usable "
                 "for other users: \nDataset: {dataset}, \nSlice: {slice}")\
            .format(conn=objects.get('database'),
                    dataset=objects.get('dataset'),
                    slice=objects.get('slice'))
        return json_response(data=info)

    @catch_exception
    @expose("/offline_info/<id>/", methods=['GET'])
    def offline_info(self, id):
        objects = self.release_affect_objects(id)
        info = _("Changing connection {conn} to offline will make these "
                 "unusable for other users: \nDataset: {dataset}, \nSlice: {slice}")\
            .format(conn=objects.get('database'),
                    dataset=objects.get('dataset'),
                    slice=objects.get('slice'))
        return json_response(data=info)

    def release_affect_objects(self, id):
        """
        Changing database to online/offline will affect online_datasets based on this
        and online_slices based on these online_datasets
        """
        database = self.get_object(id)
        online_datasets = [d for d in database.dataset if d.online is True]

        online_dataset_ids = [dataset.id for dataset in online_datasets]
        online_slices = db.session.query(Slice) \
            .filter(
                or_(Slice.datasource_id.in_(online_dataset_ids),
                    Slice.database_id == id),
                Slice.online == 1
        ).all()
        return {'database': [database, ],
                'dataset': online_datasets,
                'slice': online_slices}

    @catch_exception
    @expose("/delete_info/<id>/", methods=['GET'])
    def delete_info(self, id):
        objects = self.delete_affect_objects(id)
        info = _("Deleting connection {conn} will make these unusable: "
                 "\nDataset: {dataset}, \nSlice: {slice}")\
            .format(conn=objects.get('database'),
                    dataset=objects.get('dataset'),
                    slice=objects.get('slice'))
        return json_response(data=info)

    def delete_affect_objects(self, id):
        """
        Deleting database will affect myself datasets and online datasets.
        myself slices and online slices based on these online_datasets
        """
        database = self.get_object(id)
        user_id = g.user.id
        online_datasets = [d for d in database.dataset if d.online is True]
        myself_datasets = [d for d in database.dataset if d.created_by_fk == user_id]
        online_dataset_ids = [dataset.id for dataset in online_datasets]
        myself_dataset_ids = [dataset.id for dataset in myself_datasets]

        slices = db.session.query(Slice) \
            .filter(
                or_(
                    and_(
                        or_(Slice.datasource_id.in_(online_dataset_ids),
                            Slice.database_id == id),
                        Slice.online == 1
                    ),
                    and_(
                        or_(Slice.datasource_id.in_(myself_dataset_ids),
                            Slice.database_id == id),
                        Slice.created_by_fk == user_id
                    )
                )
        ).all()
        return {'database': [database, ],
                'dataset': list(set(online_datasets + myself_datasets)),
                'slice': slices}


class HDFSConnectionModelView(SupersetModelView, PermissionManagement):
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
        query = db.session.query(HDFSConnection) \
            .order_by(HDFSConnection.connection_name.desc())

        guardian_auth = config.get('GUARDIAN_AUTH', False)
        readable_ids = None
        if guardian_auth:
            from superset.guardian import guardian_client
            readable_ids = \
                guardian_client.search_model_permissions(g.user.username, 'hdfsconnection')
            count = len(readable_ids)
        else:
            count = query.count()
            if page_size and page_size > 0:
                query = query.limit(page_size)

        rs = query.all()
        data = []
        index = 0
        for obj in rs:
            if guardian_auth:
                if obj.id in readable_ids:
                    index += 1
                    if index > page_size:
                        break
                else:
                    continue
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
        Log.log_add(conn, 'hdfsconnection', g.user.id)
        self.add_object_permissions(['hdfsconnection', conn.id])
        self.grant_owner_permissions(['hdfsconnection', conn.id])

    def pre_update(self, conn):
        self.check_edit_perm(['hdfsconnection', conn.id])
        self.pre_add(conn)

    def post_update(self, conn):
        Log.log_update(conn, 'hdfsconnection', g.user.id)

    def pre_delete(self, conn):
        self.check_delete_perm(['hdfsconnection', conn.id])

    def post_delete(self, conn):
        Log.log_delete(conn, 'hdfsconnection', g.user.id)
        self.del_object_permissions(['hdfsconnection', conn.id])

    @staticmethod
    def check_column_values(obj):
        if not obj.connection_name:
            raise ParameterException(NONE_CONNECTION_NAME)
        if not obj.httpfs:
            raise ParameterException(NONE_HTTPFS)
        if not obj.database_id:
            obj.database_id = None

    @catch_exception
    @expose("/online_info/<id>/", methods=['GET'])
    def online_info(self, id):
        objects = self.release_affect_objects(id)
        info = _("Releasing connection {conn} will make these usable "
                 "for other users: \nDataset: {dataset}, \nSlice: {slice}") \
            .format(conn=objects.get('hdfs_connection'),
                    dataset=objects.get('dataset'),
                    slice=objects.get('slice'))
        return json_response(data=info)

    @catch_exception
    @expose("/offline_info/<id>/", methods=['GET'])
    def offline_info(self, id):
        objects = self.release_affect_objects(id)
        info = _("Changing connection {conn} to offline will make these "
                 "unusable for other users: \nDataset: {dataset}, \nSlice: {slice}") \
            .format(conn=objects.get('hdfs_connection'),
                    dataset=objects.get('dataset'),
                    slice=objects.get('slice'))
        return json_response(data=info)

    def release_affect_objects(self, id):
        """
        Changing hdfs connection to online/offline will affect online_datasets based on this
        and online_slices based on these online_datasets
        """
        hdfs_conn = self.get_object(id)
        hdfs_tables = hdfs_conn.hdfs_table
        datasets = [t.dataset for t in hdfs_tables if t.dataset]
        online_datasets = [d for d in datasets if d.online is True]
        online_dataset_ids = [dataset.id for dataset in online_datasets]

        online_slices = db.session.query(Slice) \
            .filter(
                or_(Slice.datasource_id.in_(online_dataset_ids),
                    Slice.database_id == id),
                Slice.online == 1
        ).all()
        return {'hdfs_connection': [hdfs_conn, ],
                'dataset': online_datasets,
                'slice': online_slices}

    @catch_exception
    @expose("/delete_info/<id>/", methods=['GET'])
    def delete_info(self, id):
        objects = self.delete_affect_objects(id)
        info = _("Deleting connection {conn} will make these unusable: "
                 "\nDataset: {dataset}, \nSlice: {slice}") \
            .format(conn=objects.get('hdfs_connection'),
                    dataset=objects.get('dataset'),
                    slice=objects.get('slice'))
        return json_response(data=info)

    def delete_affect_objects(self, id):
        """
        Deleting hdfs connection will affect myself datasets and online datasets.
        myself slices and online slices based on these online_datasets
        """
        hdfs_conn = self.get_object(id)
        user_id = g.user.id
        hdfs_tables = hdfs_conn.hdfs_table
        datasets = [t.dataset for t in hdfs_tables if t.dataset]

        online_datasets = [d for d in datasets if d.online is True]
        myself_datasets = [d for d in datasets if d.created_by_fk == user_id]
        online_dataset_ids = [dataset.id for dataset in online_datasets]
        myself_dataset_ids = [dataset.id for dataset in myself_datasets]

        slices = db.session.query(Slice) \
            .filter(
                or_(
                    and_(
                        or_(Slice.datasource_id.in_(online_dataset_ids),
                            Slice.database_id == id),
                        Slice.online == 1
                    ),
                    and_(
                        or_(Slice.datasource_id.in_(myself_dataset_ids),
                            Slice.database_id == id),
                        Slice.created_by_fk == user_id
                    )
                )
        ).all()
        return {'hdfs_connection': [hdfs_conn, ],
                'dataset': list(set(online_datasets + myself_datasets)),
                'slice': slices
                }

    @catch_hdfs_exception
    @connection_timeout
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


class ConnectionView(BaseSupersetView, PageMixin, PermissionManagement):
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
        return json_response(data=list(Connection.connection_types))

    @catch_exception
    @expose('/listdata/', methods=['GET', ])
    def get_list_data(self):
        kwargs = self.get_list_args(request.args)
        list_data = self.get_object_list_data(**kwargs)
        return json_response(data=list_data)

    @catch_exception
    @expose('/muldelete/', methods=['POST', ])
    def muldelete(self):
        json_data = json.loads(str(request.data, encoding='utf-8'))
        json_data = {k.lower(): v for k, v in json_data.items()}
        #
        db_ids = json_data.get('database')
        if db_ids:
            objs = db.session.query(Database) \
                .filter(Database.id.in_(db_ids)).all()
            if len(db_ids) != len(objs):
                raise ParameterException(_(
                    "Error parameter ids: {ids}, queried {num} connection(s)")
                    .format(ids=db_ids, num=len(objs))
                )
            for obj in objs:
                self.check_delete_perm(['database', obj.id])
                db.session.delete(obj)
                db.session.commit()
                Log.log_delete(obj, 'database', g.user.id)
        #
        hdfs_conn_ids = json_data.get('hdfs')
        if hdfs_conn_ids:
            objs = db.session.query(HDFSConnection) \
                .filter(HDFSConnection.id.in_(hdfs_conn_ids)).all()
            if len(hdfs_conn_ids) != len(objs):
                raise ParameterException(_(
                    "Error parameter ids: {ids}, queried {num} connection(s)")
                    .format(ids=hdfs_conn_ids, num=len(objs))
                )
            for obj in objs:
                self.check_delete_perm(['hdfsconnection', obj.id])
                db.session.delete(obj)
                db.session.commit()
                Log.log_delete(obj, 'hdfsconnection', g.user.id)

        return json_response(message=DELETE_SUCCESS)

    @catch_exception
    @expose("/muldelete_info/", methods=['POST'])
    def muldelete_info(self):
        """
        Deleting connections will affect myself datasets and online datasets.
        myself slices and online slices based on these online_datasets
        """
        json_data = json.loads(str(request.data, encoding='utf-8'))
        json_data = {k.lower(): v for k, v in json_data.items()}
        db_ids = json_data.get('database')
        hdfs_conn_ids = json_data.get('hdfs')
        user_id = g.user.id

        dbs, hconns, datasets, slices = [], [], [], []
        if db_ids:
            dbs = db.session.query(Database).filter(
                Database.id.in_(db_ids)
            ).all()
            if len(db_ids) != len(dbs):
                raise ParameterException(_(
                    "Error parameter ids: {ids}, queried {num} connection(s)")
                    .format(ids=db_ids, num=len(dbs))
                )
        if hdfs_conn_ids:
            hconns = db.session.query(HDFSConnection).filter(
                HDFSConnection.id.in_(hdfs_conn_ids)
            ).all()
            if len(hdfs_conn_ids) != len(hconns):
                raise ParameterException(_(
                    "Error parameter ids: {ids}, queried {num} connection(s)")
                    .format(ids=hdfs_conn_ids, num=len(hconns))
                )

        for d in dbs:
            datasets.extend(d.dataset)
        for hconn in hconns:
            for htable in hconn.hdfs_table:
                if htable.dataset:
                    datasets.append(htable.dataset)

        online_datasets = [d for d in datasets if d.online is True]
        myself_datasets = [d for d in datasets if d.created_by_fk == user_id]
        online_dataset_ids = [dataset.id for dataset in online_datasets]
        myself_dataset_ids = [dataset.id for dataset in myself_datasets]

        slices = db.session.query(Slice) \
            .filter(
                or_(
                    and_(
                        or_(Slice.datasource_id.in_(online_dataset_ids),
                            Slice.database_id == id),
                        Slice.online == 1
                    ),
                    and_(
                        or_(Slice.datasource_id.in_(myself_dataset_ids),
                            Slice.database_id == id),
                        Slice.created_by_fk == user_id
                    )
                )
        ).all()

        info = _("Deleting connection {conn} will make these unusable: "
                 "\nDataset: {dataset}, \nSlice: {slice}") \
            .format(conn=dbs + hconns,
                    dataset=list(set(online_datasets + myself_datasets)),
                    slice=slices)
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
            .filter(union_q.c.expose == 1)
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
        if order_column:
            try:
                column = self.str_to_column(union_q).get(order_column)
                if order_direction == 'desc':
                    query = query.order_by(column.desc())
                else:
                    query = query.order_by(column)
            except KeyError:
                msg = _('Error order column name: [{name}]').format(name=order_column)
                raise ParameterException(msg)

        guardian_auth = config.get('GUARDIAN_AUTH', False)
        readable_db_ids = None
        readable_hdfs_ids = None
        if guardian_auth:
            from superset.guardian import guardian_client
            username = g.user.username
            readable_db_ids = \
                guardian_client.search_model_permissions(username, 'database')
            readable_hdfs_ids = \
                guardian_client.search_model_permissions(username, 'hdfsconnection')
            count = len(readable_db_ids) + len(readable_hdfs_ids)
        else:
            count = query.count()
            if page is not None and page >= 0 and page_size and page_size > 0:
                query = query.limit(page_size).offset(page * page_size)

        rs = query.all()
        data = []
        index = 0
        for row in rs:
            if guardian_auth:
                type_ = row[5]
                if (type_ == 'HDFS' and row[0] in readable_hdfs_ids) \
                        or (type_ != 'HDFS' and row[0] in readable_db_ids):
                    index += 1
                    if index <= page * page_size:
                        continue
                    elif index > (page+1) * page_size:
                        break
                else:
                    continue

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
