# -*- coding: utf-8 -*-
# pylint: disable=C,R,W
"""Unit tests for Pilot"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import json
import unittest

from datetime import datetime
from superset.models import Dashboard
from superset.views.core import DashboardModelView
from tests.base_tests import SupersetTestCase


class DashboardTests(SupersetTestCase):
    require_examples = True
    route_base = '/dashboard'

    def __init__(self, *args, **kwargs):
        super(DashboardTests, self).__init__(*args, **kwargs)
        self.view = DashboardModelView()

    def test_listdata(self):
        resp_data = self.get_json_resp('{}/listdata/'.format(self.route_base))
        assert resp_data.get('status') == 200

        data = resp_data.get('data')
        assert 'count' in data
        assert 'order_column' in data
        assert 'order_direction' in data
        assert 'page' in data
        assert 'page_size' in data

        dash_list = data.get('data')
        for dash_dict in dash_list:
            assert isinstance(dash_dict.get('id'), int)
            assert isinstance(dash_dict.get('favorite'), bool)
            assert '/p/dashboard/' in dash_dict.get('url')

        if dash_list:
            one_dash = dash_list[0]
            queried_dash = Dashboard.get_object(id=one_dash.get('id'))
            assert one_dash.get('name') == queried_dash.name
            assert one_dash.get('url') == queried_dash.url
            assert one_dash.get('description') == queried_dash.description

    def test_add_show_edit_delete(self):
        ### add
        new_slices = self.get_slices(2)
        ts = datetime.now().isoformat()
        ts = ts.replace('-', '').replace(':', '').split('.')[0]
        data = {'name': 'new_dashboard_{}'.format(ts),
                'description': 'new dashboard',
                'slices': self.view.slices_to_dict(new_slices)
                }
        resp = self.get_json_resp('{}/add/'.format(self.route_base),
                                  data=json.dumps(data))
        new_dash_id = resp.get('data').get('object_id')
        added_dash = Dashboard.get_object(id=new_dash_id)
        assert added_dash is not None

        ### show
        resp_data = self.get_json_resp(
            '{}/show/{}/'.format(self.route_base, new_dash_id))
        resp_data = resp_data.get('data')
        assert added_dash.id == resp_data.get('id')
        assert added_dash.name == resp_data.get('name')
        assert added_dash.description == resp_data.get('description')
        assert len(added_dash.slices) == len(resp_data.get('slices'))

        ### edit
        new_slices = self.get_slices(3)
        data = {'name': 'edited_dashboard_{}'.format(ts),
                'description': 'edit dashboard',
                'slices': self.view.slices_to_dict(new_slices)}
        resp = self.get_json_resp('{}/edit/{}/'.format(self.route_base, new_dash_id),
                                  data=json.dumps(data))
        assert resp.get('status') == 200

        edited_dash = Dashboard.get_object(id=new_dash_id)
        assert edited_dash.name == data.get('name')
        assert edited_dash.description == data.get('description')
        new_slices_name = [slc.slice_name for slc in new_slices]
        for slc in edited_dash.slices:
            assert slc.slice_name in new_slices_name

        ### delete
        resp = self.get_json_resp('{}/delete/{}/'.format(self.route_base, new_dash_id))
        assert resp.get('status') == 200
        dash = Dashboard.get_object(id=new_dash_id)
        assert dash is None

    def test_save_dashboard(self):
        pass


if __name__ == '__main__':
    unittest.main()
