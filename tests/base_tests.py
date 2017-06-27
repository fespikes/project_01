"""Unit tests for Superset"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import logging
import json
import os
import unittest
from datetime import datetime

from flask_appbuilder.security.sqla import models as ab_models

from superset import app, cli, db, models, appbuilder, security, sm
from superset.security import sync_role_definitions
from superset.views import DashboardModelView

os.environ['SUPERSET_CONFIG'] = 'tests.superset_test_config'

BASE_DIR = app.config.get("BASE_DIR")

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
    requires_examples = False
    test_username = 'admin'

    def __init__(self, *args, **kwargs):
        if (self.requires_examples and
                not os.environ.get('SOLO_TEST') and
                not os.environ.get('examples_loaded')
        ):
            logging.info("Loading examples")
            cli.load_examples(load_test_data=True)
            self.add_admin_user(self.test_username)
            self.update_example_user(self.test_username)
            self.add_admin_user('hive')
            logging.info("Done loading examples")
            os.environ['examples_loaded'] = 1

        sync_role_definitions()
        super(SupersetTestCase, self).__init__(*args, **kwargs)
        self.client = app.test_client()
        self.maxDiff = None
        self.user = appbuilder.sm.find_user(self.test_username)

    def add_admin_user(self, username):
        user = appbuilder.sm.find_user(username)
        if not user:
            appbuilder.sm.add_user(
                username, username, username, '{}@transwarp.io'.format(username),
                appbuilder.sm.find_role('Admin'),  password='general')

    def update_example_user(self, username):
        user = appbuilder.sm.find_user(username)
        classes = [models.Dashboard, models.Slice, models.Database,
                   models.Dataset, models.TableColumn, models.SqlMetric]
        for cls in classes:
            self.update_object_user(cls, user.id)

    def update_object_user(self, cls, user_id):
        db.session.query(cls).update(
            {cls.created_by_fk: user_id,
             cls.changed_by_fk: user_id,
             cls.created_on: datetime.now(),
             cls.changed_on: datetime.now()}
        )
        db.session.commit()

    def get_table(self, table_id):
        return db.session.query(models.Dataset).filter_by(
            id=table_id).first()

    def get_or_create(self, cls, criteria, session):
        obj = session.query(cls).filter_by(**criteria).first()
        if not obj:
            obj = cls(**criteria)
        return obj

    def login(self, username='admin', password='general'):
        resp = self.get_resp(
            '/login/',
            data=dict(username=username, password=password))
        self.assertIn('Pilot', resp)

    def get_query_by_sql(self, sql):
        session = db.create_scoped_session()
        query = session.query(models.Query).filter_by(sql=sql).first()
        session.close()
        return query

    def get_latest_query(self, sql):
        session = db.create_scoped_session()
        query = (
            session.query(models.Query)
            .order_by(models.Query.id.desc())
            .first()
        )
        session.close()
        return query

    def get_slice(self, slice_name, session):
        slc = (
            session.query(models.Slice)
            .filter_by(slice_name=slice_name)
            .one()
        )
        session.expunge_all()
        return slc

    def get_table_by_name(self, name):
        return db.session.query(models.Dataset).filter_by(
            table_name=name).first()

    def get_resp(
            self, url, data=None, follow_redirects=True, raise_on_error=True):
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

    def get_main_database(self, session):
        return (
            session.query(models.Database)
            .filter_by(database_name='main')
            .first()
        )

    def logout(self):
        self.client.get('/logout/', follow_redirects=True)

    def run_sql(self, sql, client_id, user_name=None, raise_on_error=False):
        if user_name:
            self.logout()
            self.login(username=(user_name if user_name else 'admin'))
        dbid = self.get_main_database(db.session).id
        resp = self.get_json_resp(
            '/superset/sql_json/',
            raise_on_error=False,
            data=dict(database_id=dbid, sql=sql, select_as_create_as=False,
                      client_id=client_id),
        )
        if raise_on_error and 'error' in resp:
            raise Exception("run_sql failed")
        return resp

