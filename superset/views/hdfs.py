import logging
import json
import functools
import os
import requests
import threading
from urllib.parse import quote
from flask import g, request, redirect, Response
from flask_appbuilder import expose

from fileRobot_client.FileRobotClientFactory import fileRobotClientFactory
from fileRobot_common.conf.FileRobotConfiguration import FileRobotConfiguartion
from fileRobot_common.conf.FileRobotVars import FileRobotVars
from fileRobot_common.exception.FileRobotException import FileRobotException

from superset import app, db, appbuilder
from superset.cache import TokenCache, FileRobotCache
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
            try:
                return f(self, *args, **kwargs)
            except FileRobotException as fe:
                if fe.status == 401:
                    self.login_filerobot()
                    return f(self, *args, **kwargs)
                else:
                    return json_response(status=fe.status, code=fe.returnCode,
                                         message=fe.message)
        except FileRobotException as fe:
            logging.exception(fe)
            return json_response(status=fe.status, code=fe.returnCode, message=fe.message)
        except SupersetException as se:
            logging.exception(se)
            return json_response(status=500, message=str(se), code=se.code)
        except AttributeError as e:
            logging.exception(e)
            if 'AnonymousUserMixin' in str(e):
                return json_response(status=500, message=NO_USER, code=1)
            else:
                return json_response(status=500, message=str(e), code=1)
        except Exception as e:
            logging.exception(e)
            return json_response(status=500, message=str(e), code=1)
    return functools.update_wrapper(wraps, f)


class HDFSBrowser(BaseSupersetView):
    route_base = '/hdfs'
    file_block_size = config.get('FILE_BLOCK_LENGTH')

    @catch_exception
    @expose('/')
    def render_html(self):
        self.update_redirect()
        if not g.user or not g.user.get_id():
            return redirect(appbuilder.get_url_for_logout)
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
        self.login_filerobot()
        return json_response(message=LOGIN_FILEROBOT_SUCCESS)

    @catch_hdfs_exception
    @expose('/logout/', methods=['GET'])
    def logout(self):
        httpfs = self.get_httpfs()
        client = self.get_client()
        client.logout()
        FileRobotCache.delete(g.user.username, httpfs)
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
        filename = quote(os.path.basename(path), encoding="utf-8")
        data = self.read_file(client, path)
        response = Response(bytes(data), content_type='application/octet-stream')
        response.headers['Content-Disposition'] = "attachment; filename=" + filename
        return response

    @catch_hdfs_exception
    @expose('/upload/', methods=['POST'])
    def upload(self):
        """Upload files by form"""
        client = self.get_client()
        dest_path = request.args.get('dest_path')
        redirect_url = '/hdfs/?current_path={}'.format(dest_path)
        for f in request.files.getlist('list_file'):
            filename = f.filename
            file_path = os.path.join(dest_path, filename)
            try:
                client.touch(dest_path, filename)
            except Exception as e:
                logging.exception(e)
                redirect_url = '{}&error_message={}'.format(redirect_url, str(e))
            else:
                try:
                    while True:
                        file_content = f.read(self.file_block_size)
                        if file_content:
                            client.append(file_path, {'files': [filename, file_content]})
                        else:
                            break
                except Exception as e:
                    logging.exception(e)
                    client.remove(file_path, forever=True)
                    redirect_url = '{}&error_message={}'.format(redirect_url, str(e))
        return redirect(redirect_url)

    @catch_hdfs_exception
    @expose('/upload_in_body/', methods=['POST'])
    def upload_in_body(self):
        """Upload file by request body"""
        client = self.get_client()
        f = request.data
        dest_path = request.args.get('dest_path')
        file_name = request.args.get('file_name')
        response = client.upload(dest_path, [('files', (file_name, f))])
        return json_response(message=eval(response.text).get("message"),
                             status=response.status_code)

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
            httpfs = cls.get_httpfs(hdfs_conn_id) if not httpfs else httpfs
            access_token = TokenCache.get(g.user.username, g.user.password2)
            return {'server': config.get('FILE_ROBOT_SERVER'),
                    'username': g.user.username,
                    'password': g.user.password2,
                    'httpfs': httpfs,
                    'access_token': access_token}

        def do_login(server='', username='', password='', httpfs='', access_token=None):
            if not server:
                raise ParameterException(NO_FILEROBOT_SERVER)
            if not password:
                raise ParameterException(MISS_PASSWORD_FOR_FILEROBOT)
            conf = FileRobotConfiguartion()
            conf.set(FileRobotVars.FILEROBOT_SERVER_ADDRESS.varname, server)
            client = fileRobotClientFactory.getInstance(conf)
            response = client.login(username, password, httpfs, access_token=access_token)
            return client, response

        args = get_login_args(hdfs_conn_id, httpfs)
        client, response = do_login(**args)
        if response.status_code != requests.codes.ok:
            raise LoginException(LOGIN_FILEROBOT_FAILED)
        return client

    @classmethod
    def get_httpfs(cls, hdfs_conn_id=None):
        if hdfs_conn_id:
            conn = db.session.query(HDFSConnection).filter_by(id=hdfs_conn_id).first()
            if not conn:
                raise ParameterException(NO_HDFS_CONNECTION)
            return conn.httpfs
        else:
            return config.get('DEFAULT_HTTPFS')

    @classmethod
    def get_client(cls, hdfs_conn_id=None):
        return cls.login_filerobot(hdfs_conn_id)

    @classmethod
    def read_file(cls, client, path):
        data = bytearray()
        offset = 0
        length = cls.file_block_size
        while True:
            response = client.read(path, offset, length)
            content = response.data
            len_con = len(content)
            if content:
                data.extend(content)
                offset += len_con
            if not content or len_con < length:
                break
        return data

    @classmethod
    def read_folder(cls, client, path, file_num=1000):
        """Read the files' content of ~'path' into bytearray.
        """
        response = client.list(path, page_size=file_num)
        files_json = json.loads(response.text)
        files = files_json.get('files')

        need_line_feed = False
        all_data = bytearray()
        for file in files:
            if file.get('type') == 'file':
                file_path = file.get('path')
                data = cls.read_file(client, file_path)
                if need_line_feed:
                    all_data.extend(b'\t\n')
                all_data.extend(data)
                need_line_feed = True
            else:
                pass
        return all_data
