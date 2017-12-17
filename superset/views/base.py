from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

from datetime import datetime
import json
import logging
import traceback
from distutils.util import strtobool
import functools

from flask import g, request, Response
from flask_babel import lazy_gettext as _
from flask_babel.speaklater import LazyString
from flask_appbuilder import ModelView, BaseView, expose
from flask_appbuilder.security.sqla.models import User
import sqlalchemy as sqla
from sqlalchemy import and_, or_
from wtforms.validators import ValidationError

from superset import app, appbuilder, db, models, sm, utils
from superset.source_registry import SourceRegistry
from superset.models import Dataset, Database, Dashboard, Slice, FavStar, Log
from superset.message import *
from superset.exception import (
    SupersetException, LoginException, PermissionException, ParameterException,
    DatabaseException
)


config = app.config
QueryStatus = utils.QueryStatus


def get_error_msg():
    if config.get("SHOW_STACKTRACE"):
        error_msg = traceback.format_exc()
    else:
        error_msg = "FATAL ERROR \n"
        error_msg += (
            "Stacktrace is hidden. Change the SHOW_STACKTRACE "
            "configuration setting to enable it")
    return error_msg


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

    security_exception = PermissionException(
        _("You don't have the rights to update [{obj}]").format(obj=obj))

    if g.user.is_anonymous():
        if raise_if_false:
            raise security_exception
        return False

    session = db.create_scoped_session()
    orig_obj = session.query(obj.__class__).filter_by(id=obj.id).first()

    if (hasattr(orig_obj, 'created_by') and
            orig_obj.created_by and
                orig_obj.created_by.username == g.user.username):
        return True
    if hasattr(orig_obj, 'owners'):
        owner_names = (user.username for user in orig_obj.owners)
        if (g.user and
                hasattr(g.user, 'username') and
                    g.user.username in owner_names):
            return True
    if raise_if_false:
        raise security_exception
    else:
        return False


def get_user_id():
    id = g.user.get_id()
    if id:
        return int(id)
    else:
        raise LoginException(1, NO_USER)


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


def validate_json(form, field):  # noqa
    try:
        json.loads(field.data)
    except Exception as e:
        logging.exception(e)
        raise ParameterException("json isn't valid")


def generate_download_headers(extension):
    filename = datetime.now().strftime("%Y%m%d_%H%M%S")
    content_disp = "attachment; filename={}.{}".format(filename, extension)
    headers = {
        "Content-Disposition": content_disp,
    }
    return headers


class BaseSupersetView(BaseView):
    pass
    # def can_access(self, permission_name, view_name):
    #     return utils.can_access(appbuilder.sm, permission_name, view_name)
    #
    # def all_datasource_access(self):
    #     return self.can_access(
    #         "all_datasource_access", "all_datasource_access")
    #
    # def database_access(self, database):
    #     return (
    #         self.can_access("all_database_access", "all_database_access") or
    #         self.can_access("database_access", database.perm)
    #     )
    #
    # def schema_access(self, datasource):
    #     return (
    #         self.database_access(datasource.database) or
    #         self.all_datasource_access() or
    #         self.can_access("schema_access", datasource.schema_perm)
    #     )
    #
    # def datasource_access(self, datasource):
    #     return (
    #         self.schema_access(datasource) or
    #         self.can_access("datasource_access", datasource.perm)
    #     )
    #
    # def datasource_access_by_name(
    #         self, database, datasource_name, schema=None):
    #     if (self.database_access(database) or
    #             self.all_datasource_access()):
    #         return True
    #
    #     schema_perm = utils.get_schema_perm(database, schema)
    #     if schema and utils.can_access(sm, 'schema_access', schema_perm):
    #         return True
    #
    #     datasources = SourceRegistry.query_datasources_by_name(
    #         db.session, database, datasource_name, schema=schema)
    #     for datasource in datasources:
    #         if self.can_access("datasource_access", datasource.perm):
    #             return True
    #     return False


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
        kwargs['user_id'] = get_user_id()
        kwargs['order_column'] = args.get('order_column', self.order_column)
        kwargs['order_direction'] = args.get('order_direction', self.order_direction)
        kwargs['page'] = int(args.get('page', self.page))
        kwargs['page_size'] = int(args.get('page_size', self.page_size))
        kwargs['filter'] = args.get('filter', self.filter)
        fav = args.get('only_favorite')
        kwargs['only_favorite'] = strtobool(fav) if fav else self.only_favorite
        return kwargs


class SupersetModelView(ModelView, PageMixin):
    model = models.Model
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
        user_id = get_user_id()
        json_data = self.get_request_data()
        obj = self.populate_object(None, user_id, json_data)
        self._add(obj)
        data = {'object_id': obj.id}
        return json_response(message=ADD_SUCCESS, data=data)

    def _add(self, obj):
        self.pre_add(obj)
        if not self.datamodel.add(obj):
            raise DatabaseException(ADD_FAILED)
        self.post_add(obj)

    @catch_exception
    @expose('/show/<pk>/', methods=['GET'])
    def show(self, pk):
        obj = self.get_object(pk)
        user_id = get_user_id()
        attributes = self.get_show_attributes(obj, user_id=user_id)
        return json_response(data=attributes)

    @catch_exception
    @expose('/edit/<pk>/', methods=['POST'])
    def edit(self, pk):
        user_id = get_user_id()
        json_data = self.get_request_data()
        obj = self.populate_object(pk, user_id, json_data)
        self._edit(obj)
        return json_response(message=UPDATE_SUCCESS)

    def _edit(self, obj):
        self.pre_update(obj)
        if not self.datamodel.edit(obj):
            raise DatabaseException(UPDATE_FAILED)
        self.post_update(obj)

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
            check_ownership(obj)
            self.datamodel.delete(obj)
            Log.log_delete(obj, self.model.__name__.lower(), get_user_id())
        return json_response(message=DELETE_SUCCESS)

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
            if isinstance(value, str):
                setattr(obj, key, value.strip())
            else:
                setattr(obj, key, value)
        return obj

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

    def query_own_or_online(self, class_name, user_id, only_favorite):
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

        query = query.filter(
            or_(self.model.created_by_fk == user_id,
                self.model.online == 1)
        )

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

    def get_request_data(self):
        data = request.data
        data = str(data, encoding='utf-8')
        return json.loads(data)

    def get_object(self, obj_id):
        obj_id = int(obj_id)
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


@app.route('/health/')
def health():
    return "OK"


@app.after_request
def apply_caching(response):
    """Applies the configuration's http headers to all responses"""
    for k, v in config.get('HTTP_HEADERS').items():
        response.headers[k] = v
    return response