import logging
import json
import functools
import requests
import threading
from flask import g, request, redirect
from flask_babel import lazy_gettext as _
from flask_appbuilder import expose

from fileRobot_client.FileRobotClientFactory import fileRobotClientFactory
from fileRobot_common.conf.FileRobotConfiguration import FileRobotConfiguartion
from fileRobot_common.conf.FileRobotVars import FileRobotVars
from fileRobot_common.exception.FileRobotException import FileRobotException

from superset import app, db, simple_cache
from superset.cas.access_token import get_token
from superset.message import *
from superset.exception import (
    SupersetException, ParameterException, LoginException, HDFSException
)
from superset.models import HDFSConnection
from superset.utils import human_size
from .base import BaseSupersetView, catch_exception, json_response

config = app.config

mutex = threading.Lock()


def catch_hdfs_exception(f):
    """
    A decorator to label an endpoint as an API. Catches uncaught exceptions and
    return the response in the JSON format
    """
    def wraps(self, *args, **kwargs):
        try:
            return f(self, *args, **kwargs)
        except FileRobotException as fe:
            logging.exception(fe)
            return json_response(status=fe.status,
                                 code=fe.returnCode,
                                 message=fe.message)
        except SupersetException as se:
            logging.exception(se)
            return json_response(status=500, message=str(se), code=se.code)
        except Exception as e:
            logging.exception(e)
            return json_response(status=500, message=str(e), code=1)
    return functools.update_wrapper(wraps, f)


def ensure_logined(f):
    """ Deprecated
    A decorator to label an endpoint as an API. Make ensure user has logined
    filerobot, and re_login if session is timeout.
    """
    def wraps(self, *args, **kwargs):
        username = g.user.username
        client = simple_cache.get(self.cache_key())
        if not client:
            client, response = self.login_filerobot()
            self.handle_login_resp(client, response)
            try:
                client.mkdir('/user', username)
            except Exception as e:
                logging.error('Failed to create default user path for [{}]. '
                              .format(username) + str(e))
        try:
            return f(self, *args, **kwargs)
        except FileRobotException as fe:
            if fe.status == 401:
                client, response = self.login_filerobot()
                self.handle_login_resp(client, response)
                return f(self, *args, **kwargs)
            else:
                raise fe
    return functools.update_wrapper(wraps, f)


class HDFSBrowser(BaseSupersetView):
    route_base = '/hdfs'

    @catch_exception
    @expose('/')
    def render_html(self):
        self.update_redirect()
        try:
            client = self.get_client()
            client.mkdir('/user', g.user.username)
        except Exception as e:
            logging.error('Failed to create default user path for [{}]. '
                          .format(g.user.username) + str(e))
        return self.render_template('superset/hdfsList.html')

    @catch_hdfs_exception
    @expose('/login/', methods=['GET'])
    def login(self):
        client, response = self.login_filerobot()
        self.handle_login_resp(client, response)
        return json_response(message=LOGIN_FILEROBOT_SUCCESS,
                             status=response.status_code)

    @catch_hdfs_exception
    @expose('/logout/', methods=['GET'])
    def logout(self):
        client = self.get_client()
        client.logout()
        self.delete_client()
        return json_response(message=LOGOUT_FILEROBOT_SUCCESS)

    @catch_hdfs_exception
    @expose('/list/', methods=['GET'])
    def list(self):
        client = self.get_client()
        path = request.args.get('path')
        page_num = request.args.get('page_num', 1)
        page_size = request.args.get('page_size')
        response = client.list(path, page_num, page_size)
        data = json.loads(response.text)
        for file in data['files']:
            file['size'] = human_size(file['size'])
        return json_response(data=data, status=response.status_code)

    @catch_hdfs_exception
    @expose('/download/', methods=['GET'])
    def download(self):
        client = self.get_client()
        path = request.args.get('path')
        response = client.download(path)
        response.encoding = 'utf-8'
        return json_response(data=response.text, status=response.status_code)

    @catch_hdfs_exception
    @expose('/upload/', methods=['POST'])
    def upload(self):
        client = self.get_client()
        dest_path = request.args.get('dest_path')
        files = {}
        redirect_url = '/hdfs/?current_path={}'.format(dest_path)
        try:
            for f in request.files.getlist('list_file'):
                file_content = f.read()
                max_size = config.get('MAX_UPLOAD_SIZE')
                if len(file_content) > max_size:
                    raise HDFSException(
                        _('The size of uploaded file is limited to {size}M')
                            .format(size=int(max_size / (1024 * 1024))))
                files[f.filename] = file_content
            files_struct = [('files', (name, data)) for name, data in files.items()]
            client.upload(dest_path, files_struct)
        except FileRobotException as fe:
            logging.exception(fe)
            redirect_url = '{}&error_message={}'.format(redirect_url, fe.message)
        except Exception as e:
            logging.exception(e)
            redirect_url = '{}&error_message={}'.format(redirect_url, str(e))
        return redirect(redirect_url)

    @catch_hdfs_exception
    @expose('/remove/', methods=['POST'])
    def remove(self):
        client = self.get_client()
        args = self.get_request_data()
        paths = ';'.join(args.get('path'))
        forever = args.get('forever', 'false')
        response = client.remove(paths, forever)
        return json_response(message=eval(response.text).get("message"),
                             status=response.status_code)

    @catch_hdfs_exception
    @expose('/move/', methods=['POST'])
    def move(self):
        client = self.get_client()
        args = self.get_request_data()
        paths = ';'.join(args.get('path'))
        dest_path = args.get('dest_path')
        response = client.move(paths, dest_path)
        return json_response(message=eval(response.text).get("message"),
                             status=response.status_code)

    @catch_hdfs_exception
    @expose('/copy/', methods=['POST'])
    def copy(self):
        client = self.get_client()
        args = self.get_request_data()
        paths = ';'.join(args.get('path'))
        dest_path = args.get('dest_path')
        response = client.copy(paths, dest_path)
        return json_response(message=eval(response.text).get("message"),
                             status=response.status_code)

    @catch_hdfs_exception
    @expose('/mkdir/', methods=['GET'])
    def mkdir(self):
        client = self.get_client()
        path = request.args.get('path')
        dir_name = request.args.get('dir_name')
        response = client.mkdir(path, dir_name)
        return json_response(message=eval(response.text).get("message"),
                             status=response.status_code)

    @catch_hdfs_exception
    @expose('/preview/', methods=['GET'])
    def preview(self):
        client = self.get_client()
        path = request.args.get('path')
        offset = request.args.get('offset', 0)
        length = request.args.get('length', 16 * 1024)
        response = client.preview(path, offset=offset, length=length)
        return json_response(data=response.text,
                             status=response.status_code)

    @catch_hdfs_exception
    @expose('/chmod/', methods=['POST'])
    def chmod(self):
        client = self.get_client()
        args = self.get_request_data()
        paths = ';'.join(args.get('path'))
        mode = args.get('mode')
        recursive = args.get('recursive')
        recursive = True if recursive else False
        response = client.chmod(paths, mode, recursive=recursive)
        return json_response(message=eval(response.text).get("message"),
                             status=response.status_code)

    @catch_hdfs_exception
    @expose('/touch/', methods=['GET'])
    def touch(self):
        client = self.get_client()
        path = request.args.get('path')
        filename = request.args.get('filename')
        response = client.touch(path, filename)
        return json_response(message=eval(response.text).get("message"),
                             status=response.status_code)

    @catch_hdfs_exception
    @expose('/modify/', methods=['POST'])
    def modify(self):
        client = self.get_client()
        path = request.args.get('path')
        file = request.data
        response = client.modify(path, file)
        return json_response(message=eval(response.text).get("message"),
                             status=response.status_code)

    @classmethod
    def login_filerobot(cls, hdfs_conn_id=None, httpfs=None):

        def get_login_args(hdfs_conn_id=None, httpfs=None):
            # def get_pt(httpfs):
            #     pt = None
            #     if config.get('CAS_AUTH'):
            #         from superset.cas.routing import get_proxy_ticket
            #         if ':' not in httpfs:
            #             httpfs = '{}:14000'.format(httpfs)
            #         if 'http://' not in httpfs:
            #             httpfs = 'http://{}'.format(httpfs)
            #         pt = get_proxy_ticket(httpfs)
            #     return pt

            httpfs = cls.get_httpfs(hdfs_conn_id) if not httpfs else httpfs
            proxy_ticket = None
            access_token = None
            if config['CAS_AUTH']:
                access_token = get_token(g.user.username)
            return {'server': config.get('FILE_ROBOT_SERVER'),
                    'username': g.user.username,
                    'password': g.user.password2,
                    'httpfs': httpfs,
                    'proxy_ticket': proxy_ticket,
                    'access_token': access_token}

        def do_login(server='', username='', password='', httpfs='',
                     proxy_ticket=None, access_token=None):
            if not server:
                raise ParameterException(NO_FILEROBOT_SERVER)
            if not password:
                raise ParameterException(MISS_PASSWORD_FOR_FILEROBOT)
            conf = FileRobotConfiguartion()
            conf.set(FileRobotVars.FILEROBOT_SERVER_ADDRESS.varname, server)
            client = fileRobotClientFactory.getInstance(conf)
            response = client.login(username, password, httpfs, proxy_ticket,
                                    access_token)
            return client, response

        args = get_login_args(hdfs_conn_id, httpfs)
        return do_login(**args)

    @classmethod
    def get_httpfs(cls, hdfs_conn_id=None):
        if hdfs_conn_id:
            conn = db.session.query(HDFSConnection) \
                .filter_by(id=hdfs_conn_id).first()
            if not conn:
                raise ParameterException(NO_HDFS_CONNECTION)
            return conn.httpfs
        else:
            return config.get('DEFAULT_HTTPFS')

    @classmethod
    def handle_login_resp(cls, client, response):
        if response.status_code == requests.codes.ok:
            if mutex.acquire(1):
                simple_cache.set(cls.cache_key(), client)
                mutex.release()
        else:
            raise LoginException(LOGIN_FILEROBOT_FAILED)

    @classmethod
    def get_client(cls, hdfs_conn_id=None):
        httpfs = cls.get_httpfs(hdfs_conn_id)
        key = cls.cache_key(httpfs)
        client = simple_cache.get(key)
        if not client:
            client, response = cls.login_filerobot(hdfs_conn_id)
            cls.handle_login_resp(client, response)
            client = simple_cache.get(key)
        return client

    @classmethod
    def delete_client(cls, hdfs_conn_id=None):
        httpfs = cls.get_httpfs(hdfs_conn_id)
        key = cls.cache_key(httpfs)
        simple_cache.delete(key)

    @classmethod
    def cache_key(cls, httpfs=None):
        if not httpfs:
            return '{}_{}'.format(g.user.username, config.get('DEFAULT_HTTPFS'))
        else:
            return '{}_{}'.format(g.user.username, httpfs)
