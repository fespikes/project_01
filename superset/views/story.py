from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals


import json
import logging
import pickle
import sys
import time
import zlib
from datetime import datetime, timedelta

from flask import g, request, redirect, flash, render_template
from flask_babel import lazy_gettext as _
from flask_appbuilder import expose
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_appbuilder.security.sqla.models import User

from sqlalchemy import or_

from superset import app, cache, db, utils
from superset.utils import SupersetException
from superset.models import (Dashboard, Story, Log, FavStar, str_to_model)
from superset.message import NONE_STORY_NAME
from .base import (
    SupersetModelView, BaseSupersetView, catch_exception, get_user_id,
    check_ownership, json_response
)


config = app.config


class StoryModelView(SupersetModelView):  # noqa
    model = Story
    datamodel = SQLAInterface(Story)
    route_base = '/story'
    list_columns = ['id', 'story_name', 'url', 'description', 'online',  'changed_on']
    edit_columns = ['story_name', 'description', 'order_json']
    show_columns = ['id', 'story_name', 'description', 'order_json']
    add_columns = edit_columns
    base_order = ('changed_on', 'desc')

    str_to_column = {
        'name': Story.story_name,
        'description': Story.description,
        'changed_on': Story.changed_on,
        'owner': User.username,
        'created_by_user': User.username
    }
    int_columns = ['id', 'created_by_fk', 'changed_by_fk']
    bool_columns = ['online']
    str_columns = ['created_on', 'changed_on']

    def get_addable_choices(self):
        data = super().get_addable_choices()
        dashboards = self.get_available_dashboards(get_user_id())
        data['available_dashboards'] = self.dashboards_to_dict(dashboards)
        return data

    def pre_add(self, obj):
        self.check_column_values(obj)
        utils.validate_json(obj.order_json)

    def post_add(self, obj):
        Log.log_add(obj, 'story', get_user_id())

    def pre_update(self, obj):
        # check_ownership(obj)
        self.pre_add(obj)

    def post_update(self, obj):
        Log.log_update(obj, 'story', get_user_id())

    def pre_delete(self, obj):
        check_ownership(obj)

    def post_delete(self, obj):
        db.session.query(FavStar) \
            .filter(FavStar.class_name.ilike('story'),
                    FavStar.obj_id == obj.id) \
            .delete(synchronize_session=False)
        db.session.commit()
        Log.log_delete(obj, 'story', get_user_id())

    @staticmethod
    def check_column_values(obj):
        if not obj.story_name:
            raise SupersetException(NONE_STORY_NAME)
        if obj.order_json:
            orders_json = json.loads(obj.order_json)
            orders = sorted([one_order.get("order") for one_order in orders_json])
            # the orders should start with 1, and be sequential
            for order in orders:
                if orders.index(order) + 1 != order:
                    raise SupersetException("Error dashboard orders: {}".format(orders))

    def get_object_list_data(self, **kwargs):
        """Return the stories with column 'favorite' and 'online'"""
        user_id = kwargs.get('user_id')
        order_column = kwargs.get('order_column')
        order_direction = kwargs.get('order_direction')
        page = kwargs.get('page')
        page_size = kwargs.get('page_size')
        filter = kwargs.get('filter')
        only_favorite = kwargs.get('only_favorite')

        query = self.query_own_or_online('story', user_id, only_favorite)
        if filter:
            filter_str = '%{}%'.format(filter.lower())
            query = query.filter(
                or_(
                    Story.story_name.ilike(filter_str),
                    Story.description.ilike(filter_str),
                    User.username.ilike(filter_str)
                )
            )
        count = query.count()

        if order_column:
            try:
                column = self.str_to_column.get(order_column)
            except KeyError:
                msg = _('Error order column name: [{name}]').format(name=order_column)
                self.handle_exception(404, KeyError, msg)
            else:
                if order_direction == 'desc':
                    query = query.order_by(column.desc())
                else:
                    query = query.order_by(column)

        if page is not None and page >= 0 and page_size and page_size > 0:
            query = query.limit(page_size).offset(page * page_size)

        rs = query.all()
        data = []
        for obj, username, fav_id in rs:
            line = {}
            for col in self.list_columns:
                if col in self.str_columns:
                    line[col] = str(getattr(obj, col, None))
                else:
                    line[col] = getattr(obj, col, None)
            line['created_by_user'] = username
            line['favorite'] = True if fav_id else False
            data.append(line)

        response = {}
        response['count'] = count
        response['order_column'] = order_column
        response['order_direction'] = 'desc' if order_direction == 'desc' else 'asc'
        response['page'] = page
        response['page_size'] = page_size
        response['only_favorite'] = only_favorite
        response['data'] = data
        return response

    def get_show_attributes(self, obj, user_id=None):
        attributes = super().get_show_attributes(obj)
        available_dashs = self.get_available_dashboards(user_id)
        attributes['available_dashboards'] = self.dashboards_to_dict(available_dashs)
        return attributes

    def get_add_attributes(self, data, user_id):
        attributes = super().get_add_attributes(data, user_id)
        attributes['dashboards'] = \
            self.get_dashboards_in_order_json(data.get('order_json'))
        return attributes

    def get_edit_attributes(self, data, user_id):
        attributes = super().get_edit_attributes(data, user_id)
        attributes['dashboards'] = \
            self.get_dashboards_in_order_json(data.get('order_json'))
        return attributes

    def get_dashboards_in_order_json(self, order_str):
        order_json = json.loads(order_str)
        ids = set([one_order.get('dashboard_id') for one_order in order_json])
        dashs = db.session.query(Dashboard).filter(Dashboard.id.in_(ids)).all()
        if len(ids) != len(dashs):
            msg = _("Error parameter ids: {ids}, queried {num} dashboard(s)") \
                .format(ids=ids, num=len(dashs))
            self.handle_exception(404, Exception, msg)
        return dashs

    @catch_exception
    @expose("/online_info/<id>/", methods=['GET'])
    def online_info(self, id):
        pass

    @catch_exception
    @expose("/offline_info/<id>/", methods=['GET'])
    def offline_info(self, id):
        story = db.session.query(Story).filter_by(id=id).first()
        if not story:
            raise SupersetException(
                _("Error parameter ids: {ids}, queried {num} story(s)")
                .format(ids=[id, ], num=0)
            )
        info = _("Changing story {story} to offline will make it invisible "
                 "for other users").format(story=[story, ])
        return json_response(data=info)

    @catch_exception
    @expose("/delete_info/<id>/", methods=['GET'])
    def delete_info(self, id):
        return json_response(data='')

    @catch_exception
    @expose("/muldelete_info/", methods=['POST'])
    def muldelete_info(self):
        return json_response(data='')

    @catch_exception
    @expose("/add_dashboards/<story_id>/", methods=['POST'])
    def add_dashboards(self, story_id):
        """Add and save dashboards to a story"""
        data = json.loads(request.form.get('data'))
        dashboard_ids = data['dashboard_ids']
        story = db.session.query(Story).filter_by(id=story_id).first()
        check_ownership(story, raise_if_false=True)

        new_dashs = db.session.query(Dashboard).filter(Dashboard.id.in_(dashboard_ids))
        story.dashboards += new_dashs
        db.session.merge(story)
        db.session.commit()
        return True

    @catch_exception
    @expose("/save/<story_id>/", methods=['POST'])
    def save_story(self):
        pass

    @catch_exception
    @expose("/copy/<story_id>/", methods=['POST'])
    def copy_story(self):
        pass

    @catch_exception
    @expose("/import/", methods=['GET', 'POST'])
    def import_stories(self):
        pass

    @catch_exception
    @expose("/export/")
    def export_stories(self):
        pass
