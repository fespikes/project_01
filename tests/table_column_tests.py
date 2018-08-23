"""Unit tests for Pilot"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import unittest
from datetime import datetime
import json

from superset import db
from superset.models.dataset import TableColumn
from superset.models.dataset import Dataset
from tests.base_tests import SupersetTestCase


class TableColumnTests(SupersetTestCase):
    require_examples = True
    route_base = '/tablecolumn'

    def __init__(self, *args, **kwargs):
        super(TableColumnTests, self).__init__(*args, **kwargs)

    def test_listdata(self):
        one_dataset = db.session.query(Dataset).order_by(Dataset.id).first()
        resp_data = self.get_json_resp(
            '{}/listdata/?dataset_id={}'.format(self.route_base, one_dataset.id))
        assert resp_data.get('status') == 200
        list_data = resp_data.get('data').get('data')
        for column_dict in list_data:
            assert 'id' in column_dict
            assert 'column_name' in column_dict
            assert 'expression' in column_dict
            assert 'type' in column_dict
            assert 'max' in column_dict
            assert 'max' in column_dict

    def test_add_show_edit_delete(self):
        one_dataset = db.session.query(Dataset).order_by(Dataset.id).first()
        ### add
        ts = datetime.now().isoformat()
        ts = ts.replace('-', '').replace(':', '').split('.')[0]
        data = {"column_name": "new_column_{}".format(ts),
                "filterable": True,
                "count_distinct": False,
                "expression": "test",
                "type": "STRING",
                "max": False,
                "min": False,
                "sum": False,
                "avg": False,
                "groupby": True,
                "is_dttm": False,
                "dataset_id": one_dataset.id}
        resp = self.get_json_resp('{}/add/'.format(self.route_base, ),
                                  data=json.dumps(data))
        new_column_id = resp.get('data').get('object_id')
        added_column = TableColumn.get_object(id=new_column_id)
        assert added_column is not None

        ### show
        resp_data = self.get_json_resp(
            '{}/show/{}/'.format(self.route_base,  new_column_id))
        resp_data = resp_data.get('data')
        assert added_column.column_name == resp_data.get('column_name')
        assert added_column.expression == resp_data.get('expression')

        ### edit
        data['column_name'] = 'edited_column_{}'.format(ts)
        resp = self.get_json_resp('{}/edit/{}/'.format(self.route_base, new_column_id),
                                  data=json.dumps(data))
        assert resp.get('status') == 200
        edited_column = TableColumn.get_object(id=new_column_id)
        assert edited_column.column_name == data.get('column_name')

        ### delete
        resp = self.get_json_resp('{}/delete/{}/'.format(self.route_base, new_column_id))
        assert resp.get('status') == 200
        column = TableColumn.get_object(id=new_column_id)
        assert column is None


if __name__ == '__main__':
    unittest.main()
