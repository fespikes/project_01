from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

from datetime import timedelta, date
import logging
import json
import re
from flask import g, request, redirect, Response
from flask_babel import lazy_gettext as _
from flask_appbuilder import expose
from flask_appbuilder.security.sqla.models import User
from sqlalchemy import func, and_, or_

from superset import appbuilder, db
from superset.models import Slice, Dashboard, FavStar, Log, DailyNumber, str_to_model
from superset.message import *
from .base import BaseSupersetView, catch_exception


class Home(BaseSupersetView):
    """The api for the home page

    limit = 0: means not limit
    default_types['actions'] could be: ['online', 'offline', 'add', 'edit', 'delete'...]
    """
    default_view = 'home'
    route_base = '/home'

    page = 0
    page_size = 10
    order_column = 'time'
    order_direction = 'desc'
    default_types = {
        'counts': ['dashboard', 'slice', 'dataset', 'connection'],
        'trends': ['dashboard', 'slice', 'dataset', 'connection'],
        'favorits': ['dashboard', 'slice'],
        'edits': ['dashboard', 'slice'],
        'actions': ['online', 'offline']
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

    def get_user_id(self):
        if not g.user:
            self.status = 401 if str(self.status)[0] < '4' else self.status
            self.message.append(NO_USER)
            return False, -1
        return True, int(g.user.get_id())

    def get_obj_class(self, type_):
        try:
            model = str_to_model[type_.lower()]
        except KeyError:
            self.status = 400 if str(self.status)[0] < '4' else self.status
            self.message.append(_("Error model type: [{type_}]").format(type_=type_))
            return False, None
        else:
            return True, model

    def get_object_count(self, user_id, type_):
        return DailyNumber.object_present_count(type_, user_id)

    def get_object_counts(self, user_id, types):
        dt = {}
        for type_ in types:
            count = self.get_object_count(user_id, type_)
            dt[type_] = count
        return dt

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
        query = db.session.query(func.count(FavStar.obj_id), Dashboard.dashboard_title) \
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
        for count, name in rs:
            rows.append({'name': name, 'count': count})
        return rows

    def get_fav_slices(self, user_id, limit=10):
        """Query the times of slice liked by users"""
        query = db.session.query(func.count(FavStar.obj_id), Slice.slice_name) \
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
        for count, name in rs:
            rows.append({'name': name, 'count': count})
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
            SELECT slices.slice_name, count(slices.slice_name)
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
            rows.append({'name': row[0], 'count': row[1]})
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
        success, user_id = self.get_user_id()
        if not success:
            return Response(json.dumps(NO_USER),
                            status=400,
                            mimetype='application/json')
        kwargs = self.get_request_args(request.args)
        kwargs['user_id'] = user_id
        count, data = self.get_edited_slices(**kwargs)

        status_ = self.status
        message_ = self.message
        self.status = 200
        self.message = []
        if str(self.status)[0] != '2':
            return Response(json.dumps(message_),
                            status=status_,
                            mimetype='application/json')
        else:
            response = {}
            response['data'] = data
            response['count'] = count
            response['page'] = kwargs.get('page')
            response['page_size'] = kwargs.get('page_size')
            response['order_column'] = kwargs.get('order_column')
            response['order_direction'] = kwargs.get('order_direction')
            return Response(json.dumps(response),
                            status=status_,
                            mimetype='application/json')

    @catch_exception
    @expose('/edits/dashboard/')
    def get_edited_dashboards_by_url(self):
        success, user_id = self.get_user_id()
        if not success:
            return Response(json.dumps(NO_USER),
                            status=400,
                            mimetype='application/json')
        kwargs = self.get_request_args(request.args)
        kwargs['user_id'] = user_id
        count, data = self.get_edited_dashboards(**kwargs)

        status_ = self.status
        message_ = self.message
        self.status = 200
        self.message = []
        if str(self.status)[0] != '2':
            return Response(json.dumps(message_),
                            status=status_,
                            mimetype='application/json')
        else:
            response = {}
            response['data'] = data
            response['count'] = count
            response['page'] = kwargs.get('page')
            response['page_size'] = kwargs.get('page_size')
            response['order_column'] = kwargs.get('order_column')
            response['order_direction'] = kwargs.get('order_direction')
            return Response(json.dumps(response),
                            status=status_,
                            mimetype='application/json')

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
        success, user_id = self.get_user_id()
        if not success:
            return Response(json.dumps(NO_USER),
                            status=400,
                            mimetype='application/json')
        kwargs = self.get_request_args(request.args)
        kwargs['user_id'] = user_id
        kwargs['types'] = request.args.get('types', self.default_types.get('actions'))

        if not isinstance(kwargs['types'], list) or len(kwargs['types']) < 1:
            message_ = _("Error request parameters: [{params}]")\
                .format(params=request.args)
            return Response(json.dumps(message_),
                            status=400,
                            mimetype='application/json')

        count, data = self.get_user_actions(**kwargs)
        status_ = self.status
        message_ = self.message
        self.status = 201
        self.message = []
        if str(self.status)[0] != '2':
            return Response(json.dumps(message_),
                            status=status_,
                            mimetype='application/json')
        else:
            response = {}
            response['data'] = data
            response['count'] = count
            response['page'] = kwargs.get('page')
            response['page_size'] = kwargs.get('page_size')
            response['order_column'] = kwargs.get('order_column')
            response['order_direction'] = kwargs.get('order_direction')
            return Response(json.dumps(response),
                            status=status_,
                            mimetype='application/json')

    def get_object_number_trends(self, user_id=0, types=[], limit=30):
        dt = {}
        for type_ in types:
            r = self.get_object_number_trend(user_id, type_, limit)
            dt[type_.lower()] = r
        return dt

    def get_object_number_trend(self, user_id, type_, limit):
        rows = (
            db.session.query(DailyNumber.count, DailyNumber.dt)
                .filter(
                and_(
                    DailyNumber.obj_type.ilike(type_),
                    DailyNumber.user_id == user_id
                )
            )
                .order_by(DailyNumber.dt)
                .limit(limit)
                .all()
        )
        return self.fill_missing_date(rows, limit)

    def fill_missing_date(self, rows, limit):
        """Fill the discontinuous date and count of number trend
           Still need to limit
        """
        full_count, full_dt = [], []
        if not rows:
            return {}

        one_day = timedelta(days=1)
        for row in rows:
            if row.dt > date.today():
                msg = _("Date [{date}] > today [{today}]")\
                    .format(date=row.dt, today=date.today())
                logging.error(msg)
                self.message.append(msg)
                return {}
            elif len(full_count) < 1:
                full_count.append(int(row.count))
                full_dt.append(row.dt)
            else:
                while full_dt[-1] + one_day < row.dt:
                    full_count.append(full_count[-1])
                    full_dt.append(full_dt[-1] + one_day)
                full_count.append(row.count)
                full_dt.append(row.dt)

        while full_dt[-1] < date.today():
            full_count.append(full_count[-1])
            full_dt.append(full_dt[-1] + one_day)

        full_dt = [str(d) for d in full_dt]
        json_rows = []
        full_count = full_count[-limit:]
        full_dt = full_dt[-limit:]
        for index, v in enumerate(full_count):
            json_rows.append({'date': full_dt[index], 'count': full_count[index]})
        return json_rows

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
        success, user_id = self.get_user_id()
        if not success:
            return Response(json.dumps(NO_USER),
                            status=400,
                            mimetype='application/json')
        response = {}
        #
        types = self.default_types.get('counts')
        result = self.get_object_counts(user_id, types)
        response['counts'] = result
        #
        types = self.default_types.get('trends')
        limit = self.default_limit.get('trends')
        result = self.get_object_number_trends(user_id, types, limit=limit)
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
        return Response(
            json.dumps({'index': response}),
            status=status_,
            mimetype="application/json")

