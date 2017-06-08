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

os.environ['SUPERSET_CONFIG'] = 'tests.superset_test_config'

BASE_DIR = app.config.get("BASE_DIR")


class SupersetTestCase(unittest.TestCase):
    requires_examples = False
    examples_loaded = False

    def __init__(self, *args, **kwargs):
        if (self.requires_examples and
                not self.examples_loaded and
                not os.environ.get('SOLO_TEST')
        ):
            logging.info("Loading examples")
            cli.load_examples(load_test_data=True)
            logging.info("Done loading examples")
            sync_role_definitions()
            self.add_admin_user('admin')
            self.update_example_user('admin')
            self.examples_loaded = True
        else:
            sync_role_definitions()
        super(SupersetTestCase, self).__init__(*args, **kwargs)
        self.client = app.test_client()
        self.maxDiff = None
        self.add_admin_user('hive')

    def add_admin_user(self, username):
        user = appbuilder.sm.find_user(username)
        if not user:
            appbuilder.sm.add_user(
                username, username, ' user', '{}@transwarp.io'.format(username),
                appbuilder.sm.find_role('Admin'),  password='general')

    def update_example_user(self, username):
        user = appbuilder.sm.find_user(username)
        classes = [models.Dashboard, models.Slice, models.Database,
                   models.SqlaTable, models.TableColumn, models.SqlMetric]
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
        return db.session.query(models.SqlaTable).filter_by(
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
        return db.session.query(models.SqlaTable).filter_by(
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

