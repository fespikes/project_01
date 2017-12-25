from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import json
from flask import g, request
from flask_appbuilder import expose
from .base import BaseSupersetView, PermissionManagement, catch_exception, json_response
from superset.guardian import guardian_client, guardian_admin


def get_request_data():
    return json.loads(str(request.data, encoding='utf-8'))


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
        args = get_request_data()
        object_type = args.get('object_type')
        object_id = args.get('object_id')
        data = guardian_client.search_permissions([object_type, object_id])
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
        args = get_request_data()
        username = args.get('username')
        object_type = args.get('object_type')
        object_id = args.get('object_id')
        actions = args.get('actions')
        guardian_admin.grant(username, [object_type, object_id], actions)
        return json_response(message="Grant [{}] actions {} on object {} success."
                             .format(username, actions, [object_type, object_id]))

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
        args = get_request_data()
        username = args.get('username')
        object_type = args.get('object_type')
        object_id = args.get('object_id')
        actions = args.get('actions')
        guardian_admin.revoke(username, [object_type, object_id], actions)
        return json_response(message="Revoke [{}] actions {} from object {} success."
                             .format(username, actions, [object_type, object_id]))
