"""Unit tests for Pilot"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import unittest
from datetime import datetime
import json

from superset import db
from superset.models.connection import Database, HDFSConnection, Connection
from superset.views.connection import DatabaseView, HDFSConnectionModelView
from tests.base_tests import SupersetTestCase
from tests.base_tests import PageMixin


class DatabaseTests(SupersetTestCase, PageMixin):
    require_examples = True
    route_base = '/database'

    def __init__(self, *args, **kwargs):
        super(DatabaseTests, self).__init__(*args, **kwargs)
        self.view = DatabaseView()

    def test_listdata(self):
        resp_data = self.get_json_resp('{}/listdata/'.format(self.route_base))
        assert resp_data.get('status') == 200

        data = resp_data.get('data')
        assert 'count' in data
        assert 'order_column' in data
        assert 'order_direction' in data
        assert 'page' in data
        assert 'page_size' in data

        database_list = data.get('data')
        for database_dict in database_list:
            assert 'id' in database_dict
            assert 'database_name' in database_dict
            assert 'backend' in database_dict

        one_database = database_list[0]
        if one_database:
            queried_database = db.session.query(Database) \
                .filter_by(id=one_database.get('id')).first()
            assert one_database.get('backend') == queried_database.backend
            assert one_database.get('database_name') == queried_database.name

    def test_add_edit_delete(self):
        ### add
        ts = datetime.now().isoformat()
        ts = ts.replace('-', '').replace(':', '').split('.')[0]
        data = {
            'database_name': 'mysql_{}'.format(ts),
            'sqlalchemy_uri': 'mysql://root:123456@172.16.130.109/test?charset=utf8',
            'description': 'test the database',
            'args': "{'connect_args': {} }"
        }
        resp = self.get_json_resp('{}/add/'.format(self.route_base),
                                  data=json.dumps(data))
        new_database_id = resp.get('data').get('object_id')
        added_database = Database.get_object(id=new_database_id)
        assert added_database is not None

        ### show
        resp_data = self.get_json_resp(
            '{}/show/{}/'.format(self.route_base, new_database_id))
        resp_data = resp_data.get('data')
        assert added_database.id == resp_data.get('id')
        assert added_database.database_name == resp_data.get('database_name')
        assert added_database.sqlalchemy_uri == resp_data.get('sqlalchemy_uri')

        ### edit
        data['database_name'] = 'mysql_edited_{}'.format(ts)
        resp = self.get_json_resp('{}/edit/{}/'.format(self.route_base, new_database_id),
                                  data=json.dumps(data))
        assert resp.get('status') == 200
        edited_database = Database.get_object(id=new_database_id)
        assert edited_database.database_name == data.get('database_name')

        ### delete
        resp = self.get_json_resp(
            '{}/delete/{}/'.format(self.route_base, new_database_id))
        assert resp.get('status') == 200
        database = Database.get_object(id=new_database_id)
        assert database is None

    def test_connect(self):
        pass

    def test_inceptor(self):
        pass


class HDFSConnectionTests(SupersetTestCase, PageMixin):
    require_examples = True
    route_base = '/hdfsconnection'

    def __init__(self, *args, **kwargs):
        super(HDFSConnectionTests, self).__init__(*args, **kwargs)
        self.view = HDFSConnectionModelView()

    def test_listdata(self):
        resp_data = self.get_json_resp('{}/listdata/'.format(self.route_base))
        assert resp_data.get('status') == 200

        data = resp_data.get('data')
        assert 'count' in data
        assert 'order_column' in data
        assert 'order_direction' in data
        assert 'page' in data
        assert 'page_size' in data

        hdfs_list = data.get('data')
        for hdfs in hdfs_list:
            assert 'id' in hdfs
            assert 'connection_name' in hdfs

    def test_add_show_edit_delete(self):
        ### add
        ts = datetime.now().isoformat()
        ts = ts.replace('-', '').replace(':', '').split('.')[0]
        data = {'connection_name': 'hdfs_conn_{}'.format(ts),
                'httpfs': 'localhost',
                'description': 'test the database',
                }
        resp = self.get_json_resp('{}/add/'.format(self.route_base),
                                  data=json.dumps(data))
        new_hdfs_id = resp.get('data').get('object_id')
        added_hdfs = HDFSConnection.get_object(id=new_hdfs_id)
        assert added_hdfs is not None

        ### show
        resp_data = self.get_json_resp(
            '{}/show/{}/'.format(self.route_base, new_hdfs_id))
        resp_data = resp_data.get('data')
        assert added_hdfs.id == resp_data.get('id')
        assert added_hdfs.connection_name == resp_data.get('connection_name')
        assert added_hdfs.httpfs == resp_data.get('httpfs')

        ### edit
        data['connection_name'] = 'hdfs_conn_edited_{}'.format(ts)
        resp = self.get_json_resp('{}/edit/{}/'.format(self.route_base, new_hdfs_id),
                                  data=json.dumps(data))
        assert resp.get('status') == 200
        edited_hdfs = HDFSConnection.get_object(id=new_hdfs_id)
        assert edited_hdfs.connection_name == data.get('connection_name')

        ### delete
        resp = self.get_json_resp(
            '{}/delete/{}/'.format(self.route_base, new_hdfs_id))
        assert resp.get('status') == 200
        database = HDFSConnection.get_object(id=new_hdfs_id)
        assert database is None

    def test_connect(self):
        pass


class ConnectionTests(SupersetTestCase, PageMixin):
    require_examples = True
    route_base = '/connection'

    def __init__(self, *args, **kwargs):
        super(ConnectionTests, self).__init__(*args, **kwargs)

    def test_listdata(self):
        resp_data = self.get_json_resp('{}/listdata/'.format(self.route_base))
        assert resp_data.get('status') == 200

        data = resp_data.get('data')
        assert 'count' in data
        assert 'order_column' in data
        assert 'order_direction' in data
        assert 'page' in data
        assert 'page_size' in data

        conn_list = data.get('data')
        for conn_dict in conn_list:
            assert 'id' in conn_dict
            assert 'name' in conn_dict
            assert 'connection_type' in conn_dict

    def test_connection_types(self):
        except_value = set(['INCEPTOR', 'MYSQL', 'ORACLE', 'MSSQL', 'HDFS'])
        resp_data = self.get_json_resp('{}/connection_types/'.format(self.route_base))
        assert resp_data.get('status') == 200
        real_value = set(resp_data.get('data'))
        assert except_value.issubset(real_value)
        assert real_value.issubset(except_value)

    def test_muldelete(self):
        pass

if __name__ == '__main__':
    unittest.main()
