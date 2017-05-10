from flask import (g, request)
from flask_restful import Resource, Api, reqparse

from superset import (app, db)
from superset.hdfsmodule.filebrowser import Filebrowser
from superset.hdfsmodule.models import HDFSConnection2
from superset.utils import get_hdfs_user_from_principal

from werkzeug import secure_filename
from configobj import ConfigObj
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


class HDFSConnRes(Resource):
    def get(self):
        pass

    def post(self):
        args = hdfsconn_post_parser.parse_args(strict=True)

        hdfsconnection2 = HDFSConnection2()
        hdfsconnection2.connection_name = args['connection_name']
        hdfsconnection2.database_id = args['database_id']
        hdfsconnection2.principal = args['principal']
        hdfs_user = get_hdfs_user_from_principal(args['principal'])
        if hdfs_user:
            hdfsconnection2.hdfs_user = hdfs_user
        else:
            return "can not extract the hdfs user from principal",400

        config_file = request.files['config_file']
        if mutex.acquire(1):
            filename = secure_filename(config_file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            config_file.save(filepath)

            config = ConfigObj(filepath)
            hdfsconnection2.webhdfs_url = config['hadoop']['hdfs_clusters']['default']['webhdfs_url']
            hdfsconnection2.fs_defaultfs = config['hadoop']['hdfs_clusters']['default']['fs_defaultfs']
            hdfsconnection2.logical_name = config['hadoop']['hdfs_clusters']['default']['logical_name']

            os.remove(filepath)
            mutex.release()
        else:
            return "can not get the mutex lock",400

        keytab_file = request.files['keytab_file']
        hdfsconnection2.keytab_file = keytab_file.read()

        db.session.add(hdfsconnection2)
        db.session.commit()

        return "succeed to add a new hdfs connection",201

hdfsfilebrowser_get_parser = reqparse.RequestParser()
hdfsfilebrowser_get_parser.add_argument(
    'connection_name',
    type=str,
    location=['args', 'form'],
    required=True,
    help="connection_name is required"
)


class HDFSFileBrowserRes(Resource):
    def __init__(self):
        self.filebrowser = Filebrowser()

    def get(self):
        args = hdfsfilebrowser_get_parser.parse_args(strict=True)

        connection = db.session.query(HDFSConnection2).filter_by(connection_name=args['connection_name']).one()
        fs = self.filebrowser.get_fs_from_cache(connection)
        return self.filebrowser.view(request, fs, "/user/" + get_hdfs_user_from_principal(connection.principal))

api.add_resource(HDFSConnRes,"/hdfsconnection")
api.add_resource(HDFSFileBrowserRes,"/hdfsfilebrowser")