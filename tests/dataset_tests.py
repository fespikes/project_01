"""Unit tests for Pilot"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import unittest
from datetime import datetime
import json
from sqlalchemy.engine.url import make_url

from superset import db
from superset.views.dataset import DatasetModelView
from superset.models.dataset import Dataset, Database
from tests.base_tests import SupersetTestCase
from tests.base_tests import PageMixin


class DatasetTests(SupersetTestCase, PageMixin):
    require_examples = True
    route_base = '/table'

    def __init__(self, *args, **kwargs):
        super(DatasetTests, self).__init__(*args, **kwargs)
        self.view = DatasetModelView()

    def test_listdata(self):
        resp_data = self.get_json_resp('{}/listdata/'.format(self.route_base))
        assert resp_data.get('status') == 200
        data = resp_data.get('data')
        assert 'count' in data
        assert 'order_column' in data
        assert 'order_direction' in data
        assert 'page' in data
        assert 'page_size' in data

        list_data = data.get('data')
        for dataset_dict in list_data:
            assert 'id' in dataset_dict
            assert 'dataset_name' in dataset_dict
            assert 'dataset_type' in dataset_dict
            assert 'connection' in dataset_dict
            assert 'explore_url' in dataset_dict

        one_dataset = list_data[0]
        if one_dataset:
            queried_dataset = db.session.query(Dataset) \
                .filter_by(id=one_dataset.get('id')).first()
            assert one_dataset.get('dataset_name') == queried_dataset.dataset_name
            assert one_dataset.get('explore_url') == queried_dataset.explore_url

    def test_add_show_edit_delete(self):
        ### add
        one_dataset = db.session.query(Dataset).order_by(Dataset.id).first()
        ts = datetime.now().isoformat()
        ts = ts.replace('-', '').replace(':', '').split('.')[0]
        data = {
            'dataset_name': 'new_dataset_{}'.format(ts),
            'dataset_type': 'DATABASE',
            'schema': one_dataset.schema,
            'table_name': one_dataset.table_name,
            'sql': None,
            'database_id': one_dataset.id,
            'description': 'this dataset is for test',
        }
        resp = self.get_json_resp('{}/add/'.format(self.route_base),
                                  data=json.dumps(data))
        new_dataset_id = resp.get('data').get('object_id')
        added_dataset = Dataset.get_object(id=new_dataset_id)
        assert added_dataset is not None

        ### show
        resp_data = self.get_json_resp(
            '{}/show/{}/'.format(self.route_base, new_dataset_id))
        resp_data = resp_data.get('data')
        assert added_dataset.dataset_name == resp_data.get('dataset_name')
        assert added_dataset.dataset_type == resp_data.get('dataset_type')
        assert added_dataset.schema == resp_data.get('schema')
        assert added_dataset.table_name == resp_data.get('table_name')
        assert added_dataset.sql == resp_data.get('sql')

        ### edit
        data['dataset_name'] = 'edited_dataset_{}'.format(ts)
        resp = self.get_json_resp('{}/edit/{}/'.format(self.route_base, new_dataset_id),
                                  data=json.dumps(data))
        assert resp.get('status') == 200
        edited_dataset = Dataset.get_object(id=new_dataset_id)
        assert edited_dataset.dataset_name == data.get('dataset_name')

        ### delete
        resp = self.get_json_resp(
            '{}/delete/{}/'.format(self.route_base, new_dataset_id))
        assert resp.get('status') == 200
        database = Dataset.get_object(id=new_dataset_id)
        assert database is None

    def test_get_schemas_tables(self):
        one_database = db.session.query(Database).order_by(Database.id).first()
        database_id = one_database.id
        resp_data = self.get_json_resp(
            '{}/schemas/{}/'.format(self.route_base, database_id))
        assert resp_data.get('status') == 200
        schemas = resp_data.get('data')
        assert isinstance(schemas, list)

        if schemas:
            resp_data = self.get_json_resp(
                '{}/tables/{}/{}/'.format(self.route_base, database_id, schemas[0]))
            assert resp_data.get('status') == 200
            tables = resp_data.get('data')
            assert isinstance(tables, list)

    def test_preview_data(self):
        ### preview case 1
        one_dataset = db.session.query(Dataset).order_by(Dataset.id).first()
        resp_data = self.get_json_resp(
            '{}/preview_data/?dataset_id={}'.format(self.route_base, one_dataset.id))
        assert resp_data.get('status') == 200
        data = resp_data.get('data')
        types = data['types']
        columns = data['columns']
        records = data['records']
        assert len(types) == len(columns)
        if records:
            one_record = records[0]
            for c in columns:
                assert c in one_record

        ### preview case 2
        database = self.get_main_database()
        url = make_url(database.sqlalchemy_uri)
        resp_data = self.get_json_resp(
            '{}/preview_data/?database_id={}&full_tb_name={}.{}'
            .format(self.route_base, database.id, url.database, 'birth_names'))
        data = resp_data.get('data')
        types = data['types']
        columns = data['columns']
        records = data['records']
        assert len(types) == len(columns)
        if records:
            one_record = records[0]
            for c in columns:
                assert c in one_record

    def test_add_dataset_types(self):
        except_value = set(['DATABASE', 'HDFS', 'UPLOAD FILE'])
        resp_data = self.get_json_resp('{}/add_dataset_types/'.format(self.route_base))
        assert resp_data.get('status') == 200
        real_value = set(resp_data.get('data'))
        assert except_value.issubset(real_value)
        assert real_value.issubset(except_value)

    def test_filter_dataset_types(self):
        except_value = set(["ALL", "INCEPTOR", "MYSQL", "ORACLE", "MSSQL", "HDFS"])
        resp_data = self.get_json_resp('{}/filter_dataset_types/'.format(self.route_base))
        assert resp_data.get('status') == 200
        real_value = set(resp_data.get('data'))
        assert except_value.issubset(real_value)
        assert real_value.issubset(except_value)


if __name__ == '__main__':
    unittest.main()
