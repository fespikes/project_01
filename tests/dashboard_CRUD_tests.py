"""Unit tests for Pilot"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import unittest

from sqlalchemy import and_, or_
from flask_appbuilder.security.sqla.models import User
from superset import db
from superset.models import Dashboard
from superset.views import DashboardModelView
from tests.base_tests import SupersetTestCase


class PageMixin(object):
    order_column = 'changed_on'
    order_direction = 'desc'
    page = 0
    page_size = 10
    filter = None
    only_favorite = False
    kwargs = {'order_column': order_column,
              'order_direction': order_direction,
              'page': page,
              'page_size': page_size,
              'filter': filter,
              'only_favorite': only_favorite}


class DashboardCRUDTests(SupersetTestCase, PageMixin):
    requires_examples = True

    def __init__(self, *args, **kwargs):
        super(DashboardCRUDTests, self).__init__(*args, **kwargs)
        self.dash_view = DashboardModelView()

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_listdata(self):
        kwargs = self.kwargs
        kwargs['user_id'] = self.user.id
        real_value = self.dash_view.get_object_list_data(**kwargs)

        assert self.page == real_value.get('page')
        assert self.page_size == real_value.get('page_size')
        assert self.order_column == real_value.get('order_column')
        assert self.order_direction == real_value.get('order_direction')

        dash_list = real_value.get('data')
        one_dash = dash_list[0]
        for dash_dict in dash_list:
            assert isinstance(dash_dict.get('id'), int)
            assert isinstance(dash_dict.get('online'), bool)
            assert isinstance(dash_dict.get('favorite'), bool)
            assert '/pilot/dashboard/' in dash_dict.get('url')

        queried_dash = db.session.query(Dashboard)\
            .filter_by(id=one_dash.get('id')).first()
        assert one_dash.get('dashboard_title') == queried_dash.dashboard_title
        assert one_dash.get('online') == queried_dash.online
        assert one_dash.get('url') == queried_dash.url
        assert one_dash.get('description') == queried_dash.description
        assert one_dash.get('dashboard_title') == queried_dash.dashboard_title

    def test_show(self):
        one_dash = db.session.query(Dashboard).first()
        real_value = self.dash_view.get_show_attributes(one_dash, self.user.id)
        assert one_dash.id == real_value.get('id')
        assert one_dash.dashboard_title == real_value.get('dashboard_title')
        assert one_dash.description == real_value.get('description')
        assert one_dash.table_names == real_value.get('table_names')
        assert len(one_dash.slices) == len(real_value.get('slices'))

    def test_add_edit_delete(self):
        new_dash_id = None

        # add
        new_slices = self.dash_view.get_available_slices(self.user.id)[:2]
        new_dash = {'dashboard_title': 'new_dashboard',
                    'description': 'new dashboard',
                    'slices': self.dash_view.slices_to_dict(new_slices)}
        obj = self.dash_view.populate_object(None, self.user.id, new_dash)
        self.dash_view.datamodel.add(obj)

        added_dash = db.session.query(Dashboard)\
            .filter_by(dashboard_title=new_dash.get('dashboard_title'))\
            .first()
        new_dash_id = added_dash.id
        assert added_dash.dashboard_title == new_dash.get('dashboard_title')
        assert added_dash.description == new_dash.get('description')
        # when add/edit in app, 'created_by_fk' and 'changed_by_fk'
        # are the present logined user, so no need to test them
        new_slices_name = [slc.slice_name for slc in new_slices]
        for slc in added_dash.slices:
            assert slc.slice_name in new_slices_name

        # edit
        new_slices = self.dash_view.get_available_slices(self.user.id)[0:2]
        new_dash = {'dashboard_title': 'edited_dashboard',
                    'description': 'edit dashboard',
                    'slices': self.dash_view.slices_to_dict(new_slices)}
        obj = self.dash_view.populate_object(new_dash_id, self.user.id, new_dash)
        self.dash_view.datamodel.edit(obj)

        edited_dash = db.session.query(Dashboard) \
            .filter_by(id=new_dash_id)\
            .first()
        assert edited_dash.dashboard_title == new_dash.get('dashboard_title')
        assert edited_dash.description == new_dash.get('description')
        new_slices_name = [slc.slice_name for slc in new_slices]
        for slc in edited_dash.slices:
            assert slc.slice_name in new_slices_name

        # delete
        obj = self.dash_view.get_object(new_dash_id)
        self.dash_view.datamodel.delete(obj)
        target_dash = db.session.query(Dashboard) \
            .filter_by(id=new_dash_id).first()
        assert target_dash is None


if __name__ == '__main__':
    unittest.main()
