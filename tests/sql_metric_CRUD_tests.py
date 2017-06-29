"""Unit tests for Pilot"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import unittest

from datetime import datetime, timedelta, date

from sqlalchemy import and_, or_
from flask_appbuilder.security.sqla.models import User
from superset import db
from superset.views import SqlMetricInlineView
from superset.models import SqlMetric
from superset.models import Dataset
from tests.base_tests import SupersetTestCase
from tests.base_tests import PageMixin


class SqlMetricCRUDTests(SupersetTestCase, PageMixin):
    #requires_examples = True

    def __init__(self, *args, **kwargs):
        super(SqlMetricCRUDTests, self).__init__(*args, **kwargs)
        self.view = SqlMetricInlineView()

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_listdata(self):
        one_table = db.session.query(Dataset).first()
        self.kwargs['dataset_id'] = one_table.id
        self.check_base_param(no_check=True)
        sql_metric_data_list = self.real_value.get('data')
        for sql_metric_data in sql_metric_data_list:
            sql_metric = db.session.query(SqlMetric) \
                .filter_by(id=sql_metric_data['id'])\
                .filter_by(metric_name=sql_metric_data['metric_name']) \
                .filter_by(expression=sql_metric_data['expression']) \
                .first()
            assert sql_metric is not None


    def check_available_tables(self, single_table, available_tables):
        for available_table in available_tables:
            if single_table['id'] == available_table['id'] and \
                            single_table['dataset_name'] == available_table['dataset_name'] :
                return True
        return False

    def test_show(self):
        one_sql_metric = db.session.query(SqlMetric).first()
        real_value = self.view.get_show_attributes(one_sql_metric, self.user.id)
        available_tables = self.view.get_available_tables()

        for attr in real_value:
            if attr == 'readme' or 'changed_by_user':
                pass
            elif attr == 'available_tables':
                available_tables_list = real_value.get('available_tables')
                for single_table in available_tables_list:
                    assert self.check_available_tables(single_table, available_tables) == True
            else:
                assert getattr(one_sql_metric, attr) == real_value.get(attr)

    def test_add_edit_delete(self):
        
        one_table = db.session.query(Dataset).first()
        json_data = {
            'metric_name': 'avg_num',
            'expression': 'AVG(num)',
            'metric_type': 'avg',
            'table': one_table.table_name,
            'verbose_name': 'avg_num',
            'dataset_id': one_table.id,
            'd3format': None,
            'description': 'added metric'+str(datetime.now()),
        }

        # add
        obj = self.view.populate_object(None, self.user.id, json_data)
        self.view.pre_add(obj)
        self.view.datamodel.add(obj)
        self.view.post_add(obj)

        added_sql_metric = db.session.query(SqlMetric)\
            .filter_by(metric_name=json_data.get('metric_name'))\
            .filter_by(expression=json_data.get('expression'))\
            .filter_by(verbose_name=json_data.get('verbose_name'))\
            .filter_by(dataset_id=json_data.get('dataset_id'))\
            .filter_by(description=json_data.get('description'))\
            .first()
        assert added_sql_metric.dataset.table_name == json_data['table']

        # edit
        json_data['description'] = 'this is for test'
        obj = self.view.populate_object(added_sql_metric.id, self.user.id, json_data)
        self.view.pre_update(obj)
        self.view.datamodel.edit(obj)
        self.view.post_update(obj)
        edited_sql_metric = db.session.query(SqlMetric)\
            .filter_by(metric_name=json_data.get('metric_name'))\
            .filter_by(expression=json_data.get('expression'))\
            .filter_by(verbose_name=json_data.get('verbose_name'))\
            .filter_by(dataset_id=json_data.get('dataset_id'))\
            .filter_by(description=json_data.get('description'))\
            .first()
        assert edited_sql_metric is not None

        # delete
        obj = self.view.get_object(edited_sql_metric.id)
        self.view.delete(edited_sql_metric.id)
        target_sql_metric = db.session.query(SqlMetric) \
            .filter_by(id=edited_sql_metric.id) \
            .first()
        assert target_sql_metric is None

    def test_addablechoices(self):
        result = self.view.get_addable_choices()
        available_table_list = result.get('available_tables')
        for one_available_table in available_table_list:
            target_table = db.session.query(Dataset) \
                .filter_by(id=one_available_table.get('id'), dataset_name=one_available_table.get('dataset_name')) \
                .first()
            assert target_table is not None


if __name__ == '__main__':
    unittest.main()
