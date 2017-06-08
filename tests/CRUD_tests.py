"""Unit tests for Pilot"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import json

from sqlalchemy import and_, or_
from flask_appbuilder.security.sqla.models import User
from superset import db
from superset.models import Dashboard, FavStar
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
        print(json.dumps(real_value))
        expect_count, expect_rs = self.get_dashboard_list_data()
        assert expect_count == real_value.get('count')
        assert self.page == real_value.get('page')
        assert self.page_size == real_value.get('page_size')
        assert self.order_column == real_value.get('order_column')
        assert self.order_direction == real_value.get('order_direction')

        read_data = real_value.get('data')
        index = 0
        for obj, username, fav in expect_rs:
            assert read_data[index].get('id') == obj.id
            assert read_data[index].get('dashboard_title') == obj.dashboard_title
            assert read_data[index].get('online') == obj.online
            assert read_data[index].get('url') == obj.url
            assert read_data[index].get('description') == obj.description
            if fav:
                assert read_data[0].get('favorite') is True
            else:
                assert read_data[0].get('favorite') is False
            index = index + 1

    def get_dashboard_list_data(self):
        query = (
            db.session.query(Dashboard, User.username, FavStar.obj_id)
                .join(User, Dashboard.created_by_fk == User.id)
        )

        if self.only_favorite:
            query = query.join(FavStar,
                               and_(
                                   Dashboard.id == FavStar.obj_id,
                                   FavStar.class_name.ilike('dashboard'),
                                   FavStar.user_id == self.user.id)
                               )
        else:
            query = query.outerjoin(FavStar,
                                    and_(
                                        Dashboard.id == FavStar.obj_id,
                                        FavStar.class_name.ilike('dashboard'),
                                        FavStar.user_id == self.user.id)
                                    )
        query = query.filter(
            or_(Dashboard.created_by_fk == self.user.id,
                Dashboard.online == 1)
        )

        if self.filter:
            filter_str = '%{}%'.format(self.filter.lower())
            query = query.filter(
                or_(
                    Dashboard.dashboard_title.ilike(filter_str),
                    Dashboard.description.ilike(filter_str),
                    User.username.ilike(filter_str)
                )
            )
        count = query.count()

        if self.order_column:
            column = self.dash_view.str_to_column.get(self.order_column)
            if self.order_direction == 'desc':
                query = query.order_by(column.desc())
            else:
                query = query.order_by(column)

        if self.page is not None and self.page >= 0 \
                and self.page_size and self.page_size > 0:
            query = query.limit(self.page_size) \
                .offset(self.page * self.page_size)

        rs = query.all()
        return count, rs

    def test_show(self):
        pass

    def test_add(self):
        pass

    def test_delete(self):
        pass

    def test_muldelete(self):
        pass