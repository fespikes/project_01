"""Unit tests for Pilot"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import unittest
from datetime import datetime
import json

from superset import db
from superset.views.core import SliceModelView
from superset.models import Dashboard, Slice
from tests.base_tests import SupersetTestCase
from tests.base_tests import PageMixin


class SliceTests(SupersetTestCase, PageMixin):
    require_examples = True
    route_base = '/slice'

    def __init__(self, *args, **kwargs):
        super(SliceTests, self).__init__(*args, **kwargs)
        self.view = SliceModelView()

    def test_listdata(self):
        resp_data = self.get_json_resp('{}/listdata/'.format(self.route_base))
        assert resp_data.get('status') == 200
        list_data = resp_data.get('data').get('data')
        for metric_dict in list_data:
            assert 'id' in metric_dict
            assert 'slice_name' in metric_dict
            assert 'slice_url' in metric_dict
            assert 'viz_type' in metric_dict
            assert 'description' in metric_dict
            assert 'datasource' in metric_dict
            assert 'explore_url' in metric_dict
            assert 'favorite' in metric_dict

    def test_add(self):
        pass

    def test_show_edit_delete(self):
        # add
        ts = datetime.now().isoformat()
        ts = ts.replace('-', '').replace(':', '').split('.')[0]
        new_slice = self.add_slice('new_slice_{}'.format(ts))
        new_slice_id = new_slice.id

        ### show
        resp_data = self.get_json_resp(
            '{}/show/{}/'.format(self.route_base, new_slice_id))
        resp_data = resp_data.get('data')
        assert new_slice.slice_name == resp_data.get('slice_name')
        assert len(new_slice.dashboards) == len(resp_data.get('dashboards'))

        # edit
        one_dash = db.session.query(Dashboard).first()
        data = {
            'dashboards': [{'dashboard_title': one_dash.name, 'id': one_dash.id}, ],
            'slice_name': 'edit_slice_{}'.format(ts),
            'description': 'edit',
        }
        resp = self.get_json_resp('{}/edit/{}/'.format(self.route_base, new_slice_id),
                                  data=json.dumps(data))
        assert resp.get('status') == 200
        edited_slice = Slice.get_object(id=new_slice_id)
        assert edited_slice.slice_name == data.get('slice_name')
        assert len(edited_slice.dashboards) == len(data.get('dashboards'))

        # delete
        resp = self.get_json_resp('{}/delete/{}/'.format(self.route_base, new_slice_id))
        assert resp.get('status') == 200
        slice = Slice.get_object(id=new_slice_id)
        assert slice is None

    @staticmethod
    def add_slice(slice_name):
        one_slice = db.session.query(Slice).order_by(Slice.id).first()
        slice = Slice(
            slice_name=slice_name,
            datasource_id=one_slice.datasource_id,
            datasource_type=one_slice.datasource_type,
            datasource_name=one_slice.datasource_name,
            database_id=one_slice.database_id,
            full_table_name=one_slice.full_table_name,
            viz_type=one_slice.viz_type,
            params=one_slice.params
        )
        db.session.add(slice)
        db.session.commit()
        return slice


if __name__ == '__main__':
    unittest.main()





