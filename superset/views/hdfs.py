from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import logging
import json
import functools
import requests
from flask import g, request
from flask_babel import gettext as __
from flask_appbuilder import BaseView, expose

from fileRobot_client.FileRobotClientFactory import fileRobotClientFactory
from fileRobot_common.conf.FileRobotConfiguration import FileRobotConfiguartion
from fileRobot_common.conf.FileRobotVars import FileRobotVars
from fileRobot_common.exception.FileRobotException import FileRobotException

from superset import app, db, appbuilder
from superset.message import *
from superset.utils import SupersetException
from superset.models import HDFSConnection
from .base import catch_exception, json_response

config = app.config


def catch_hdfs_exception(f):
    """
    A decorator to label an endpoint as an API. Catches uncaught exceptions and
    return the response in the JSON format
    """
    def wraps(self, *args, **kwargs):
        try:
            return f(self, *args, **kwargs)
        except FileRobotException as fe:
            if fe.status == 401:
                try:
                    self.re_login()
                    return f(self, *args, **kwargs)
                except FileRobotException as fe2:
                    return json_response(status=fe2.status,
                                         code=fe2.returnCode,
                                         message=fe2.message)
                except Exception as e:
                    logging.exception(e)
                    return json_response(status=500, message=str(e))
            else:
                return json_response(status=fe.status,
                                     code=fe.returnCode,
                                     message=fe.message)

        except SupersetException as se:
            logging.exception(se)
            return json_response(status=500, message=str(se))
        except Exception as e:
            logging.exception(e)
            return json_response(status=500, message=str(e))
    return functools.update_wrapper(wraps, f)


def ensure_logined(f):
    """
    A decorator to label an endpoint as an API. Catches uncaught exceptions and
    return the response in the JSON format
    """
    def wraps(self, *args, **kwargs):
        if self.client is None or self.logined_user != g.user.username:
            self.do_login(self.hdfs_conn_id)
        return f(self, *args, **kwargs)
    return functools.update_wrapper(wraps, f)


class HDFSBrowser(BaseView):
    route_base = '/hdfs'

    def __init__(self):
        super(HDFSBrowser, self).__init__()
        self.client = None
        self.hdfs_conn_id = None
        self.logined_user = ''

    @catch_exception
    @expose('/')
    def render_html(self):
        return self.render_template('superset/hdfsList.html')

    @catch_hdfs_exception
    @expose('/login/', methods=['GET'])
    def login(self):
        hdfs_conn_id = request.args.get('hdfs_conn_id')
        response = self.do_login(hdfs_conn_id)
        return json_response(message=LOGIN_FILEROBOT_SUCCESS,
                             status=response.status_code)

    @catch_hdfs_exception
    @expose('/logout/', methods=['GET'])
    def logout(self):
        self.client.logout()
        return json_response(message=LOGOUT_FILEROBOT_SUCCESS)

    @catch_hdfs_exception
    @ensure_logined
    @expose('/list/', methods=['GET'])
    def list(self):
        path = request.args.get('path')
        page_num = request.args.get('page_num', 1)
        page_size = request.args.get('page_size')
        response = self.client.list(path, page_num, page_size)
        data = json.loads(response.text)
        return json_response(data=data, status=response.status_code)

    @catch_hdfs_exception
    @ensure_logined
    @expose('/download/', methods=['GET'])
    def download(self):
        path = request.args.get('path')
        response = self.client.download(path)
        return json_response(data=response.text, status=response.status_code)

    @catch_hdfs_exception
    @ensure_logined
    @expose('/upload/', methods=['POST'])
    def upload(self):
        f = request.data
        dest_path = request.args.get('dest_path')
        file_name = request.args.get('file_name')
        response = self.client.upload(dest_path, {'files': (file_name, f)})
        return json_response(message=eval(response.text).get("message"),
                             status=response.status_code)

    @catch_hdfs_exception
    @ensure_logined
    @expose('/remove/', methods=['POST'])
    def remove(self):
        args = self.get_request_data()
        paths = ';'.join(args.get('path'))
        response = self.client.remove(paths)
        return json_response(message=eval(response.text).get("message"),
                             status=response.status_code)

    @catch_hdfs_exception
    @ensure_logined
    @expose('/move/', methods=['POST'])
    def move(self):
        args = self.get_request_data()
        paths = ';'.join(args.get('path'))
        dest_path = args.get('dest_path')
        response = self.client.move(paths, dest_path)
        return json_response(message=eval(response.text).get("message"),
                             status=response.status_code)

    @catch_hdfs_exception
    @ensure_logined
    @expose('/copy/', methods=['POST'])
    def copy(self):
        args = self.get_request_data()
        paths = ';'.join(args.get('path'))
        dest_path = args.get('dest_path')
        response = self.client.copy(paths, dest_path)
        return json_response(message=eval(response.text).get("message"),
                             status=response.status_code)

    @catch_hdfs_exception
    @ensure_logined
    @expose('/mkdir/', methods=['GET'])
    def mkdir(self):
        path = request.args.get('path')
        dir_name = request.args.get('dir_name')
        response = self.client.mkdir(path, dir_name)
        return json_response(message=eval(response.text).get("message"),
                             status=response.status_code)

    @catch_hdfs_exception
    @ensure_logined
    @expose('/preview/', methods=['GET'])
    def preview(self):
        path = request.args.get('path')
        offset = request.args.get('offset', 0)
        length = request.args.get('length', 16 * 1024)
        response = self.client.preview(path, offset=offset, length=length)
        return json_response(data=response.text,
                             status=response.status_code)

    @catch_hdfs_exception
    @ensure_logined
    @expose('/chmod/', methods=['POST'])
    def chmod(self):
        args = self.get_request_data()
        paths = ';'.join(args.get('path'))
        mode = args.get('mode')
        recursive = args.get('recursive')
        recursive = True if recursive else False
        response = self.client.chmod(paths, mode, recursive=recursive)
        return json_response(message=eval(response.text).get("message"),
                             status=response.status_code)

    @catch_hdfs_exception
    @ensure_logined
    @expose('/touch/', methods=['GET'])
    def touch(self):
        path = request.args.get('path')
        filename = request.args.get('filename')
        response = self.client.touch(path, filename)
        return json_response(message=eval(response.text).get("message"),
                             status=response.status_code)

    @catch_hdfs_exception
    @ensure_logined
    @expose('/modify/', methods=['POST'])
    def modify(self):
        path = request.args.get('path')
        file = request.data
        response = self.client.modify(path, file)
        return json_response(message=eval(response.text).get("message"),
                             status=response.status_code)

    def get_request_data(self):
        return json.loads(str(request.data, encoding='utf-8'))

    def do_login(self, hdfs_conn_id=None):
        def login_filerobot(server='', username='', password='', httpfs=''):
            if not server:
                raise SupersetException(NO_FILEROBOT_SERVER)
            if not password:
                raise SupersetException(NEED_PASSWORD_FOR_FILEROBOT)
            conf = FileRobotConfiguartion()
            conf.set(FileRobotVars.FILEROBOT_SERVER_ADDRESS.varname, server)
            client = fileRobotClientFactory.getInstance(conf)
            response = client.login(username, password, httpfs)
            return client, response

        args = self.get_login_args(hdfs_conn_id)
        client, response = login_filerobot(**args)
        if response.status_code == requests.codes.ok:
            self.client = client
            self.logined_user = g.user.username
            self.hdfs_conn_id = hdfs_conn_id
            return response
        else:
            self.client = None
            self.logined_user = ''
            self.hdfs_conn_id = None
            raise SupersetException(LOGIN_FILEROBOT_FAILED)

    @staticmethod
    def get_login_args(hdfs_conn_id=None):
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

        from flask_appbuilder.security.views import AuthDBView
        httpfs = get_httpfs(hdfs_conn_id)
        server = app.config.get('FILE_ROBOT_SERVER')
        username = g.user.username
        password = AuthDBView.mock_user.get(username)
        return {'server': server,
                'username': username,
                'password': password,
                'httpfs': httpfs}


appbuilder.add_view_no_menu(HDFSBrowser)
appbuilder.add_link(
    'HDFS Browser',
    href='/hdfs/',
    label=__("HDFS Browser"),
    icon="fa-flask",
    category='',
    category_icon='')
