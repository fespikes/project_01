from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import json
from flask import g, request, Response
from flask_appbuilder import BaseView, expose
from superset import sm, appbuilder
from superset.utils import SupersetException
from superset.message import *
from .base import catch_exception


class UserView(BaseView):
    route_base = '/user'
    default_role = 'Admin'
    list_columns = ['id', 'username', 'email', 'last_login']
    show_columns = ['username', 'email', 'last_login', 'login_count', 'created_on']
    str_columns = ['last_login', 'created_on', 'changed_on']

    @catch_exception
    @expose('/list/', methods=['GET'])
    def list(self):
        users = sm.get_all_users()
        data = []
        for user in users:
            line = {}
            for col in self.list_columns:
                line[col] = str(getattr(user, col))
            line['created_by'] = user.created_by.username \
                if user.created_by else None
            data.append(line)
        return Response(
            json.dumps({'count': len(users), 'data': data})
        )

    @catch_exception
    @expose('/add/', methods=['POST'])
    def add(self):
        data = self.get_request_data()
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        user = self.appbuilder.sm.add_user(
            username, username, username, email,
            self.appbuilder.sm.find_role(self.default_role),
            password=password)
        if not user:
            raise SupersetException(ADD_FAILED)
        return Response(ADD_SUCCESS)

    @catch_exception
    @expose('/show/<pk>/', methods=['GET'])
    def show(self, pk):
        user = sm.get_user_by_id(pk)
        data = {}
        for col in self.show_columns:
            data[col] = str(getattr(user, col))
        data['created_by'] = user.created_by.username if user.created_by else None
        return Response(json.dumps({'data': data}))

    @catch_exception
    @expose('/edit/<pk>/', methods=['POST'])
    def edit(self, pk):
        data = self.get_request_data()
        username = data.get('username')
        user = sm.get_user_by_id(pk)
        self.check_permission(user, 'edit')
        user.first_name = username
        user.last_name = username
        user.username = username
        user.email = data.get('email')
        rs = sm.update_user(user)
        if rs is False:
            raise SupersetException(UPDATE_FAILED)
        rs = sm.reset_password(pk, data.get('password'))
        if rs is False:
            raise SupersetException('Update password failed')
        return Response(UPDATE_SUCCESS)

    @catch_exception
    @expose('/delete/<pk>/', methods=['GET'])
    def delete(self, pk):
        user = sm.get_user_by_id(pk)
        self.check_permission(user, 'delete')
        rs = sm.del_register_user(user)
        if not rs:
            raise SupersetException(DELETE_FAILED)
        return Response(DELETE_SUCCESS)

    @classmethod
    def get_request_data(cls):
        return json.loads(str(request.data, encoding='utf-8'))

    @classmethod
    def check_permission(cls, user, action):
        present_id = g.user.get_user_id()
        if action == 'edit':
            if user.id == present_id and user.created_by_fk == present_id:
                return True
            else:
                raise SupersetException('No permission to edit this user.')
        elif action == 'delete':
            if user.created_by_fk == present_id:
                return True
            else:
                raise SupersetException('No permission to delete this user.')
        else:
            raise SupersetException('Error action [{}]'.format(action))


appbuilder.add_view_no_menu(UserView)
