"""Unit tests for Pilot"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

from superset import db, models
from superset.views import DashboardModelView
from tests.base_tests import SupersetTestCase


class DashboardCRUDTests(SupersetTestCase):

    def __init__(self, *args, **kwargs):
        super(DashboardCRUDTests, self).__init__(*args, **kwargs)
        self.dash_view = DashboardModelView()

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_listdata(self):
        pass

    def test_show(self):
        pass

    def test_add(self):
        pass

    def test_delete(self):
        pass

    def test_muldelete(self):
        pass