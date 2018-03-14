import logging
from flask_appbuilder import expose
from flask_appbuilder.models.sqla.interface import SQLAInterface

from superset import models
from superset.models import Database
from .base import SupersetModelView, BaseSupersetView, catch_exception, json_response


class QueryView(SupersetModelView):
    route_base = '/queryview'
    datamodel = SQLAInterface(models.Query)
    list_columns = ['user', 'database', 'status', 'start_time', 'end_time']


class SQLLab(BaseSupersetView):
    route_base = '/sql'

    @catch_exception
    @expose("/metadata/<database_id>/<schema>/")
    def extra_schema_metadata(self, database_id, schema):
        database = Database.get_object(database_id)
        metadata = database.db_engine_spec.extra_schema_metadata(database, schema)
        return json_response(data=metadata)

    @catch_exception
    @expose("/metadata/<database_id>/<schema>/<table_name>/")
    def extra_table_metadata(self, database_id, schema, table_name):
        database = Database.get_object(database_id)
        metadata = database.db_engine_spec.extra_table_metadata(
            database, schema, table_name)
        return json_response(data=metadata)

    @catch_exception
    @expose("/metadata/<database_id>/<schema>/<table_name>/<column_name>/")
    def extra_column_metadata(self, database_id, schema, table_name, column_name):
        database = Database.get_object(database_id)
        metadata = database.db_engine_spec.extra_column_metadata(
            database, schema, table_name, column_name)
        if not metadata:
            logging.error('The column [{}] is not existed in [].[]'
                          .format(column_name, schema, table_name))
        return json_response(data=metadata)