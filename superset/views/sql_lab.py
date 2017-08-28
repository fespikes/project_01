from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

from flask_appbuilder.models.sqla.interface import SQLAInterface
from superset import models
from .base import SupersetModelView


class QueryView(SupersetModelView):
    route_base = '/queryview'
    datamodel = SQLAInterface(models.Query)
    list_columns = ['user', 'database', 'status', 'start_time', 'end_time']
