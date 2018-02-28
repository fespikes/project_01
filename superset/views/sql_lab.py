from flask_appbuilder.models.sqla.interface import SQLAInterface
from superset import models
from .base import SupersetModelView


class QueryView(SupersetModelView):
    route_base = '/queryview'
    datamodel = SQLAInterface(models.Query)
    list_columns = ['user', 'database', 'status', 'start_time', 'end_time']
