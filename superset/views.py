from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

from datetime import datetime, timedelta, date
import json
import logging
import pickle
import sys
import time
import traceback
import zlib
import re
from distutils.util import strtobool

import functools
import sqlalchemy as sqla

from flask import (g, request, redirect, flash,
                   Response, render_template, Markup, abort)
from flask_appbuilder import ModelView, BaseView, expose
from flask_appbuilder.actions import action
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_appbuilder.security.decorators import has_access
from flask_appbuilder.models.sqla.filters import (BaseFilter, FilterStartsWith, FilterEqualFunction)
from flask_appbuilder.security.sqla import models as ab_models

from flask_babel import gettext as __
from flask_babel import lazy_gettext as _

from sqlalchemy import create_engine, case
from wtforms.validators import ValidationError


from superset import (
    app, appbuilder, cache, db, models, sm, sql_lab, sql_parse,
    results_backend, security, viz, utils
)
from superset.source_registry import SourceRegistry
from superset.sql_parse import SupersetQuery
from superset.utils import (get_database_access_error_msg,
                            get_datasource_access_error_msg,
                            get_datasource_exist_error_msg,
                            json_error_response)

from superset.models import Database, SqlaTable, Slice, \
    Dashboard, FavStar, Log, DailyNumber, str_to_model
from sqlalchemy import func, and_, or_
from flask_appbuilder.security.sqla.models import User
from superset.message import *
from superset.hdfsmodule.models import HDFSTable
from superset.hdfsmodule.views import HDFSConnRes, \
    HDFSFileBrowserRes, HDFSFilePreviewRes, HDFSTableRes

config = app.config
log_this = models.Log.log_this
log_action = models.Log.log_action
log_number = models.DailyNumber.log_number
can_access = utils.can_access
QueryStatus = models.QueryStatus


def get_error_msg():
  if config.get("SHOW_STACKTRACE"):
    error_msg = traceback.format_exc()
  else:
    error_msg = "FATAL ERROR \n"
    error_msg += (
      "Stacktrace is hidden. Change the SHOW_STACKTRACE "
      "configuration setting to enable it")
  return error_msg


class BaseSupersetView(BaseView):
    def can_access(self, permission_name, view_name):
        return utils.can_access(appbuilder.sm, permission_name, view_name)

    def all_datasource_access(self):
        return self.can_access(
            "all_datasource_access", "all_datasource_access")

    def database_access(self, database):
        return (
            self.can_access("all_database_access", "all_database_access") or
            self.can_access("database_access", database.perm)
        )

    def schema_access(self, datasource):
        return (
            self.database_access(datasource.database) or
            self.all_datasource_access() or
            self.can_access("schema_access", datasource.schema_perm)
        )

    def datasource_access(self, datasource):
        return (
            self.schema_access(datasource) or
            self.can_access("datasource_access", datasource.perm)
        )

    def datasource_access_by_name(
            self, database, datasource_name, schema=None):
        if (self.database_access(database) or
                self.all_datasource_access()):
            return True

        schema_perm = utils.get_schema_perm(database, schema)
        if schema and utils.can_access(sm, 'schema_access', schema_perm):
            return True

        datasources = SourceRegistry.query_datasources_by_name(
            db.session, database, datasource_name, schema=schema)
        for datasource in datasources:
            if self.can_access("datasource_access", datasource.perm):
                return True
        return False


def log_number_for_all_users(obj_type):
    users = db.session.query(User).all()
    for user in users:
        log_number(obj_type, user.id)


def catch_exception(f):
    """
    A decorator to label an endpoint as an API. Catches uncaught exceptions and
    return the response in the JSON format
    """
    def wraps(self, *args, **kwargs):
        try:
            return f(self, *args, **kwargs)
        except Exception as e:
            logging.exception(e)
            return json_error_response(str(e))

    return functools.update_wrapper(wraps, f)


def check_ownership(obj, raise_if_false=True):
    """Meant to be used in `pre_update` hooks on models to enforce ownership

    Admin have all access, and other users need to be referenced on either
    the created_by field that comes with the ``AuditMixin``, or in a field
    named ``owners`` which is expected to be a one-to-many with the User
    model. It is meant to be used in the ModelView's pre_update hook in
    which raising will abort the update.
    """
    if not obj:
        return False

    security_exception = utils.SupersetSecurityException(
              "You don't have the rights to alter [{}]".format(obj))

    if g.user.is_anonymous():
        if raise_if_false:
            raise security_exception
        return False
    # roles = (r.name for r in get_user_roles())
    # if 'Admin' in roles:
    #     return True
    session = db.create_scoped_session()
    orig_obj = session.query(obj.__class__).filter_by(id=obj.id).first()
    owner_names = (user.username for user in orig_obj.owners)
    if (
            hasattr(orig_obj, 'created_by') and
            orig_obj.created_by and
            orig_obj.created_by.username == g.user.username):
        return True
    if (
            hasattr(orig_obj, 'owners') and
            g.user and
            hasattr(g.user, 'username') and
            g.user.username in owner_names):
        return True
    if raise_if_false:
        raise security_exception
    else:
        return False


def get_user_roles():
    if g.user.is_anonymous():
        public_role = config.get('AUTH_ROLE_PUBLIC')
        return [appbuilder.sm.find_role(public_role)] if public_role else []
    return g.user.roles


class SupersetFilter(BaseFilter):

    """Add utility function to make BaseFilter easy and fast

    These utility function exist in the SecurityManager, but would do
    a database round trip at every check. Here we cache the role objects
    to be able to make multiple checks but query the db only once
    """

    def get_user_roles(self):
        return get_user_roles()

    def get_all_permissions(self):
        """Returns a set of tuples with the perm name and view menu name"""
        perms = set()
        for role in get_user_roles():
            for perm_view in role.permissions:
                t = (perm_view.permission.name, perm_view.view_menu.name)
                perms.add(t)
        return perms

    def has_role(self, role_name_or_list):
        """Whether the user has this role name"""
        if not isinstance(role_name_or_list, list):
            role_name_or_list = [role_name_or_list]
        return any(
            [r.name in role_name_or_list for r in self.get_user_roles()])

    def has_perm(self, permission_name, view_menu_name):
        """Whether the user has this perm"""
        return (permission_name, view_menu_name) in self.get_all_permissions()

    def get_view_menus(self, permission_name):
        """Returns the details of view_menus for a perm name"""
        vm = set()
        for perm_name, vm_name in self.get_all_permissions():
            if perm_name == permission_name:
                vm.add(vm_name)
        return vm

    def has_all_datasource_access(self):
        return (
            self.has_role(['Admin', 'Alpha']) or
            self.has_perm('all_datasource_access', 'all_datasource_access'))


class DatasourceFilter(SupersetFilter):
    def apply(self, query, func):  # noqa
        if self.has_all_datasource_access():
            return query
        perms = self.get_view_menus('datasource_access')
        # TODO(bogdan): add `schema_access` support here
        return query.filter(self.model.perm.in_(perms))


class SliceFilter(SupersetFilter):
    def apply(self, query, func):  # noqa
        if self.has_all_datasource_access():
            return query
        perms = self.get_view_menus('datasource_access')
        # TODO(bogdan): add `schema_access` support here
        return query.filter(self.model.perm.in_(perms))


class DashboardFilter(SupersetFilter):

    """List dashboards for which users have access to at least one slice"""

    def apply(self, query, func):  # noqa
        if self.has_all_datasource_access():
            return query
        Slice = models.Slice  # noqa
        Dash = models.Dashboard  # noqa
        # TODO(bogdan): add `schema_access` support here
        datasource_perms = self.get_view_menus('datasource_access')
        slice_ids_qry = (
            db.session
            .query(Slice.id)
            .filter(Slice.perm.in_(datasource_perms))
        )
        query = query.filter(
            Dash.id.in_(
                db.session.query(Dash.id)
                .distinct()
                .join(Dash.slices)
                .filter(Slice.id.in_(slice_ids_qry))
            )
        )
        return query


def validate_json(form, field):  # noqa
    try:
        json.loads(field.data)
    except Exception as e:
        logging.exception(e)
        raise ValidationError("json isn't valid")


def generate_download_headers(extension):
    filename = datetime.now().strftime("%Y%m%d_%H%M%S")
    content_disp = "attachment; filename={}.{}".format(filename, extension)
    headers = {
        "Content-Disposition": content_disp,
    }
    return headers


class DeleteMixin(object):
    @action(
        "muldelete", "Delete", "Delete all Really?", "fa-trash", single=False)
    def muldelete(self, items):
        self.datamodel.delete_all(items)
        self.update_redirect()
        # log_action
        if isinstance(items[0], models.SqlaTable):
            cls_name = 'table'
        else:
            cls_name = items[0].__class__.__name__.lower()
        for item in items:
            obj_name = repr(item)
            action_str = 'Delete {}: [{}]'.format(cls_name, obj_name)
            log_action('delete', action_str, cls_name, item.id)
        return redirect(self.get_redirect())


class SupersetModelView(ModelView):
    model = models.Model
    # used for querying
    page = 0
    page_size = 10
    order_column = 'changed_on'
    order_direction = 'desc'
    filter = None
    only_favorite = False        # all or favorite

    # used for Data type conversion
    int_columns = []
    bool_columns = []
    str_columns = []

    # used for returning to frontend
    status = 202
    success = True
    message = ""

    def get_list_args(self, args):
        kwargs = {}
        kwargs['user_id'] = self.get_user_id()
        kwargs['order_column'] = args.get('order_column', self.order_column)
        kwargs['order_direction'] = args.get('order_direction', self.order_direction)
        kwargs['page'] = int(args.get('page', self.page))
        kwargs['page_size'] = int(args.get('page_size', self.page_size))
        kwargs['filter'] = args.get('filter', self.filter)
        fav = args.get('only_favorite')
        kwargs['only_favorite'] = strtobool(fav) if fav else self.only_favorite
        kwargs['dataset_type'] = args.get('dataset_type')
        kwargs['table_id'] = int(args.get('table_id')) \
            if args.get('table_id') else None
        return kwargs

    @expose('/list/')
    def list(self):
         return self.render_template(self.list_template)

    @expose('/listdata/')
    def get_list_data(self):
        try:
            kwargs = self.get_list_args(request.args)
            list_data = self.get_object_list_data(**kwargs)
            return json.dumps(list_data)
        except Exception as e:
            return self.build_response(500, False, str(e))

    @expose('/addablechoices/', methods=['GET'])
    def addable_choices(self):
        try:
            data = self.get_addable_choices()
            return json.dumps({'data': data})
        except Exception as e:
            logging.error(str(e))
            return self.build_response(500, False, str(e))

    @expose('/add', methods=['GET', 'POST'])
    def add(self):
        try:
            user_id = self.get_user_id()
            json_data = self.get_request_data()
            obj = self.populate_object(None, user_id, json_data)
            self.pre_add(obj)
            self.datamodel.add(obj)
            self.post_add(obj)
            return self.build_response(200, True, ADD_SUCCESS)
        except Exception as e:
            return self.build_response(500, False, str(e))

    @expose('/show/<pk>/', methods=['GET'])
    def show(self, pk):
        try:
            obj = self.get_object(pk)
            user_id = self.get_user_id()
            attributes = self.get_show_attributes(obj, user_id=user_id)
            return json.dumps(attributes)
        except Exception as e:
            return self.build_response(500, False, str(e))

    @expose('/edit/<pk>', methods=['GET', 'POST'])
    def edit(self, pk):
        try:
            user_id = self.get_user_id()
            json_data = self.get_request_data()
            obj = self.populate_object(pk, user_id, json_data)
            self.pre_update(obj)
            self.datamodel.edit(obj)
            self.post_update(obj)
            return self.build_response(200, True, UPDATE_SUCCESS)
        except Exception as e:
            return self.build_response(self.status, False, str(e))

    @expose('/delete/<pk>')
    def delete(self, pk):
        try:
            obj = self.get_object(pk)
            self._delete(obj)
            self.update_redirect()
            return self.build_response(500, True, DELETE_SUCCESS)
        except Exception as e:
            return self.build_response(500, success=False, message=str(e))

    def _delete(self, obj):
        self.pre_delete(obj)
        self.datamodel.delete(obj)
        self.post_delete(obj)

    @expose('/muldelete', methods=['GET', 'POST'])
    def muldelete(self):
        try:
            json_data = self.get_request_data()
            ids = json_data.get('selectedRowKeys')
            for id in ids:
                obj = self.get_object(id)
                self._delete(obj)
                if isinstance(obj, models.SqlaTable):
                    cls_name = 'table'
                else:
                    cls_name = self.model.__name__.lower()
                action_str = 'Delete {}: [{}]'.format(cls_name, repr(obj))
                log_action('delete', action_str, cls_name, obj.id)
            return self.build_response(200, True, DELETE_SUCCESS)
        except Exception as e:
            return self.build_response(500, False, str(e))

    def build_response(self, status=None, success=None, message=None):
        response = {}
        response['status'] = status if status else self.status
        response['success'] = success if success is not None else self.success
        response['message'] = message if message else self.message
        return json.dumps(response)

    def get_addable_choices(self):
        data = {}
        # data['readme'] = self.get_column_readme()
        return data

    def get_object_list_data(self, **kwargs):
        pass

    def populate_object(self, obj_id, user_id, data):
        if obj_id:
            obj = self.get_object(obj_id)
            attributes = self.get_edit_attributes(data, user_id)
        else:
            obj = self.model()
            attributes = self.get_add_attributes(data, user_id)
        for key, value in attributes.items():
            setattr(obj, key, value)
        return obj

    def get_show_attributes(self, obj, user_id=None):
        attributes = {}
        for col in self.show_columns:
            if not hasattr(obj, col):
                msg = "Class: \'{}\' does not have the attribute: \'{}\'"\
                    .format(obj.__class__.__name__, col)
                self.handle_exception(500, KeyError, msg)
            if col in self.str_columns:
                attributes[col] = str(getattr(obj, col, None))
            else:
                attributes[col] = getattr(obj, col, None)

        attributes['readme'] = self.get_column_readme()
        attributes['created_by_user'] = obj.created_by.username \
            if obj.created_by else None
        attributes['changed_by_user'] = obj.changed_by.username \
            if obj.changed_by else None
        return attributes

    def get_column_readme(self):
        if hasattr(self, 'readme_columns'):
            readme = {}
            for col in self.readme_columns:
                readme[col] = self.description_columns.get(col)
            return readme
        else:
            return {}

    def get_add_attributes(self, data, user_id):
        attributes = {}
        for col in self.add_columns:
            if col not in data:
                msg = "The needed attribute: \'{}\' not in attributes: \'{}\'"\
                    .format(col, ','.join(data.keys()))
                self.handle_exception(404, KeyError, msg)
            value = data.get(col)
            if col in self.bool_columns and not isinstance(value, bool):
                attributes[col] = strtobool(value)
            elif col in self.int_columns:
                attributes[col] = int(value)
            else:
                attributes[col] = value
        return attributes

    def get_edit_attributes(self, data, user_id):
        attributes = {}
        for col in self.edit_columns:
            if col not in data:
                msg = "The needed attribute: \'{}\' not in attributes: \'{}\'" \
                    .format(col, ','.join(data.keys()))
                self.handle_exception(404, KeyError, msg)
            value = data.get(col)
            if col in self.bool_columns and not isinstance(value, bool):
                attributes[col] = strtobool(value)
            elif col in self.int_columns:
                attributes[col] = int(value)
            else:
                attributes[col] = value
        return attributes

    def query_own_or_online(self, class_name, user_id, only_favorite):
        query = (
            db.session.query(self.model, User.username, FavStar.obj_id)
            .join(User, self.model.created_by_fk == User.id)
        )

        if only_favorite:
            query = query.join(FavStar,
                and_(
                   self.model.id == FavStar.obj_id,
                   FavStar.class_name.ilike(class_name),
                   FavStar.user_id == user_id)
            )
        else:
            query = query.outerjoin(FavStar,
               and_(
                   self.model.id == FavStar.obj_id,
                   FavStar.class_name.ilike(class_name),
                   FavStar.user_id == user_id)
            )

        query = query.filter(
            or_(self.model.created_by_fk == user_id,
                self.model.online == 1)
            )

        return query

    def get_available_tables(self):
        tbs = db.session.query(models.SqlaTable).all()
        tb_list = []
        for t in tbs:
            row = {'id': t.id, 'dataset_name': t.dataset_name}
            tb_list.append(row)
        return tb_list

    def get_user_id(self):
        try:
            user_id = g.user.get_id()
            return int(user_id)
        except Exception:
            self.handle_exception(500, Exception, NO_USER)

    def get_request_data(self):
        data = request.data
        data = str(data, encoding='utf-8')
        return json.loads(data)

    def get_object(self, obj_id):
        obj_id = int(obj_id)
        try:
            obj = db.session.query(self.model).filter_by(id=obj_id).one()
        except sqla.orm.exc.NoResultFound:
            msg = "{}. model:{} id:{}".format(OBJECT_NOT_FOUND, self.model.__name__, obj_id)
            self.handle_exception(500, sqla.orm.exc.NoResultFound, msg)
        else:
            return obj

    def handle_exception(self, status, exception, msg):
        self.status = status
        logging.error(msg)
        raise exception(msg)


class TableColumnInlineView(SupersetModelView):  # noqa
    model = models.TableColumn
    datamodel = SQLAInterface(models.TableColumn)
    route_base = '/tablecolumn'
    can_delete = False
    list_columns = [
        'id', 'column_name', 'type', 'groupby', 'filterable',
        'count_distinct', 'sum', 'min', 'max', 'is_dttm']
    _list_columns = list_columns
    edit_columns = [
        'column_name', 'verbose_name', 'groupby', 'filterable',
        'table_id', 'count_distinct', 'sum', 'min', 'max', 'expression',
        'is_dttm', 'python_date_format', 'database_expression']
    show_columns = edit_columns + ['id']
    add_columns = edit_columns
    # TODO can't json.dumps lazy_gettext()
    readme_columns = ['is_dttm', 'expression']
    description_columns = {
        'is_dttm': "是否将此列作为[时间粒度]选项, 列中的数据类型必须是DATETIME",
        'expression': "a valid SQL expression as supported by the "
                      "underlying backend. Example: `substr(name, 1, 1)`",
        'python_date_format':
            "The pattern of timestamp format, use python datetime string "
            "pattern expression. If time is stored in epoch "
            "format, put `epoch_s` or `epoch_ms`. Leave `Database Expression` "
            "below empty if timestamp is stored in "
            "String or Integer(epoch) type",
        'database_expression':
            "The database expression to cast internal datetime "
            "constants to database date/timestamp type according to the DBAPI. "
            "The expression should follow the pattern of "
            "%Y-%m-%d %H:%M:%S, based on different DBAPI. "
            "The string should be a python string formatter "
            "`Ex: TO_DATE('{}', 'YYYY-MM-DD HH24:MI:SS')` for Oracle"
            "Superset uses default expression based on DB URI if this "
            "field is blank.",
    }

    bool_columns = ['is_dttm', 'is_active', 'groupby', 'count_distinct',
                    'sum', 'avg', 'max', 'min', 'filterable']
    str_columns = ['table', ]

    def get_object_list_data(self, **kwargs):
        table_id = kwargs.get('table_id')
        if not table_id:
            msg = "Need parameter 'table_id' to query columns"
            self.handle_exception(404, Exception, msg)
        rows = db.session.query(self.model)\
            .filter_by(table_id=table_id).all()
        data = []
        for row in rows:
            line = {}
            for col in self._list_columns:
                line[col] = str(getattr(row, col, None))
            data.append(line)
        return {'data': data}

    def get_addable_choices(self):
        data = super().get_addable_choices()
        data['available_tables'] = self.get_available_tables()
        return data

    def get_show_attributes(self, obj, user_id=None):
        attributes = super().get_show_attributes(obj)
        attributes['available_tables'] = self.get_available_tables()
        return attributes


class SqlMetricInlineView(SupersetModelView):  # noqa
    model = models.SqlMetric
    datamodel = SQLAInterface(models.SqlMetric)
    route_base = '/sqlmetric'
    list_columns = ['id', 'metric_name', 'metric_type', 'expression']
    _list_columns = list_columns
    show_columns = [
        'id', 'metric_name', 'description', 'verbose_name',
        'metric_type', 'expression', 'table_id', 'table', 'd3format']
    edit_columns = [
        'metric_name', 'description', 'verbose_name',
        'metric_type', 'expression', 'table_id', 'd3format']
    add_columns = edit_columns
    readme_columns = ['expression', 'd3format']
    description_columns = {
        'expression':
            "a valid SQL expression as supported by the underlying backend. "
            "Example: `count(DISTINCT userid)`",
        'is_restricted':
            "Whether the access to this metric is restricted to certain roles. "
            "Only roles with the permission 'metric access on XXX (the name of "
            "this metric)' are allowed to access this metric",
        'd3format':
            "d3 formatting string as defined [here]"
            "(https://github.com/d3/d3-format/blob/master/README.md#format). "
            "For instance, this default formatting applies in the Table "
            "visualization and allow for different metric to use different "
            "formats"
    }
    page_size = 500

    bool_columns = ['is_restricted', ]
    str_columns = ['table', ]

    def get_addable_choices(self):
        data = super().get_addable_choices()
        data['available_tables'] = self.get_available_tables()
        return data

    def get_object_list_data(self, **kwargs):
        table_id = kwargs.get('table_id')
        if not table_id:
            msg = "Need parameter 'table_id' to query metrics"
            self.handle_exception(404, Exception, msg)
        rows = (
            db.session.query(self.model)
            .filter_by(table_id=table_id)
            .order_by(self.model.metric_name)
            .all()
        )
        data = []
        for row in rows:
            line = {}
            for col in self._list_columns:
                line[col] = str(getattr(row, col, None))
            data.append(line)
        return {'data': data}

    def get_show_attributes(self, obj, user_id=None):
        attributes = super().get_show_attributes(obj)
        attributes['available_tables'] = self.get_available_tables()
        return attributes

    def post_add(self, metric):
        if metric.is_restricted:
            security.merge_perm(sm, 'metric_access', metric.get_perm())

    def post_update(self, metric):
        if metric.is_restricted:
            security.merge_perm(sm, 'metric_access', metric.get_perm())


class DatabaseView(SupersetModelView):  # noqa
    model = models.Database
    datamodel = SQLAInterface(models.Database)
    route_base = '/database'
    list_columns = ['id', 'database_name', 'backend', 'changed_on']
    _list_columns = list_columns
    show_columns = ['id', 'database_name', 'sqlalchemy_uri',
                    'backend',  'created_on', 'changed_on']
    add_columns = ['database_name', 'sqlalchemy_uri']
    edit_columns = add_columns
    readme_columns = ['sqlalchemy_uri']
    add_template = "superset/models/database/add.html"
    edit_template = "superset/models/database/edit.html"
    base_order = ('changed_on', 'desc')
    description_columns = {
        'sqlalchemy_uri':
            "Refer to the [SqlAlchemy docs]"
            "(http://docs.sqlalchemy.org/en/rel_1_0/core/engines.html#database-urls) "
            "for more information on how to structure your URI.",
        'extra':
            "JSON string containing extra configuration elements. "
            "The ``engine_params`` object gets unpacked into the "
            "[sqlalchemy.create_engine]"
            "(http://docs.sqlalchemy.org/en/latest/core/engines.html#"
            "sqlalchemy.create_engine) call, while the ``metadata_params`` "
            "gets unpacked into the [sqlalchemy.MetaData]"
            "(http://docs.sqlalchemy.org/en/rel_1_0/core/metadata.html"
            "#sqlalchemy.schema.MetaData) call. ",
    }

    str_to_column = {
        'title': Database.database_name,
        'time': Database.changed_on,
        'changed_on': Database.changed_on,
        'owner': User.username
    }

    int_columns = ['id']
    bool_columns = ['expose_in_sqllab', 'allow_run_sync', 'allow_dml']
    str_columns = ['created_on', 'changed_on']

    list_template = "superset/databaseList.html"

    def pre_add(self, obj):
        if obj.test_uri(obj.sqlalchemy_uri):
            obj.set_sqlalchemy_uri(obj.sqlalchemy_uri)
        else:
            raise Exception("Not a valid connection")

    def post_add(self, obj):
        self.add_or_edit_database_account(obj)
        # security.merge_perm(sm, 'database_access', obj.perm)
        # for schema in obj.all_schema_names():
        #     security.merge_perm(
        #         sm, 'schema_access', utils.get_schema_perm(obj, schema))
        # log user aciton
        action_str = 'Add connection: [{}]'.format(repr(obj))
        log_action('add', action_str, 'database', obj.id)
        # log database number
        log_number('database', g.user.get_id())

    def pre_update(self, obj):
        self.pre_add(obj)

    def post_update(self, obj):
        self.add_or_edit_database_account(obj)
        # log user action
        action_str = 'Edit connection: [{}]'.format(repr(obj))
        log_action('edit', action_str, 'database', obj.id)

    def pre_delete(self, obj):
        db.session.query(models.DatabaseAccount) \
            .filter(models.DatabaseAccount.database_id == obj.id) \
            .delete(synchronize_session=False)
        db.session.commit()

    def post_delete(self, obj):
        # log user action
        action_str = 'Delete connection: [{}]'.format(repr(obj))
        log_action('delete', action_str, 'database', obj.id)
        # log database number
        log_number('database', g.user.get_id())

    def add_or_edit_database_account(self, obj):
        url = sqla.engine.url.make_url(obj.sqlalchemy_uri_decrypted)
        user_id = g.user.get_id()
        db_account = models.DatabaseAccount
        db_account.insert_or_update_account(
            user_id, obj.id, url.username, url.password)

    def get_object_list_data(self, **kwargs):
        """Return the database(connection) list"""
        order_column = kwargs.get('order_column')
        order_direction = kwargs.get('order_direction')
        page = kwargs.get('page')
        page_size = kwargs.get('page_size')
        filter = kwargs.get('filter')
        user_id = kwargs.get('user_id')

        query = db.session.query(Database, User)\
            .filter(Database.created_by_fk == User.id,
                    Database.created_by_fk == user_id)

        if filter:
            filter_str = '%{}%'.format(filter.lower())
            query = query.filter(
                or_(
                    Database.database_name.ilike(filter_str),
                    User.username.ilike(filter_str)
                )
            )
        count = query.count()

        if order_column:
            try:
                column = self.str_to_column.get(order_column)
            except KeyError:
                msg = 'Error order column name: \'{}\''.format(order_column)
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
        for obj, user in rs:
            line = {}
            for col in self._list_columns:
                if col in self.str_columns:
                    line[col] = str(getattr(obj, col, None))
                else:
                    line[col] = getattr(obj, col, None)
            line['created_by_user'] = obj.created_by.username \
                if obj.created_by else None
            data.append(line)

        response = {}
        response['count'] = count
        response['order_column'] = order_column
        response['order_direction'] = 'desc' if order_direction == 'desc' else 'asc'
        response['page'] = page
        response['page_size'] = page_size
        response['data'] = data
        return response


class DatabaseAsync(DatabaseView):
    route_base = '/databaseasync'
    list_columns = [
        'id', 'database_name',
        'expose_in_sqllab', 'allow_ctas', 'force_ctas_schema',
        'allow_run_async', 'allow_run_sync', 'allow_dml',
    ]


class DatabaseTablesAsync(DatabaseView):
    route_base = '/databasetablesasync'
    list_columns = ['id', 'all_table_names', 'all_schema_names']


class TableModelView(SupersetModelView):  # noqa
    model = models.SqlaTable
    datamodel = SQLAInterface(models.SqlaTable)
    route_base = '/table'
    list_columns = ['id', 'dataset_name', 'dataset_type',
                    'explore_url', 'connection', 'changed_on']
    _list_columns = list_columns
    add_columns = ['dataset_name', 'dataset_type', 'schema', 'table_name',
                   'sql', 'database_id', 'description']
    show_columns = add_columns + ['id']
    edit_columns = add_columns
    order_columns = ['link', 'database', 'changed_on_']
    related_views = [TableColumnInlineView, SqlMetricInlineView]
    description_columns = {
        'offset': "Timezone offset (in hours) for this datasource",
        'table_name': "Name of the table that exists in the source database",
        'schema':
            "Schema, as used only in some databases like Postgres, Redshift "
            "and DB2",
        'description':
            "Supports <a href='https://daringfireball.net/projects/markdown/' target='_blank'>"
            "markdown</a>",
        'sql':
            "This fields acts a Superset view, meaning that Superset will "
            "run a query against this string as a subquery."
    }
    base_filters = [['id', DatasourceFilter, lambda: []]]

    str_to_column = {
        'title': SqlaTable.table_name,
        'time': SqlaTable.changed_on,
        'changed_on': SqlaTable.changed_on,
        'owner': User.username
    }

    int_columns = ['user_id', 'database_id', 'offset', 'cache_timeout']
    bool_columns = ['is_featured', 'filter_select_enabled']
    str_columns = ['database', 'created_on', 'changed_on']

    list_template = "superset/tableList.html"

    def get_addable_choices(self):
        data = super().get_addable_choices()
        data['available_databases'] = \
            self.get_available_databases(self.get_user_id())
        return data

    @expose('/databases/', methods=['GET', ])
    def addable_databases(self):
        try:
            dbs = self.get_available_databases(self.get_user_id())
            return json.dumps(dbs)
        except Exception as e:
            return self.build_response(500, False, str(e))

    @expose('/schemas/<database_id>/', methods=['GET', ])
    def addable_schemas(self, database_id):
        try:
            d = db.session.query(models.Database) \
                .filter_by(id=database_id).first()
            schemas = d.all_schema_names()
            return json.dumps(schemas)
        except Exception as e:
            return self.build_response(500, False, str(e))

    @expose('/tables/<database_id>/<schema>/', methods=['GET', ])
    def addable_tables(self, database_id, schema):
        try:
            d = db.session.query(models.Database) \
                .filter_by(id=database_id).first()
            tables = d.all_table_names(schema=schema)
            return json.dumps(tables)
        except Exception as e:
            return self.build_response(500, False, str(e))

    @expose('/edit/hdfstable/<pk>/', methods=['GET', 'POST'])
    def edit_hdfs_table(self, pk):
        try:
            json_data = self.get_request_data()
            obj = self.get_object(pk)
            self.pre_update(obj)
            self.update_hdfs_table(obj, json_data)
            self.datamodel.edit(obj)
            self.post_update(obj)
            return self.build_response(200, True, UPDATE_SUCCESS)
        except Exception as e:
            return self.build_response(self.status, False, str(e))

    def get_object_list_data(self, **kwargs):
        """Return the table list"""
        order_column = kwargs.get('order_column')
        order_direction = kwargs.get('order_direction')
        page = kwargs.get('page')
        page_size = kwargs.get('page_size')
        filter = kwargs.get('filter')
        dataset_type = kwargs.get('dataset_type')
        user_id = kwargs.get('user_id')

        query = db.session.query(SqlaTable, User)\
            .filter(SqlaTable.created_by_fk == User.id,
                    SqlaTable.created_by_fk == user_id)

        if dataset_type:
            query = query.filter(SqlaTable.dataset_type.ilike(dataset_type))
        if filter:
            filter_str = '%{}%'.format(filter.lower())
            query = query.filter(
                or_(
                    SqlaTable.dataset_name.ilike(filter_str),
                    SqlaTable.dataset_type.ilike(filter_str),
                    User.username.ilike(filter_str)
                )
            )
        count = query.count()

        if order_column:
            try:
                column = self.str_to_column.get(order_column)
            except KeyError:
                msg = 'Error order column name: \'{}\''.format(order_column)
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
        for obj, user in rs:
            line = {}
            for col in self._list_columns:
                if col in self.str_columns:
                    line[col] = str(getattr(obj, col, None))
                else:
                    line[col] = getattr(obj, col, None)
            line['created_by_user'] = obj.created_by.username \
                if obj.created_by else None
            data.append(line)

        response = {}
        response['count'] = count
        response['order_column'] = order_column
        response['order_direction'] = 'desc' if order_direction == 'desc' else 'asc'
        response['page'] = page
        response['page_size'] = page_size
        response['data'] = data
        return response

    def get_add_attributes(self, data, user_id):
        attributes = super().get_add_attributes(data, user_id)
        attributes['dataset_type'] = self.model.dataset_type_dict\
            .get(attributes.get('dataset_type'))
        database = db.session.query(models.Database)\
            .filter_by(id=data['database_id'])\
            .first()
        attributes['database'] = database
        return attributes

    def get_show_attributes(self, obj, user_id=None):
        attributes = super().get_show_attributes(obj)
        attributes['available_databases'] = \
            self.get_available_databases(self.get_user_id())
        return attributes

    def get_available_databases(self, user_id):
        dbs = db.session.query(models.Database)\
            .filter(models.Database.database_name != 'main',
                    models.Database.created_by_fk == user_id)\
            .all()
        dbs_list = [{'id': d.id, 'database_name': d.database_name}
                    for d in dbs]
        return dbs_list

    def pre_add(self, table):
        # number_of_existing_tables = db.session.query(
        #     sqla.func.count('*')).filter(
        #     models.SqlaTable.table_name == table.table_name,
        #     models.SqlaTable.schema == table.schema,
        #     models.SqlaTable.database_id == table.database.id
        # ).scalar()
        # table object is already added to the session
        # if number_of_existing_tables > 1:
        #     raise Exception(get_datasource_exist_error_mgs(table.full_name))

        # Fail before adding if the table can't be found
        try:
            table.get_sqla_table_object()
        except Exception as e:
            logging.exception(e)
            raise Exception(
                "Table [{}] could not be found, "
                "please double check your "
                "database connection, schema, and "
                "table name".format(table.name))

    @staticmethod
    def merge_perm(table):
        security.merge_perm(sm, 'datasource_access', table.get_perm())
        if table.schema:
            security.merge_perm(sm, 'schema_access', table.schema_perm)
        flash(_(
            "The table was created. As part of this two phase configuration "
            "process, you should now click the edit button by "
            "the new table to configure it."),
            "info")

    def post_add(self, table):
        table.fetch_metadata()
        TableModelView.merge_perm(table)
        # log user aciton
        action_str = 'Add table: [{}]'.format(repr(table))
        log_action('add', action_str, 'table', table.id)
        # log table number
        log_number('table', g.user.get_id())

    def update_hdfs_table(self, table, json_date):
        hdfs_table = table.hdfs_table
        hdfs_table.separator = json_date.get('separator')
        db.session.commit()
        hdfs_table.create_out_table(table.table_name, json_date.get('column_desc'))
        db.session.delete(table.ref_columns)
        db.session.delete(table.ref_metrics)
        table.fetch_metadata()

    def post_update(self, table):
        TableModelView.merge_perm(table)
        # log user action
        action_str = 'Edit table: [{}]'.format(repr(table))
        log_action('edit', action_str, 'table', table.id)

    def post_delete(self, table):
        if table.hdfs_table_id:
            db.session.query(HDFSTable)\
                .filter_by(id=table.hdfs_table_id)\
                .delete(synchronize_session=False)
            db.session.commit()
        # log user action
        action_str = 'Delete table: [{}]'.format(repr(table))
        log_action('delete', action_str, 'table', table.id)
        # log table number
        log_number('table', g.user.get_id())


class SliceModelView(SupersetModelView):  # noqa
    model = models.Slice
    datamodel = SQLAInterface(models.Slice)
    route_base = '/slice'
    can_add = False
    list_columns = ['id', 'slice_name', 'description', 'slice_url', 'datasource',
                    'viz_type', 'online', 'changed_on']
    _list_columns = list_columns
    edit_columns = ['slice_name', 'description']
    show_columns = ['id', 'slice_name', 'description', 'created_on', 'changed_on']
    base_order = ('changed_on', 'desc')
    description_columns = {
        'description':
            "The content here can be displayed as widget headers in the "
            "dashboard view. Supports "
            "<a href='https://daringfireball.net/projects/markdown/' target='_blank'>"
            "markdown</a>",
        'params':
            "These parameters are generated dynamically when clicking "
            "the save or overwrite button in the explore view. This JSON "
            "object is exposed here for reference and for power users who may "
            "want to alter specific parameters.",
        'cache_timeout':
            "Duration (in seconds) of the caching timeout for this slice."
        ,
    }
    base_filters = [['id', SliceFilter, lambda: []]]

    list_template = "superset/list.html"

    str_to_column = {
        'title': Slice.slice_name,
        'description': Slice.description,
        'viz_type': Slice.viz_type,
        'table': Slice.datasource_name,
        'changed_on': Slice.changed_on,
        'owner': User.username,
        'created_by_user': User.username
    }
    int_columns = ['id', 'datasource_id', 'database_id', 'cache_timeout',
                   'created_by_fk', 'changed_by_fk']
    bool_columns = ['online']
    str_columns = ['datasource', 'created_on', 'changed_on']

    def get_addable_choices(self):
        data = super().get_addable_choices()
        dashs = self.get_available_dashboards(self.get_user_id())
        data['available_dashboards'] = self.dashboards_to_dict(dashs)
        return data

    def get_show_attributes(self, obj, user_id=None):
        attributes = super().get_show_attributes(obj, user_id)
        attributes['dashboards'] = self.dashboards_to_dict(obj.dashboards)
        dashs = self.get_available_dashboards(user_id)
        available_dashs = self.dashboards_to_dict(dashs)
        attributes['available_dashboards'] = available_dashs
        return attributes

    def get_edit_attributes(self, data, user_id):
        attributes = super().get_edit_attributes(data, user_id)
        attributes['dashboards'] = self.get_dashs_in_list(data.get('dashboards'))
        return attributes

    def get_dashs_in_list(self, dashs_list):
        ids = [dash_dict.get('id') for dash_dict in dashs_list]
        objs = db.session.query(models.Dashboard) \
            .filter(models.Dashboard.id.in_(ids)).all()
        if len(ids) != len(objs):
            msg = "Some dashboards are not found by ids: {}".format(ids)
            self.handle_exception(404, Exception, msg)
        return objs

    def available_dashboards_api(self):
        user_id = self.get_user_id()
        dashs = self.get_available_dashboards(user_id)
        data = self.dashboards_to_dict(dashs)
        return json.dumps(data)

    @staticmethod
    def get_available_dashboards(user_id):
        dashs = (
            db.session.query(models.Dashboard)
            .filter_by(created_by_fk=user_id)
            .order_by(models.Dashboard.changed_on.desc())
            .all()
        )
        return dashs

    @staticmethod
    def dashboards_to_dict(dashs):
        dashs_list = []
        for dash in dashs:
            row = {'id': dash.id, 'dashboard_title': dash.dashboard_title}
            dashs_list.append(row)
        return dashs_list

    def pre_update(self, obj):
        # check_ownership(obj)
        pass

    def post_update(self, obj):
        # log user action
        action_str = 'Edit slice: [{}]'.format(repr(obj))
        log_action('edit', action_str, 'slice', obj.id)

    def pre_delete(self, obj):
        check_ownership(obj)

    def post_delete(self, obj):
        db.session.query(models.FavStar) \
            .filter(models.FavStar.class_name.ilike('slice'),
                    models.FavStar.obj_id == obj.id) \
            .delete(synchronize_session=False)
        db.session.commit()
        # log user action
        action_str = 'Delete slice: [{}]'.format(repr(obj))
        log_action('delete', action_str, 'slice', obj.id)
        # log slice number
        log_number('slice', g.user.get_id())

    @expose('/add/', methods=['GET', 'POST'])
    @has_access
    def add(self):
        table = db.session.query(models.SqlaTable).first()
        if not table:
            redirect_url = '/pilot/explore/table/0/'
        else:
            redirect_url = table.explore_url
        return redirect(redirect_url)

    def get_object_list_data(self, **kwargs):
        """ Return the slices with column 'favorite' and 'online' """
        user_id = kwargs.get('user_id')
        order_column = kwargs.get('order_column')
        order_direction = kwargs.get('order_direction')
        page = kwargs.get('page')
        page_size = kwargs.get('page_size')
        filter = kwargs.get('filter')
        only_favorite = kwargs.get('only_favorite')

        query = self.query_own_or_online('slice', user_id, only_favorite)
        if filter:
            filter_str = '%{}%'.format(filter.lower())
            query = query.filter(
                or_(
                    Slice.slice_name.ilike(filter_str),
                    Slice.description.ilike(filter_str),
                    Slice.viz_type.ilike(filter_str),
                    Slice.datasource_name.ilike(filter_str),
                    #str(Slice.changed_on).contains(filter_str),
                    User.username.ilike(filter_str)
                )
            )
        count = query.count()

        if order_column:
            try:
                column = self.str_to_column.get(order_column)
            except KeyError:
                msg = 'Error order column name: \'{}\''.format(order_column)
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
            for col in self._list_columns:
                if col in self.str_columns:
                    line[col] = str(getattr(obj, col, None))
                else:
                    line[col] = getattr(obj, col, None)
            line['explore_url'] = obj.datasource.explore_url
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

    @catch_exception
    @expose("/release/<action>/<slice_id>/", methods=['GET'])
    def slice_online_or_offline(self, action, slice_id):
        obj = db.session.query(models.Slice) \
            .filter_by(id=slice_id).first()
        if not obj:
            msg = '{}. Model:{} Id:{}'.format(
                OBJECT_NOT_FOUND, self.model.__name__, slice_id)
            logging.error(msg)
            return self.build_response(400, False, msg)
        elif obj.created_by_fk != int(g.user.get_id()):
            msg = NO_ONLINE_PERMISSION + ': {}'.format(obj.slice_name)
            return self.build_response(200, True, msg)
        elif action.lower() == 'online':
            if obj.online is True:
                msg = OBJECT_IS_ONLINE + ': {}'.format(obj.slice_name)
                return self.build_response(200, True, msg)
            else:
                obj.online = True
                db.session.commit()
                action_str = 'Change slice to online: [{}]'.format(repr(obj))
                log_action('online', action_str, 'slice', slice_id)
                log_number_for_all_users('slice')
                msg = ONLINE_SUCCESS + ': {}'.format(obj.slice_name)
                return self.build_response(200, True, msg)
        elif action.lower() == 'offline':
            if obj.online is False:
                msg = OBJECT_IS_OFFLINE + ': {}'.format(obj.slice_name)
                return self.build_response(200, True, msg)
            else:
                obj.online = False
                db.session.commit()
                action_str = 'Change slice to offline: [{}]'.format(repr(obj))
                log_action('offline', action_str, 'slice', slice_id)
                log_number_for_all_users('slice')
                msg = OFFLINE_SUCCESS + ': {}'.format(obj.slice_name)
                return self.build_response(200, True, msg)
        else:
            msg = ERROR_URL + ': {}'.format(request.url)
            return self.build_response(400, False, msg)


class SliceAsync(SliceModelView):  # noqa
    route_base = '/sliceasync'
    list_columns = ['slice_link', 'viz_type', 'modified', 'icons']
    label_columns = {
        'icons': ' ',
        'slice_link': _('Slice'),
    }


class SliceAddView(SliceModelView):  # noqa
    route_base = '/sliceaddview'
    list_columns = [
        'id', 'slice_name', 'slice_link', 'viz_type',
        'owners', 'modified', 'changed_on']


class DashboardModelView(SupersetModelView):  # noqa
    model = models.Dashboard
    datamodel = SQLAInterface(models.Dashboard)
    route_base = '/dashboard'
    list_columns = ['id', 'dashboard_title', 'url', 'description',
                    'online',  'changed_on']
    _list_columns = list_columns
    edit_columns = ['dashboard_title', 'description']
    show_columns = ['id', 'dashboard_title', 'description', 'table_names']
    add_columns = edit_columns
    base_order = ('changed_on', 'desc')
    description_columns = {
        'position_json':
            "This json object describes the positioning of the widgets in "
            "the dashboard. It is dynamically generated when adjusting "
            "the widgets size and positions by using drag & drop in "
            "the dashboard view",
        'css':
            "The css for individual dashboards can be altered here, or "
            "in the dashboard view where changes are immediately "
            "visible",
        'slug': "To get a readable URL for your dashboard",
        'json_metadata':
            "This JSON object is generated dynamically when clicking "
            "the save or overwrite button in the dashboard view. It "
            "is exposed here for reference and for power users who may "
            "want to alter specific parameters.",
        'owners': "Owners is a list of users who can alter the dashboard.",
    }
    base_filters = [['slice', DashboardFilter, lambda: []]]
    add_form_query_rel_fields = {
        'slices': [['slices', SliceFilter, None]],
    }
    edit_form_query_rel_fields = add_form_query_rel_fields

    list_template = "superset/partials/dashboard/dashboard.html"

    str_to_column = {
        'title': Dashboard.dashboard_title,
        'description': Dashboard.description,
        'changed_on': Dashboard.changed_on,
        'owner': User.username,
        'created_by_user': User.username
    }
    int_columns = ['id', 'created_by_fk', 'changed_by_fk']
    bool_columns = ['online']
    str_columns = ['created_on', 'changed_on']

    def get_addable_choices(self):
        data = super().get_addable_choices()
        slices = self.get_available_slices(self.get_user_id())
        data['available_slices'] = self.slices_to_dict(slices)
        return data

    def available_slices_api(self):
        user_id = self.get_user_id()
        slices = self.get_available_slices(user_id)
        data = self.slices_to_dict(slices)
        return json.dumps(data)

    @staticmethod
    def get_available_slices(user_id):
        slices = (
            db.session.query(models.Slice)
            .filter(
                or_(models.Slice.created_by_fk == user_id,
                    models.Slice.online == 1)
            )
            .order_by(models.Slice.changed_on.desc())
            .all()
        )
        return slices

    @staticmethod
    def slices_to_dict(slices):
        slices_list = []
        for slice in slices:
            row = {'id': slice.id,
                   'slice_name': slice.slice_name,
                   'viz_type': slice.viz_type}
            slices_list.append(row)
        return slices_list

    def pre_add(self, obj):
        if g.user not in obj.owners:
            obj.owners.append(g.user)
        utils.validate_json(obj.json_metadata)
        utils.validate_json(obj.position_json)

    def post_add(self, obj):
        # log user action
        action_str = 'Add dashboard: [{}]'.format(repr(obj))
        log_action('add', action_str, 'dashboard', obj.id)
        # log dashboard number
        log_number('dashboard', g.user.get_id())

    def pre_update(self, obj):
        # check_ownership(obj)
        self.pre_add(obj)

    def post_update(self, obj):
        # log user action
        action_str = 'Edit dashboard: [{}]'.format(repr(obj))
        log_action('edit', action_str, 'dashboard', obj.id)

    def pre_delete(self, obj):
        check_ownership(obj)

    def post_delete(self, obj):
        db.session.query(models.FavStar)\
            .filter(models.FavStar.class_name.ilike('dashboard'),
                    models.FavStar.obj_id == obj.id)\
            .delete(synchronize_session=False)
        db.session.commit()
        # log user action
        action_str = 'Delete dashboard: [{}]'.format(repr(obj))
        log_action('delete', action_str, 'dashboard', obj.id)
        # log dashboard number
        log_number('dashboard', g.user.get_id())

    def get_object_list_data(self, **kwargs):
        """Return the dashbaords with column 'favorite' and 'online'"""
        user_id = kwargs.get('user_id')
        order_column = kwargs.get('order_column')
        order_direction = kwargs.get('order_direction')
        page = kwargs.get('page')
        page_size = kwargs.get('page_size')
        filter = kwargs.get('filter')
        only_favorite = kwargs.get('only_favorite')

        query = self.query_own_or_online('dashboard', user_id, only_favorite)
        if filter:
            filter_str = '%{}%'.format(filter.lower())
            query = query.filter(
                or_(
                    Dashboard.dashboard_title.ilike(filter_str),
                    Dashboard.description.ilike(filter_str),
                    #str(Slice.changed_on).contains(filter_str),
                    User.username.ilike(filter_str)
                )
            )
        count = query.count()

        if order_column:
            try:
                column = self.str_to_column.get(order_column)
            except KeyError:
                msg = 'Error order column name: \'{}\''.format(order_column)
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
            for col in self._list_columns:
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
        attributes['slices'] = self.slices_to_dict(obj.slices)
        available_slices = self.get_available_slices(user_id)
        attributes['available_slices'] = self.slices_to_dict(available_slices)
        return attributes

    def get_add_attributes(self, data, user_id):
        attributes = super().get_add_attributes(data, user_id)
        attributes['slices'] = self.get_slices_in_list(data.get('slices'))
        return attributes

    def get_edit_attributes(self, data, user_id):
        attributes = super().get_edit_attributes(data, user_id)
        attributes['slices'] = self.get_slices_in_list(data.get('slices'))
        return attributes

    def get_slices_in_list(self, slices_list):
        ids = [slice_dict.get('id') for slice_dict in slices_list]
        objs = db.session.query(models.Slice) \
            .filter(models.Slice.id.in_(ids)).all()
        if len(ids) != len(objs):
            msg = "Some slices are not found by ids: {}".format(ids)
            self.handle_exception(404, Exception, msg)
        return objs

    @catch_exception
    @expose("/import/", methods=['GET', 'POST'])
    def import_dashboards(self):
        """Overrides the dashboards using pickled instances from the file."""
        f = request.data
        if request.method == 'POST' and f:
            current_tt = int(time.time())
            data = pickle.loads(f)
            for table in data['datasources']:
                if table.type == 'table':
                    models.SqlaTable.import_obj(table, import_time=current_tt)
                else:
                    pass
            db.session.commit()
            for dashboard in data['dashboards']:
                models.Dashboard.import_obj(
                    dashboard, import_time=current_tt)
                # log user action
                action_str = 'Import dashboard: [{}]'.format(dashboard.dashboard_title)
                log_action('import', action_str, 'dashboard', dashboard.id)
            db.session.commit()
            # TODO log_number
            # TODO log_action
        return redirect('/dashboard/list/')

    @catch_exception
    @expose("/export/")
    def export_dashboards(self):
        ids = request.args.getlist('id')
        return Response(
            models.Dashboard.export_dashboards(ids),
            headers=generate_download_headers("pickle"),
            mimetype="application/text")

    @catch_exception
    @expose("/release/<action>/<dashboard_id>/", methods=['GET'])
    def dashbaord_online_or_offline(self, action, dashboard_id):
        obj = db.session.query(models.Dashboard) \
            .filter_by(id=dashboard_id).first()
        if not obj:
            msg = '{}. Model:{} Id:{}'.format(
                OBJECT_NOT_FOUND, self.model.__name__, dashboard_id)
            logging.error(msg)
            return self.build_response(400, False, msg)
        elif obj.created_by_fk != self.get_user_id():
            msg = NO_ONLINE_PERMISSION + ': {}'.format(obj.dashboard_title)
            return self.build_response(200, True, msg)
        elif action.lower() == 'online':
            if obj.online is True:
                msg = OBJECT_IS_ONLINE + ': {}'.format(obj.dashboard_title)
                return self.build_response(200, True, msg)
            else:
                obj.online = True
                db.session.commit()
                action_str = 'Change dashboard to online: [{}]'.format(repr(obj))
                log_action('online', action_str, 'dashboard', dashboard_id)
                log_number_for_all_users('dashboard')
                msg = ONLINE_SUCCESS + ': {}'.format(obj.dashboard_title)
                return self.build_response(200, True, msg)
        elif action.lower() == 'offline':
            if obj.online is False:
                msg = OBJECT_IS_OFFLINE + ': {}'.format(obj.dashboard_title)
                return self.build_response(200, True, msg)
            else:
                obj.online = False
                db.session.commit()
                action_str = 'Change dashboard to offline: [{}]'.format(repr(obj))
                log_action('offline', action_str, 'dashboard', dashboard_id)
                log_number_for_all_users('dashboard')
                msg = OFFLINE_SUCCESS + ': {}'.format(obj.dashboard_title)
                return self.build_response(200, True, msg)
        else:
            msg = ERROR_URL + ': {}'.format(request.url)
            return self.build_response(400, False, msg)

    @staticmethod
    def add_slices_api(dashboard_id, slice_ids):
        """Add and save slices to a dashboard"""
        session = db.session()
        dash = session.query(models.Dashboard).filter_by(id=dashboard_id).first()
        check_ownership(dash, raise_if_false=True)
        new_slices = session.query(models.Slice).filter(
            models.Slice.id.in_(slice_ids))
        dash.slices += new_slices
        session.merge(dash)
        session.commit()
        session.close()
        return True


class DashboardModelViewAsync(DashboardModelView):  # noqa
    route_base = '/dashboardmodelviewasync'
    list_columns = ['dashboard_link', 'creator', 'modified', 'dashboard_title']


class LogModelView(SupersetModelView):
    route_base = '/logmodelview'
    datamodel = SQLAInterface(models.Log)
    list_columns = ('user', 'action_type', 'action', 'obj_type', 'obj_id', 'dttm')
    edit_columns = ('user', 'action', 'dttm', 'json')
    base_order = ('dttm', 'desc')
    label_columns = {
        'user': _("User"),
        'action': _("Action"),
        'dttm': _("dttm"),
        'json': _("JSON"),
    }
    

class QueryView(SupersetModelView):
    route_base = '/queryview'
    datamodel = SQLAInterface(models.Query)
    list_columns = ['user', 'database', 'status', 'start_time', 'end_time']


@app.route('/health/')
def health():
    return "OK"


@app.route('/ping/')
def ping():
    return "OK"


class R(BaseSupersetView):

    """used for short urls"""

    @expose("/<url_id>")
    def index(self, url_id):
        url = db.session.query(models.Url).filter_by(id=url_id).first()
        if url:
            return redirect('/' + url.url)
        else:
            flash("URL to nowhere...", "danger")
            return redirect('/')

    @expose("/shortner/", methods=['POST', 'GET'])
    def shortner(self):
        url = request.form.get('data')
        obj = models.Url(url=url)
        db.session.add(obj)
        db.session.commit()
        return("http://{request.headers[Host]}/r/{obj.id}".format(
            request=request, obj=obj))

    @expose("/msg/")
    def msg(self):
        """Redirects to specified url while flash a message"""
        flash(Markup(request.args.get("msg")), "info")
        return redirect(request.args.get("url"))


class Superset(BaseSupersetView):
    route_base = '/pilot'

    def temp_table(self, database_id, full_tb_name):
        """A temp table for slice"""
        table = SqlaTable()
        table.id = 0
        if '.' in full_tb_name:
            table.schema, table.table_name = full_tb_name.split('.')
        else:
            table.table_name = full_tb_name
        table.database_id = database_id
        table.database = db.session.query(models.Database) \
            .filter_by(id=database_id).first()
        table.filter_select_enabled = True
        table.set_temp_columns_and_metrics()
        return table

    def get_viz(self, slice_id=None, args=None,
                datasource_type=None, datasource_id=None,
                database_id=None, full_tb_name=None):
        if slice_id:
            slc = db.session.query(models.Slice).filter_by(id=slice_id).one()
            return slc.get_viz()
        else:
            viz_type = args.get('viz_type', 'table')
            if database_id and full_tb_name:
                datasource = self.temp_table(database_id, full_tb_name)
            else:
                datasource = SourceRegistry.get_datasource(
                    datasource_type, datasource_id, db.session)
            viz_obj = viz.viz_types[viz_type](
                datasource, request.args if request.args else args)
            return viz_obj

    @catch_exception
    @expose("/slice/<slice_id>/")
    def slice(self, slice_id):
        viz_obj = self.get_viz(slice_id)
        return redirect(viz_obj.get_url(**request.args))

    @catch_exception
    @expose("/explore_json/<datasource_type>/<datasource_id>/")
    def explore_json(self, datasource_type, datasource_id):
        """render the chart of slice"""
        # todo modify the url with parameters: datasource_id, full_tb_name
        database_id = request.args.get('database_id')
        full_tb_name = request.args.get('full_tb_name')
        try:
            # todo midify get_viz with parameters: database_id, full_tb_name
            viz_obj = self.get_viz(
                datasource_type=datasource_type,
                datasource_id=datasource_id,
                database_id=database_id,
                full_tb_name=full_tb_name,
                args=request.args)
        except Exception as e:
            logging.exception(e)
            return json_error_response(utils.error_msg_from_exception(e))

        # if not self.datasource_access(viz_obj.datasource):
        #     return Response(
        #         json.dumps(
        #             {'error': DATASOURCE_ACCESS_ERR}),
        #         status=404,
        #         mimetype="application/json")

        payload = {}
        status = 200
        try:
            payload = viz_obj.get_payload()
        except Exception as e:
            logging.exception(e)
            status = 500
            return json_error_response(utils.error_msg_from_exception(e))

        if payload.get('status') == QueryStatus.FAILED:
            status = 500

        return Response(
            viz_obj.json_dumps(payload),
            status=status,
            mimetype="application/json")

    @catch_exception
    @expose("/explore/<datasource_type>/<datasource_id>/")
    def explore(self, datasource_type, datasource_id):
        """render the parameters of slice"""
        viz_type = request.args.get("viz_type")
        slice_id = request.args.get('slice_id')

        slc = None
        user_id = g.user.get_id() if g.user else None

        if slice_id:
            slc = db.session.query(models.Slice).filter_by(id=slice_id).first()

        error_redirect = '/slice/list/'
        datasource_class = SourceRegistry.sources[datasource_type]
        datasources = db.session.query(datasource_class).all()
        datasources = sorted(datasources, key=lambda ds: ds.full_name)
        databases = db.session.query(models.Database)\
            .filter_by(expose_in_sqllab=1).all()
        databases = sorted(databases, key=lambda d: d.name)

        database_id = request.args.get('database_id')
        full_tb_name = request.args.get('full_tb_name')
        try:
            viz_obj = self.get_viz(
                datasource_type=datasource_type,
                datasource_id=datasource_id,
                database_id=database_id,
                full_tb_name=full_tb_name,
                args=request.args)
        except Exception as e:
            flash('{}'.format(e), "alert")
            return redirect(error_redirect)

        # if not viz_obj.datasource:
        #     flash(DATASOURCE_MISSING_ERR, "alert")
        #     return redirect(error_redirect)
        #
        # if not self.datasource_access(viz_obj.datasource):
        #     flash(
        #         __(get_datasource_access_error_msg(viz_obj.datasource.name)),
        #         "danger")
        #     return redirect(
        #         'superset/request_access/?'
        #         'datasource_type={datasource_type}&'
        #         'datasource_id={datasource_id}&'
        #         ''.format(**locals()))

        if not viz_type and viz_obj.datasource.default_endpoint:
            return redirect(viz_obj.datasource.default_endpoint)

        # slc perms
        slice_add_perm = self.can_access('can_add', 'SliceModelView')
        slice_edit_perm = check_ownership(slc, raise_if_false=False)
        slice_download_perm = self.can_access('can_download', 'SliceModelView')

        # handle save or overwrite
        action = request.args.get('action')
        if action in ('saveas', 'overwrite'):
            return self.save_or_overwrite_slice(
                request.args, slc, slice_add_perm, slice_edit_perm)

        # find out if user is in explore v2 beta group
        # and set flag `is_in_explore_v2_beta`
        #is_in_explore_v2_beta = sm.find_role('explore-v2-beta') in get_user_roles()
        is_in_explore_v2_beta = False

        # handle different endpoints
        if request.args.get("csv") == "true":
            payload = viz_obj.get_csv()
            return Response(
                payload,
                status=200,
                headers=generate_download_headers("csv"),
                mimetype="application/csv")
        elif request.args.get("standalone") == "true":
            return self.render_template("superset/standalone.html", viz=viz_obj, standalone_mode=True)
        elif request.args.get("V2") == "true" or is_in_explore_v2_beta:
            # bootstrap data for explore V2
            bootstrap_data = {
                "can_add": slice_add_perm,
                "can_download": slice_download_perm,
                "can_edit": slice_edit_perm,
                # TODO: separate endpoint for fetching datasources
                "datasources": [(d.id, d.full_name) for d in datasources],
                "datasource_id": datasource_id,
                "datasource_name": viz_obj.datasource.name,
                "datasource_type": datasource_type,
                "user_id": user_id,
                "viz": json.loads(viz_obj.json_data),
                "filter_select": viz_obj.datasource.filter_select_enabled
            }
            table_name = viz_obj.datasource.table_name \
                if datasource_type == 'table' \
                else viz_obj.datasource.datasource_name
            return self.render_template(
                "superset/explorev2.html",
                bootstrap_data=json.dumps(bootstrap_data),
                slice=slc,
                table_name=table_name)
        else:
            preview_data = viz_obj.datasource.preview_data()
            return self.render_template(
                "superset/explore.html",
                viz=viz_obj,
                slice=slc,
                datasources=datasources,
                databases=databases,
                preview_data=preview_data,
                can_add=slice_add_perm,
                can_edit=slice_edit_perm,
                can_download=slice_download_perm,
                userid=g.user.get_id() if g.user else ''
            )

    @catch_exception
    @expose("/filter/<datasource_type>/<datasource_id>/<column>/")
    def filter(self, datasource_type, datasource_id, column):
        """
        Endpoint to retrieve values for specified column.

        :param datasource_type: Type of datasource e.g. table
        :param datasource_id: Datasource id
        :param column: Column name to retrieve values for
        :return:
        """
        # TODO: Cache endpoint by user, datasource and column
        error_redirect = '/slice/list/'
        datasource_class = models.SqlaTable

        datasource = db.session.query(
            datasource_class).filter_by(id=datasource_id).first()

        if not datasource:
            flash(DATASOURCE_MISSING_ERR, "alert")
            return json_error_response(DATASOURCE_MISSING_ERR)
        if not self.datasource_access(datasource):
            flash(get_datasource_access_error_msg(datasource.name), "danger")
            return json_error_response(DATASOURCE_ACCESS_ERR)

        viz_type = request.args.get("viz_type")
        if not viz_type and datasource.default_endpoint:
            return redirect(datasource.default_endpoint)
        if not viz_type:
            viz_type = "table"
        try:
            obj = viz.viz_types[viz_type](
                datasource,
                form_data=request.args,
                slice_=None)
        except Exception as e:
            flash(str(e), "danger")
            return redirect(error_redirect)
        status = 200
        payload = obj.get_values_for_column(column)
        return Response(
            payload,
            status=status,
            mimetype="application/json")

    def save_or_overwrite_slice(
            self, args, slc, slice_add_perm, slice_edit_perm):
        """Save or overwrite a slice"""
        slice_name = args.get('slice_name')
        action = args.get('action')

        # TODO use form processing form wtforms
        d = args.to_dict(flat=False)
        del d['action']
        if 'previous_viz_type' in d:
            del d['previous_viz_type']

        as_list = ('metrics', 'groupby', 'columns', 'all_columns',
                   'mapbox_label', 'order_by_cols')
        for k in d:
            v = d.get(k)
            if k in as_list and not isinstance(v, list):
                d[k] = [v] if v else []
            if k not in as_list and isinstance(v, list):
                d[k] = v[0]

        datasource_type = args.get('datasource_type')
        datasource_id = args.get('datasource_id')
        database_id = args.get('database_id')
        full_tb_name = args.get('full_tb_name')

        if action in ('saveas'):
            d.pop('slice_id')  # don't save old slice_id
            slc = models.Slice(owners=[g.user] if g.user else [])

        slc.params = json.dumps(d, indent=4, sort_keys=True)
        slc.datasource_name = args.get('datasource_name')
        slc.viz_type = args.get('viz_type')
        slc.datasource_type = datasource_type
        slc.datasource_id = datasource_id
        slc.slice_name = slice_name
        slc.database_id = database_id
        slc.full_table_name = full_tb_name

        if action in ('saveas') and slice_add_perm:
            self.save_slice(slc)
        elif action == 'overwrite' and slice_edit_perm:
            self.overwrite_slice(slc)

        # Adding slice to a dashboard if requested
        dash = None
        if request.args.get('add_to_dash') == 'existing':
            dash = (
                db.session.query(models.Dashboard)
                .filter_by(id=int(request.args.get('save_to_dashboard_id')))
                .one()
            )
            flash(
                "Slice [{}] was added to dashboard [{}]".format(
                    slc.slice_name,
                    dash.dashboard_title),
                "info")
        elif request.args.get('add_to_dash') == 'new':
            dash = models.Dashboard(
                dashboard_title=request.args.get('new_dashboard_name'),
                owners=[g.user] if g.user else [])
            flash(
                "Dashboard [{}] just got created and slice [{}] was added "
                "to it".format(
                    dash.dashboard_title,
                    slc.slice_name),
                "info")

        if dash and slc not in dash.slices:
            dash.slices.append(slc)
            db.session.commit()
            # log user aciton
            action_str = 'Add dashboard: [{}]'.format(dash.dashboard_title)
            log_action('add', action_str, 'dashboard', dash.id)

        if request.args.get('goto_dash') == 'true':
            if request.args.get('V2') == 'true':
                return dash.url
            return redirect(dash.url)
        else:
            if request.args.get('V2') == 'true':
                return slc.slice_url
            return redirect(slc.slice_url)

    def save_slice(self, slc):
        session = db.session()
        msg = "Slice [{}] has been saved".format(slc.slice_name)
        session.add(slc)
        session.commit()
        flash(msg, "info")
        # log user action
        action_str = 'Add slice: [{}]'.format(slc.slice_name)
        log_action('add', action_str, 'slice', slc.id)
        # log slice number
        log_number('slice', g.user.get_id())

    def overwrite_slice(self, slc):
        can_update = check_ownership(slc, raise_if_false=False)
        if not can_update:
            flash("You cannot overwrite [{}]".format(slc), "danger")
        else:
            session = db.session()
            session.merge(slc)
            session.commit()
            msg = "Slice [{}] has been overwritten".format(slc.slice_name)
            flash(msg, "info")
            # log user action
            action_str = 'Edit slice: [{}]'.format(slc.slice_name)
            log_action('edit', action_str, 'slice', slc.id)

    @catch_exception
    @expose("/checkbox/<model_view>/<id_>/<attr>/<value>/", methods=['GET'])
    def checkbox(self, model_view, id_, attr, value):
        """endpoint for checking/unchecking any boolean in a sqla model"""
        views = sys.modules[__name__]
        model_view_cls = getattr(views, model_view)
        model = model_view_cls.datamodel.obj

        obj = db.session.query(model).filter_by(id=id_).first()
        if obj:
            setattr(obj, attr, value == 'true')
            db.session.commit()
        return Response("OK", mimetype="application/json")

    @catch_exception
    @expose("/all_tables/<db_id>/")
    def all_tables(self, db_id):
        """Endpoint that returns all tables and views from the database"""
        database = (
            db.session.query(models.Database)
            .filter_by(id=db_id)
            .one()
        )
        all_tables = []
        all_views = []
        schemas = database.all_schema_names()
        for schema in schemas:
            all_tables.extend(database.all_table_names(schema=schema))
            all_views.extend(database.all_view_names(schema=schema))
        if not schemas:
            all_tables.extend(database.all_table_names())
            all_views.extend(database.all_view_names())

        return Response(
            json.dumps({"tables": all_tables, "views": all_views}),
            mimetype="application/json")

    @catch_exception
    @expose("/tables/<db_id>/<schema>/")
    def tables(self, db_id, schema):
        """endpoint to power the calendar heatmap on the welcome page"""
        schema = None if schema in ('null', 'undefined') else schema
        database = (
            db.session.query(models.Database)
            .filter_by(id=db_id)
            .one()
        )
        tables = [t for t in database.all_table_names(schema) if
                  self.datasource_access_by_name(database, t, schema=schema)]
        views = [v for v in database.all_table_names(schema) if
                 self.datasource_access_by_name(database, v, schema=schema)]
        payload = {'tables': tables, 'views': views}
        return Response(
            json.dumps(payload), mimetype="application/json")

    @catch_exception
    @expose("/copy_dash/<dashboard_id>/", methods=['GET', 'POST'])
    def copy_dash(self, dashboard_id):
        """Copy dashboard"""
        session = db.session()
        data = json.loads(request.form.get('data'))
        dash = models.Dashboard()
        original_dash = session.query(models.Dashboard).filter_by(id=dashboard_id).first()
        dash.owners = [g.user] if g.user else []
        dash.dashboard_title = data['dashboard_title']
        dash.slices = original_dash.slices
        dash.params = original_dash.params

        self._set_dash_metadata(dash, data)
        session.add(dash)
        session.commit()
        dash_json = dash.json_data
        # log user action
        action_str = 'Add dashboard: [{}]'.format(dash.dashboard_title)
        log_action('add', action_str, 'dashboard', dash.id)
        return Response(
            dash_json, mimetype="application/json")

    @catch_exception
    @expose("/save_dash/<dashboard_id>/", methods=['GET', 'POST'])
    def save_dash(self, dashboard_id):
        """Save a dashboard's metadata"""
        session = db.session()
        dash = session.query(models.Dashboard).filter_by(id=dashboard_id).first()
        # check_ownership(dash, raise_if_false=True)
        data = json.loads(request.form.get('data'))
        self._set_dash_metadata(dash, data)
        session.merge(dash)
        session.commit()
        # log user aciton
        action_str = 'Edit dashboard: [{}]'.format(repr(dash))
        log_action('edit', action_str, 'dashboard', dashboard_id)
        return "SUCCESS"

    @staticmethod
    def _set_dash_metadata(dashboard, data):
        positions = data['positions']
        slice_ids = [int(d['slice_id']) for d in positions]
        dashboard.slices = [o for o in dashboard.slices if o.id in slice_ids]
        positions = sorted(data['positions'], key=lambda x: int(x['slice_id']))
        dashboard.position_json = json.dumps(positions, indent=4, sort_keys=True)
        md = dashboard.params_dict
        dashboard.css = data['css']

        if 'filter_immune_slices' not in md:
            md['filter_immune_slices'] = []
        if 'filter_immune_slice_fields' not in md:
            md['filter_immune_slice_fields'] = {}
        md['expanded_slices'] = data['expanded_slices']
        dashboard.json_metadata = json.dumps(md, indent=4)

    @catch_exception
    @expose("/add_slices/<dashboard_id>/", methods=['POST'])
    def add_slices(self, dashboard_id):
        """Add and save slices to a dashboard"""
        data = json.loads(request.form.get('data'))
        session = db.session()
        Slice = models.Slice  # noqa
        dash = session.query(models.Dashboard).filter_by(id=dashboard_id).first()
        # check_ownership(dash, raise_if_false=True)
        new_slices = session.query(Slice).filter(
            Slice.id.in_(data['slice_ids']))
        dash.slices += new_slices
        session.merge(dash)
        session.commit()
        session.close()
        return "SLICES ADDED"

    @catch_exception
    @expose("/testconn", methods=["POST", "GET"])
    def testconn(self):
        """Tests a sqla connection"""
        try:
            args = json.loads(str(request.data, encoding='utf-8'))
            uri = args.get('sqlalchemy_uri')
            db_name = args.get('database_name')
            if db_name:
                database = (
                    db.session.query(models.Database)
                    .filter_by(database_name=db_name)
                    .first()
                )
                if database and uri == database.safe_sqlalchemy_uri():
                    # the password-masked uri was passed
                    # use the URI associated with this database
                    uri = database.sqlalchemy_uri_decrypted
            connect_args = (
                args.get('extras', {})
                    .get('engine_params', {})
                    .get('connect_args', {}))
            engine = create_engine(uri, connect_args=connect_args)
            engine.connect()
            return json.dumps(engine.table_names(), indent=4)
        except Exception as e:
            return Response((
                "Connection failed!\n\n"
                "The error message returned was:\n{}").format(e),
                status=500,
                mimetype="application/json")

    @catch_exception
    @expose("/recent_activity/<user_id>/", methods=['GET'])
    def recent_activity(self, user_id):
        """Recent activity (actions) for a given user"""
        M = models  # noqa
        qry = (
            db.session.query(M.Log, M.Dashboard, M.Slice)
            .outerjoin(M.Dashboard, M.Dashboard.id == M.Log.dashboard_id)
            .outerjoin(M.Slice, M.Slice.id == M.Log.slice_id)
            .filter(
                sqla.and_(
                    ~M.Log.action.in_(('queries', 'shortner', 'sql_json')),
                    M.Log.user_id == user_id))
            .order_by(M.Log.dttm.desc())
            .limit(1000)
        )
        payload = []
        for log in qry.all():
            item_url = None
            item_title = None
            if log.Dashboard:
                item_url = log.Dashboard.url
                item_title = log.Dashboard.dashboard_title
            elif log.Slice:
                item_url = log.Slice.slice_url
                item_title = log.Slice.slice_name

            payload.append({
                'action': log.Log.action,
                'item_url': item_url,
                'item_title': item_title,
                'time': log.Log.dttm,
            })
        return Response(
            json.dumps(payload, default=utils.json_int_dttm_ser),
            mimetype="application/json")

    @catch_exception
    @expose("/fave_dashboards/<user_id>/", methods=['GET'])
    def fave_dashboards(self, user_id):
        qry = (
            db.session.query(models.Dashboard, models.FavStar.dttm)
            .join(models.FavStar,
                sqla.and_(
                    models.FavStar.user_id == int(user_id),
                    models.FavStar.class_name == 'Dashboard',
                    models.Dashboard.id == models.FavStar.obj_id))
            .order_by(models.FavStar.dttm.desc())
        )
        payload = []
        for o in qry.all():
            d = {
                'id': o.Dashboard.id,
                'dashboard': o.Dashboard.dashboard_link(),
                'title': o.Dashboard.dashboard_title,
                'url': o.Dashboard.url,
                'dttm': o.dttm,
            }
            if o.Dashboard.created_by:
                user = o.Dashboard.created_by
                d['creator'] = str(user)
                d['creator_url'] = '/pilot/profile/{}/'.format(
                    user.username)
            payload.append(d)
        return Response(
            json.dumps(payload, default=utils.json_int_dttm_ser),
            mimetype="application/json")

    @catch_exception
    @expose("/created_dashboards/<user_id>/", methods=['GET'])
    def created_dashboards(self, user_id):
        Dash = models.Dashboard  # noqa
        qry = (
            db.session.query(Dash)
            .filter(
                sqla.or_(
                    Dash.created_by_fk == user_id,
                    Dash.changed_by_fk == user_id,))
            .order_by(Dash.changed_on.desc())
        )
        payload = [{
            'id': o.id,
            'dashboard': o.dashboard_link(),
            'title': o.dashboard_title,
            'url': o.url,
            'dttm': o.changed_on,
        } for o in qry.all()]
        return Response(
            json.dumps(payload, default=utils.json_int_dttm_ser),
            mimetype="application/json")

    @catch_exception
    @expose("/created_slices/<user_id>/", methods=['GET'])
    def created_slices(self, user_id):
        """List of slices created by this user"""
        Slice = models.Slice  # noqa
        qry = (
            db.session.query(Slice)
            .filter(
                sqla.or_(
                    Slice.created_by_fk == user_id,
                    Slice.changed_by_fk == user_id))
            .order_by(Slice.changed_on.desc())
        )
        payload = [{
            'id': o.id,
            'title': o.slice_name,
            'url': o.slice_url,
            'dttm': o.changed_on,
        } for o in qry.all()]
        return Response(
            json.dumps(payload, default=utils.json_int_dttm_ser),
            mimetype="application/json")

    @catch_exception
    @expose("/fave_slices/<user_id>/", methods=['GET'])
    def fave_slices(self, user_id):
        """Favorite slices for a user"""
        qry = (
            db.session.query(models.Slice,models.FavStar.dttm)
            .join(models.FavStar,
                  sqla.and_(
                    models.FavStar.user_id == int(user_id),
                    models.FavStar.class_name == 'slice',
                    models.Slice.id == models.FavStar.obj_id))
            .order_by(models.FavStar.dttm.desc())
        )
        payload = []
        for o in qry.all():
            d = {
                'id': o.Slice.id,
                'title': o.Slice.slice_name,
                'url': o.Slice.slice_url,
                'dttm': o.dttm,
            }
            if o.Slice.created_by:
                user = o.Slice.created_by
                d['creator'] = str(user)
                d['creator_url'] = '/pilot/profile/{}/'.format(
                    user.username)
            payload.append(d)
        return Response(
            json.dumps(payload, default=utils.json_int_dttm_ser),
            mimetype="application/json")

    @catch_exception
    @expose("/warm_up_cache/", methods=['GET'])
    def warm_up_cache(self):
        """Warms up the cache for the slice or table."""
        slices = None
        session = db.session()
        slice_id = request.args.get('slice_id')
        table_name = request.args.get('table_name')
        db_name = request.args.get('db_name')

        if not slice_id and not (table_name and db_name):
            return json_error_response(__(
                "Malformed request. slice_id or table_name and db_name "
                "arguments are expected"), status=400)
        if slice_id:
            slices = session.query(models.Slice).filter_by(id=slice_id).all()
            if not slices:
                return json_error_response(__(
                    "Slice %(id)s not found", id=slice_id), status=404)
        elif table_name and db_name:
            table = (
                session.query(models.SqlaTable)
                .join(models.Database)
                .filter(
                    models.Database.database_name == db_name or
                    models.SqlaTable.table_name == table_name)
            ).first()
            if not table:
                return json_error_response(__(
                    "Table %(t)s wasn't found in the database %(d)s",
                    t=table_name, s=db_name), status=404)
            slices = session.query(models.Slice).filter_by(
                datasource_id=table.id,
                datasource_type=table.type).all()

        for slice in slices:
            try:
                obj = slice.get_viz()
                obj.get_json(force=True)
            except Exception as e:
                return json_error_response(utils.error_msg_from_exception(e))
        return Response(
            json.dumps(
                [{"slice_id": session.id, "slice_name": session.slice_name}
                 for session in slices]),
            status=200,
            mimetype="application/json")

    @catch_exception
    @expose("/favstar/<class_name>/<obj_id>/<action>/")
    def favstar(self, class_name, obj_id, action):
        """Toggle favorite stars on Slices and Dashboard"""
        session = db.session()
        FavStar = models.FavStar  # noqa
        count = 0
        favs = (
            session.query(FavStar)
            .filter_by(class_name=class_name, obj_id=obj_id, user_id=g.user.get_id())
            .all()
        )
        # get obj name to make log readable
        obj = (
            session.query(models.str_to_model[class_name.lower()])
            .filter_by(id=obj_id)
            .one()
        )

        if action == 'select':
            if not favs:
                session.add(
                    FavStar(
                        class_name=class_name,
                        obj_id=obj_id,
                        user_id=g.user.get_id(),
                        dttm=datetime.now()
                    )
                )
            count = 1
            # log user aciton
            action_str = 'Like {}: [{}]'.format(class_name.lower(), repr(obj))
            log_action('like', action_str, class_name.lower(), obj_id)
        elif action == 'unselect':
            for fav in favs:
                session.delete(fav)
            # log user aciton
            action_str = 'Dislike {}: [{}]'.format(class_name.lower(), repr(obj))
            log_action('dislike', action_str, class_name.lower(), obj_id)
        else:
            count = len(favs)
        session.commit()
        return Response(
            json.dumps({'count': count}),
            mimetype="application/json")

    @catch_exception
    @expose('/if_online/<class_name>/<obj_id>')
    def if_online(self, class_name, obj_id):
        try:
            model = str_to_model.get(class_name.lower())
            if hasattr(model, 'online'):
                obj = db.session.query(model).filter_by(id=obj_id).first()
                return json.dumps({'online': obj.online})
            else:
                return json.dumps({'online': False})
        except Exception as e:
            return json_error_response(utils.error_msg_from_exception(e))

    @catch_exception
    @expose("/dashboard/<dashboard_id>/")
    def dashboard(self, dashboard_id):
        """Server side rendering for a dashboard"""
        session = db.session()
        qry = session.query(models.Dashboard)
        if dashboard_id.isdigit():
            qry = qry.filter_by(id=int(dashboard_id))
        else:
            qry = qry.filter_by(slug=dashboard_id)

        dash = qry.one()
        datasources = {slc.datasource for slc in dash.slices}
        for datasource in datasources:
            if not self.datasource_access(datasource):
                flash(
                    __(get_datasource_access_error_msg(datasource.name)),
                    "danger")
                return redirect(
                    'pilot/request_access/?'
                    'dashboard_id={dash.id}&'
                    ''.format(**locals()))

        # Hack to log the dashboard_id properly, even when getting a slug
        def dashboard(**kwargs):  # noqa
            pass
        dashboard(dashboard_id=dash.id)
        dash_edit_perm = check_ownership(dash, raise_if_false=False)
        dash_save_perm = \
            dash_edit_perm and self.can_access('can_save_dash', 'Superset')
        standalone = request.args.get("standalone") == "true"
        context = dict(
            user_id=g.user.get_id(),
            dash_save_perm=dash_save_perm,
            dash_edit_perm=dash_edit_perm,
            standalone_mode=standalone,
        )
        return self.render_template(
            "superset/dashboard.html",
            dashboard=dash,
            context=json.dumps(context),
            standalone_mode=standalone,
        )

    @catch_exception
    @expose("/sqllab_viz/", methods=['POST'])
    def sqllab_viz(self):
        data = json.loads(request.form.get('data'))
        table_name = data.get('datasourceName')
        viz_type = data.get('chartType')
        table = (
            db.session.query(models.SqlaTable)
            .filter_by(dataset_name=table_name)
            .first()
        )
        if not table:
            table = models.SqlaTable(dataset_name=table_name)
        table.dataset_type = models.SqlaTable.dataset_type_dict.get("inceptor")
        table.database_id = data.get('dbId')
        q = SupersetQuery(data.get('sql'))
        table.sql = q.stripped()
        db.session.add(table)
        db.session.commit()
        # log user action
        action_str = 'Add table: [{}]'.format(table_name)
        log_action('add', action_str, 'table', table.id)

        cols = []
        dims = []
        metrics = []
        for column_name, config in data.get('columns').items():
            is_dim = config.get('is_dim', False)
            col = models.TableColumn(
                column_name=column_name,
                filterable=is_dim,
                groupby=is_dim,
                is_dttm=config.get('is_date', False),
            )
            cols.append(col)
            if is_dim:
                dims.append(col)
            agg = config.get('agg')
            if agg:
                if agg == 'count_distinct':
                    metrics.append(models.SqlMetric(
                        metric_name="{agg}__{column_name}".format(**locals()),
                        expression="COUNT(DISTINCT {column_name})"
                        .format(**locals()),
                    ))
                else:
                    metrics.append(models.SqlMetric(
                        metric_name="{agg}__{column_name}".format(**locals()),
                        expression="{agg}({column_name})".format(**locals()),
                    ))
        if not metrics:
            metrics.append(models.SqlMetric(
                metric_name="count".format(**locals()),
                expression="count(*)".format(**locals()),
            ))
        table.ref_columns = cols
        table.ref_metrics = metrics
        db.session.commit()
        params = {
            'viz_type': viz_type,
            'groupby': dims[0].column_name if dims else None,
            'metrics': metrics[0].metric_name if metrics else None,
            'metric': metrics[0].metric_name if metrics else None,
            'since': '100 years ago',
            'limit': '0',
        }
        params = "&".join([k + '=' + v for k, v in params.items() if v])
        return '/pilot/explore/table/{table.id}/?{params}'.format(**locals())

    @catch_exception
    @expose("/table/<database_id>/<table_name>/<schema>/")
    def table(self, database_id, table_name, schema):
        schema = None if schema in ('null', 'undefined') else schema
        mydb = db.session.query(models.Database).filter_by(id=database_id).one()
        cols = []
        indexes = []
        t = mydb.get_columns(table_name, schema)
        try:
            t = mydb.get_columns(table_name, schema)
            indexes = mydb.get_indexes(table_name, schema)
            primary_key = mydb.get_pk_constraint(table_name, schema)
            foreign_keys = mydb.get_foreign_keys(table_name, schema)
        except Exception as e:
            return Response(
                json.dumps({'error': utils.error_msg_from_exception(e)}),
                mimetype="application/json")
        keys = []
        if primary_key and primary_key.get('constrained_columns'):
            primary_key['column_names'] = primary_key.pop('constrained_columns')
            primary_key['type'] = 'pk'
            keys += [primary_key]
        for fk in foreign_keys:
            fk['column_names'] = fk.pop('constrained_columns')
            fk['type'] = 'fk'
        keys += foreign_keys
        for idx in indexes:
            idx['type'] = 'index'
        keys += indexes

        for col in t:
            dtype = ""
            try:
                dtype = '{}'.format(col['type'])
            except:
                pass
            cols.append({
                'name': col['name'],
                'type': dtype.split('(')[0] if '(' in dtype else dtype,
                'longType': dtype,
                'keys': [
                    k for k in keys
                    if col['name'] in k.get('column_names')
                ],
            })
        tbl = {
            'name': table_name,
            'columns': cols,
            'selectStar': mydb.select_star(
                table_name, schema=schema, show_cols=True, indent=True),
            'primaryKey': primary_key,
            'foreignKeys': foreign_keys,
            'indexes': keys,
        }
        return Response(json.dumps(tbl), mimetype="application/json")

    @catch_exception
    @expose("/extra_table_metadata/<database_id>/<table_name>/<schema>/")
    def extra_table_metadata(self, database_id, table_name, schema):
        schema = None if schema in ('null', 'undefined') else schema
        mydb = db.session.query(models.Database).filter_by(id=database_id).one()
        payload = mydb.db_engine_spec.extra_table_metadata(
            mydb, table_name, schema)
        return Response(json.dumps(payload), mimetype="application/json")

    @catch_exception
    @expose("/select_star/<database_id>/<table_name>/")
    def select_star(self, database_id, table_name):
        mydb = db.session.query(
            models.Database).filter_by(id=database_id).first()
        quote = mydb.get_quoter()
        t = mydb.get_table(table_name)

        # Prevent exposing column fields to users that cannot access DB.
        if not self.datasource_access(t.perm):
            flash(get_datasource_access_error_msg(t.name), 'danger')
            return redirect("/table/list/")

        fields = ", ".join(
            [quote(c.name) for c in t.columns] or "*")
        s = "SELECT\n{}\nFROM {}".format(fields, table_name)
        return self.render_template(
            "superset/ajah.html",
            content=s
        )

    @expose("/theme/")
    def theme(self):
        return self.render_template('superset/theme.html')

    @catch_exception
    @expose("/cached_key/<key>/")
    def cached_key(self, key):
        """Returns a key from the cache"""
        resp = cache.get(key)
        if resp:
            return resp
        return "nope"

    @catch_exception
    @expose("/results/<key>/")
    def results(self, key):
        """Serves a key off of the results backend"""
        if not results_backend:
            return json_error_response("Results backend isn't configured")

        blob = results_backend.get(key)
        if blob:
            json_payload = zlib.decompress(blob)
            obj = json.loads(json_payload)
            db_id = obj['query']['dbId']
            session = db.session()
            mydb = session.query(models.Database).filter_by(id=db_id).one()

            if not self.database_access(mydb):
                return json_error_response(
                    get_database_access_error_msg(mydb.database_name))

            return Response(
                json_payload,
                status=200,
                mimetype="application/json")
        else:
            return Response(
                json.dumps({
                    'error': (
                        "Data could not be retrived. You may want to "
                        "re-run the query."
                    )
                }),
                status=410,
                mimetype="application/json")

    @catch_exception
    @expose("/sql_json/", methods=['POST', 'GET'])
    def sql_json(self):
        """Runs arbitrary sql and returns and json"""
        def table_accessible(database, full_table_name, schema_name=None):
            table_name_pieces = full_table_name.split(".")
            if len(table_name_pieces) == 2:
                table_schema = table_name_pieces[0]
                table_name = table_name_pieces[1]
            else:
                table_schema = schema_name
                table_name = table_name_pieces[0]
            return self.datasource_access_by_name(
                database, table_name, schema=table_schema)

        async = request.form.get('runAsync') == 'true'
        sql = request.form.get('sql')
        database_id = request.form.get('database_id')

        session = db.session()
        mydb = session.query(models.Database).filter_by(id=database_id).one()

        if not mydb:
            json_error_response(
                'Database with id {} is missing.'.format(database_id))

        superset_query = sql_parse.SupersetQuery(sql)
        schema = request.form.get('schema')
        schema = schema if schema else None

        rejected_tables = [
            t for t in superset_query.tables if not
            table_accessible(mydb, t, schema_name=schema)]
        if rejected_tables:
            return json_error_response(
                get_datasource_access_error_msg('{}'.format(rejected_tables)))
        session.commit()

        select_as_cta = request.form.get('select_as_cta') == 'true'
        tmp_table_name = request.form.get('tmp_table_name')
        if select_as_cta and mydb.force_ctas_schema:
            tmp_table_name = '{}.{}'.format(
                mydb.force_ctas_schema,
                tmp_table_name
            )

        query = models.Query(
            database_id=int(database_id),
            limit=int(app.config.get('SQL_MAX_ROW', None)),
            sql=sql,
            schema=schema,
            select_as_cta=request.form.get('select_as_cta') == 'true',
            start_time=utils.now_as_float(),
            tab_name=request.form.get('tab'),
            status=QueryStatus.PENDING if async else QueryStatus.RUNNING,
            sql_editor_id=request.form.get('sql_editor_id'),
            tmp_table_name=tmp_table_name,
            user_id=int(g.user.get_id()),
            client_id=request.form.get('client_id'),
        )
        session.add(query)
        session.commit()
        query_id = query.id

        # Async request.
        if async:
            # Ignore the celery future object and the request may time out.
            sql_lab.get_sql_results.delay(
                query_id, return_results=False,
                store_results=not query.select_as_cta)
            return Response(
                json.dumps({'query': query.to_dict()},
                           default=utils.json_int_dttm_ser,
                           allow_nan=False),
                status=202,  # Accepted
                mimetype="application/json")

        # Sync request.
        try:
            SQLLAB_TIMEOUT = config.get("SQLLAB_TIMEOUT")
            with utils.timeout(
                    seconds=SQLLAB_TIMEOUT,
                    error_message=(
                        "The query exceeded the {SQLLAB_TIMEOUT} seconds "
                        "timeout. You may want to run your query as a "
                        "`CREATE TABLE AS` to prevent timeouts."
                    ).format(**locals())):
                data = sql_lab.get_sql_results(query_id, return_results=True)
        except Exception as e:
            logging.exception(e)
            return Response(
                json.dumps({'error': "{}".format(e)}),
                status=500,
                mimetype="application/json")
        return Response(
            data,
            status=200,
            mimetype="application/json")

    @catch_exception
    @expose("/csv/<client_id>/")
    def csv(self, client_id):
        """Download the query results as csv."""
        query = (
            db.session.query(models.Query)
            .filter_by(client_id=client_id)
            .one()
        )

        if not self.database_access(query.database):
            flash(get_database_access_error_msg(query.database.database_name))
            return redirect('/')

        sql = query.select_sql or query.sql
        df = query.database.get_df(sql, query.schema)
        # TODO(bkyryliuk): add compression=gzip for big files.
        csv = df.to_csv(index=False, encoding='utf-8')
        response = Response(csv, mimetype='text/csv')
        response.headers['Content-Disposition'] = (
            'attachment; filename={}.csv'.format(query.name))
        return response

    @catch_exception
    @expose("/fetch_datasource_metadata/")
    def fetch_datasource_metadata(self):
        datasource_type = request.args.get('datasource_type')
        datasource_class = SourceRegistry.sources[datasource_type]
        datasource = (
            db.session.query(datasource_class)
            .filter_by(id=request.args.get('datasource_id'))
            .first()
        )

        # Check if datasource exists
        if not datasource:
            return json_error_response(DATASOURCE_MISSING_ERR)

        # Check permission for datasource
        if not self.datasource_access(datasource):
            return json_error_response(DATASOURCE_ACCESS_ERR)

        return Response(
            json.dumps(datasource.data),
            mimetype="application/json"
        )

    @catch_exception
    @expose("/queries/<last_updated_ms>/")
    def queries(self, last_updated_ms):
        """Get the updated queries."""
        if not g.user.get_id():
            return Response(
                json.dumps({'error': "Please login to access the queries."}),
                status=403,
                mimetype="application/json")

        # Unix time, milliseconds.
        last_updated_ms_int = int(float(last_updated_ms)) if last_updated_ms else 0

        # UTC date time, same that is stored in the DB.
        last_updated_dt = utils.EPOCH + timedelta(seconds=last_updated_ms_int / 1000)

        sql_queries = (
            db.session.query(models.Query)
            .filter(
                models.Query.user_id == g.user.get_id(),
                models.Query.changed_on >= last_updated_dt,
            )
            .all()
        )
        dict_queries = {q.client_id: q.to_dict() for q in sql_queries}
        return Response(
            json.dumps(dict_queries, default=utils.json_int_dttm_ser),
            status=200,
            mimetype="application/json")

    @catch_exception
    @expose("/search_queries/")
    def search_queries(self):
        """Search for queries."""
        query = db.session.query(models.Query)
        search_user_id = request.args.get('user_id')
        database_id = request.args.get('database_id')
        search_text = request.args.get('search_text')
        status = request.args.get('status')
        # From and To time stamp should be Epoch timestamp in seconds
        from_time = request.args.get('from')
        to_time = request.args.get('to')

        if search_user_id:
            # Filter on db Id
            query = query.filter(models.Query.user_id == search_user_id)

        if database_id:
            # Filter on db Id
            query = query.filter(models.Query.database_id == database_id)

        if status:
            # Filter on status
            query = query.filter(models.Query.status == status)

        if search_text:
            # Filter on search text
            query = query \
                .filter(models.Query.sql.like('%{}%'.format(search_text)))

        if from_time:
            query = query.filter(models.Query.start_time > int(from_time))

        if to_time:
            query = query.filter(models.Query.start_time < int(to_time))

        query_limit = config.get('QUERY_SEARCH_LIMIT', 1000)
        sql_queries = (
            query.order_by(models.Query.start_time.asc())
            .limit(query_limit)
            .all()
        )

        dict_queries = [q.to_dict() for q in sql_queries]

        return Response(
            json.dumps(dict_queries, default=utils.json_int_dttm_ser),
            status=200,
            mimetype="application/json")

    @app.errorhandler(500)
    def show_traceback(self):
        return render_template(
            'superset/traceback.html',
            error_msg=get_error_msg(),
        ), 500

    @catch_exception
    @expose("/welcome/")
    def welcome(self):
        """Personalized welcome page"""
        if not g.user or not g.user.get_id():
            return redirect(appbuilder.get_url_for_login)
        return self.render_template('superset/welcome.html', utils=utils)

    @catch_exception
    @has_access
    @expose("/profile/<username>/")
    def profile(self, username):
        """User profile page"""
        if not username and g.user:
            username = g.user.username
        user = (
            db.session.query(ab_models.User)
            .filter_by(username=username)
            .one()
        )
        roles = {}
        from collections import defaultdict
        permissions = defaultdict(set)
        for role in user.roles:
            perms = set()
            for perm in role.permissions:
                perms.add(
                    (perm.permission.name, perm.view_menu.name)
                )
                if perm.permission.name in ('datasource_access', 'database_access'):
                    permissions[perm.permission.name].add(perm.view_menu.name)
            roles[role.name] = [
                [perm.permission.name, perm.view_menu.name]
                for perm in role.permissions
            ]
        payload = {
            'user': {
                'username': user.username,
                'firstName': user.first_name,
                'lastName': user.last_name,
                'userId': user.id,
                'isActive': user.is_active(),
                'createdOn': user.created_on.isoformat(),
                'email': user.email,
                'roles': roles,
                'permissions': permissions,
            }
        }
        return self.render_template(
            'superset/profile.html',
            title=user.username + "'s profile",
            navbar_container=True,
            bootstrap_data=json.dumps(payload, default=utils.json_iso_dttm_ser)
        )

    @catch_exception
    @expose("/sqllab/")
    def sqllab(self):
        """SQL Editor"""
        d = {
            'defaultDbId': config.get('SQLLAB_DEFAULT_DBID'),
        }
        return self.render_template(
            'superset/sqllab.html',
            bootstrap_data=json.dumps(d, default=utils.json_iso_dttm_ser)
        )


class Home(BaseSupersetView):
    """The api for the home page

    limit = 0: means not limit
    default_types['actions'] could be: ['online', 'offline', 'add', 'edit', 'delete'...]
    """
    default_view = 'home'
    route_base = '/pilot/home'

    page = 0
    page_size = 10
    order_column = 'time'
    order_direction = 'desc'
    default_types = {
        'counts': ['dashboard', 'slice', 'table', 'database'],
        'trends': ['dashboard', 'slice', 'table', 'database'],
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
            self.message.append('{}: {}'.format(ERROR_CLASS_TYPE, type_))
            return False, None
        else:
            return True, model

    def get_object_count(self, user_id, type_):
        success, model = self.get_obj_class(type_)
        if not success:
            return 0
        count = 0
        if user_id == 0:
            count = db.session.query(model).count()
        else:
            if hasattr(model, 'online'):
                count = (
                    db.session.query(model)
                    .filter(
                        sqla.or_(
                            model.created_by_fk == user_id,
                            model.online == 1
                        )
                    )
                    .count())
            else:
                count = db.session.query(model)\
                    .filter(model.created_by_fk == user_id)\
                    .count()
        return count

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
        query = db.session.query(func.count(FavStar.obj_id), Dashboard.dashboard_title)\
            .filter(
                and_(FavStar.class_name.ilike('dashboard'),
                    FavStar.obj_id == Dashboard.id)
            )
        if user_id > 0:
            query = query.filter(
                or_(Dashboard.created_by_fk == user_id,
                    Dashboard.online == 1)
            )
        query = query.group_by(FavStar.obj_id)\
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
                slices.online = True)
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
                Dashboard.online == 1
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
            self.message.append('{}: {},{} are passed to {}'
                                .format(ERROR_REQUEST_PARAM, types, page_size, 'get_user_actions()'))
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

        if order_column:
            column = self.str_to_column_in_actions.get(order_column)
            if order_direction == 'desc':
                query = query.order_by(column.desc())
            else:
                query = query.order_by(column)
        else:
            query = query.order_by(Log.dttm.desc())

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
            message_ = '{}: {} '.format(ERROR_REQUEST_PARAM, request.args)
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

    @expose('/')
    def home(self):
        """default page"""
        if not g.user or not g.user.get_id():
            return redirect(appbuilder.get_url_for_login)
        return self.render_template('superset/home.html')

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


class HDFSBrowser(BaseSupersetView):
    route_base = '/hdfs'

    @expose('/list')
    def list(self):
        return self.render_template('superset/hdfsList.html')


appbuilder.add_view_no_menu(DatabaseAsync)
appbuilder.add_view_no_menu(DatabaseTablesAsync)
appbuilder.add_view_no_menu(TableColumnInlineView)
appbuilder.add_view_no_menu(SqlMetricInlineView)
appbuilder.add_view_no_menu(SliceAsync)
appbuilder.add_view_no_menu(SliceAddView)
appbuilder.add_view_no_menu(DashboardModelViewAsync)
appbuilder.add_view_no_menu(R)
appbuilder.add_view_no_menu(Superset)
appbuilder.add_view_no_menu(HDFSBrowser)

appbuilder.add_view(
    Home,
    "Home",
    label='home',
    category='',
    category_label='',
    icon="fa-list-ol")

appbuilder.add_view(
    DashboardModelView,
    "Dashboards",
    label=__("Dashboards"),
    icon="fa-dashboard",
    category='',
    category_icon='',)

appbuilder.add_view(
    SliceModelView,
    "Slices",
    label=__("Slices"),
    icon="fa-bar-chart",
    category="",
    category_icon='',)

appbuilder.add_view(
    DatabaseView,
    "Databases",
    label=__("Databases"),
    icon="fa-database",
    category="Sources",
    category_label=__("Sources"),
    category_icon='fa-database',)

appbuilder.add_view(
    TableModelView,
    "Tables",
    label=__("Tables"),
    category="Sources",
    category_label=__("Sources"),
    icon='fa-table',)

appbuilder.add_link(
    'SQL Editor',
    href='/pilot/sqllab',
    category_icon="fa-flask",
    icon="fa-flask",
    category='SQL Lab')
appbuilder.add_link(
    'Query Search',
    href='/pilot/sqllab#search',
    icon="fa-search",
    category_icon="fa-flask",
    category='SQL Lab')
appbuilder.add_link(
    'HDFS Browser',
    href='/hdfs/list',
    label="HDFS Browser",
    icon="fa-flask",
    category='',
    category_icon='')


@app.after_request
def apply_caching(response):
    """Applies the configuration's http headers to all responses"""
    for k, v in config.get('HTTP_HEADERS').items():
        response.headers[k] = v
    return response
