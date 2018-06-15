import celery
from datetime import datetime
import json
import logging
import pandas as pd
from superset import app, db, models, utils, dataframe, results_backend
from superset.models import Database
from superset.sql_parse import SupersetQuery
from superset.db_engine_specs import LimitMethod
from superset.jinja_context import get_template_processor
from superset.timeout_decorator import sql_timeout

QueryStatus = models.QueryStatus

celery_app = celery.Celery(config_source=app.config.get('CELERY_CONFIG'))


INCEPTOR_WORK_SCHEMA = 'pilot'  # The schema used for download sql result as csv
INCEPTOR_TEMP_TABLE_PREFIX = 'pilot_sqllab_'


def dedup(l, suffix='__'):
    """De-duplicates a list of string by suffixing a counter

    Always returns the same number of entries as provided, and always returns
    unique values.

    >>> dedup(['foo', 'bar', 'bar', 'bar'])
    ['foo', 'bar', 'bar__1', 'bar__2']
    """
    new_l = []
    seen = {}
    for s in l:
        if s in seen:
            seen[s] += 1
            s += suffix + str(seen[s])
        else:
            seen[s] = 0
        new_l.append(s)
    return new_l


@sql_timeout
@celery_app.task(bind=True)
def get_sql_results(self, query_id, return_results=True, store_results=False):
    """Executes the sql query returns the results."""
    # if not self.request.called_directly:
    #     engine = sqlalchemy.create_engine(
    #         app.config.get('SQLALCHEMY_DATABASE_URI'), poolclass=NullPool)
    #     session_class = sessionmaker()
    #     session_class.configure(bind=engine)
    #     session = session_class()
    # else:
    session = db.session()
    query = session.query(models.Query).filter_by(id=query_id).one()
    database = query.database
    db_engine_spec = database.db_engine_spec

    def handle_error(msg):
        """Local method handling error while processing the SQL"""
        query.error_message = msg
        query.status = QueryStatus.FAILED
        query.tmp_table_name = None
        session.commit()
        raise Exception(query.error_message)

    if store_results and not results_backend:
        handle_error("Results backend isn't configured.")

    # Limit enforced only for retrieving the data, not for the CTA queries.
    superset_query = SupersetQuery(query.sql)
    executed_sql = superset_query.stripped()
    # if not superset_query.is_select() and not database.allow_dml:
    #     handle_error("Only `SELECT` statements are allowed against this database")
    # if query.select_as_cta:
    #     if not superset_query.is_select():
    #         handle_error(
    #             "Only `SELECT` statements can be used with the CREATE TABLE feature.")
    #     if not query.tmp_table_name:
    #         start_dttm = datetime.fromtimestamp(query.start_time)
    #         query.tmp_table_name = 'tmp_{}_table_{}'.format(
    #             query.user_id,
    #             start_dttm.strftime('%Y_%m_%d_%H_%M_%S'))
    #     executed_sql = superset_query.as_create_table(query.tmp_table_name)
    #     query.select_as_cta_used = True
    if query.limit and superset_query.is_select() and \
                    db_engine_spec.limit_method == LimitMethod.FETCH_MANY:
        executed_sql = database.wrap_sql_limit(executed_sql, query.limit)
        query.limit_used = True

    try:
        template_processor = get_template_processor(database=database, query=query)
        executed_sql = template_processor.process_template(executed_sql)
        executed_sql = db_engine_spec.sql_preprocessor(executed_sql)
    except Exception as e:
        logging.exception(e)
        msg = "Template rendering failed: " + utils.error_msg_from_exception(e)
        handle_error(msg)

    try:
        query.executed_sql = executed_sql
        query.status = QueryStatus.RUNNING
        session.flush()
        #session.close()

        engine = database.get_sqla_engine(schema=query.schema)
        logging.info("Running query: \n{}".format(executed_sql))
        result_proxy = engine.execute(executed_sql)
    except Exception as e:
        logging.exception(e)
        handle_error(utils.error_msg_from_exception(e))

    cursor = result_proxy.cursor
    db_engine_spec.handle_cursor(cursor, query, session)

    cdf = None
    if result_proxy.cursor:
        column_names = [col[0] for col in result_proxy.cursor.description]
        column_names = dedup(column_names)
        # if db_engine_spec.limit_method == LimitMethod.FETCH_MANY:
        #     data = result_proxy.fetchmany(query.limit)
        # else:
        #     data = result_proxy.fetchall()
        data = result_proxy.fetchall()
        cdf = dataframe.SupersetDataFrame(pd.DataFrame(data, columns=column_names))

    query = session.query(models.Query).filter_by(id=query_id).one()
    query.rows = result_proxy.rowcount
    query.progress = 100
    query.status = QueryStatus.SUCCESS
    if query.rows == -1 and cdf:
        # Presto doesn't provide result_proxy.row_count
        query.rows = cdf.size
    # if query.select_as_cta:
    #     query.select_sql = '{}'.format(database.select_sql(
    #         query.tmp_table_name,
    #         limit=query.limit,
    #         schema=database.force_ctas_schema
    #     ))
    query.end_time = utils.now_as_float()
    session.flush()

    payload = {'query_id': query.id, 'status': query.status}
    payload['data'] = cdf.data if cdf else []
    payload['columns'] = cdf.columns_dict if cdf else []
    payload['query'] = query.to_dict()
    payload = json.dumps(payload, default=utils.json_iso_dttm_ser)

    # if store_results:
    #     key = '{}'.format(uuid.uuid4())
    #     logging.info("Storing results in results backend, key: {}".format(key))
    #     results_backend.set(key, zlib.compress(payload))
    #     query.results_key = key

    session.flush()
    session.commit()
    if return_results:
        return payload


@sql_timeout
def execute_sql(database_id, sql, schema=None):
    database = Database.get_object(database_id)
    engine = database.get_sqla_engine(schema=schema)

    query = SupersetQuery(sql)
    if query.is_select():
        sql = database.wrap_sql_limit(sql, int(app.config.get('SQL_MAX_ROW', 100)))

    result_proxy = engine.execute(sql)
    cdf = None
    column_names = []
    if result_proxy.cursor:
        column_names = [col[0] for col in result_proxy.cursor.description]
        column_names = dedup(column_names)
        data = result_proxy.fetchall()
        cdf = dataframe.SupersetDataFrame(pd.DataFrame(data, columns=column_names))

    payload = {
        'data': cdf.data if cdf else [],
        'columns': column_names,
        'sql': sql
    }
    return payload


def store_sql_results_to_hdfs(select_sql, engine):
    """
    For inceptor, store the sql results to hdfs folders
    :param sql: origin select sql
    :param engine: inceptor engine
    :return: temp table name and hdfs path storing results
    """
    ts = datetime.now().isoformat()
    ts = ts.replace('-', '').replace(':', '').split('.')[0]
    table_name = '{}{}'.format(INCEPTOR_TEMP_TABLE_PREFIX, ts).lower()
    path = '/tmp/pilot/{}/'.format(table_name)
    table_name = '{}.{}'.format(INCEPTOR_WORK_SCHEMA, table_name).lower()

    connect = engine.connect()

    sql = 'CREATE DATABASE IF NOT EXISTS {}'.format(INCEPTOR_WORK_SCHEMA)
    _execute(connect, sql)

    sql = 'DROP TABLE IF EXISTS {}'.format(table_name)
    _execute(connect, sql)

    sql = "CREATE TABLE {table} STORED AS CSVFILE LOCATION '{path}' as {sql}"\
        .format(table=table_name, path=path, sql=select_sql)
    _execute(connect, sql)

    sql = "SET ngmr.partition.automerge=TRUE"
    _execute(connect, sql)
    sql = "SET ngmr.partition.mergesize.mb=180"
    _execute(connect, sql)

    sql = "INSERT OVERWRITE TABLE {table} SELECT * FROM {table}".format(table=table_name)
    _execute(connect, sql)
    return table_name, path


@sql_timeout
def _execute(connect, sql):
    logging.info(sql)
    connect.execute(sql)


def drop_inceptor_temp_table(username):
    """Drop redundant temp tables in inceptor created when downloading sql results.
    """
    keep_temp_table_name = 3

    logging.info('Begin to drop redundant temp tables in Inceptor')
    default_inceptor = db.session.query(Database)\
        .filter_by(database_name=app.config.get('DEFAULT_INCEPTOR_CONN_NAME'))\
        .one()
    engine = default_inceptor.get_sqla_engine()
    sql = "SELECT table_name, create_time FROM system.tables_v " \
          "WHERE database_name='{schema}' and owner_name='{owner}' " \
          "      and table_name like '{prefix}%' " \
          "ORDER BY create_time DESC LIMIT {offset}, 10" \
        .format(schema=INCEPTOR_WORK_SCHEMA,
                owner=username,
                prefix=INCEPTOR_TEMP_TABLE_PREFIX,
                offset=keep_temp_table_name)
    logging.info(sql)

    rs = engine.execute(sql)
    for row in rs:
        sql = 'DROP TABLE IF EXISTS {}.{}'.format(INCEPTOR_WORK_SCHEMA, row[0])
        logging.info(sql)
        engine.execute(sql)
