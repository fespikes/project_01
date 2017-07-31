from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import json
import functools
import requests
import string
import random
from flask import g, request, Response
from flask_babel import gettext as __
from flask_appbuilder import BaseView, expose
from flask_appbuilder.security.views import AuthDBView

from fileRobot_client.FileRobotClientFactory import fileRobotClientFactory
from fileRobot_common.conf.FileRobotConfiguration import FileRobotConfiguartion
from fileRobot_common.conf.FileRobotVars import FileRobotVars

from superset import app, db, appbuilder
from superset.utils import SupersetException
from superset.models import HDFSConnection
from .base import catch_exception

config = app.config


def ensure_logined(f):
    """
    A decorator to label an endpoint as an API. Catches uncaught exceptions and
    return the response in the JSON format
    """
    def wraps(self, *args, **kwargs):
        if self.client is None:
            self.re_login()
        return f(self, *args, **kwargs)
    return functools.update_wrapper(wraps, f)


class HDFSBrowser(BaseView):
    route_base = '/hdfs'
    retry_times = 3  # re_login times

    def __init__(self):
        super(HDFSBrowser, self).__init__()
        self.client = None
        self.hdfs_conn_id = None

    @catch_exception
    @expose('/')
    def render_html(self):
        return self.render_template('superset/hdfsList.html')

    @catch_exception
    @expose('/login/', methods=['GET'])
    def login(self):
        id = request.args.get('hdfs_conn_id')
        self.hdfs_conn_id = int(id) if id else self.hdfs_conn_id
        args = self.get_login_args(self.hdfs_conn_id)
        self.client, response = self.do_login(**args)
        if response.status_code != requests.codes.ok:
            response.raise_for_status()
        return Response("Login hdfs_micro_service success")

    @catch_exception
    @expose('/logout/', methods=['GET'])
    def logout(self):
        self.client.logout()

    @catch_exception
    @ensure_logined
    @expose('/list/', methods=['GET'])
    def list(self):
        # TODO page
        path = request.args.get('path')
        page_num = request.args.get('page_num', 0)
        path_size = request.args.get('path_size', 10)
        response = self.client.list(path)
        return Response(response.text)

    @catch_exception
    @ensure_logined
    @expose('/download/', methods=['GET'])
    def download(self):
        path = request.args.get('path')
        response = self.client.download(path)
        return Response(response.text)

    @catch_exception
    @ensure_logined
    @expose('/upload/', methods=['POST'])
    def upload(self):
        f = request.data
        dest_path = request.args.get('dest_path')
        file_name = request.args.get('file_name')
        response = self.client.upload(dest_path, {'file': (file_name, f)})
        return Response(response.text)

    @catch_exception
    @ensure_logined
    @expose('/remove/', methods=['POST'])
    def remove(self):
        args = self.get_request_data()
        paths = ';'.join(args.get('path'))
        response = self.client.remove(paths)
        return Response(response.text)

    @catch_exception
    @ensure_logined
    @expose('/move/', methods=['POST'])
    def move(self):
        args = self.get_request_data()
        paths = ';'.join(args.get('path'))
        dest_path = args.get('dest_path')
        response = self.client.move(paths, dest_path)
        return Response(response.text)

    @catch_exception
    @ensure_logined
    @expose('/copy/', methods=['POST'])
    def copy(self):
        args = self.get_request_data()
        paths = ';'.join(args.get('path'))
        dest_path = args.get('dest_path')
        response = self.client.copy(paths, dest_path)
        return Response(response.text)

    @catch_exception
    @ensure_logined
    @expose('/mkdir/', methods=['GET'])
    def mkdir(self):
        path = request.args.get('path')
        dir_name = request.args.get('dir_name')
        response = self.client.mkdir(path, dir_name)
        return Response(response.text)

    @catch_exception
    @ensure_logined
    @expose('/rmdir/', methods=['POST'])
    def rmdir(self):
        args = self.get_request_data()
        paths = ';'.join(args.get('path'))
        response = self.client.rmdir(paths)
        return Response(response.text)

    @catch_exception
    @ensure_logined
    @expose('/preview/', methods=['GET'])
    def preview(self):
        path = request.args.get('path')
        response = self.client.preview(path)
        return Response(response.text)

    @catch_exception
    @ensure_logined
    @expose('/chmod/', methods=['GET'])
    def chmod(self):
        path = request.args.get('path')
        mode = request.args.get('mode')
        response = self.client.chmod(path, mode)
        return Response(response.text)

    def get_request_data(self):
        return json.loads(str(request.data, encoding='utf-8'))

    def re_login(self):
        args = self.get_login_args(self.hdfs_conn_id)
        for index in range(self.retry_times):
            self.client, response = self.do_login(**args)
            if response.status_code == requests.codes.ok:
                return True
        raise SupersetException('Login hdfs micro service failed.')

    @staticmethod
    def get_login_args(hdfs_conn_id=None):
        def get_httpfs(hdfs_conn_id=None):
            if hdfs_conn_id:
                conn = db.session.query(HDFSConnection) \
                    .filter_by(id=hdfs_conn_id).first()
            else:
                conn = db.session.query(HDFSConnection) \
                    .order_by(HDFSConnection.id).first()
            return conn.httpfs

        httpfs = get_httpfs(hdfs_conn_id)
        server = app.config.get('HDFS_MICROSERVICES_SERVER')
        username = g.user.username
        password = AuthDBView.mock_user.get(username)
        return {'server': server,
                'username': username,
                'password': password,
                'httpfs': httpfs}

    @classmethod
    def do_login(cls, server='', username='', password='', httpfs=''):
        if not server:
            raise SupersetException('Cannot get HDFS_MICROSERVICES_SERVER from config.')
        if not password:
            raise SupersetException('Need password to access hdfs_micro_service, '
                                    'try logout and then login.')
        conf = FileRobotConfiguartion()
        conf.set(FileRobotVars.FILEROBOT_SERVER_ADDRESS.varname, server)
        client = fileRobotClientFactory.getInstance(conf)
        response = client.login(username, password, httpfs)
        return client, response

appbuilder.add_view_no_menu(HDFSBrowser)
appbuilder.add_link(
    'HDFS Browser',
    href='/hdfs/',
    label=__("HDFS Browser"),
    icon="fa-flask",
    category='',
    category_icon='')