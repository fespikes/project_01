"""Unit tests for Pilot"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import unittest
from datetime import datetime
import json

from superset import db
from superset.models.dataset import SqlMetric
from superset.models.dataset import Dataset
from tests.base_tests import SupersetTestCase
from tests.base_tests import PageMixin


class SqlMetricTests(SupersetTestCase, PageMixin):
    require_examples = True
    route_base = '/sqlmetric'

    def __init__(self, *args, **kwargs):
        super(SqlMetricTests, self).__init__(*args, **kwargs)

    def test_list(self):
        one_dataset = db.session.query(Dataset).order_by(Dataset.id).first()
        resp_data = self.get_json_resp(
            '{}/listdata/?dataset_id={}'.format(self.route_base, one_dataset.id))
        assert resp_data.get('status') == 200
        list_data = resp_data.get('data').get('data')
        for metric_dict in list_data:
            assert 'id' in metric_dict
            assert 'metric_name' in metric_dict
            assert 'expression' in metric_dict
            assert 'metric_type' in metric_dict

    def test_add_show_edit_delete(self):
        one_dataset = db.session.query(Dataset).order_by(Dataset.id).first()
        ### add
        ts = datetime.now().isoformat()
        ts = ts.replace('-', '').replace(':', '').split('.')[0]
        data = {"metric_name": "new_metric_{}".format(ts),
                "expression": "count(*)",
                "metric_type": "COUNT",
                "description": "",
                "dataset_id": one_dataset.id}
        resp = self.get_json_resp('{}/add/'.format(self.route_base),
                                  data=json.dumps(data))
        new_object_id = resp.get('data').get('object_id')
        added_object = SqlMetric.get_object(id=new_object_id)
        assert added_object is not None

        ### show
        resp_data = self.get_json_resp(
            '{}/show/{}/'.format(self.route_base, new_object_id))
        resp_data = resp_data.get('data')
        assert added_object.metric_name == resp_data.get('metric_name')
        assert added_object.expression == resp_data.get('expression')

        ### edit
        data['metric_name'] = 'edited_metric_{}'.format(ts)
        resp = self.get_json_resp('{}/edit/{}/'.format(self.route_base, new_object_id),
                                  data=json.dumps(data))
        assert resp.get('status') == 200
        edited_object = SqlMetric.get_object(id=new_object_id)
        assert edited_object.metric_name == data.get('metric_name')

        ### delete
        resp = self.get_json_resp('{}/delete/{}/'.format(self.route_base, new_object_id))
        assert resp.get('status') == 200
        column = SqlMetric.get_object(id=new_object_id)
        assert column is None


if __name__ == '__main__':
    unittest.main()
