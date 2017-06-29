"""Unit tests for Pilot"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import unittest
from datetime import datetime


from superset import db
from superset.views import TableColumnInlineView
from superset.models import TableColumn
from superset.models import Dataset
from tests.base_tests import SupersetTestCase
from tests.base_tests import PageMixin


class TableColumnCRUDTests(SupersetTestCase, PageMixin):
    #requires_examples = True

    def __init__(self, *args, **kwargs):
        super(TableColumnCRUDTests, self).__init__(*args, **kwargs)
        self.view = TableColumnInlineView()

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_listdata(self):
        one_table = db.session.query(TableColumn).first()
        self.kwargs['dataset_id'] = one_table.dataset_id
        kwargs = self.kwargs
        self.real_value = self.view.get_object_list_data(**kwargs)
        real_data = self.real_value.get('data')
        for one in real_data:
            target_table = db.session.query(TableColumn) \
                .filter_by(id=one.get('id')) \
                .filter_by(filterable=one.get('filterable')) \
                .filter_by(count_distinct=one.get('count_distinct')) \
                .filter_by(is_dttm=one.get('is_dttm')) \
                .filter_by(min=one.get('min')) \
                .filter_by(type=one.get('type')) \
                .filter_by(column_name=one.get('column_name')) \
                .filter_by(sum=one.get('sum')) \
                .filter_by(groupby=one.get('groupby')) \
                .filter_by(max=one.get('max')) \
                .all()
            assert target_table is not None

    def check_available_tables(self, available_tables=None):
        if not available_tables:
            available_tables = self.view.get_available_tables()
        for one_table in available_tables:
            target_table = db.session.query(Dataset) \
                .filter_by(id=one_table['id'], dataset_name=one_table['dataset_name']) \
                .one()
            assert target_table is not None

    def test_addablechoices(self):
        self.check_available_tables()    
    
    def test_show(self):
        one_table_column = db.session.query(TableColumn).first() 
        attributes = self.view.get_show_attributes(one_table_column)
        not_checked_attr = ['readme', 'created_by_user', 'changed_by_user']
        for attr in attributes:
            if attr in not_checked_attr:
                pass
            elif attr == 'available_tables':
                self.check_available_tables(attributes.get('available_tables'))
            else:
                assert getattr(one_table_column, attr) == attributes.get(attr)

    def test_add_edit_delete(self):
        one_table = db.session.query(Dataset).first()
        assert one_table is not None
        json_data = {
            'column_name': 'source' + str(datetime.now()),
            'filterable': True,
            'count_distinct': False,
            'expression': '',
            'verbose_name': 'new_column_source',
            'max': False,
            'sum': False,
            'groupby': True,
            'database_expression': None,
            'python_date_format': None,
            'dataset_id': one_table.id,
            'is_dttm': False,
            'min': False,
        }
        # add
        obj = self.view.populate_object(None, self.user.id, json_data)
        self.view.pre_add(obj)
        self.view.datamodel.add(obj)
        self.view.post_add(obj)
        
        added_table = db.session.query(TableColumn) \
            .filter_by(count_distinct=json_data.get('count_distinct')) \
            .filter_by(verbose_name=json_data.get('verbose_name')) \
            .filter_by(column_name=json_data['column_name']) \
            .one()
        assert added_table is not None

        #edit
        json_data['column_name'] = 'target' + str(datetime.now())
        obj = self.view.populate_object(added_table.id, self.user.id, json_data)
        self.view.datamodel.edit(obj)
        edited_table = db.session.query(TableColumn)\
            .filter_by(id=added_table.id) \
            .filter_by(column_name=json_data['column_name']) \
            .one()
        assert edited_table is not None

        #delete
        self.view.delete(edited_table.id)
        target_table = db.session.query(TableColumn) \
            .filter_by(id=edited_table.id) \
            .filter_by(column_name=json_data['column_name']) \
            .first()
        assert target_table is None

if __name__ == '__main__':
    unittest.main()




