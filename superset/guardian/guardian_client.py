#!/usr/bin/env python
# -*- coding:utf-8 -*-
# Author: jiajie.zhang@transwarp.io

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

from jpype import *
from superset.exception import GuardianException
from .guardian_base import GuardianBase, catch_guardian_exception


class GuardianClient(GuardianBase):

    def __init__(self):
        super(GuardianClient, self).__init__()
        client_factory = JClass('io.transwarp.guardian.client.GuardianClientFactory')
        self.client = client_factory.getInstance()
        self.component = self.client.getComponent()

    @catch_guardian_exception
    def register(self):
        service_type = self.service_type
        component = self.component
        description = "Service {}".format(self.component)
        config = JObject({}, JClass('java.util.Map'))
        self.client.register(service_type, component, description, config)

    @catch_guardian_exception
    def authenticate(self, username, password):
        self.client.authenticate(username, password)

    @catch_guardian_exception
    def get_user(self, username):
        user = self.client.getUser(username)
        username = user.getUserName()
        print(username)

    @catch_guardian_exception
    def get_users(self, prefix=None):
        if not prefix:
            users = self.client.getUsers()
        else:
            users = self.client.getUsers(prefix)
        return sorted([user.getUserName() for user in users])

    @catch_guardian_exception
    def check_access(self, username, finite_obj, action):
        """
        :param username:
        :param finite_obj: a list of object's finite_obj structure:
                           [object_type, object_id], such as ['database', 1]
        :param actions:
        :return:
        """
        if isinstance(action, list):
            perm = self._permissions(finite_obj, action)
        else:
            perm = self._permission(finite_obj, action)
        can = self.client.checkAccess(username, perm)
        can = True if can else False
        return can

    @catch_guardian_exception
    def check_any_access(self, username, finite_obj, actions):
        perms = self._permissions(finite_obj, actions)
        can = self.client.checkAnyAccess(username, perms)
        can = True if can else False
        return can

    @catch_guardian_exception
    def user_permissions(self, username, component=None, finite_obj=None):
        if not component:
            perms = self.client.userPermissions(username)
        elif not finite_obj:
            perms = self.client.userPermissions(username, component)
        else:
            datasource = self._datasource(finite_obj)
            perms = self.client.userPermissions(username, component, datasource)
        for perm in perms:
            print('{} {} {}'.format(perm.getComponent(), perm.getDataSource(),
                                    perm.getAction()))

    @catch_guardian_exception
    def list_permissions(self, component=None, finite_obj=None):
        component = component if component else self.component
        if not finite_obj:
            perms = self.client.listPermissions(component)
        else:
            datasource = self._datasource(finite_obj)
            perms = self.client.listPermissions(component, datasource)
        for perm in perms:
            print('{} {} {}'.format(perm.getComponent(), perm.getDataSource(),
                                    perm.getAction()))

    @catch_guardian_exception
    def search_object_permissions(self, finite_obj, component=None):
        """
        Search users' permission on a specific object
        :param finite_obj: [object_type, object_id], such as ['database', 1]
        :param component: default component in guardian-site.xml
        :return: {user1: [action1,], user2: [action2,action2], }
        """
        component = component if component else self.component
        datasource = self._datasource(finite_obj)
        entity_perms = self.client.searchPermissions(component, datasource)
        data = {}
        for entity_perm in entity_perms:
            ptype = entity_perm.getPrincipalType()
            if ptype and str(ptype).upper() == 'USER':
                name = entity_perm.getName()
                perm = entity_perm.getPermissionVo()
                if name in data.keys():
                    actions = data.get(name)
                    actions.append(perm.getAction())
                    data[name] = actions
                else:
                    data[name] = [perm.getAction(), ]
        return data

    @catch_guardian_exception
    def search_model_permissions(self, username, model, component=None):
        """
        Search user's permissions of all objects of one model
        :param username:
        :param model: such as 'database', 'dataset', 'slice', 'dashboard' ...
        :param component:
        :return: set of ids which has any permissions
        """
        component = component if component else self.component
        datasource = self._datasource([model, ])
        entity_perms = self.client.searchPermissions(
            username, self.PrincipalType.USER, component, datasource, True
        )
        names = set()
        for entity_perm in entity_perms:
            perm = entity_perm.getPermissionVo()
            datasource = perm.getDataSource()
            name = datasource.get(datasource.size() - 1)
            if name:
                # if id in data.keys():
                #     actions = data.get(id)
                #     actions.append(perm.getAction())
                #     data[id] = actions
                # else:
                #     data[id] = [perm.getAction(), ]
                names.add(name)
        return sorted(names)

    @catch_guardian_exception
    def get_keytab(self, username):
        return self.client.getKeytab(username)


guardian_client = GuardianClient()
