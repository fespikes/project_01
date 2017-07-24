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
from superset.views.core import SliceModelView
from superset.models.core import Dashboard
from superset.models.aider import FavStar
from superset.models.core import Slice
from tests.base_tests import SupersetTestCase
from tests.base_tests import PageMixin

class SliceCRUDTests(SupersetTestCase, PageMixin):
    #requres_examples = True

    def __init__(self, *args, **kwargs):
        super(SliceCRUDTests, self).__init__(*args, **kwargs)
        self.view = SliceModelView()

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_listdata(self):
        self.check_base_param()

        slice_list = self.real_value.get('data')
        one_slice = None
        if slice_list:
            one_slice = slice_list[0]
        for slice_dic in slice_list:
            assert isinstance(slice_dic.get('favorite'), bool)
            assert '/pilot/explore/table/' in slice_dic.get('slice_url')

        rs = db.session.query(Slice, User.username) \
            .join(User, Slice.created_by_fk == User.id) \
            .filter(
                and_(
                    Slice.id == one_slice.get('id'),
                    User.username.ilike(one_slice.get('created_by_user'))
                )
            ) \
            .first()
        [target_slice, user_name] = rs

        assert one_slice.get('id') == target_slice.id
        assert one_slice.get('slice_url') == target_slice.slice_url
        assert one_slice.get('viz_type') == target_slice.viz_type
        assert one_slice.get('slice_name') == target_slice.slice_name
        #assert one_slice.get('datasource') == target_slice.datasource.datasource_name
        assert one_slice.get('created_by_user') == user_name

    def check_brief_dashboards(self, brief_dashboard, dashboards, user_id=None):
        for dashboard in dashboards:
            if user_id:
                if dashboard['created_by_fk'] == user_id and \
                            dashboard['dashboard_title'] == brief_dashboard['dashboard_title'] and \
                            dashboard['id'] == brief_dashboard['id']:
                    return True
                else:
                    pass
            else:
                if dashboard.dashboard_title == brief_dashboard['dashboard_title'] and \
                                dashboard.id == brief_dashboard['id']:
                    return True
                else:
                    pass

        return False

    def test_show(self):
        one_slice = db.session.query(Slice).first()
        obj = self.view.get_object(one_slice.id)
        real_value = self.view.get_show_attributes(one_slice, self.user.id)
        assert one_slice.id == real_value.get('id')
        assert one_slice.slice_name == real_value.get('slice_name')
        all_related_dashboard = one_slice.dashboards
        for brief_dashboard in real_value['dashboards']:
            assert self.check_brief_dashboards(brief_dashboard, all_related_dashboard) is True

        available_dashboards = []
        all_dashboard = db.session.query(Dashboard).all()
        for dashboard in all_dashboard:
            available_dashboards.append({'id': dashboard.id, 'dashboard_title': dashboard.dashboard_title, 'created_by_fk': dashboard.created_by_fk})
        for brief_dashboard in real_value['available_dashboards']:
            assert self.check_brief_dashboards(brief_dashboard, available_dashboards, self.user.id) is True

    def test_release_online(self):
        slice_obj = db.session.query(Slice).first()
        # set online
        slice_obj.online = True
        db.session.commit()
        slice_new = db.session.query(Slice).filter_by(id=slice_obj.id).first()
        assert slice_new.online is True
        # set offline
        slice_obj.online = False
        db.session.commit()
        slice_new = db.session.query(Slice).filter_by(id=slice_obj.id).first()
        assert slice_new.online is False

    def test_favstar(self):
        fav_one_obj = db.session.query(FavStar) \
            .filter_by(class_name='Slice', user_id=self.user.id) \
            .first()
        # ensure there is a favor   
        if not fav_one_obj:
            slice_obj = db.session.query(Slice).first()
            obj_id = slice_obj.id
            db.session.add(
                FavStar(
                    class_name='Slice',
                    obj_id=obj_id,
                    user_id=self.user.id,
                    dttm=datetime.now()
                )
            )
            db.session.commit()
        # unselect
        fav_one_obj = db.session.query(FavStar).first()
        db.session.delete(fav_one_obj)
        db.session.commit()
        query_obj = db.session.query(FavStar) \
            .filter_by(class_name='Slice', id=fav_one_obj.id, user_id=self.user.id) \
            .first()
        assert query_obj is None
        
        # select
        db.session.add(
            FavStar(
                class_name='Slice',
                obj_id=fav_one_obj.id,
                user_id=self.user.id,
                dttm=datetime.now()
            )
        )
        db.session.commit()
        query_obj = db.session.query(FavStar) \
            .filter_by(class_name='Slice', obj_id=fav_one_obj.id, user_id=self.user.id) \
            .first()
        assert query_obj is not None

    def test_edit(self):

        one_slice = db.session.query(Slice).first() 
        all_dashboard = db.session.query(Dashboard).all()
        if len(all_dashboard) < 2:
            print("do not have enough dashboard")
        json_data = {
            'dashboards':[
                {'dashboard_title':all_dashboard[0].dashboard_title, 'id':all_dashboard[0].id},
                {'dashboard_title':all_dashboard[1].dashboard_title, 'id':all_dashboard[1].id},
            ],
            'slice_name':'test_slice' + str(datetime.now()),
            'description':'for test',
        }
        # edit
        obj = self.view.populate_object(one_slice.id, self.user.id, json_data)
        self.view.datamodel.edit(obj)

        # check5
        target_slice = db.session.query(Slice) \
            .filter_by(id=one_slice.id).one()
        all_related_dashboard = target_slice.dashboards

        assert target_slice.description == json_data.get('description')
        assert target_slice.slice_name == json_data.get('slice_name')
        #for brief_dashboard in json_data['dashboards']:
        #    assert self.check_brief_dashboards(brief_dashboard, all_related_dashboard) is True

    def ttest_delete(self):
        one_slice = db.session.query(Slice).first()
        self.view.datamodel.delete(one_slice)

        target_slice = db.session.query(Slice) \
            .filter_by(id=one_slice.id).first()
        assert target_slice is None

if __name__ == '__main__':
    unittest.main()





