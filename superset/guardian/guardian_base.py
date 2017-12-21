#!/usr/bin/env python
# -*- coding:utf-8 -*-
# Author: jiajie.zhang@transwarp.io

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import os
import functools
import logging
from jpype import *
from superset.exception import GuardianException, SupersetException


def catch_guardian_exception(f):
    """
    A decorator to label an endpoint as an API. Catches uncaught exceptions and
    return the response in the JSON format
    """
    def wraps(self, *args, **kwargs):
        try:
            return f(self, *args, **kwargs)
        except JavaException as e:
            raise GuardianException(str(e))
        except Exception as e:
            raise SupersetException(str(e))
    return functools.update_wrapper(wraps, f)


class GuardianBase(object):
    GUARDIAN_JAR_PATH = '/usr/local/lib/'
    GUARDIAN_JAR = '/usr/local/lib/guardian-client-2.0-transwarp-5.2.0-SNAPSHOT.jar'
    GUARDIAN_SITE_PATH = '/etc/pilot/conf/'
    GUARDIAN_SERVICE_TYPE = 'PILOT'

    def __init__(self):
        self.start_jvm()
        self.client = None
        self.component = None
        self.models = JPackage('io.transwarp.guardian.common.model')
        self.PermissionVo = self.models.PermissionVo
        self.EntityPermissionVo = self.models.EntityPermissionVo
        self.PrincipalType = self.models.PrincipalType
        self.UserVo = self.models.UserVo

    def start_jvm(self):
        if not isJVMStarted():
            if not os.path.exists(self.GUARDIAN_JAR):
                logging.error('Guardian client jar [{}] is not existed.'
                              .format(self.GUARDIAN_JAR))
                raise IOError
            startJVM(getDefaultJVMPath(), '-ea',
                     '-Djava.class.path={}:{}'.format(self.GUARDIAN_JAR,
                                                      self.GUARDIAN_SITE_PATH))
            attachThreadToJVM()

    def shutdomn_jvm(self):
        shutdownJVM()

    @catch_guardian_exception
    def login(self, username=None, password=None):
        if not username and not password:
            self.client.login()
        else:
            self.client.login(username, password)

    def _datasource(self, finite_obj):
        alist = java.util.ArrayList()
        for s in finite_obj:
            alist.add(str(s))
        return alist

    def _permission(self, finite_obj, action):
        datasource = self._datasource(finite_obj)
        if isinstance(action, list):
            action = action[0]
        return self.PermissionVo(self.component, datasource, action)

    def _permissions(self, finite_obj, actions):
        datasource = self._datasource(finite_obj)
        perms = java.util.ArrayList()
        if not isinstance(actions, list):
            perm = self.PermissionVo(self.component, datasource, actions)
            perms.add(perm)
        else:
            for action in actions:
                perm = self.PermissionVo(self.component, datasource, action)
                perms.add(perm)
        return perms

    def _entity_permission(self, name, principal_type, finite_obj, action):
        if principal_type.upper() == 'GROUP':
            principal_type = self.PrincipalType.GROUP
        elif principal_type.upper() == 'ROLE':
            principal_type = self.PrincipalType.ROLE
        else:
            principal_type = self.PrincipalType.USER
        permission = self._permission(finite_obj, action)
        return self.EntityPermissionVo(name, principal_type, permission)
