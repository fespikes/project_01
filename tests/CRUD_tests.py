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

    def test_add(self):
        pass

    def test_delete(self):
        pass

    def test_muldelete(self):
        pass


if __name__ == '__main__':
    unittest.main()
