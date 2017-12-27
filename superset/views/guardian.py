from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

from flask import request
from flask_babel import lazy_gettext as _
from flask_appbuilder import expose
from superset import db
from superset.models import Database, str_to_model
from superset.guardian import guardian_client, guardian_admin
from superset.exception import ParameterException
from .base import BaseSupersetView, PermissionManagement, catch_exception, json_response


class GuardianView(BaseSupersetView, PermissionManagement):
    route_base = '/guardian'

    @catch_exception
    @expose('/users/', methods=['GET'])
    def get_users(self):
        prefix = request.args.get('prefix')
        users = guardian_client.get_users(prefix)
        return json_response(data={'usernames': users})

    @catch_exception
    @expose('/permisson/types/', methods=['GET'])
    def permission_types(self):
        return json_response(data={'permissions': self.ALL_PERMS})

    @catch_exception
    @expose('/permisson/search/', methods=['POST'])
    def search_permissions(self):
        """
        Search user's permission on specific object. Format of request.data is as bellow:
        {
            "object_type": "database",
            "object_id": 1
        }
        """
        args = self.get_request_data()
        object_type = args.get('object_type')
        object_id = args.get('object_id')
        data = guardian_client.search_object_permissions([object_type, object_id])
        return json_response(data=data)

    @catch_exception
    @expose('/permisson/grant/', methods=['POST'])
    def grant_permissions(self):
        """
        Grant a user actions on a object. Format of request.data is as bellow:
        {
            "username": "a",
            "object_type": "database",
            "object_id": 1,
            "actions": ["READ", "EDIT", "ADMIN"]
        }
        """
        args = self.get_request_data()
        username = args.get('username')
        object_type = args.get('object_type')
        object_id = args.get('object_id')
        actions = args.get('actions')
        obj = self.get_object(object_type, object_id)
        self.grant_relations(username, obj, object_type, actions)
        msg = _("Grant [{}] actions {} on object {} and dependencies success.") \
            .format(username, actions, [object_type, object_id])
        return json_response(message=msg)

    def grant_relations(self, username, obj, object_type, actions):
        if not self.check_grant_perm([object_type, obj.id], raise_if_false=False):
            return
        guardian_admin.grant(username, [object_type, obj.id], actions)

        if object_type == 'dashboard':
            for slice in obj.slices:
                self.grant_relations(username, slice, 'slice', actions)
        elif object_type == 'slice':
            if obj.datasource_id and obj.datasource:
                self.grant_relations(username, obj.datasource, 'dataset', actions)
            elif obj.database_id:
                database = db.session.query(Database).filter_by(id=obj.database_id).first()
                self.grant_relations(username, database, 'database', actions)
        elif object_type == 'dataset':
            if obj.database:
                self.grant_relations(username, obj.database, 'database', actions)
            if obj.hdfs_table and obj.hdfs_table.hdfs_connection:
                self.grant_relations(username, obj.hdfs_table.hdfs_connection,
                                     'hdfsconnection', actions)

    @catch_exception
    @expose('/permisson/revoke/', methods=['POST'])
    def revoke_permissions(self):
        """"
        Revoke a user's actions from a object. Format of request.data is as bellow:
        {
            "username": "a",
            "object_type": "database",
            "object_id": 1,
            "actions": ["READ", "EDIT", "ADMIN"]
        }
        """
        args = self.get_request_data()
        username = args.get('username')
        object_type = args.get('object_type')
        object_id = args.get('object_id')
        actions = args.get('actions')
        self.check_grant_perm([object_type, object_id])
        guardian_admin.revoke(username, [object_type, object_id], actions)
        return json_response(message="Revoke [{}] actions {} from object {} success."
                             .format(username, actions, [object_type, object_id]))

    def get_object(self, obj_type, obj_id):
        model = str_to_model.get(obj_type)
        obj = db.session.query(model).filter_by(id=obj_id).first()
        if not obj:
            raise ParameterException(_("Not found the object: model={model}, id={id}")
                                     .format(model=obj_type, id=obj_id))
        return obj
