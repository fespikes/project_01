from flask import (flash, request)
from flask_babel import lazy_gettext as _
from flask_restful import Resource, Api, reqparse

from superset import (app, db, security, sm)
from superset.models import Database, SqlaTable
from superset.hdfsmodule.filebrowser import Filebrowser
from superset.hdfsmodule.models import HDFSConnection2, HDFSTable
from superset.utils import get_hdfs_user_from_principal

from werkzeug import secure_filename
from configobj import ConfigObj
import json
import os
import threading


api = Api(app)
mutex = threading.Lock()

hdfsconn_post_parser = reqparse.RequestParser()
hdfsconn_post_parser.add_argument(
    'connection_name',
    type=str,
    location=['args', 'form'],
    required=True,
    help="connection_name is required"
)
hdfsconn_post_parser.add_argument(
    'database_id',
    type=int,
    location=['args', 'form'],
    required=True,
    help="database_id is required"
)
hdfsconn_post_parser.add_argument(
    'config_file',
    location=['files'],
    required=True,
    help="config file is required"
)
hdfsconn_post_parser.add_argument(
    'principal',
    type=str,
    location=['args', 'form'],
    required=True,
    help="principal is required"
)
hdfsconn_post_parser.add_argument(
    'keytab_file',
    location=['files'],
    required=True,
    help="keytab file is required"
)

hdfsconn_put_parser = reqparse.RequestParser()
hdfsconn_put_parser.add_argument(
    'database_id',
    type=int,
    location=['args', 'form'],
    help="database id is required"
)
hdfsconn_put_parser.add_argument(
    'config_file',
    location=['files'],
    help="config file is required"
)
hdfsconn_put_parser.add_argument(
    'principal',
    type=str,
    location=['args', 'form'],
    help="principal is required"
)
hdfsconn_put_parser.add_argument(
    'keytab_file',
    location=['files'],
    help="keytab file is required"
)


class HDFSConnRes(Resource):
    def get(self, hdfsconnection_id=None):

        hdfsconnection_list = []
        rs = []

        if hdfsconnection_id is not None:
            hdfsconnection = db.session.query(HDFSConnection2).get(hdfsconnection_id)
            if hdfsconnection is not None:
                hdfsconnection_list.append(hdfsconnection)
        else:
            hdfsconnection_list = db.session.query(HDFSConnection2).all()

        if hdfsconnection_list == []:
            return "no hdfs connection satisfied the condition found", 404

        for index in range(len(hdfsconnection_list)):
            data = {'id':hdfsconnection_list[index].id, 'connection_name':hdfsconnection_list[index].connection_name, 'changed_on':hdfsconnection_list[index].changed_on.strftime('%Y-%m-%d %H:%M:%S')}
            rs.append(data)

        return json.dumps(rs), 200

    def post(self):
        args = hdfsconn_post_parser.parse_args(strict=True)

        if db.session.query(HDFSConnection2).filter_by(connection_name=args['connection_name']).one_or_none() is not None:
            return "the hdfs connection with the same name has already been created", 400

        hdfsconnection2 = HDFSConnection2()
        hdfsconnection2.connection_name = args['connection_name']
        hdfsconnection2.database_id = args['database_id']
        hdfsconnection2.principal = args['principal']
        hdfs_user = get_hdfs_user_from_principal(args['principal'])
        if hdfs_user:
            hdfsconnection2.hdfs_user = hdfs_user
        else:
            return "can not extract the hdfs user from principal", 400

        config_file = request.files['config_file']
        rs = self.analyse_config_file(config_file, hdfsconnection2)
        if not rs[0]:
            return rs[1], 400

        keytab_file = request.files['keytab_file']
        hdfsconnection2.keytab_file = keytab_file.read()

        db.session.add(hdfsconnection2)
        db.session.commit()

        return "succeed to add a new hdfs connection", 201

    def put(self, hdfsconnection_id=None):

        if hdfsconnection_id is None:
            return "connection id is needed to execute a put operation", 400

        args = hdfsconn_put_parser.parse_args(strict=True)

        hdfsconnection = db.session.query(HDFSConnection2).get(hdfsconnection_id)
        if hdfsconnection is None:
            return "the hdfs connection does not exist, please create it first", 400

        if args['database_id'] is not None:
            hdfsconnection.database_id = args['database_id']

        if args['principal'] is not None:
            hdfsconnection.principal = args['principal']

        if request.files['config_file'] is not None:
            rs = self.analyse_config_file(request.files['config_file'], hdfsconnection)
            if not rs[0]:
                return rs[1], 400

        if request.files['keytab_file'] is not None:
            hdfsconnection.keytab_file = request.files['keytab_file'].read()

        db.session.commit()

        return "succeed to modify an hdfs connection", 200

    def delete(self, hdfsconnection_id=None):

        if hdfsconnection_id is None:
            return "connection id is needed to execute a delete operation", 400

        hdfsconnection = db.session.query(HDFSConnection2).get(hdfsconnection_id)
        if hdfsconnection is None:
            return "the hdfs connection does not exist, please check you connection id", 404

        db.session.delete(hdfsconnection)
        db.session.commit()

        return "succeed to delete an hdfs connection", 204

    def analyse_config_file(self, config_file, hdfsconnection):
        if mutex.acquire(1):
            try:
                filename = secure_filename(config_file.filename)
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                config_file.save(filepath)

                config = ConfigObj(filepath)
                hdfsconnection.webhdfs_url = config['hadoop']['hdfs_clusters']['default']['webhdfs_url']
                hdfsconnection.fs_defaultfs = config['hadoop']['hdfs_clusters']['default']['fs_defaultfs']
                hdfsconnection.logical_name = config['hadoop']['hdfs_clusters']['default']['logical_name']

                os.remove(filepath)
                mutex.release()
                return True, "succeed to analyse the config file"
            except Exception:
                mutex.release()
                return False, "unexpected error occurred"
        else:
            return False, "can not get the mutex lock"


hdfstable_post_parser = reqparse.RequestParser()
hdfstable_post_parser.add_argument(
    'table_name',
    type=str,
    location=['json'],
    required=True,
    help="table name is required"
)
hdfstable_post_parser.add_argument(
    'hdfs_connection_id',
    type=int,
    location=['json'],
    required=True,
    help="hdfs connection id is required"
)
hdfstable_post_parser.add_argument(
    'hdfs_path',
    type=str,
    location=['json'],
    required=True,
    help="hdfs path is required"
)
hdfstable_post_parser.add_argument(
    'column_desc',
    type=dict,
    location=['json'],
    help="column des is required"
)
hdfstable_post_parser.add_argument(
    'separator',
    type=str,
    location=['json'],
    help="separator is required"
)

hdfstable_put_parser = reqparse.RequestParser()
hdfstable_put_parser.add_argument(
    'column_desc',
    type=dict,
    location=['json'],
    required=True,
    help="column des is required"
)
hdfstable_put_parser.add_argument(
    'separator',
    type=str,
    location=['json'],
    required=True,
    help="separator is required"
)


class HDFSTableRes(Resource):
    def __init__(self):
        self.filebrowser = Filebrowser()

    def get(self, table_id=None):
        hdfstable_list = []
        rs = []

        if table_id is not None:
            hdfstable = db.session.query(HDFSTable).get(table_id)
            if hdfstable is not None:
                hdfstable_list.append(hdfstable)
        else:
            hdfstable_list = db.session.query(HDFSTable).all()

        if hdfstable_list == []:
            return "no hdfs table satisfied the condition found", 404

        for index in range(len(hdfstable_list)):
            data = {'id': hdfstable_list[index].id,
                    'hdfs_path': hdfstable_list[index].hdfs_path,
                    'changed_on': str(hdfstable_list[index].changed_on)}
            rs.append(data)

        return json.dumps(rs), 200

    def post(self):
        args = hdfstable_post_parser.parse_args(strict=True)

        hdfstable = HDFSTable()
        hdfstable.hdfs_connection_id = args['hdfs_connection_id']
        hdfstable.hdfs_path = args['hdfs_path']
        hdfstable.separator = args['separator']

        table_name = args['table_name']
        column_desc = args['column_desc']

        if hdfstable.separator is None:
            hdfstable.separator = ','

        create_sql = None
        if column_desc is None:
            hdfsconnection = db.session.query(HDFSConnection2).get(hdfstable.hdfs_connection_id)
            if hdfsconnection is None:
                return "no hdfs connection found with the connection id", 400
            fs = self.filebrowser.get_fs_from_cache(hdfsconnection)

            file_path = None
            dirlist = self.filebrowser.view(request, fs, hdfstable.hdfs_path)
            data_json = json.loads(dirlist.data.decode())
            files = data_json['files']
            for file in files:
                if file['type'] == 'file':
                    file_path = file['path']
                    break

            if file_path is None:
                return "no file can read in the hdfs path", 400

            rs = self.filebrowser.read(fs, file_path, hdfstable.separator)
            data_json = json.loads(rs.data.decode())
            if data_json:
                create_sql = "create external table " + table_name + "("
                for index in range(len(data_json['row0'])):
                    create_sql = create_sql + "col" + str(index+1) + " string,"
                create_sql = create_sql[:-1] + ") row format delimited fields terminated by '" + hdfstable.separator + "' location '" + hdfstable.hdfs_path + "'"
            else:
                return "no data in the file when executing preview operation", 400
        else:
            create_sql = "create external table " + table_name + "("
            for column_name, column_type in column_desc.items():
                create_sql = create_sql + column_name + " " + column_type + ","
            create_sql = create_sql[:-1] + ") row format delimited fields terminated by ',' location '" + hdfstable.hdfs_path + "'"

        database = db.session.query(Database).filter(Database.id == HDFSConnection2.database_id, HDFSConnection2.id == hdfstable.hdfs_connection_id).one_or_none()
        if database is None:
            return "no database found with the hdfs connection id", 400
        engine = database.get_sqla_engine()
        engine.execute("drop table if exists " + table_name)
        engine.execute(create_sql)

        db.session.add(hdfstable)
        db.session.commit()

        sqlaTable = SqlaTable()
        sqlaTable.dataset_name = table_name
        sqlaTable.dataset_type = 'hdfs_folder'
        sqlaTable.table_name = table_name
        sqlaTable.database_id = database.id
        sqlaTable.hdfs_table_id = hdfstable.id

        db.session.add(sqlaTable)
        db.session.commit()
        self.merge_perm(sqlaTable)
        return "succeed to add a new hdfs table", 201

    def put(self, table_id=None):
        args = hdfstable_put_parser.parse_args(strict=True)

        if table_id is None:
            return "table id is needed to execute an update operation", 400
        hdfstable = db.session.query(HDFSTable).get(table_id)
        if hdfstable is None:
            return "hdfs table not found", 400
        sqlaTable = db.session.query(SqlaTable).get(hdfstable.table_id)
        if sqlaTable is None:
            return "sqlaTable not found", 400
        database = db.session.query(Database).get(sqlaTable.database_id)
        if database is None:
            return "database not found", 400

        hdfstable.separator = args['separator']
        db.session.commit()

        create_sql = "create external table " + sqlaTable.table_name + "("
        for column_name, column_type in args['column_desc'].items():
            create_sql = create_sql + column_name + " " + column_type + ","
        create_sql = create_sql[:-1] + ") row format delimited fields terminated by '" + hdfstable.separator + "' location '" + hdfstable.hdfs_path + "'"

        engine = database.get_sqla_engine()
        engine.execute("drop table if exists " + sqlaTable.table_name)
        engine.execute(create_sql)

        self.merge_perm(sqlaTable)

        return "succeed to modify an hdfs table", 200

    def delete(self, table_id=None):
        if table_id is None:
            return "table id is needed to execute a delete operation", 400
        hdfstable = db.session.query(HDFSTable).get(table_id)
        if hdfstable is None:
            return "hdfs table not found", 400

        db.session.delete(hdfstable)
        db.session.commit()
        return "succeed to delete an hdfs table", 204

    @staticmethod
    def merge_perm(table):
        table.fetch_metadata()
        security.merge_perm(sm, 'datasource_access', table.get_perm())
        if table.schema:
            security.merge_perm(sm, 'schema_access', table.schema_perm)


hdfsfilebrowser_get_parser = reqparse.RequestParser()
hdfsfilebrowser_get_parser.add_argument(
    'action',
    type=str,
    location=['args', 'form'],
    required=True,
    help="action is required"
)
hdfsfilebrowser_get_parser.add_argument(
    'connection_id',
    type=int,
    location=['args', 'form'],
    required=True,
    help="connection id is required"
)

hdfsfilebrowser_get_parser.add_argument(
    'hdfs_path',
    type=str,
    location=['args', 'form'],
    help="hdfs path is required"
)
hdfsfilebrowser_get_parser.add_argument(
    'page_num',
    type=int,
    location=['args', 'form'],
    help="page num is required"
)
hdfsfilebrowser_get_parser.add_argument(
    'page_size',
    type=int,
    location=['args', 'form'],
    help="page size is required"
)

hdfsfilebrowser_post_parser = reqparse.RequestParser()
hdfsfilebrowser_post_parser.add_argument(
    'action',
    type=str,
    location=['args', 'form'],
    required=True,
    help="action is required"
)
hdfsfilebrowser_post_parser.add_argument(
    'connection_id',
    type=int,
    location=['args', 'form'],
    required=True,
    help="connection id is required"
)
hdfsfilebrowser_post_parser.add_argument(
    'hdfs_path',
    type=str,
    location=['args', 'form'],
    required=True,
    help="hdfs path is required"
)

hdfsfilebrowser_post_parser.add_argument(
    'hdfs_file',
    location=['files'],
    help="hdfs file is required"
)
hdfsfilebrowser_post_parser.add_argument(
    'dir_name',
    type=str,
    location=['args', 'form'],
    help="dir name is required"
)
hdfsfilebrowser_post_parser.add_argument(
    'dest_path',
    type=str,
    location=['args', 'form'],
    help="destination path is required"
)


class HDFSFileBrowserRes(Resource):
    def __init__(self):
        self.filebrowser = Filebrowser()
        self.actionlist = {"list": self.list, "download": self.download, "upload": self.upload, "remove": self.remove,
                           "move": self.move, "copy": self.copy, "mkdir": self.mkdir, "rmdir": self.rmdir}

    def get(self):
        args = hdfsfilebrowser_get_parser.parse_args(strict=True)
        connection = db.session.query(HDFSConnection2).get(args['connection_id'])
        if connection is None:
            return "no hdfs connection found with the connection id", 400

        return self.actionlist.get(args['action'])(args, connection)

    def post(self):
        args = hdfsfilebrowser_post_parser.parse_args(strict=True)
        connection = db.session.query(HDFSConnection2).get(args['connection_id'])
        if connection is None:
            return "no hdfs connection found with the connection id", 400

        return self.actionlist.get(args['action'])(args, connection)

    def list(self, args, connection):
        hdfs_path = args['hdfs_path']
        if hdfs_path is None:
            hdfs_path = "/user/" + get_hdfs_user_from_principal(connection.principal)

        fs = self.filebrowser.get_fs_from_cache(connection)
        return self.filebrowser.view(request, fs, hdfs_path)

    def download(self, args, connection):
        hdfs_path = args['hdfs_path']
        if hdfs_path is None:
            return "hdfs path not found", 400

        fs = self.filebrowser.get_fs_from_cache(connection)
        return self.filebrowser.download_file(fs, hdfs_path)

    def upload(self, args, connection):
        hdfs_file = request.files['hdfs_file']
        if hdfs_file is None:
            return "hdfs file not found", 400

        fs = self.filebrowser.get_fs_from_cache(connection)
        return self.filebrowser.upload_file(fs, args['hdfs_path'], hdfs_file)

    def remove(self, args, connection):
        fs = self.filebrowser.get_fs_from_cache(connection)
        return self.filebrowser.remove(fs, args['hdfs_path'])

    def move(self, args, connection):
        dest_path = args['dest_path']
        if dest_path is None:
            return "destination path not found", 400

        fs = self.filebrowser.get_fs_from_cache(connection)
        return self.filebrowser.copy_or_move(fs, args['hdfs_path'], dest_path, args['action'])

    def copy(self, args, connection):
        dest_path = args['dest_path']
        if dest_path is None:
            return "destination path not found", 400

        fs = self.filebrowser.get_fs_from_cache(connection)
        return self.filebrowser.copy_or_move(fs, args['hdfs_path'], dest_path, args['action'])

    def mkdir(self, args, connection):
        dir_name = args['dir_name']
        if dir_name is None:
            return "dir name not found", 400

        fs = self.filebrowser.get_fs_from_cache(connection)
        return self.filebrowser.mkdir(fs, args['hdfs_path'], dir_name)

    def rmdir(self, args, connection):
        fs = self.filebrowser.get_fs_from_cache(connection)
        return self.filebrowser.rmdir(fs, args['hdfs_path'])


hdfsfilepreview_get_parser = reqparse.RequestParser()
hdfsfilepreview_get_parser.add_argument(
    'connection_name',
    type=str,
    location=['args', 'form',  'headers'],
    required=True,
    help="connection name is required"
)
hdfsfilepreview_get_parser.add_argument(
    'hdfs_path',
    type=str,
    location=['args', 'form', 'headers'],
    required=True,
    help="hdfs path is required"
)
hdfsfilepreview_get_parser.add_argument(
    'separator',
    type=str,
    location=['args', 'form', 'headers'],
    help="separator is required"
)


class HDFSFilePreviewRes(Resource):
    def __init__(self):
        self.filebrowser = Filebrowser()

    def get(self):
        args = hdfsfilepreview_get_parser.parse_args(strict=True)

        connection = db.session.query(HDFSConnection2).filter_by(connection_name=args['connection_name']).one()
        fs = self.filebrowser.get_fs_from_cache(connection)
        return self.filebrowser.read(fs, args['hdfs_path'], args['separator'])


api.add_resource(HDFSConnRes, "/hdfsconnection", "/hdfsconnection/<int:hdfsconnection_id>")
api.add_resource(HDFSTableRes, "/hdfstable", "/hdfstable/<int:table_id>")
api.add_resource(HDFSFileBrowserRes, "/hdfsfilebrowser")
api.add_resource(HDFSFilePreviewRes, "/hdfsfilepreview")