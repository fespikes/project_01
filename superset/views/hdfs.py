from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals


import json
import requests
import urllib
from flask import g, request, Response
from flask_babel import gettext as __
from flask_appbuilder import BaseView, expose
from flask_appbuilder.security.views import AuthDBView
from superset import app, db, appbuilder
from superset.utils import SupersetException
from superset.models import HDFSConnection
from .base import catch_exception

config = app.config


class HDFSBrowser(BaseView):
    route_base = '/hdfs'
    header = {"Content-type": "application/json", "Accept":  "application/json"}
    timeout = 10  # seconds

    def __init__(self):
        super(HDFSBrowser, self).__init__()
        self.session = requests.Session()

    @catch_exception
    @expose('/render_html/')
    def render_html(self):
        return self.render_template('superset/hdfsList.html')

    @catch_exception
    @expose('/login/', methods=['GET'])
    def login(self):
        url = '{}/login'.format(self.url_root)
        hdfs_conn_id = request.args.get('hdfs_conn_id')
        if hdfs_conn_id:
            conn = db.session.query(HDFSConnection) \
                .filter_by(id=hdfs_conn_id).first()
        else:
            conn = db.session.query(HDFSConnection) \
                .order_by(HDFSConnection.id).first()
        data = {"username": g.user.username,
                "password": AuthDBView.mock_user.get(g.user.username),
                "httpfshost": conn.httpfs}
        resp = self.session.post(url, data=data)
        return self.build_response(resp)

    @catch_exception
    @expose('/logout/', methods=['GET'])
    def logout(self):
        url = '{}/logout'.format(self.url_root)
        resp = self.session.post(url)
        return self.build_response(resp)

    @catch_exception
    @expose('/list/', methods=['GET'])
    def list(self):
        url = self.build_url(self.url_prefix, 'list', **request.args.to_dict())
        return json.dumps(url)

    @catch_exception
    @expose('/download/', methods=['GET'])
    def download(self):
        url = self.build_url(self.url_prefix, 'download', **request.args.to_dict())
        return json.dumps(url)

    @catch_exception
    @expose('/upload/', methods=['POST'])
    def upload(self):
        url = self.build_url(self.url_prefix, 'upload', **request.args.to_dict())
        return json.dumps(url)

    @catch_exception
    @expose('/remove/', methods=['GET'])
    def remove(self):
        url = self.build_url(self.url_prefix, 'remove', **request.args.to_dict())
        return json.dumps(url)

    @catch_exception
    @expose('/move/', methods=['GET'])
    def move(self):
        url = self.build_url(self.url_prefix, 'move', **request.args.to_dict())
        return json.dumps(url)

    @catch_exception
    @expose('/mkdir/', methods=['GET'])
    def mkdir(self):
        url = self.build_url(self.url_prefix, 'mkdir', **request.args.to_dict())
        return json.dumps(url)

    @catch_exception
    @expose('/rmdir/', methods=['GET'])
    def rmdir(self):
        url = self.build_url(self.url_prefix, 'rmdir', **request.args.to_dict())
        return json.dumps(url)

    @catch_exception
    @expose('/preview/', methods=['GET'])
    def preview(self):
        url = self.build_url(self.url_prefix, 'preview', **request.args.to_dict())
        return json.dumps(url)

    @catch_exception
    @expose('/chmod/', methods=['GET'])
    def chmod(self):
        url = self.build_url(self.url_prefix, 'chmod', **request.args.to_dict())
        return json.dumps(url)

    @property
    def url_root(self):
        server = app.config.get('HDFS_MICROSERVICES_SERVER')
        if not server:
            raise SupersetException('No HDFS_MICROSERVICES_SERVER in config.')
        return 'http://{}'.format(server)

    @property
    def url_prefix(self):
        return '{}/filebrowser'.format(self.url_root)

    def build_url(self, url_prefix, action, **args):
        args['action'] = action
        return '{}?{}'.format(url_prefix, urllib.parse.urlencode(args))

    def build_response(self, resp):
        if resp.status_code != requests.codes.ok:
            resp.raise_for_status()
        return Response()

    @classmethod
    def login_action(cls, req, server, username, password, httpfs):
        data = {"username": username,
                "password": password,
                "httpfshost": httpfs}
        resp = req.post('http://{}/login'.format(server), data=data)
        if resp.status_code != requests.codes.ok:
            resp.raise_for_status()
        return requests.utils.dict_from_cookiejar(resp.cookies)


appbuilder.add_link(
    'HDFS Browser',
    href='/hdfs/list',
    label=__("HDFS Browser"),
    icon="fa-flask",
    category='',
    category_icon='')
