"""Unit tests for Pilot"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import unittest
from datetime import datetime

from sqlalchemy import and_, or_
from flask_appbuilder.security.sqla.models import User
from superset import db
from superset.views import TableModelView
from superset.views import DatabaseView
from superset.models import SqlaTable
from superset.models import Database
from tests.base_tests import SupersetTestCase
from tests.base_tests import PageMixin

class TableCRUDTests(SupersetTestCase, PageMixin):
    requires_examples = True

    def __init__(self, *args, **kwargs):
        super(TableCRUDTests, self).__init__(*args, **kwargs)
        self.view = TableModelView()

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_listdata(self):
        self.check_base_param()
    
        query = db.session.query(SqlaTable, User) \
            .filter(SqlaTable.created_by_fk == User.id)
        count = query.count()
        assert count == self.real_value.get('count')

        data = self.real_value.get('data')
        for line in data:
            assert '/pilot/explore/table/' in line.get('explore_url')
            assert isinstance(line.get('id'), int)

    def test_databases(self):
        dbs = self.view.get_available_databases()
        for one_db in dbs:
            assert one_db.get('database_name') != 'main'
            rs = db.session.query(Database) \
                .filter_by(database_name=one_db['database_name'], id=one_db['id']) \
                .all()
            assert rs is not None

    def test_schemas(self):
        pass

    def test_tables(self):
        pass

    def check_available_databases(self, single_database, available_databases):
        for available_database in available_databases:
            if single_database['id'] == available_database['id'] and \
                            single_database['database_name'] == available_database['database_name']:
                return True
        return False

    def test_show(self):
        one_table = db.session.query(SqlaTable).first()
        real_value = self.view.get_show_attributes(one_table, self.user.id)
        available_databases = self.view.get_available_databases()
        not_checked_attr = ['readme', 'created_by_user', 'changed_by_user']
        for attr in real_value:
            if attr in not_checked_attr:
                pass
            elif attr == 'available_databases':
                available_databases_list = real_value.get('available_databases')
                for single_database in available_databases_list:
                    assert self.check_available_databases(single_database, available_databases) == True
            else:
                assert getattr(one_table, attr) == real_value.get(attr)

    def test_table_add_edit_delete(self):
        # add
        one_table = db.session.query(SqlaTable).first()
        json_data = {
            'dataset_name': 'this is for test' + str(datetime.now()),#one_table.dataset_name,
            'dataset_type': one_table.dataset_type,
            'table_name': 'dbs',
            'schema': None,
            'database_id': one_table.database_id,
            'sql': None,
            'description': 'this table is for test' + str(datetime.now()),
        }
        obj = self.view.populate_object(None, self.user.id, json_data)
        #self.view.pre_add(obj)
        self.view.datamodel.add(obj)
        #self.view.post_add(obj)

        added_table = db.session.query(SqlaTable) \
            .filter_by(dataset_name=json_data.get('dataset_name')) \
            .filter_by(dataset_type=json_data.get('dataset_type')) \
            .filter_by(table_name=json_data.get('table_name')) \
            .filter_by(schema=json_data.get('schema')) \
            .filter_by(database_id=json_data.get('database_id')) \
            .filter_by(description=json_data.get('description')) \
            .first()
        assert added_table is not None

        # edit
        json_data['description'] = 'this has been edited' + str(datetime.now())
        obj = self.view.populate_object(added_table.id, self.user.id, json_data)
        #self.view.pre_update(obj)
        self.view.datamodel.edit(obj)
        #self.view.post_update(obj)
        edited_table = db.session.query(SqlaTable)\
            .filter_by(id=added_table.id)\
            .filter_by(description=json_data.get('description'))\
            .first()
        assert edited_table is not None

        # delete
        obj = self.view.get_object(edited_table.id)
        self.view.delete(edited_table.id)
        target_table = db.session.query(SqlaTable) \
            .filter_by(id=edited_table.id) \
            .first()
        assert target_table is None

if __name__ == '__main__':
    unittest.main()





