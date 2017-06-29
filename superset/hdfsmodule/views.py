import threading
from flask import request
from flask_restful import Resource, Api, reqparse

from superset import app, db
from superset.hdfsmodule.filebrowser import Filebrowser
from superset.utils import get_hdfs_user_from_principal
from superset.models import HDFSConnection


api = Api(app)
mutex = threading.Lock()

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
        connection = db.session.query(HDFSConnection).get(args['connection_id'])
        if connection is None:
            return "no hdfs connection found with the connection id", 400

        return self.actionlist.get(args['action'])(args, connection)

    def post(self):
        args = hdfsfilebrowser_post_parser.parse_args(strict=True)
        connection = db.session.query(HDFSConnection).get(args['connection_id'])
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


api.add_resource(HDFSFileBrowserRes, "/hdfsfilebrowser")