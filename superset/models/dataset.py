from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals


import re
import random
import string
import logging
import sqlparse
from io import StringIO
import numpy
import pandas as pd
from datetime import datetime
from distutils.util import strtobool

from flask import g, Markup, escape
from flask_babel import lazy_gettext as _
from flask_appbuilder import Model

import sqlalchemy as sqla
from sqlalchemy import (
    Column, Integer, String, ForeignKey, Text, Boolean,
    DateTime, desc, asc, select, and_, UniqueConstraint
)
from sqlalchemy.orm import backref, relationship
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql import table, literal_column, text, column
from sqlalchemy.sql.expression import ColumnClause, TextAsFrom

from superset import db, app, import_util, utils
from superset.utils import wrap_clause_in_parens, DTTM_ALIAS, SupersetException
from superset.jinja_context import get_template_processor
from .base import (
    AuditMixinNullable, ImportMixin, Queryable, QueryResult, QueryStatus, Count
)
from .connection import Database, HDFSConnection

config = app.config


FillterPattern = re.compile(r'''((?:[^,"']|"[^"]*"|'[^']*')+)''')


class TableColumn(Model, AuditMixinNullable, ImportMixin):

    """ORM object for table columns, each table can have multiple columns"""

    __tablename__ = 'table_columns'
    id = Column(Integer, primary_key=True)
    dataset_id = Column(Integer, ForeignKey('dataset.id'))
    ref_dataset = relationship(
        'Dataset',
        backref=backref('ref_columns', cascade='all, delete-orphan'),
        foreign_keys=[dataset_id])
    column_name = Column(String(128), nullable=False)
    verbose_name = Column(String(128))
    is_dttm = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    type = Column(String(32), default='')
    groupby = Column(Boolean, default=False)
    count_distinct = Column(Boolean, default=False)
    sum = Column(Boolean, default=False)
    avg = Column(Boolean, default=False)
    max = Column(Boolean, default=False)
    min = Column(Boolean, default=False)
    filterable = Column(Boolean, default=True)
    expression = Column(Text, default='')
    description = Column(Text, default='')
    python_date_format = Column(String(256))
    database_expression = Column(String(256))

    __table_args__ = (
        UniqueConstraint('column_name', 'dataset_id', name='column_name_dataset_uc'),
    )

    num_types = ('DOUBLE', 'FLOAT', 'INT', 'BIGINT', 'LONG')
    date_types = ('DATE', 'TIME')
    str_types = ('VARCHAR', 'STRING', 'CHAR')
    export_fields = (
        'table_id', 'column_name', 'verbose_name', 'is_dttm', 'is_active',
        'type', 'groupby', 'count_distinct', 'sum', 'avg', 'max', 'min',
        'filterable', 'expression', 'description', 'python_date_format',
        'database_expression'
    )
    temp_dataset = None

    def __repr__(self):
        return self.column_name

    @property
    def dataset(self):
        return self.temp_dataset if self.temp_dataset else self.ref_dataset

    @property
    def isnum(self):
        return any([t in self.type.upper() for t in self.num_types])

    @property
    def is_time(self):
        return any([t in self.type.upper() for t in self.date_types])

    @property
    def is_string(self):
        return any([t in self.type.upper() for t in self.str_types])

    @property
    def sqla_col(self):
        name = self.column_name
        if not self.expression:
            col = column(self.column_name).label(name)
        else:
            col = literal_column(self.expression).label(name)
        return col

    def get_time_filter(self, start_dttm, end_dttm):
        col = self.sqla_col.label('__time')
        return and_(
            col >= text(self.dttm_sql_literal(start_dttm)),
            col <= text(self.dttm_sql_literal(end_dttm)),
            )

    def get_timestamp_expression(self, time_grain):
        """Getting the time component of the query"""
        expr = self.expression or self.column_name
        if not self.expression and not time_grain:
            return column(expr, type_=DateTime).label(DTTM_ALIAS)
        if time_grain:
            pdf = self.python_date_format
            if pdf in ('epoch_s', 'epoch_ms'):
                # if epoch, translate to DATE using db specific conf
                db_spec = self.dataset.database.db_engine_spec
                if pdf == 'epoch_s':
                    expr = db_spec.epoch_to_dttm().format(col=expr)
                elif pdf == 'epoch_ms':
                    expr = db_spec.epoch_ms_to_dttm().format(col=expr)
            grain = self.dataset.database.grains_dict().get(time_grain, '{col}')
            expr = grain.function.format(col=expr)
        return literal_column(expr, type_=DateTime).label(DTTM_ALIAS)

    @classmethod
    def import_obj(cls, i_column):
        def lookup_obj(lookup_column):
            return db.session.query(TableColumn).filter(
                TableColumn.table_id == lookup_column.table_id,
                TableColumn.column_name == lookup_column.column_name).first()
        return import_util.import_simple_obj(db.session, i_column, lookup_obj)

    def dttm_sql_literal(self, dttm):
        """Convert datetime object to a SQL expression string

        If database_expression is empty, the internal dttm
        will be parsed as the string with the pattern that
        the user inputted (python_date_format)
        If database_expression is not empty, the internal dttm
        will be parsed as the sql sentence for the database to convert
        """

        tf = self.python_date_format or '%Y-%m-%d %H:%M:%S.%f'
        if self.database_expression:
            return self.database_expression.format(dttm.strftime('%Y-%m-%d %H:%M:%S'))
        elif tf == 'epoch_s':
            return str((dttm - datetime(1970, 1, 1)).total_seconds())
        elif tf == 'epoch_ms':
            return str((dttm - datetime(1970, 1, 1)).total_seconds() * 1000.0)
        else:
            s = self.dataset.database.db_engine_spec.convert_dttm(
                self.type, dttm)
            return s or "'{}'".format(dttm.strftime(tf))


class SqlMetric(Model, AuditMixinNullable, ImportMixin):

    """ORM object for metrics, each table can have multiple metrics"""

    __tablename__ = 'sql_metrics'
    id = Column(Integer, primary_key=True)
    metric_name = Column(String(128), nullable=False)
    verbose_name = Column(String(128))
    metric_type = Column(String(32))
    dataset_id = Column(Integer, ForeignKey('dataset.id'))
    ref_dataset = relationship(
        'Dataset',
        backref=backref('ref_metrics', cascade='all, delete-orphan'),
        foreign_keys=[dataset_id])
    expression = Column(Text)
    description = Column(Text)
    is_restricted = Column(Boolean, default=False, nullable=True)
    d3format = Column(String(128))

    __table_args__ = (
        UniqueConstraint('metric_name', 'dataset_id', name='metric_name_dataset_uc'),
    )

    export_fields = (
        'metric_name', 'verbose_name', 'metric_type', 'table_id', 'expression',
        'description', 'is_restricted', 'd3format')
    temp_dataset = None

    def __repr__(self):
        return self.metric_name

    @property
    def dataset(self):
        return self.temp_dataset if self.temp_dataset else self.ref_dataset

    @property
    def sqla_col(self):
        name = self.metric_name
        return literal_column(self.expression).label(name)

    @property
    def perm(self):
        return (
            "{parent_name}.[{obj.metric_name}](id:{obj.id})"
        ).format(obj=self,
                 parent_name=self.dataset.full_name) if self.dataset else None

    @classmethod
    def import_obj(cls, i_metric):
        def lookup_obj(lookup_metric):
            return db.session.query(SqlMetric).filter(
                SqlMetric.table_id == lookup_metric.table_id,
                SqlMetric.metric_name == lookup_metric.metric_name).first()
        return import_util.import_simple_obj(db.session, i_metric, lookup_obj)


class Dataset(Model, Queryable, AuditMixinNullable, ImportMixin, Count):
    """An ORM object for SqlAlchemy table references"""
    type = "table"
    __tablename__ = 'dataset'

    id = Column(Integer, primary_key=True)
    dataset_name = Column(String(128), nullable=False)
    # dataset_type = Column(String(32), nullable=False)
    table_name = Column(String(128))
    schema = Column(String(128))
    sql = Column(Text)

    database_id = Column(Integer, ForeignKey('dbs.id'), nullable=True)
    database = relationship(
        'Database',
        backref=backref('dataset'),
        foreign_keys=[database_id])

    user_id = Column(Integer, ForeignKey('ab_user.id'))
    owner = relationship('User', backref='dataset', foreign_keys=[user_id])

    online = Column(Boolean, default=False)
    description = Column(Text)
    filter_select_enabled = Column(Boolean, default=False)
    main_dttm_col = Column(String(128))
    params = Column(Text)
    offset = Column(Integer, default=0)
    default_endpoint = Column(Text)
    is_featured = Column(Boolean, default=False)
    cache_timeout = Column(Integer)

    __table_args__ = (
        UniqueConstraint('dataset_name', 'created_by_fk', name='dataset_name_owner_uc'),
    )

    baselink = "table"
    column_cls = TableColumn
    metric_cls = SqlMetric
    temp_columns = []      # for creating slice with source table
    temp_metrics = []
    export_fields = (
        'table_name', 'main_dttm_col', 'description', 'default_endpoint',
        'database_id', 'is_featured', 'offset', 'cache_timeout', 'schema',
        'sql', 'params')

    dataset_types = Database.database_types
    filter_types = dataset_types
    addable_types = ['DATABASE']

    def __repr__(self):
        return self.dataset_name

    @property
    def dataset_type(self):
        if self.hdfs_table:
            return self.hdfs_table.hdfs_table_type
        return self.database.database_type

    @property
    def backend(self):
        return self.database.backend

    @property
    def connection(self):
        if self.hdfs_table:
            return self.hdfs_table.hdfs_path
        elif self.database:
            return str(self.database)
        else:
            return 'No connection'

    @property
    def columns(self):
        return self.temp_columns if self.temp_columns else self.ref_columns

    @property
    def metrics(self):
        return self.temp_metrics if self.temp_metrics else self.ref_metrics

    @property
    def description_markeddown(self):
        return utils.markdown(self.description)

    @property
    def link(self):
        name = escape(self.name)
        return Markup(
            '<a href="{self.explore_url}">{name}</a>'.format(**locals()))

    @property
    def schema_perm(self):
        """Returns schema permission if present, database one otherwise."""
        return utils.get_schema_perm(self.database, self.schema)

    @property
    def perm(self):
        return "[{obj.database}].[{obj.dataset_name}](id:{obj.id})".format(obj=self)

    @property
    def name(self):
        if not self.schema:
            return self.table_name
        return "{}.{}".format(self.schema, self.table_name)

    @property
    def full_name(self):
        # return utils.get_datasource_full_name(
        #     self.database, self.table_name, schema=self.schema)
        user = self.created_by.username if self.created_by else None
        return "[{}].[{}].[{}]".format(user, self.database, self.dataset_name)

    @property
    def dttm_cols(self):
        l = [c.column_name for c in self.columns if c.is_dttm]
        if self.main_dttm_col not in l:
            l.append(self.main_dttm_col)
        return l

    @property
    def num_cols(self):
        return [c.column_name for c in self.columns if c.isnum]

    @property
    def any_dttm_col(self):
        cols = self.dttm_cols
        if cols:
            return cols[0]

    @property
    def html(self):
        t = ((c.column_name, c.type) for c in self.columns)
        df = pd.DataFrame(t)
        df.columns = ['field', 'type']
        return df.to_html(
            index=False,
            classes=(
                "dataframe table table-striped table-bordered "
                "table-condensed"))

    @property
    def metrics_combo(self):
        return sorted(
            [(m.metric_name, m.verbose_name or m.metric_name)
             for m in self.metrics],
            key=lambda x: x[1])

    @property
    def sql_url(self):
        return self.database.sql_url + "?table_name=" + str(self.table_name)

    @property
    def time_column_grains(self):
        return {
            "time_columns": self.dttm_cols,
            "time_grains": [grain.name for grain in self.database.grains()]
        }

    def get_col(self, col_name):
        columns = self.columns
        for col in columns:
            if col_name == col.column_name:
                return col

    def preview_data(self, limit=100):
        tbl = table(self.table_name)
        if self.schema:
            tbl.schema = self.schema
        if self.sql:
            tbl = TextAsFrom(sqla.text(self.sql), []).alias('expr_qry')
        qry = select("*").select_from(tbl).limit(limit)
        engine = self.database.get_sqla_engine()
        sql = str(qry.compile(engine, compile_kwargs={"literal_binds": True},))

        df = pd.read_sql(sql, con=engine)
        df = df.replace({numpy.nan: 'None'})
        columns = list(df.columns)
        types = []
        if self.table_name:
            tb = self.get_sqla_table_object()
            col_types = {col.name: str(col.type) for col in tb.columns}
            types = [col_types.get(c) for c in columns]
        return {'columns': columns,
               'types': types,
               'records': df.to_dict(orient='records')}

    def values_for_column(self, column_name, from_dttm, to_dttm, limit=500):
        """Runs query against sqla to retrieve some
        sample values for the given column.
        """
        granularity = self.main_dttm_col

        cols = {col.column_name: col for col in self.columns}
        target_col = cols[column_name]

        tbl = table(self.table_name)
        qry = select([target_col.sqla_col])
        qry = qry.select_from(tbl)
        qry = qry.distinct(column_name)
        qry = qry.limit(limit)

        if granularity:
            dttm_col = cols[granularity]
            timestamp = dttm_col.sqla_col.label('timestamp')
            time_filter = [
                timestamp >= text(dttm_col.dttm_sql_literal(from_dttm)),
                timestamp <= text(dttm_col.dttm_sql_literal(to_dttm)),
                ]
            qry = qry.where(and_(*time_filter))

        engine = self.database.get_sqla_engine()
        sql = "{}".format(
            qry.compile(
                engine, compile_kwargs={"literal_binds": True}, ),
        )

        return pd.read_sql_query(
            sql=sql,
            con=engine
        )

    def query(self, groupby, metrics, granularity, from_dttm, to_dttm,
              filter=None, is_timeseries=True, timeseries_limit=None,
              timeseries_limit_metric=None, row_limit=None, inner_from_dttm=None,
              inner_to_dttm=None, orderby=None, extras=None, columns=None):
        """Querying any sqla table from this common interface"""
        template_processor = get_template_processor(
            table=self, database=self.database)

        # For backward compatibility
        if granularity not in self.dttm_cols:
            granularity = self.main_dttm_col

        cols = {col.column_name: col for col in self.columns}
        metrics_dict = {m.metric_name: m for m in self.metrics}
        qry_start_dttm = datetime.now()

        if not granularity and is_timeseries:
            raise Exception(_(
                "Datetime column not provided as part table configuration "
                "and is required by this type of chart"))
        for m in metrics:
            if m not in metrics_dict:
                raise Exception(_("Metric [{m}] is not valid".format(m)))
        metrics_exprs = [metrics_dict.get(m).sqla_col for m in metrics]
        timeseries_limit_metric = metrics_dict.get(timeseries_limit_metric)
        timeseries_limit_metric_expr = None
        if timeseries_limit_metric:
            timeseries_limit_metric_expr = \
                timeseries_limit_metric.sqla_col
        if metrics:
            main_metric_expr = metrics_exprs[0]
        else:
            main_metric_expr = literal_column("COUNT(*)").label("ccount")

        select_exprs = []
        groupby_exprs = []

        if groupby:
            select_exprs = []
            inner_select_exprs = []
            inner_groupby_exprs = []
            for s in groupby:
                col = cols[s]
                outer = col.sqla_col
                inner = col.sqla_col.label(col.column_name + '__')

                groupby_exprs.append(outer)
                select_exprs.append(outer)
                inner_groupby_exprs.append(inner)
                inner_select_exprs.append(inner)
        elif columns:
            for s in columns:
                select_exprs.append(cols[s].sqla_col)
            metrics_exprs = []

        if granularity:

            @compiles(ColumnClause)
            def visit_column(element, compiler, **kw):
                """Patch for sqlalchemy bug

                TODO: sqlalchemy 1.2 release should be doing this on its own.
                Patch only if the column clause is specific for DateTime
                set and granularity is selected.
                """
                text = compiler.visit_column(element, **kw)
                try:
                    if (
                                    element.is_literal and
                                    hasattr(element.type, 'python_type') and
                                    type(element.type) is DateTime
                    ):
                        text = text.replace('%%', '%')
                except NotImplementedError:
                    # Some elements raise NotImplementedError for python_type
                    pass
                return text

            dttm_col = cols[granularity]
            time_grain = extras.get('time_grain_sqla')

            if is_timeseries:
                timestamp = dttm_col.get_timestamp_expression(time_grain)
                select_exprs += [timestamp]
                groupby_exprs += [timestamp]

            time_filter = dttm_col.get_time_filter(from_dttm, to_dttm)

        select_exprs += metrics_exprs
        qry = select(select_exprs)

        tbl = table(self.table_name)
        if self.schema:
            tbl.schema = self.schema

        # Supporting arbitrary SQL statements in place of tables
        if self.sql:
            tbl = TextAsFrom(sqla.text(self.sql), []).alias('expr_qry')

        if not columns:
            qry = qry.group_by(*groupby_exprs)

        where_clause_and = []
        having_clause_and = []
        for col, op, eq in filter:
            col_obj = cols[col]
            if op in ('in', 'not in'):
                splitted = FillterPattern.split(eq)[1::2]
                values = [types.replace("'", '').strip() for types in splitted]
                cond = col_obj.sqla_col.in_(values)
                if op == 'not in':
                    cond = ~cond
                where_clause_and.append(cond)
        if extras:
            where = extras.get('where')
            if where:
                where_clause_and += [wrap_clause_in_parens(
                    template_processor.process_template(where))]
            having = extras.get('having')
            if having:
                having_clause_and += [wrap_clause_in_parens(
                    template_processor.process_template(having))]
        if granularity:
            qry = qry.where(and_(*([time_filter] + where_clause_and)))
        else:
            qry = qry.where(and_(*where_clause_and))
        qry = qry.having(and_(*having_clause_and))
        if groupby:
            qry = qry.order_by(desc(main_metric_expr))
        elif orderby:
            for col, ascending in orderby:
                direction = asc if ascending else desc
                qry = qry.order_by(direction(col))

        if timeseries_limit and 0 < timeseries_limit < row_limit:
            row_limit = timeseries_limit
        qry = qry.limit(row_limit)

        if is_timeseries and timeseries_limit and groupby:
            # some sql dialects require for order by expressions
            # to also be in the select clause
            inner_select_exprs += [main_metric_expr]
            subq = select(inner_select_exprs)
            subq = subq.select_from(tbl)
            inner_time_filter = dttm_col.get_time_filter(
                inner_from_dttm or from_dttm,
                inner_to_dttm or to_dttm,
                )
            subq = subq.where(and_(*(where_clause_and + [inner_time_filter])))
            subq = subq.group_by(*inner_groupby_exprs)
            ob = main_metric_expr
            if timeseries_limit_metric_expr is not None:
                ob = timeseries_limit_metric_expr
            subq = subq.order_by(desc(ob))
            subq = subq.limit(timeseries_limit)
            on_clause = []
            for i, gb in enumerate(groupby):
                on_clause.append(
                    groupby_exprs[i] == column(gb + '__'))

            tbl = tbl.join(subq.alias(), and_(*on_clause))

        qry = qry.select_from(tbl)

        engine = self.database.get_sqla_engine()
        sql = "{}".format(
            qry.compile(
                engine, compile_kwargs={"literal_binds": True},),
        )
        sql = sqlparse.format(sql, reindent=True)
        logging.info(sql)
        status = QueryStatus.SUCCESS
        error_message = None
        df = None
        try:
            df = pd.read_sql_query(sql, con=engine)
        except Exception as e:
            status = QueryStatus.FAILED
            error_message = str(e)

        return QueryResult(
            status=status,
            df=df,
            duration=datetime.now() - qry_start_dttm,
            query=sql,
            error_message=error_message)

    def drop_temp_view(self, engine, view_name):
        drop_view = "DROP VIEW {}".format(view_name)
        engine.execute(drop_view)

    def create_temp_view(self, engine, view_name, sql):
        create_view = "CREATE VIEW {} AS {}".format(view_name, sql)
        engine.execute(create_view)

    def get_sqla_table_object(self):
        try:
            engine = self.database.get_sqla_engine()
            if self.sql:
                view_name = "pilot_view_{}" \
                    .format(''.join(random.sample(string.ascii_lowercase, 10)))
                self.create_temp_view(engine, view_name, self.sql)
                table = self.database.get_table(view_name)
                self.drop_temp_view(engine, view_name)
                return table
            else:
                return self.database.get_table(self.table_name, schema=self.schema)
        except sqla.exc.DBAPIError as e:
            err = _("Drop or create temporary view by sql failed: {msg}")\
                .format(msg=str(e))
            logging.error(err)
            raise Exception(err)
        except Exception:
            raise Exception(_("Couldn't fetch table [{table}]'s information "
                            "in the specified database [{schema}]")
                            .format(table=self.table_name, schema=self.schema))

    @classmethod
    def temp_dataset(cls, database_id, full_tb_name, need_columns=True):
        """A temp dataset for slice"""
        dataset = cls(id=0,
                      online=True,
                      filter_select_enabled=True)
        if '.' in full_tb_name:
            dataset.schema, dataset.table_name = full_tb_name.split('.')
        else:
            dataset.table_name = full_tb_name
        dataset.dataset_name = '{}_{}'.format(
            dataset.table_name,
            ''.join(random.sample(string.ascii_lowercase, 10))
        )
        dataset.database_id = database_id
        dataset.database = db.session.query(Database) \
            .filter_by(id=database_id).first()
        if need_columns:
            dataset.set_temp_columns_and_metrics()
        return dataset

    def set_temp_columns_and_metrics(self):
        """Get table's columns and metrics"""
        table = self.get_sqla_table_object()

        any_date_col = None
        self.temp_columns = []
        self.temp_metrics = []
        for col in table.columns:
            try:
                datatype = "{}".format(col.type).upper()
            except Exception as e:
                datatype = "UNKNOWN"
                logging.error("Unrecognized data type in {}.{}".format(table, col.name))
                logging.exception(e)

            new_col = TableColumn(temp_dataset=self, column_name=col.name, type=datatype)
            new_col.count_distinct = True
            new_col.groupby = new_col.is_string or new_col.isnum or new_col.is_time
            new_col.filterable = new_col.is_string
            new_col.sum = new_col.isnum
            new_col.avg = new_col.isnum
            new_col.max = new_col.isnum
            new_col.min = new_col.isnum
            new_col.is_dttm = new_col.is_time
            self.temp_columns.append(new_col)

            if not any_date_col and new_col.is_time:
                any_date_col = col.name

            quoted = "{}".format(
                column(new_col.column_name).compile(dialect=db.engine.dialect))
            if new_col.sum:
                new_metric = SqlMetric(
                    temp_dataset=self,
                    metric_name='sum__' + new_col.column_name,
                    verbose_name='sum__' + new_col.column_name,
                    metric_type='sum',
                    expression='SUM({})'.format(quoted))
                self.temp_metrics.append(new_metric)
            if new_col.avg:
                new_metric = SqlMetric(
                    temp_dataset=self,
                    metric_name='avg__' + new_col.column_name,
                    verbose_name='avg__' + new_col.column_name,
                    metric_type='avg',
                    expression='AVG({})'.format(quoted))
                self.temp_metrics.append(new_metric)
            if new_col.max:
                new_metric = SqlMetric(
                    temp_dataset=self,
                    metric_name='max__' + new_col.column_name,
                    verbose_name='max__' + new_col.column_name,
                    metric_type='max',
                    expression='MAX({})'.format(quoted))
                self.temp_metrics.append(new_metric)
            if new_col.min:
                new_metric = SqlMetric(
                    temp_dataset=self,
                    metric_name='min__' + new_col.column_name,
                    verbose_name='min__' + new_col.column_name,
                    metric_type='min',
                    expression='MIN({})'.format(quoted))
                self.temp_metrics.append(new_metric)
            if new_col.count_distinct:
                new_metric = SqlMetric(
                    temp_dataset=self,
                    metric_name='count_distinct__' + new_col.column_name,
                    verbose_name='count_distinct__' + new_col.column_name,
                    metric_type='count_distinct',
                    expression='COUNT(DISTINCT {})'.format(quoted))
                self.temp_metrics.append(new_metric)

        new_metric = SqlMetric(
            temp_dataset=self,
            metric_name='count',
            verbose_name='COUNT(*)',
            metric_type='count',
            expression='COUNT(*)')
        self.temp_metrics.append(new_metric)
        if not self.main_dttm_col:
            self.main_dttm_col = any_date_col

    def fetch_metadata(self):
        """Fetches the metadata for the table and merges it in"""
        table = self.get_sqla_table_object()
        TC = TableColumn  # noqa shortcut to class
        M = SqlMetric  # noqa
        metrics = []
        any_date_col = None
        for col in table.columns:
            try:
                datatype = "{}".format(col.type).upper()
            except Exception as e:
                datatype = "UNKNOWN"
                logging.error("Unrecognized data type in {}.{}".format(table, col.name))
                logging.exception(e)
            dbcol = (
                db.session.query(TC)
                    .filter(TC.dataset == self)
                    .filter(TC.column_name == col.name)
                    .first()
            )
            db.session.flush()
            if not dbcol:
                dbcol = TableColumn(column_name=col.name, type=datatype)
                dbcol.count_distinct = True
                dbcol.groupby = dbcol.is_string or dbcol.isnum or dbcol.is_time
                dbcol.filterable = dbcol.is_string
                dbcol.sum = dbcol.isnum
                dbcol.avg = dbcol.isnum
                dbcol.max = dbcol.isnum
                dbcol.min = dbcol.isnum
                dbcol.is_dttm = dbcol.is_time

            db.session.merge(self)
            self.columns.append(dbcol)

            if not any_date_col and dbcol.is_time:
                any_date_col = col.name

            quoted = "{}".format(
                column(dbcol.column_name).compile(dialect=db.engine.dialect))
            if dbcol.sum:
                metrics.append(M(
                    metric_name='sum__' + dbcol.column_name,
                    verbose_name='sum__' + dbcol.column_name,
                    metric_type='sum',
                    expression="SUM({})".format(quoted)
                ))
            if dbcol.avg:
                metrics.append(M(
                    metric_name='avg__' + dbcol.column_name,
                    verbose_name='avg__' + dbcol.column_name,
                    metric_type='avg',
                    expression="AVG({})".format(quoted)
                ))
            if dbcol.max:
                metrics.append(M(
                    metric_name='max__' + dbcol.column_name,
                    verbose_name='max__' + dbcol.column_name,
                    metric_type='max',
                    expression="MAX({})".format(quoted)
                ))
            if dbcol.min:
                metrics.append(M(
                    metric_name='min__' + dbcol.column_name,
                    verbose_name='min__' + dbcol.column_name,
                    metric_type='min',
                    expression="MIN({})".format(quoted)
                ))
            if dbcol.count_distinct:
                metrics.append(M(
                    metric_name='count_distinct__' + dbcol.column_name,
                    verbose_name='count_distinct__' + dbcol.column_name,
                    metric_type='count_distinct',
                    expression="COUNT(DISTINCT {})".format(quoted)
                ))
            dbcol.type = datatype
            db.session.merge(self)
            db.session.commit()

        metrics.append(M(
            metric_name='count',
            verbose_name='COUNT(*)',
            metric_type='count',
            expression="COUNT(*)"
        ))
        for metric in metrics:
            m = (
                db.session.query(M)
                    .filter(M.metric_name == metric.metric_name)
                    .filter(M.dataset_id == self.id)
                    .first()
            )
            metric.dataset_id = self.id
            if not m:
                db.session.add(metric)
                db.session.commit()
        if not self.main_dttm_col:
            self.main_dttm_col = any_date_col

    @classmethod
    def check_online(cls, dataset, raise_if_false=True):
        def check(obj, user_id):
            user_id = int(user_id)
            if (hasattr(obj, 'online') and obj.online is True) or \
                            obj.created_by_fk == user_id:
                return True
            return False

        user_id = g.user.get_id()
        if check(dataset, user_id) is False:
            if raise_if_false:
                raise SupersetException(
                    _("Dependent someone's dataset [{dataset}] is offline, "
                    "so it's unavailable").format(dataset=dataset))
            else:
                return False
        # database
        if dataset.database and check(dataset.database, user_id) is False:
            if raise_if_false:
                raise SupersetException(
                    _("Dependent someone's Inceptor connection [{conn}] is offline, "
                    "so it's unavailable").format(conn=dataset.database))
            else:
                return False
        # hdfs_connection
        if dataset.hdfs_table \
                and dataset.hdfs_table.hdfs_connection \
                and check(dataset.hdfs_table.hdfs_connection, user_id) is False:
            if raise_if_false:
                raise SupersetException(
                    _("Dependent someone's HDFS connection [{conn}] is offline, "
                    "so it's unavailable").format(conn=dataset.hdfs_table.hdfs_connection))
            else:
                return False
        return True

    @classmethod
    def import_obj(cls, i_datasource, import_time=None):
        """Imports the datasource from the object to the database.

         Metrics and columns and datasource will be overrided if exists.
         This function can be used to import/export dashboards between multiple
         superset instances. Audit metadata isn't copies over.
        """
        def lookup_dataset(table):
            return db.session.query(Dataset).join(Database).filter(
                Dataset.table_name == table.table_name,
                Dataset.schema == table.schema,
                Database.id == table.database_id,
                ).first()

        def lookup_database(table):
            return db.session.query(Database).filter_by(
                database_name=table.params_dict['database_name']).one()
        return import_util.import_datasource(
            db.session, i_datasource, lookup_database, lookup_dataset,
            import_time)


class HDFSTable(Model, AuditMixinNullable):
    __tablename__ = "hdfs_table"
    type = 'table'
    hdfs_table_type = 'HDFS'
    hdfs_table_types = ['HDFS', ]
    filter_types = hdfs_table_types
    addable_types = hdfs_table_types + ['UPLOAD FILE']

    id = Column(Integer, primary_key=True)
    hdfs_path = Column(String(256), nullable=False)
    file_type = Column(String(32))
    separator = Column(String(8), nullable=False, default=',')
    quote = Column(String(8), default='"')
    skip_rows = Column(Integer, default=0)         # skip rows, start with 0
    next_as_header = Column(Boolean, default=False)  # if next line as header
    skip_more_rows = Column(Integer)    # below the header, skip rows again
    nrows = Column(Integer)             # the rows of data readed
    charset = Column(String(32))
    hdfs_connection_id = Column(Integer, ForeignKey('hdfs_connection.id'))
    hdfs_connection = relationship(
        'HDFSConnection',
        backref=backref('hdfs_table', lazy='joined'),
        foreign_keys=[hdfs_connection_id]
    )
    dataset_id = Column(Integer, ForeignKey('dataset.id'))
    dataset = relationship(
        'Dataset',
        backref=backref('hdfs_table', uselist=False, cascade='all, delete-orphan'),
        foreign_keys=[dataset_id]
    )

    cached_file = {}

    def __repr__(self):
        return self.hdfs_path

    @staticmethod
    def create_external_table(database, table_name, columns, hdfs_path,
                              separator=',', schema='default'):
        table_name = '{}.{}'.format(schema, table_name)
        sql = 'create external table {}('.format(table_name)
        names = columns.get('names')
        types = columns.get('types')
        for index, v in enumerate(names):
            sql = sql + names[index] + " " + types[index] + ","
        sql = sql[:-1] \
              + ") row format delimited fields terminated by '" + separator \
              + "' location '" + hdfs_path + "'"

        engine = database.get_sqla_engine()
        engine.execute("drop table if exists " + table_name)
        engine.execute(sql)

    @classmethod
    def parse_file(cls, file_content, separator=',', quote='"', skip_rows='0',
                   next_as_header='false', skip_more_rows='0', charset='utf-8',
                   nrows='100', names=None):
        skip_rows = int(skip_rows)
        next_as_header = strtobool(next_as_header)
        skip_more_rows = int(skip_more_rows)
        nrows = int(nrows)

        header = skip_rows + 1 if next_as_header else None
        names = None if header else names
        skiprows = int(skip_rows) + int(skip_more_rows)
        skiprows += 1 if next_as_header else skiprows
        try:
            return pd.read_csv(StringIO(file_content), sep=separator,
                               skiprows=skiprows, header=None, names=names,
                               prefix='C', nrows=nrows, encoding=charset)
        except Exception as e:
            raise Exception(_("Parse file error: {msg}").format(msg=str(e)))

