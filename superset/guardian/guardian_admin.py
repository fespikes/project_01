#!/usr/bin/env python
# -*- coding:utf-8 -*-
# Author: jiajie.zhang@transwarp.io

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

from jpype import *
from .guardian_base import GuardianBase, catch_guardian_exception


class GuardianAdmin(GuardianBase):

    def __init__(self):
        super(GuardianAdmin, self).__init__()
        admin_factory = JClass('io.transwarp.guardian.client.GuardianAdminFactory')
        self.client = admin_factory.getInstance()
        self.component = self.client.getComponent()

    @catch_guardian_exception
    def add_permission(self, finite_obj, action):
        """
        :param finite_obj: a list of object's finite_obj structure:
                           [object_type, object_id], such as ['database', 1]
        :param action:
        :return:
        """
        if isinstance(action, list):
            for a in action:
                new_perm = self._permission(finite_obj, a)
                self.client.addPermission(new_perm)
        else:
            new_perm = self._permission(finite_obj, action)
            self.client.addPermission(new_perm)

    @catch_guardian_exception
    def del_permission(self, finite_obj, action):
        if isinstance(action, list):
            for a in action:
                perm = self._permission(finite_obj, a)
                self.client.delPermission(perm)
        else:
            perm = self._permission(finite_obj, action)
            self.client.delPermission(perm)

    @catch_guardian_exception
    def del_perm_obj(self, finite_obj):
        perm_obj = self._perm_obj(finite_obj)
        self.client.delPermObj(perm_obj)

    @catch_guardian_exception
    def grant(self, name, finite_obj, action, principal_type='USER'):
        if isinstance(action, list):
            for a in action:
                entity_perm = \
                    self._entity_permission(name, principal_type, finite_obj, a)
                self.client.grant(entity_perm)
        else:
            entity_perm = \
                self._entity_permission(name, principal_type, finite_obj, action)
            self.client.grant(entity_perm)

    @catch_guardian_exception
    def revoke(self, name, finite_obj, action, principal_type='USER'):
        if isinstance(action, list):
            for a in action:
                entity_perm = \
                    self._entity_permission(name, principal_type, finite_obj, a)
                self.client.revoke(entity_perm)
        else:
            entity_perm = \
                self._entity_permission(name, principal_type, finite_obj, action)
            self.client.revoke(entity_perm)


guardian_admin = GuardianAdmin()
