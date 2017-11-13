"""Unit tests for pilot
If debug someone test script,
(1) At the end of superset.config, add
SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(DATA_DIR, 'unittests.db')
LICENSE_CHECK = False
GUARDIAN_AUTH = False
(2) install pilot:
# python setup.py install
(3) upgrade db:
# pilot db upgrade
(4) debug the test script file
"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import json
import unittest

from superset import app, cli, db, models, appbuilder, security, sm

config = app.config


class PageMixin(object):
    order_column = 'changed_on'
    order_direction = 'desc'
    page = 0
    page_size = 10
    filter = None
    only_favorite = False
    view = None
    real_value = None
    kwargs = {
        'order_column': order_column,
        'order_direction': order_direction,
        'page': page,
        'page_size': page_size,
        'filter': filter,
        'only_favorite': only_favorite
    }

    def check_base_param(self, no_check=False):
        kwargs = self.kwargs
        kwargs['user_id'] = self.user.id
        self.real_value = self.view.get_object_list_data(**kwargs)

        if no_check:
            pass
        else:
            assert self.page == self.real_value.get('page')
            assert self.page_size == self.real_value.get('page_size')
            assert self.order_column == self.real_value.get('order_column')
            assert self.order_direction == self.real_value.get('order_direction')

    def check_param_same(self, src_list, des_list):
        if len(src_list) != len(des_list):
            print('the source list and the destination list is not the same length')
            return
        for x in range(len(src_list)):
            assert src_list[x] == des_list[x]


class SupersetTestCase(unittest.TestCase):
    require_examples = True
    test_username = 'admin'
    test_password = '123456'

    def __init__(self, *args, **kwargs):
        super(SupersetTestCase, self).__init__(*args, **kwargs)
        self.init()
        self.client = app.test_client()
        self.maxDiff = None
        self.user = appbuilder.sm.find_user(self.test_username)

    @classmethod
    def init(cls):
        if config.get("SQLALCHEMY_DATABASE_URI").startswith('sqlite'):
            rs = db.session.execute(
                "select count(*) from sqlite_master "
                "where name='energy_usage' and type='table'"
            )
            row = rs.fetchone()
            if row[0] > 0 or cls.require_examples is False:
                return
        print("sync_role_definitions")
        security.sync_role_definitions()

        print("Create default user")
        user = cls.get_or_create_admin_user(cls.test_username, cls.test_password)

        print("Start to load examples...")
        cli.load_examples(False, user_id=user.id)
        print("Finish to load examples.")

    @staticmethod
    def get_or_create_admin_user(username, password):
        user = appbuilder.sm.find_user(username)
        if not user:
            user = appbuilder.sm.add_user(
                username, username, username, '{}@transwarp.io'.format(username),
                appbuilder.sm.find_role('Admin'),  password=password)
            user.password2 = password
            sm.get_session.commit()
        return user

    def login(self, username=None, password=None):
        if not username:
            username = config.TEST_USERNAME
        if not password:
            password = config.TEST_PASSWORD
        resp = self.get_resp('/login/',
                             data=dict(username=username, password=password))
        self.assertIn('Pilot', resp)

    def logout(self):
        self.client.get('/logout/', follow_redirects=True)

    @staticmethod
    def get_query_by_sql(sql):
        return db.session.query(models.Query).filter_by(sql=sql).first()

    @staticmethod
    def get_latest_query():
        query = (
            db.session.query(models.Query)
                .order_by(models.Query.id.desc())
                .first()
        )
        return query

    @staticmethod
    def get_slice_by_name(slice_name):
        return db.session.query(models.Slice).filter_by(slice_name=slice_name).one()

    @staticmethod
    def get_dataset(id):
        return db.session.query(models.Dataset).filter_by(id=id).first()

    @staticmethod
    def get_dataset_by_name(name):
        return db.session.query(models.Dataset).filter_by(dataset_name=name).first()

    @staticmethod
    def get_main_database():
        return db.session.query(models.Database).filter_by(database_name='main').first()

    def get_resp(self, url, data=None, follow_redirects=True, raise_on_error=True):
        """Shortcut to get the parsed results while following redirects"""
        if data:
            resp = self.client.post(
                url, data=data, follow_redirects=follow_redirects)
        else:
            resp = self.client.get(url, follow_redirects=follow_redirects)
        if raise_on_error and resp.status_code > 400:
            raise Exception(
                "http request failed with code {}".format(resp.status_code))
        return resp.data.decode('utf-8')

    def get_json_resp(
            self, url, data=None, follow_redirects=True, raise_on_error=True):
        """Shortcut to get the parsed results while following redirects"""
        resp = self.get_resp(url, data, follow_redirects, raise_on_error)
        return json.loads(resp)

    def run_sql(self, sql, client_id, user_name=None, raise_on_error=False):
        if user_name:
            self.logout()
            self.login(username=(user_name if user_name else 'admin'))
        dbid = self.get_main_database().id
        resp = self.get_json_resp(
            '/superset/sql_json/',
            raise_on_error=False,
            data=dict(database_id=dbid, sql=sql, select_as_create_as=False,
                      client_id=client_id),
        )
        if raise_on_error and 'error' in resp:
            raise Exception("run_sql failed")
        return resp

