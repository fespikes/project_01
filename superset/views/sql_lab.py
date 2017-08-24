from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals


from flask_babel import gettext as __
from flask_appbuilder.models.sqla.interface import SQLAInterface
from superset import appbuilder, models
from .base import SupersetModelView


class QueryView(SupersetModelView):
    route_base = '/queryview'
    datamodel = SQLAInterface(models.Query)
    list_columns = ['user', 'database', 'status', 'start_time', 'end_time']


appbuilder.add_view_no_menu(QueryView)
appbuilder.add_link(
    'SQL Editor',
    href='/p/sqllab',
    category_icon="fa-flask",
    icon="fa-flask",
    category='SQL Lab',
    category_label=__("SQL Lab"),)
appbuilder.add_link(
    'Query Search',
    href='/p/sqllab#search',
    icon="fa-search",
    category_icon="fa-flask",
    category='SQL Lab',
    category_label=__("SQL Lab"),)
