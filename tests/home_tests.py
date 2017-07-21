from __future__ import absolute_import

import unittest
import time
from datetime import datetime

from superset.models import DailyNumber, Log

from superset.models import Database
from superset.models import Slice
from superset.models import Dataset
from superset.models import Dashboard

from superset.views import Home
from superset.views import DashboardModelView
from superset.views import SliceModelView
from superset.views import DatasetModelView
from superset.views import DatabaseView

from tests.base_tests import SupersetTestCase
from tests.base_tests import PageMixin

from superset import app, cli, db, models, appbuilder, security, sm

log_number = DailyNumber.log_number

class HomeTests(SupersetTestCase, PageMixin):
    #requires_examples = True

    add_slice_id = None
    add_dashboard_id = None
    add_dataset_id = None
    add_connection_id = None

    def __init__(self, *args, **kwargs):
        super(HomeTests, self).__init__(*args, **kwargs)
        self.view = Home()

    def setUp(self):
        pass

    def tearDown(self):
        pass

    '''
        the data format: {'date':'2017-06-07', count:2}
        return today data
    '''
    def parse_trends_data(self, data):
        slice_today = data.get('trends').get('slice')
        dataset_today = data.get('trends').get('dataset')
        dashboard_today = data.get('trends').get('dashboard')
        connection_today = data.get('trends').get('connection')

        today = time.strftime('%Y-%m-%d')
        count_today = {
            'slice': 0,
            'dataset': 0,
            'dashboard': 0,
            'connection': 0,
        }
        if slice_today:
            count_today['slice'] = slice_today[-1]['count']
        if dataset_today:
            count_today['dataset'] = dataset_today[-1]['count']
        if dashboard_today:
            count_today['dashboard'] = dashboard_today[-1]['count']
        if connection_today:
            count_today['connection'] = connection_today[-1]['count']
        return count_today['slice'], count_today['dataset'], count_today['dashboard'], count_today['connection']

    def log_action(self, action_type, action, obj_type, obj_id):
        sesh = db.session()
        log_c = Log()
        log_c.action = action
        log_c.action_type = action_type
        log_c.obj_type = obj_type
        log_c.obj_id = obj_id
        log_c.json = ""
        log_c.referrer = None
        log_c.user_id = self.user.id
        sesh.add(log_c)
        sesh.commit()

    def add_dashboard_connection_slice_dataset(self):
        # add dashboards
        self.view = DashboardModelView()
        new_slices = self.view.get_available_slices(self.user.id)[:2]
        new_dash = {'dashboard_title': 'new_dashboard' +str(datetime.now()),
                    'description': 'new dashboard',
                    'slices': self.view.slices_to_dict(new_slices)}
        obj = self.view.populate_object(None, self.user.id, new_dash)
        self.view.datamodel.add(obj)

        obj = db.session.query(Dashboard).filter_by(dashboard_title=new_dash.get('dashboard_title')).first()
        obj.online = True
        obj.created_by_fk = self.user.id
        db.session.commit()
        log_number('dashboard', True, self.user.id)


        obj = db.session.query(Dashboard).all()
        # add dataset
        self.view = DatasetModelView()
        one_dataset = db.session.query(Dataset).first()
        json_data = {
            'dataset_name': 'this is a for test' + str(datetime.now()),#one_dataset.dataset_name,
            'dataset_type': 'inceptor',
            'table_name': 'dbs',
            'schema': None,
            'database_id': one_dataset.database_id,
            'sql': None,
            'description': 'this dataset is for test' + str(datetime.now()),
        }
        obj = self.view.populate_object(None, self.user.id, json_data)
        self.view.datamodel.add(obj)

        obj = db.session.query(Dataset).filter_by(dataset_name=json_data.get('dataset_name')).first()
        obj.online = True
        obj.created_by_fk = self.user.id
        db.session.commit()
        log_number('dataset', True, self.user.id)


        # add connection
        self.view = DatabaseView()
        one_connection = db.session.query(Database).first()
        new_connection = {
            'database_name': '1.198_copy_test_lc'+str(datetime.now()),
            'sqlalchemy_uri': 'mysql://root:120303@localhost/pilot_test?charset=utf8',
            'description': 'test the database',
            'args': "{'connect_args': {} }"
        }
        obj = self.view.populate_object(None, self.user.id, new_connection)
        self.view.datamodel.add(obj)

        obj = db.session.query(Database).filter_by(database_name=new_connection.get('database_name')).first()
        obj.online = True
        obj.created_by_fk = self.user.id
        db.session.commit()
        log_number('connection', True, self.user.id)

        #edit slice
        self.view = SliceModelView()
        one_slice = db.session.query(Slice).first()
        all_dashboard = db.session.query(Dashboard).all()
        if len(all_dashboard) < 2:
            print("do not have enough dashboard")
        json_data = {
            'dashboards': [
                {'dashboard_title': all_dashboard[0].dashboard_title, 'id':all_dashboard[0].id},
                {'dashboard_title': all_dashboard[1].dashboard_title, 'id':all_dashboard[1].id},
            ],
            'slice_name': 'test_slice',
            'description': 'for test' + str(datetime.now()),
        }
        # edit
        obj = self.view.populate_object(one_slice.id, self.user.id, json_data)
        self.view.datamodel.edit(obj)
        action_str = 'Edit slice: [{}]'.format(one_slice.slice_name)
        self.log_action('edit', action_str, 'slice', one_slice.id)

        self.view = Home()

    def get_home_data(self):
        user_id = self.user.id
        response = {}
        #
        types = self.view.default_types.get('counts')
        result = self.view.get_object_counts(user_id, types)
        response['counts'] = result
        #
        types = self.view.default_types.get('trends')
        limit = self.view.default_limit.get('trends')
        result = self.view.get_object_number_trends(user_id, types, limit=limit)
        response['trends'] = result
        # #
        types = self.view.default_types.get('favorits')
        limit = self.view.default_limit.get('favorits')
        result = self.view.get_fav_objects(user_id, types, limit)
        response['favorits'] = result
        # #
        limit = self.view.default_limit.get('refers')
        result = self.view.get_refered_slices(user_id, limit)
        response['refers'] = result
        #
        types = self.view.default_types.get('edits')
        limit = self.view.default_limit.get('edits')
        result = self.view.get_edited_objects(
            user_id=user_id, types=types, page_size=limit)
        response['edits'] = result
        # #
        limit = self.view.default_limit.get('actions')
        types = self.view.default_types.get('actions')
        count, result = self.view.get_user_actions(
            user_id=user_id, types=types, page_size=limit)
        response['actions'] = result
        return response


    def test_alldata(self):
        # trends
        self.add_dashboard_connection_slice_dataset()
        home_data = self.get_home_data()
        slice_count, dataset_count, dashboard_count, connection_count = self.parse_trends_data(home_data)
        self.add_dashboard_connection_slice_dataset()
        home_data = self.get_home_data()
        slice_count_new, dataset_count_new, dashboard_count_new, connection_count_new = self.parse_trends_data(home_data)
        assert (dataset_count+1) == dataset_count_new
        assert (dashboard_count+1) == dashboard_count_new
        assert (connection_count+1) == connection_count_new


        # edits
        assert time.strftime('%Y-%m-%d') in home_data.get('edits').get('slice')[0].get('time')

        response_attr = {
            'edits': ['time', 'name', 'action', 'link', 'description'],
            'favorits': ['name', 'count'],
        }
        for title in response_attr:
            for obj in home_data.get(title).get('slice'):
                for attr in response_attr.get(title):
                    assert attr in obj
            for obj in home_data.get(title).get('dashboard'):
                for attr in response_attr.get(title):
                    assert attr in obj

        response_attr = {
            'actions': ['link', 'time', 'action', 'title', 'user', 'obj_type'],
            'refers':  ['name', 'count'],
        }
        for title in response_attr:
            for obj in home_data.get(title):
                for attr in response_attr.get(title):
                    assert attr in obj

if __name__ == '__main__':
    unittest.main()
