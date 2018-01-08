from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

from datetime import datetime
import json
import logging
import copy
from distutils.util import strtobool
import functools

from flask import g, request, Response
from flask_babel import lazy_gettext as _
from flask_babel.speaklater import LazyString
from flask_appbuilder import ModelView, BaseView, expose
from flask_appbuilder.security.sqla.models import User
import sqlalchemy as sqla
from sqlalchemy import and_, or_

from superset import app, db, models, utils, conf
from superset.models import Dataset, Database, Dashboard, Slice, FavStar, Log
from superset.message import *
from superset.exception import (
    SupersetException, LoginException, PermissionException, ParameterException,
    DatabaseException, PropertyException
)


config = app.config
QueryStatus = utils.QueryStatus


def catch_exception(f):
    """
    A decorator to label an endpoint as an API. Catches uncaught exceptions and
    return the response in the JSON format
    """
    def wraps(self, *args, **kwargs):
        try:
            return f(self, *args, **kwargs)
        except sqla.exc.IntegrityError as ie:
            logging.exception(ie)
            return json_response(status=500, message=str(ie), code=1)
        except SupersetException as e:
            logging.exception(e)
            return json_response(status=500, message=e.message, code=e.code)
        except Exception as e:
            logging.exception(e)
            return json_response(status=500, message=str(e), code=1)
    return functools.update_wrapper(wraps, f)


def json_response(message='', status=200, data='', code=0):
    if isinstance(message, LazyString):
        message = str(message)  # py3
    resp = {'status': status,
            'code': code,
            'message': message,
            'data': data}
    return Response(
        json.dumps(resp, default=utils.json_iso_dttm_ser),
        status=status,
        mimetype="application/json"
    )


class PermissionManagement(object):
    READ_PERM = 'READ'
    EDIT_PERM = 'EDIT'
    ADMIN_PERM = 'ADMIN'
    ALL_PERMS = [READ_PERM, EDIT_PERM, ADMIN_PERM]
    OWNER_PERMS = [READ_PERM, EDIT_PERM]
    READ_PERMS = ALL_PERMS
    EDIT_PERMS = [EDIT_PERM, ADMIN_PERM]
    ADMIN_PERMS = [ADMIN_PERM, ]
    DATASOURCE_TYPE = {'database': 'database',
                       'hdfsconnection': 'hdfsconnection',
                       'dataset': 'dataset',
                       'slice': 'slice',
                       'dashboard': 'dashboard'}

    def add_object_permissions(self, finite_obj):
        if conf.get("GUARDIAN_AUTH"):
            from superset.guardian import guardian_admin
            guardian_admin.add_permission(finite_obj, self.ALL_PERMS)

    def del_perm_obj(self, finite_obj):
        if conf.get("GUARDIAN_AUTH"):
            from superset.guardian import guardian_admin
            guardian_admin.del_perm_obj(finite_obj)

    def rename_perm_obj(self, model, old_name, new_name):
        if conf.get("GUARDIAN_AUTH"):
            from superset.guardian import guardian_admin
            if old_name == new_name:
                return
            guardian_admin.rename_perm_obj([model, old_name], [model, new_name])

    def grant_owner_permissions(self, finite_obj):
        if conf.get("GUARDIAN_AUTH"):
            from superset.guardian import guardian_admin
            guardian_admin.grant(g.user.username, finite_obj, self.OWNER_PERMS)

    def check_edit_perm(self, finite_obj, raise_if_false=True):
        can = self.do_check(g.user.username, finite_obj, self.EDIT_PERMS)
        if not can and raise_if_false:
            raise PermissionException(
                _('No privilege to edit {name}').format(name=finite_obj[-1]))
        else:
            return can

    def check_delete_perm(self, finite_obj, raise_if_false=True):
        can = self.do_check(g.user.username, finite_obj, self.EDIT_PERMS)
        if not can and raise_if_false:
            raise PermissionException(
                _('No privilege to delete {name}').format(name=finite_obj[-1]))
        else:
            return can

    def check_admin_perm(self, finite_obj, raise_if_false=True):
        can = self.do_check(g.user.username, finite_obj, self.ADMIN_PERMS)
        if not can and raise_if_false:
            raise PermissionException(
                _('No privilege ADMIN of {name}').format(name=finite_obj[-1]))
        else:
            return can

    def check_grant_perm(self, finite_obj, raise_if_false=True):
        can = self.do_check(g.user.username, finite_obj, self.ADMIN_PERMS)
        if not can and raise_if_false:
            raise PermissionException(
                _('No privilege to grant/revoke on {name}').format(name=finite_obj[-1]))
        else:
            return can

    def check_release_perm(self, finite_obj, raise_if_false=True):
        can = self.do_check(g.user.username, finite_obj, self.ADMIN_PERMS)
        if not can and raise_if_false:
            raise PermissionException(
                _('No privilege to release {name}').format(name=finite_obj[-1]))
        else:
            return can

    def do_check(self, username, finite_obj, actions):
        if conf.get("GUARDIAN_AUTH"):
            from superset.guardian import guardian_client
            return guardian_client.check_any_access(username, finite_obj, actions)
        else:
            return True


class BaseSupersetView(BaseView):

    def user_id(self):
        id = g.user.get_id()
        if id:
            return int(id)
        else:
            raise LoginException(1, NO_USER)

    def get_request_data(self):
        return json.loads(str(request.data, encoding='utf-8'))

    def generate_download_headers(self, extension):
        filename = datetime.now().strftime("%Y%m%d_%H%M%S")
        content_disp = "attachment; filename={}.{}".format(filename, extension)
        headers = {
            "Content-Disposition": content_disp,
        }
        return headers


class PageMixin(object):
    # used for querying
    page = 0
    page_size = 10
    order_column = 'changed_on'
    order_direction = 'desc'
    filter = None
    only_favorite = False        # all or favorite

    def get_list_args(self, args):
        kwargs = {}
        kwargs['user_id'] = g.user.id
        kwargs['order_column'] = args.get('order_column', self.order_column)
        kwargs['order_direction'] = args.get('order_direction', self.order_direction)
        kwargs['page'] = int(args.get('page', self.page))
        kwargs['page_size'] = int(args.get('page_size', self.page_size))
        kwargs['filter'] = args.get('filter', self.filter)
        fav = args.get('only_favorite')
        kwargs['only_favorite'] = strtobool(fav) if fav else self.only_favorite
        return kwargs


class SupersetModelView(BaseSupersetView, ModelView, PageMixin, PermissionManagement):
    model = models.Model
    model_type = 'model'
    # used for Data type conversion
    int_columns = []
    bool_columns = []
    str_columns = []

    def get_list_args(self, args):
        kwargs = super().get_list_args(args)
        kwargs['dataset_type'] = args.get('dataset_type')
        kwargs['dataset_id'] = int(args.get('dataset_id')) \
            if args.get('dataset_id') else None
        return kwargs

    @expose('/list/')
    def list(self):
        return self.render_template(self.list_template)

    @catch_exception
    @expose('/listdata/')
    def get_list_data(self):
        kwargs = self.get_list_args(request.args)
        list_data = self.get_object_list_data(**kwargs)
        return json_response(data=list_data)

    @catch_exception
    @expose('/addablechoices/', methods=['GET'])
    def addable_choices(self):
        data = self.get_addable_choices()
        return json_response(data={'data': data})

    @catch_exception
    @expose('/add/', methods=['GET', 'POST'])
    def add(self):
        json_data = self.get_request_data()
        _, obj = self.populate_object(None, g.user.id, json_data)
        self._add(obj)
        data = {'object_id': obj.id}
        return json_response(message=ADD_SUCCESS, data=data)

    def _add(self, obj):
        self.pre_add(obj)
        if not self.datamodel.add(obj):
            raise DatabaseException(ADD_FAILED)
        self.post_add(obj)

    def pre_add(self, conn):
        self.check_column_values(conn)

    def post_add(self, conn):
        Log.log_add(conn, self.model_type, g.user.id)
        self.add_object_permissions([self.model_type, conn.connection_name])
        self.grant_owner_permissions([self.model_type, conn.connection_name])

    @catch_exception
    @expose('/show/<pk>/', methods=['GET'])
    def show(self, pk):
        obj = self.get_object(pk)
        attributes = self.get_show_attributes(obj, user_id=g.user.id)
        return json_response(data=attributes)

    @catch_exception
    @expose('/edit/<pk>/', methods=['POST'])
    def edit(self, pk):
        json_data = self.get_request_data()
        old_obj, new_obj = self.populate_object(pk, g.user.id, json_data)
        self._edit(old_obj, new_obj)
        return json_response(message=UPDATE_SUCCESS)

    def _edit(self, old_obj, new_obj):
        self.pre_update(old_obj, new_obj)
        if not self.datamodel.edit(new_obj):
            raise DatabaseException(UPDATE_FAILED)
        self.post_update(old_obj, new_obj)

    def pre_update(self, old_obj, new_obj):
        self.check_edit_perm([self.model_type, old_obj.name])
        self.pre_add(new_obj)

    def post_update(self, old_obj, new_obj):
        Log.log_update(new_obj, self.model_type, g.user.id)
        self.rename_perm_obj(self.model_type, old_obj.name, new_obj.name)

    @catch_exception
    @expose('/delete/<pk>/')
    def delete(self, pk):
        obj = self.get_object(pk)
        self._delete(obj)
        return json_response(message=DELETE_SUCCESS)

    def _delete(self, obj):
        self.pre_delete(obj)
        if not self.datamodel.delete(obj):
            raise DatabaseException(DELETE_FAILED)
        self.post_delete(obj)

    def pre_delete(self, obj):
        self.check_delete_perm([self.model_type, obj.name])

    def post_delete(self, obj):
        Log.log_delete(obj, self.model_type, g.user.id)
        self.del_perm_obj([self.model_type, obj.name])

    @catch_exception
    @expose('/muldelete/', methods=['GET', 'POST'])
    def muldelete(self):
        json_data = self.get_request_data()
        ids = json_data.get('selectedRowKeys')
        objs = db.session.query(self.model).filter(self.model.id.in_(ids)).all()
        if len(ids) != len(objs):
            raise ParameterException(
                "Error parameter ids: {}, get {} object(s) in database"
                .format(ids, len(objs))
            )
        for obj in objs:
            self._delete(obj)
        return json_response(message=DELETE_SUCCESS)

    def get_addable_choices(self):
        data = {}
        # data['readme'] = self.get_column_readme()
        return data

    def get_object_list_data(self, **kwargs):
        pass

    def populate_object(self, obj_id, user_id, data):
        old_obj = None
        if obj_id:
            new_obj = self.get_object(obj_id)
            old_obj = copy.deepcopy(new_obj)
            attributes = self.get_edit_attributes(data, user_id)
        else:
            new_obj = self.model()
            attributes = self.get_add_attributes(data, user_id)
        for key, value in attributes.items():
            if isinstance(value, str):
                setattr(new_obj, key, value.strip())
            else:
                setattr(new_obj, key, value)
        return old_obj, new_obj

    def get_show_attributes(self, obj, user_id=None):
        attributes = {}
        for col in self.show_columns:
            if not hasattr(obj, col) and not hasattr(obj, '"{}"'.format(col)):
                msg = _("Class [{cls}] does not have the attribute [{attribute}]") \
                    .format(cls=obj.__class__.__name__, attribute=col)
                self.handle_exception(500, KeyError, msg)
            if col in self.str_columns:
                attributes[col] = str(getattr(obj, col, None))
            else:
                attributes[col] = getattr(obj, col, None)

        # attributes['readme'] = self.get_column_readme()
        attributes['created_by_user'] = obj.created_by.username \
            if obj.created_by else None
        attributes['changed_by_user'] = obj.changed_by.username \
            if obj.changed_by else None
        return attributes

    def get_column_readme(self):
        readme = {}
        if hasattr(self, 'readme_columns'):
            for col in self.readme_columns:
                readme[col] = self.description_columns.get(col)
        return readme

    def get_add_attributes(self, data, user_id):
        attributes = {}
        for col in self.add_columns:
            if col not in data:
                msg = _("The needed attribute [{attribute}] is not in attributes [{attributes}]") \
                    .format(attribute=col, attributes=','.join(data.keys()))
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
                msg = _("The needed attribute [{attribute}] is not in attributes [{attributes}]") \
                    .format(attribute=col, attributes=','.join(data.keys()))
                self.handle_exception(404, KeyError, msg)
            value = data.get(col)
            if col in self.bool_columns and not isinstance(value, bool):
                attributes[col] = strtobool(value)
            elif col in self.int_columns:
                attributes[col] = int(value)
            else:
                attributes[col] = value
        return attributes

    def query_with_favorite(self, class_name, **kwargs):
        """
        A query api suitable for dashboard and slice
        :param class_name: 'dashboard' or 'slice'
        :param kwargs:
        :return:
        """
        user_id = kwargs.get('user_id')
        order_column = kwargs.get('order_column')
        order_direction = kwargs.get('order_direction')
        filter = kwargs.get('filter')
        only_favorite = kwargs.get('only_favorite')

        query = (
            db.session.query(self.model, User.username, FavStar.obj_id)
                .outerjoin(User, self.model.created_by_fk == User.id)
        )
        if only_favorite:
            query = query.join(
                FavStar,
                and_(
                    self.model.id == FavStar.obj_id,
                    FavStar.class_name.ilike(class_name),
                    FavStar.user_id == user_id)
            )
        else:
            query = query.outerjoin(
                FavStar,
                and_(
                    self.model.id == FavStar.obj_id,
                    FavStar.class_name.ilike(class_name),
                    FavStar.user_id == user_id)
            )

        if filter:
            filter_str = '%{}%'.format(filter.lower())
            if class_name.lower() == 'dashbaord':
                query = query.filter(
                    or_(Dashboard.dashboard_title.ilike(filter_str),
                        User.username.ilike(filter_str))
                )
            elif class_name.lower() == 'slice':
                query = query.filter(
                    or_(Slice.slice_name.ilike(filter_str),
                        User.username.ilike(filter_str))
                )

        if order_column:
            try:
                column = self.str_to_column.get(order_column)
            except KeyError:
                msg = _('Error order column name: [{name}]').format(name=order_column)
                raise ParameterException(msg)
            else:
                if order_direction == 'desc':
                    query = query.order_by(column.desc())
                else:
                    query = query.order_by(column)
        return query

    @staticmethod
    def get_available_datasets(user_id):
        datasets = (
            db.session.query(Dataset)
            .filter(
                or_(Dataset.created_by_fk == user_id,
                    Dataset.online == 1)
            )
            .order_by(Dataset.changed_on.desc())
            .all()
        )
        return datasets

    def get_available_connections(self, user_id):
        return self.get_available_databases(user_id)

    @staticmethod
    def get_available_databases(user_id):
        """TODO just return connection_type=='inceptor'"""
        dbs = (
            db.session.query(Database)
            .filter(Database.database_name != config.get('METADATA_CONN_NAME'),
                    or_(Database.created_by_fk == user_id,
                        Database.online == 1)
            )
            .order_by(Database.database_name)
            .all()
        )
        dbs_list = [{'id': d.id, 'database_name': d.database_name}
                    for d in dbs]
        return dbs_list

    @staticmethod
    def get_available_dashboards(user_id):
        dashs = (
            db.session.query(Dashboard)
            .filter(
                or_(Dashboard.created_by_fk == user_id,
                    Dashboard.online == 1)
            )
            .order_by(Dashboard.changed_on.desc())
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

    @staticmethod
    def get_available_slices(user_id):
        slices = (
            db.session.query(Slice)
            .filter(
                or_(Slice.created_by_fk == user_id,
                    Slice.online == 1)
            )
            .order_by(Slice.changed_on.desc())
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

    def get_object(self, obj_id):
        try:
            obj_id = int(obj_id)
        except Exception as e:
            raise PropertyException("[{}] is not a valid id, may this {} is not existed"
                                    .format(obj_id, self.model.__name__))
        try:
            obj = db.session.query(self.model).filter_by(id=obj_id).one()
        except sqla.orm.exc.NoResultFound:
            msg = _("Not found the object: model={model}, id={id}")\
                .format(model=self.model.__name__, id=obj_id)
            self.handle_exception(500, sqla.orm.exc.NoResultFound, msg)
        else:
            return obj

    def handle_exception(self, status, exception, msg):
        self.status = status
        logging.error(msg)
        raise exception(msg)

    def check_online(self, obj, raise_if_false=True):
        online = getattr(obj, 'online', False)
        if online and raise_if_false:
            raise PermissionException(_('Can not edit a online object'))
        else:
            return online


@app.route('/health/')
def health():
    return "OK"


@app.after_request
def apply_caching(response):
    """Applies the configuration's http headers to all responses"""
    for k, v in config.get('HTTP_HEADERS').items():
        response.headers[k] = v
    return response
