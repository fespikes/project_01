from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

from datetime import timedelta, date
import logging
import json
import re
import copy
from werkzeug.urls import Href
from flask import g, request, redirect, Response
from flask_babel import lazy_gettext as _
from flask_appbuilder import expose
from flask_appbuilder.security.sqla.models import User
from sqlalchemy import func, and_, or_

from superset import appbuilder, db, conf, utils
from superset.models import Slice, Dashboard, FavStar, Log, str_to_model
from superset.message import *
from superset.utils import ParameterException
from .base import BaseSupersetView, catch_exception, json_response, get_user_id


class Home(BaseSupersetView):
    """The api for the home page

    limit = 0: means not limit
    default_types['actions'] could be: ['online', 'offline', 'add', 'update', 'delete'...]
    """
    default_view = 'home'
    route_base = '/home'

    page = 0
    page_size = 10
    order_column = 'time'
    order_direction = 'desc'
    default_types = {
        'counts': ['story', 'dashboard', 'slice', 'dataset', 'connection'],
        'trends': ['story', 'dashboard', 'slice', 'dataset', 'connection'],
        'favorits': ['dashboard', 'slice'],
        'edits': ['dashboard', 'slice'],
        'actions': ['online', 'offline', 'add', 'delete']
    }
    default_limit = {
        'trends': 30,
        'favorits': 10,
        'refers': 10,
        'edits': 10,
        'actions': 10
    }
    str_to_column_in_actions = {
        'user': User.username,
        'action': Log.action,
        'time': Log.dttm
    }
    str_to_column_in_edits = {
        'name': {'slice': Slice.slice_name, 'dashboard': Dashboard.dashboard_title},
        'time': {'slice': Slice.changed_on, 'dashboard': Dashboard.changed_on}
    }

    def __init__(self):
        super(Home, self).__init__()
        self.status = 201
        self.success = True
        self.message = []

    def get_obj_class(self, type_):
        try:
            model = str_to_model[type_.lower()]
        except KeyError:
            self.status = 400 if str(self.status)[0] < '4' else self.status
            self.message.append(_("Error model type: [{type_}]").format(type_=type_))
            return False, None
        else:
            return True, model

    def get_object_counts(self, user_id, types):
        dt = {}
        for type_ in types:
            dt[type_] = str_to_model[type_].count(user_id)
        return dt

    def get_object_number_trends(self, user_id=None, types=[], limit=30, counts={}):
        trends = {}
        for type_ in types:
            trends[type_] = [{"date": str(date.today()), "count": counts.get(type_)}]

        start_date = date.today() - timedelta(days=limit-1)
        logs = db.session.query(Log) \
            .filter(Log.dt > start_date) \
            .order_by(Log.dt.desc()) \
            .all()
        present_count = counts
        present_date = date.today()
        for log in logs:
            obj_type = 'connection' if log.obj_type in ['database', 'hdfsconnection'] \
                else log.obj_type
            if obj_type in self.default_types.get('trends'):
                #
                if log.dt != present_date:
                    present_date = present_date - timedelta(days=1)
                    for type_ in types:
                        trends[type_].insert(0, {"date": str(present_date),
                                                 "count": present_count.get(type_)})
                #
                if log.action_type == 'add' and log.user_id == user_id \
                        or log.action_type == 'online' and log.user_id != user_id:
                    present_count[obj_type] = present_count.get(obj_type) - 1
                elif log.action_type == 'delete' and log.user_id == user_id \
                        or log.action_type == 'offline' and log.user_id != user_id:
                    present_count[obj_type] = present_count.get(obj_type) + 1

        while present_date > start_date:
            for type_ in types:
                trends[type_].insert(0, {"date": str(present_date),
                                         "count": present_count.get(type_)})
            present_date = present_date - timedelta(days=1)

        return trends

    def get_slice_types(self, limit=10):
        """Query the viz_type of slices"""
        rs = (
            db.session.query(func.count(Slice.viz_type), Slice.viz_type)
                .group_by(Slice.viz_type)
                .order_by(func.count(Slice.viz_type).desc())
                .limit(limit)
                .all()
        )
        return rs

    def get_fav_dashboards(self, user_id, limit=10):
        """Query the times of dashboard liked by users"""
        query = db.session.query(func.count(FavStar.obj_id), Dashboard) \
            .filter(
            and_(FavStar.class_name.ilike('dashboard'),
                 FavStar.obj_id == Dashboard.id)
        )
        if user_id > 0:
            query = query.filter(
                or_(Dashboard.created_by_fk == user_id,
                    Dashboard.online == 1)
            )
        query = query.group_by(FavStar.obj_id) \
            .order_by(func.count(FavStar.obj_id).desc())
        if limit > 0:
            query = query.limit(limit)
        rs = query.all()

        rows = []
        for count, dash in rs:
            rows.append(
                {'name': dash.dashboard_title, 'link': dash.url, 'count': count})
        return rows

    def get_fav_slices(self, user_id, limit=10):
        """Query the times of slice liked by users"""
        query = db.session.query(func.count(FavStar.obj_id), Slice) \
            .filter(
            and_(FavStar.class_name.ilike('slice'),
                 FavStar.obj_id == Slice.id)
        )
        if user_id > 0:
            query = query.filter(
                or_(Slice.created_by_fk == user_id,
                    Slice.online == 1)
            )
        query = query.group_by(FavStar.obj_id) \
            .order_by(func.count(FavStar.obj_id).desc())
        if limit > 0:
            query = query.limit(limit)
        rs = query.all()

        rows = []
        for count, slice in rs:
            rows.append(
                {'name': slice.slice_name, 'link': slice.slice_url, 'count': count})
        return rows

    def get_fav_objects(self, user_id, types, limit):
        dt = {}
        if 'dashboard' in types:
            dt['dashboard'] = self.get_fav_dashboards(user_id, limit=limit)
        if 'slice' in types:
            dt['slice'] = self.get_fav_slices(user_id, limit=limit)
        return dt

    def get_refered_slices(self, user_id, limit=10):
        """Query the times of slice used by dashboards"""
        sql = """
            SELECT slices.slice_name, count(slices.slice_name), slices.params, 
                   slices.id, slices.datasource_id
            FROM slices, dashboards, dashboard_slices
            WHERE slices.id = dashboard_slices.slice_id
            AND dashboards.id = dashboard_slices.dashboard_id
            AND (
                slices.created_by_fk = {}
                OR
                slices.online = 1)
            GROUP BY slices.slice_name
            ORDER BY count(slices.slice_name) DESC
            LIMIT {}""".format(user_id, limit)
        rs = db.session.execute(sql)
        
        rows = []
        for row in rs:
            try:
                slice_params = json.loads(row[2])
            except Exception as e:
                logging.exception(e)
                slice_params = {}
            slice_params['slice_id'] = row[3]
            slice_params['json'] = "false"
            slice_params['slice_name'] = row[0]
            href = Href("/p/explore/table/{}/".format(row[4]))
            rows.append({'name': row[0], 'count': row[1], 'link': href(slice_params)})
        return rows

    def get_edited_slices(self, **kwargs):
        """The records of slice be modified"""
        user_id = kwargs.get('user_id')
        page = kwargs.get('page')
        page_size = kwargs.get('page_size')
        order_column = kwargs.get('order_column')
        order_direction = kwargs.get('order_direction')

        query = db.session.query(Slice).filter(
            or_(
                Slice.created_by_fk == user_id,
                Slice.online == 1
            )
        )
        count = query.count()

        if order_column:
            column = self.str_to_column_in_edits.get(order_column).get('slice')
            if order_direction == 'desc':
                query = query.order_by(column.desc())
            else:
                query = query.order_by(column)
        else:
            query = query.order_by(Slice.changed_on.desc())

        if page_size and page_size > 0:
            query = query.limit(page_size)
        if page and page > 0:
            query = query.offset(page * page_size)

        rows = []
        for obj in query.all():
            action = 'create' if obj.changed_on == obj.created_on else 'edit'
            line = {'name': obj.slice_name,
                    'description': obj.description,
                    'action': action,
                    'time': str(obj.changed_on),
                    'link': obj.slice_url}
            rows.append(line)
        return count, rows

    def get_edited_dashboards(self, **kwargs):
        """The records of slice be modified"""
        user_id = kwargs.get('user_id')
        page = kwargs.get('page')
        page_size = kwargs.get('page_size')
        order_column = kwargs.get('order_column')
        order_direction = kwargs.get('order_direction')

        query = db.session.query(Dashboard).filter(
            or_(
                Dashboard.created_by_fk == user_id,
                Dashboard.online == True
            )
        )
        count = query.count()

        if order_column:
            column = self.str_to_column_in_edits.get(order_column).get('dashboard')
            if order_direction == 'desc':
                query = query.order_by(column.desc())
            else:
                query = query.order_by(column)
        else:
            query = query.order_by(Dashboard.changed_on.desc())

        if page_size and page_size > 0:
            query = query.limit(page_size)
        if page and page > 0:
            query = query.offset(page * page_size)

        rows = []
        for obj in query.all():
            action = 'create' if obj.changed_on == obj.created_on else 'edit'
            line = {'name': obj.dashboard_title,
                    'description': obj.description,
                    'action': action,
                    'time': str(obj.changed_on),
                    'link': obj.url}
            rows.append(line)
        return count, rows

    def get_edited_objects(self, **kwargs):
        dt = {}
        types = kwargs.pop('types')
        if 'slice' in types:
            count, dt['slice'] = self.get_edited_slices(**kwargs)
        if 'dashboard' in types:
            count, dt['dashboard'] = self.get_edited_dashboards(**kwargs)
        return dt

    def get_request_args(self, args):
        kwargs = {}
        kwargs['page'] = int(args.get('page', self.page))
        kwargs['page_size'] = int(args.get('page_size', self.page_size))
        kwargs['order_column'] = args.get('order_column', self.order_column)
        kwargs['order_direction'] = args.get('order_direction', self.order_direction)
        return kwargs

    @catch_exception
    @expose('/edits/slice/')
    def get_edited_slices_by_url(self):
        user_id = get_user_id()
        kwargs = self.get_request_args(request.args)
        kwargs['user_id'] = user_id
        count, data = self.get_edited_slices(**kwargs)

        status_ = self.status
        message_ = self.message
        self.status = 200
        self.message = []
        if str(self.status)[0] != '2':
            return json_response(message=message_, status=status_, code=1),
        else:
            response = {}
            response['data'] = data
            response['count'] = count
            response['page'] = kwargs.get('page')
            response['page_size'] = kwargs.get('page_size')
            response['order_column'] = kwargs.get('order_column')
            response['order_direction'] = kwargs.get('order_direction')
            return json_response(data=response)

    @catch_exception
    @expose('/edits/dashboard/')
    def get_edited_dashboards_by_url(self):
        user_id = get_user_id()
        kwargs = self.get_request_args(request.args)
        kwargs['user_id'] = user_id
        count, data = self.get_edited_dashboards(**kwargs)

        status_ = self.status
        message_ = self.message
        self.status = 200
        self.message = []
        if str(self.status)[0] != '2':
            return json_response(message=message_, status=status_, code=1)
        else:
            response = {}
            response['data'] = data
            response['count'] = count
            response['page'] = kwargs.get('page')
            response['page_size'] = kwargs.get('page_size')
            response['order_column'] = kwargs.get('order_column')
            response['order_direction'] = kwargs.get('order_direction')
            return json_response(data=response)

    def get_user_actions(self, **kwargs):
        """The actions of user"""
        user_id = kwargs.get('user_id')
        page = kwargs.get('page')
        page_size = kwargs.get('page_size')
        order_column = kwargs.get('order_column')
        order_direction = kwargs.get('order_direction')
        types = kwargs.get('types')

        if len(types) < 1 or page_size < 0:
            self.status = 401 if str(self.status)[0] < '4' else self.status
            self.message.append(_("Error request parameters: [{params}]")
                                .format(params={'types': types,
                                                'page_size': page_size})
                                )
            return {}

        query = (
            db.session.query(Log, User.username, Dashboard, Slice)
                .join(User, Log.user_id == User.id)
                .outerjoin(Dashboard,
                           and_(
                               Log.obj_id == Dashboard.id,
                               Log.obj_type.ilike('dashboard'))
                           )
                .outerjoin(Slice,
                           and_(
                               Log.obj_id == Slice.id,
                               Log.obj_type.ilike('slice'))
                           )
                .filter(Log.user_id == user_id,
                        Log.action_type.in_(types))
        )
        count = query.count()

        # if order_column:
        #     column = self.str_to_column_in_actions.get(order_column)
        #     if order_direction == 'desc':
        #         query = query.order_by(column.desc())
        #     else:
        #         query = query.order_by(column)
        # else:
        #     query = query.order_by(Log.dttm.desc())
        query = query.order_by(Log.id.desc())

        if page_size and page_size > 0:
            query = query.limit(page_size)
        if page is not None and page >= 0:
            query = query.offset(page * page_size)

        rows = []
        for log, username, dash, slice in query.all():
            if dash:
                title, link = dash.dashboard_title, dash.url
            elif slice:
                title, link = slice.slice_name, slice.slice_url
            else:
                link = None
                g = re.compile(r"\[.*\]").search(log.action)
                title = g.group(0)[1:-1] if g else 'No this object'
            line = {'user': username,
                    'action': log.action,
                    'title': title,
                    'link': link,
                    'obj_type': log.obj_type,
                    'time': str(log.dttm)
                    }
            rows.append(line)
        return count, rows

    @catch_exception
    @expose('/actions/')
    def get_user_actions_by_url(self):
        user_id = get_user_id()
        kwargs = self.get_request_args(request.args)
        kwargs['user_id'] = user_id
        kwargs['types'] = request.args.get('types', self.default_types.get('actions'))

        if not isinstance(kwargs['types'], list) or len(kwargs['types']) < 1:
            message_ = _("Error request parameters: [{params}]")\
                .format(params=request.args)
            raise ParameterException(message_)

        count, data = self.get_user_actions(**kwargs)
        status_ = self.status
        message_ = self.message
        self.status = 201
        self.message = []
        if str(self.status)[0] != '2':
            return json_response(message=message_, status=status_, code=1)
        else:
            response = {}
            response['data'] = data
            response['count'] = count
            response['page'] = kwargs.get('page')
            response['page_size'] = kwargs.get('page_size')
            response['order_column'] = kwargs.get('order_column')
            response['order_direction'] = kwargs.get('order_direction')
            return json_response(data=response)

    @catch_exception
    @expose('/')
    def home(self):
        """default page"""
        if not g.user or not g.user.get_id():
            return redirect(appbuilder.get_url_for_login)
        return self.render_template('superset/home.html')

    @catch_exception
    @expose('/alldata/')
    def get_all_statistics_data(self):
        user_id = get_user_id()
        response = {}
        #
        types = self.default_types.get('counts')
        result = self.get_object_counts(user_id, types)
        response['counts'] = result
        #
        types = self.default_types.get('trends')
        limit = self.default_limit.get('trends')
        result = self.get_object_number_trends(user_id, types, limit,
                                               counts=copy.deepcopy(result))
        response['trends'] = result
        # #
        types = self.default_types.get('favorits')
        limit = self.default_limit.get('favorits')
        result = self.get_fav_objects(user_id, types, limit)
        response['favorits'] = result
        # #
        limit = self.default_limit.get('refers')
        result = self.get_refered_slices(user_id, limit)
        response['refers'] = result
        #
        types = self.default_types.get('edits')
        limit = self.default_limit.get('edits')
        result = self.get_edited_objects(
            user_id=user_id, types=types, page_size=limit)
        response['edits'] = result
        # #
        limit = self.default_limit.get('actions')
        types = self.default_types.get('actions')
        count, result = self.get_user_actions(
            user_id=user_id, types=types, page_size=limit)
        response['actions'] = result

        status_ = self.status
        if len(self.message) > 0:
            response['error'] = '. '.join(self.message)
        self.status = 201
        self.message = []
        return json_response(data={'index': response})

