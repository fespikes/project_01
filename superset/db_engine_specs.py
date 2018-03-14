"""Compatibility layer for different database engines

This modules stores logic specific to different database engines. Things
like time-related functions that are similar but not identical, or
information as to expose certain features or not and how to expose them.

For instance, Hive/Presto supports partitions and have a specific API to
list partitions. Other databases like Vertica also support partitions but
have different API to get to them. Other databases don't support partitions
at all. The classes here will use a common interface to specify all this.

The general idea is to use static classes and an inheritance scheme.
"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

from collections import namedtuple
import inspect
import textwrap
import time

from flask_babel import lazy_gettext as _

Grain = namedtuple('Grain', 'name label function')


class LimitMethod(object):
    """Enum the ways that limits can be applied"""
    FETCH_MANY = 'fetch_many'
    WRAP_SQL = 'wrap_sql'


class BaseEngineSpec(object):
    engine = 'base'  # str as defined in sqlalchemy.engine.engine
    time_grains = tuple()
    limit_method = LimitMethod.FETCH_MANY

    @classmethod
    def epoch_to_dttm(cls):
        raise NotImplementedError()

    @classmethod
    def epoch_ms_to_dttm(cls):
        return cls.epoch_to_dttm().replace('{col}', '({col}/1000.0)')

    @classmethod
    def extra_schema_metadata(cls, database, schema):
        """Returns engine-specific schema metadata"""
        raise NotImplementedError()

    @classmethod
    def extra_table_metadata(cls, database, schema, table):
        """Returns engine-specific table metadata"""
        columns = database.get_columns(table, schema)
        indexes = database.get_indexes(table, schema)
        primary_key = database.get_pk_constraint(table, schema)
        foreign_keys = database.get_foreign_keys(table, schema)

        for c in columns:
            c['type'] = '{}'.format(c['type'])

        keys = []
        if primary_key and primary_key.get('constrained_columns'):
            primary_key['column_names'] = primary_key.pop('constrained_columns')
            primary_key['type'] = 'pk'
            keys += [primary_key]
        for fk in foreign_keys:
            fk['column_names'] = fk.pop('constrained_columns')
            fk['type'] = 'fk'
        keys += foreign_keys
        for idx in indexes:
            idx['type'] = 'index'
        keys += indexes

        return {'columns': columns,
                'primary_key': primary_key,
                'foreign_keys': foreign_keys,
                'indexes': keys}

    @classmethod
    def extra_column_metadata(cls, database, schema, table, column):
        """Returns engine-specific column metadata"""
        column = database.get_column(table, column, schema)
        metadata = {}
        if column:
            column['type'] = '{}'.format(column['type'])
            metadata = column
        return metadata

    @classmethod
    def convert_dttm(cls, target_type, dttm):
        return "'{}'".format(dttm.strftime('%Y-%m-%d %H:%M:%S'))

    @classmethod
    def handle_cursor(cls, cursor, query, session):
        """Handle a live cursor between the execute and fetchall calls

        The flow works without this method doing anything, but it allows
        for handling the cursor and updating progress information in the
        query object"""
        pass

    @classmethod
    def sql_preprocessor(cls, sql):
        """If the SQL needs to be altered prior to running it

        For example Presto needs to double `%` characters
        """
        return sql

    @classmethod
    def adjust_database_uri(cls, uri, selected_schema):
        """Based on a URI and selected schema, return a new URI

        The URI here represents the URI as entered when saving the database,
        ``selected_schema`` is the schema currently active presumably in
        the SQL Lab dropdown. Based on that, for some database engine,
        we can return a new altered URI that connects straight to the
        active schema, meaning the users won't have to prefix the object
        names by the schema name.

        Some databases engines have 2 level of namespacing: database and
        schema (postgres, oracle, mssql, ...)
        For those it's probably better to not alter the database
        component of the URI with the schema name, it won't work.

        Some database drivers like presto accept "{catalog}/{schema}" in
        the database component of the URL, that can be handled here.
        """
        return uri


class PostgresEngineSpec(BaseEngineSpec):
    engine = 'postgresql'

    time_grains = (
        Grain("Time Column", _('Time Column'), "{col}"),
        Grain("second", _('second'), "DATE_TRUNC('second', {col})"),
        Grain("minute", _('minute'), "DATE_TRUNC('minute', {col})"),
        Grain("hour", _('hour'), "DATE_TRUNC('hour', {col})"),
        Grain("day", _('day'), "DATE_TRUNC('day', {col})"),
        Grain("week", _('week'), "DATE_TRUNC('week', {col})"),
        Grain("month", _('month'), "DATE_TRUNC('month', {col})"),
        Grain("quarter", _('quarter'), "DATE_TRUNC('quarter', {col})"),
        Grain("year", _('year'), "DATE_TRUNC('year', {col})"),
    )

    @classmethod
    def epoch_to_dttm(cls):
        return "(timestamp 'epoch' + {col} * interval '1 second')"

    @classmethod
    def convert_dttm(cls, target_type, dttm):
        return "'{}'".format(dttm.strftime('%Y-%m-%d %H:%M:%S'))


class SqliteEngineSpec(BaseEngineSpec):
    engine = 'sqlite'
    time_grains = (
        Grain('Time Column', _('Time Column'), '{col}'),
        Grain('day', _('day'), 'DATE({col})'),
        Grain("week", _('week'),
              "DATE({col}, -strftime('%w', {col}) || ' days')"),
        Grain("month", _('month'),
              "DATE({col}, -strftime('%d', {col}) || ' days')"),
    )

    @classmethod
    def epoch_to_dttm(cls):
        return "datetime({col}, 'unixepoch')"

    @classmethod
    def convert_dttm(cls, target_type, dttm):
        iso = dttm.isoformat().replace('T', ' ')
        if '.' not in iso:
            iso += '.000000'
        return "'{}'".format(iso)


class MySQLEngineSpec(BaseEngineSpec):
    engine = 'mysql'
    meta_schema = 'information_schema'
    time_grains = (
        Grain('Time Column', _('Time Column'), '{col}'),
        Grain("second", _('second'), "DATE_ADD(DATE({col}), "
              "INTERVAL (HOUR({col})*60*60 + MINUTE({col})*60"
              " + SECOND({col})) SECOND)"),
        Grain("minute", _('minute'), "DATE_ADD(DATE({col}), "
              "INTERVAL (HOUR({col})*60 + MINUTE({col})) MINUTE)"),
        Grain("hour", _('hour'), "DATE_ADD(DATE({col}), "
              "INTERVAL HOUR({col}) HOUR)"),
        Grain('day', _('day'), 'DATE({col})'),
        Grain("week", _('week'), "DATE(DATE_SUB({col}, "
              "INTERVAL DAYOFWEEK({col}) - 1 DAY))"),
        Grain("month", _('month'), "DATE(DATE_SUB({col}, "
              "INTERVAL DAYOFMONTH({col}) - 1 DAY))"),
        Grain("quarter", _('quarter'), "MAKEDATE(YEAR({col}), 1) "
              "+ INTERVAL QUARTER({col}) QUARTER - INTERVAL 1 QUARTER"),
        Grain("year", _('year'), "DATE(DATE_SUB({col}, "
              "INTERVAL DAYOFYEAR({col}) - 1 DAY))"),
        Grain("week_start_monday", _('week_start_monday'),
              "DATE(DATE_SUB({col}, "
              "INTERVAL DAYOFWEEK(DATE_SUB({col}, INTERVAL 1 DAY)) - 1 DAY))"),
    )

    @classmethod
    def extra_schema_metadata(cls, database, schema):
        engine = database.get_sqla_engine()
        query = engine.execute(
            "SELECT DEFAULT_CHARACTER_SET_NAME FROM {}.SCHEMATA WHERE SCHEMA_NAME='{}'"
                .format(cls.meta_schema, schema))
        rs = query.fetchone()
        metadata = {}
        if rs:
            metadata['charset'] = rs[0]
        return metadata

    @classmethod
    def convert_dttm(cls, target_type, dttm):
        if target_type.upper() in ('DATETIME', 'DATE'):
            return "STR_TO_DATE('{}', '%Y-%m-%d %H:%i:%s')".format(
                dttm.strftime('%Y-%m-%d %H:%M:%S'))
        return "'{}'".format(dttm.strftime('%Y-%m-%d %H:%M:%S'))

    @classmethod
    def epoch_to_dttm(cls):
        return "from_unixtime({col})"

    @classmethod
    def adjust_database_uri(cls, uri, selected_schema=None):
        if selected_schema:
            uri.database = selected_schema
        return uri


class InceptorEngineSpec(BaseEngineSpec):
    engine = 'inceptor'
    time_grains = tuple()

    @classmethod
    def extra_schema_metadata(cls, database, schema):
        engine = database.get_sqla_engine()
        query = engine.execute(
            "SELECT commentstring, owner_name FROM system.databases_v "
            "WHERE database_name='{}'".format(schema))
        rs = query.fetchone()
        metadata = {}
        if rs:
            metadata['comment'] = rs[0]
            metadata['owner'] = rs[1]
        return metadata


class PrestoEngineSpec(BaseEngineSpec):
    engine = 'presto'

    time_grains = (
        Grain('Time Column', _('Time Column'), '{col}'),
        Grain('second', _('second'),
              "date_trunc('second', CAST({col} AS TIMESTAMP))"),
        Grain('minute', _('minute'),
              "date_trunc('minute', CAST({col} AS TIMESTAMP))"),
        Grain('hour', _('hour'),
              "date_trunc('hour', CAST({col} AS TIMESTAMP))"),
        Grain('day', _('day'),
              "date_trunc('day', CAST({col} AS TIMESTAMP))"),
        Grain('week', _('week'),
              "date_trunc('week', CAST({col} AS TIMESTAMP))"),
        Grain('month', _('month'),
              "date_trunc('month', CAST({col} AS TIMESTAMP))"),
        Grain('quarter', _('quarter'),
              "date_trunc('quarter', CAST({col} AS TIMESTAMP))"),
        Grain("week_ending_saturday", _('week_ending_saturday'),
              "date_add('day', 5, date_trunc('week', date_add('day', 1, "
              "CAST({col} AS TIMESTAMP))))"),
        Grain("week_start_sunday", _('week_start_sunday'),
              "date_add('day', -1, date_trunc('week', "
              "date_add('day', 1, CAST({col} AS TIMESTAMP))))"),
    )

    @classmethod
    def sql_preprocessor(cls, sql):
        return sql.replace('%', '%%')

    @classmethod
    def convert_dttm(cls, target_type, dttm):
        tt = target_type.upper()
        if tt == 'DATE':
            return "from_iso8601_date('{}')".format(dttm.isoformat()[:10])
        if tt == 'TIMESTAMP':
            return "from_iso8601_timestamp('{}')".format(dttm.isoformat())
        return "'{}'".format(dttm.strftime('%Y-%m-%d %H:%M:%S'))

    @classmethod
    def epoch_to_dttm(cls):
        return "from_unixtime({col})"

    @staticmethod
    def show_partition_pql(
            table_name, schema_name=None, order_by=None, limit=100):
        if schema_name:
            table_name = schema_name + '.' + table_name
        order_by = order_by or []
        order_by_clause = ''
        if order_by:
            order_by_clause = "ORDER BY " + ', '.join(order_by) + " DESC"

        limit_clause = ''
        if limit:
            limit_clause = "LIMIT {}".format(limit)

        return textwrap.dedent("""\
        SHOW PARTITIONS
        FROM {table_name}
        {order_by_clause}
        {limit_clause}
        """).format(**locals())

    @classmethod
    def extra_table_metadata(cls, database, schema_name, table_name):
        indexes = database.get_indexes(table_name, schema_name)
        if not indexes:
            return {}
        cols = indexes[0].get('column_names', [])
        pql = cls.show_partition_pql(table_name, schema_name, cols)
        df = database.get_df(pql, schema_name)
        latest_part = df.to_dict(orient='records')[0] if not df.empty else None

        partition_query = cls.show_partition_pql(table_name, schema_name, cols)
        return {
            'partitions': {
                'cols': cols,
                'latest': latest_part,
                'partitionQuery': partition_query,
            }
        }

    @classmethod
    def handle_cursor(cls, cursor, query, session):
        """Updates progress information"""
        polled = cursor.poll()
        # poll returns dict -- JSON status information or ``None``
        # if the query is done
        # https://github.com/dropbox/PyHive/blob/
        # b34bdbf51378b3979eaf5eca9e956f06ddc36ca0/pyhive/presto.py#L178
        while polled:
            # Update the object and wait for the kill signal.
            stats = polled.get('stats', {})
            if stats:
                completed_splits = float(stats.get('completedSplits'))
                total_splits = float(stats.get('totalSplits'))
                if total_splits and completed_splits:
                    progress = 100 * (completed_splits / total_splits)
                    if progress > query.progress:
                        query.progress = progress
                    session.commit()
            time.sleep(1)
            polled = cursor.poll()

    @classmethod
    def adjust_database_uri(cls, uri, selected_schema=None):
        database = uri.database
        if selected_schema:
            if '/' in database:
                database = database.split('/')[0] + '/' + selected_schema
            else:
                database += '/' + selected_schema
            uri.database = database
        return uri


class MssqlEngineSpec(BaseEngineSpec):
    engine = 'mssql'
    meta_schema = 'information_schema'
    epoch_to_dttm = "dateadd(S, {col}, '1970-01-01')"

    time_grains = (
        Grain("Time Column", _('Time Column'), "{col}"),
        Grain("second", _('second'), "DATEADD(second, "
              "DATEDIFF(second, '2000-01-01', {col}), '2000-01-01')"),
        Grain("minute", _('minute'), "DATEADD(minute, "
              "DATEDIFF(minute, 0, {col}), 0)"),
        Grain("5 minute", _('5 minute'), "DATEADD(minute, "
              "DATEDIFF(minute, 0, {col}) / 5 * 5, 0)"),
        Grain("half hour", _('half hour'), "DATEADD(minute, "
              "DATEDIFF(minute, 0, {col}) / 30 * 30, 0)"),
        Grain("hour", _('hour'), "DATEADD(hour, "
              "DATEDIFF(hour, 0, {col}), 0)"),
        Grain("day", _('day'), "DATEADD(day, "
              "DATEDIFF(day, 0, {col}), 0)"),
        Grain("week", _('week'), "DATEADD(week, "
              "DATEDIFF(week, 0, {col}), 0)"),
        Grain("month", _('month'), "DATEADD(month, "
              "DATEDIFF(month, 0, {col}), 0)"),
        Grain("quarter", _('quarter'), "DATEADD(quarter, "
              "DATEDIFF(quarter, 0, {col}), 0)"),
        Grain("year", _('year'), "DATEADD(year, "
              "DATEDIFF(year, 0, {col}), 0)"),
    )

    @classmethod
    def extra_schema_metadata(cls, database, schema):
        engine = database.get_sqla_engine()
        query = engine.execute(
            "SELECT SCHEMA_OWNER FROM {}.SCHEMATA WHERE SCHEMA_NAME='{}'"
                .format(cls.meta_schema, schema))
        rs = query.fetchone()
        metadata = {}
        if rs:
            metadata['owner'] = rs[0]
        return metadata

    @classmethod
    def convert_dttm(cls, target_type, dttm):
        return "CONVERT(DATETIME, '{}', 126)".format(dttm.isoformat())


class RedshiftEngineSpec(PostgresEngineSpec):
    engine = 'redshift'


class OracleEngineSpec(PostgresEngineSpec):
    engine = 'oracle'

    time_grains = (
        Grain('Time Column', _('Time Column'), '{col}'),
        Grain('minute', _('minute'),
              "TRUNC(TO_DATE({col}), 'MI')"),
        Grain('hour', _('hour'),
              "TRUNC(TO_DATE({col}), 'HH')"),
        Grain('day', _('day'),
              "TRUNC(TO_DATE({col}), 'DDD')"),
        Grain('week', _('week'),
              "TRUNC(TO_DATE({col}), 'WW')"),
        Grain('month', _('month'),
              "TRUNC(TO_DATE({col}), 'MONTH')"),
        Grain('quarter', _('quarter'),
              "TRUNC(TO_DATE({col}), 'Q')"),
        Grain('year', _('year'),
              "TRUNC(TO_DATE({col}), 'YEAR')"),
    )

    @classmethod
    def extra_schema_metadata(cls, database, schema):
        engine = database.get_sqla_engine()
        query = engine.execute(
            "SELECT DEFAULT_TABLESPACE, TO_CHAR(CREATED, 'YYYY-MM-DD') "
            "FROM dba_users WHERE USERNAME='{}'".format(schema))
        rs = query.fetchone()
        metadata = {}
        if rs:
            metadata['tablespace'] = rs[0]
            metadata['created'] = rs[1]
        return metadata

    @classmethod
    def convert_dttm(cls, target_type, dttm):
        return (
            """TO_TIMESTAMP('{}', 'YYYY-MM-DD"T"HH24:MI:SS.ff6')"""
        ).format(dttm.isoformat())


class VerticaEngineSpec(PostgresEngineSpec):
    engine = 'vertica'

engines = {
    o.engine: o for o in globals().values()
    if inspect.isclass(o) and issubclass(o, BaseEngineSpec)}
