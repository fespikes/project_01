"""init

Revision ID: 0001
Revises: None
Create Date: 2017-04-23 14:08:56.139842

"""

# revision identifiers, used by Alembic.
revision = '0001'
down_revision = None

from alembic import op
import sqlalchemy as sa
from sqlalchemy_utils.types.encrypted import EncryptedType
from sqlalchemy.sql.expression import text


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('daily_number',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.Column('obj_type', sa.String(length=32), nullable=False),
        sa.Column('count', sa.Integer(), nullable=False),
        sa.Column('dt', sa.Date(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('dashboards',
        sa.Column('created_on', sa.DateTime(), nullable=True),
        sa.Column('changed_on', sa.DateTime(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('dashboard_title', sa.String(length=255), nullable=False),
        sa.Column('position_json', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('department', sa.Text(), nullable=True),
        sa.Column('css', sa.Text(), nullable=True),
        sa.Column('online', sa.Boolean(), nullable=True, server_default="0"),
        sa.Column('json_metadata', sa.Text(), nullable=True),
        sa.Column('slug', sa.String(length=255), nullable=True),
        sa.Column('changed_by_fk', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.Column('created_by_fk', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('dashboard_title')
    )
    op.create_table('dbs',
        sa.Column('created_on', sa.DateTime(), nullable=True),
        sa.Column('changed_on', sa.DateTime(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('database_name', sa.String(length=250), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('online', sa.Boolean(), nullable=True, server_default="0"),
        sa.Column('sqlalchemy_uri', sa.String(length=1024), nullable=True),
        sa.Column('password', EncryptedType(), nullable=True),
        sa.Column('cache_timeout', sa.Integer(), nullable=True),
        sa.Column('select_as_create_table_as', sa.Boolean(), nullable=True),
        sa.Column('expose_in_sqllab', sa.Boolean(), nullable=True, server_default="1"),
        sa.Column('allow_run_sync', sa.Boolean(), nullable=True, server_default="1"),
        sa.Column('allow_run_async', sa.Boolean(), nullable=True, server_default="0"),
        sa.Column('allow_ctas', sa.Boolean(), nullable=True, server_default="0"),
        sa.Column('allow_dml', sa.Boolean(), nullable=True, server_default="1"),
        sa.Column('force_ctas_schema', sa.String(length=250), server_default="0"),
        sa.Column('args', sa.Text(), nullable=True),
        sa.Column('perm', sa.String(length=1000), nullable=True),
        sa.Column('changed_by_fk', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.Column('created_by_fk', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('database_name')
    )
    op.create_table('favstar',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.Column('class_name', sa.String(length=50), nullable=True),
        sa.Column('obj_id', sa.Integer(), nullable=True),
        sa.Column('dttm', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=512), nullable=True),
        sa.Column('action_type', sa.String(length=200), nullable=True),
        sa.Column('obj_type', sa.String(length=50), nullable=True),
        sa.Column('obj_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.Column('json', sa.Text(), nullable=True),
        sa.Column('dttm', sa.DateTime(), nullable=True),
        sa.Column('dt', sa.Date(), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('referrer', sa.String(length=1024), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('slices',
        sa.Column('created_on', sa.DateTime(), nullable=True),
        sa.Column('changed_on', sa.DateTime(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slice_name', sa.String(length=250), nullable=True),
        sa.Column('online', sa.Boolean(), nullable=True, server_default="0"),
        sa.Column('datasource_id', sa.Integer(), nullable=True),
        sa.Column('datasource_type', sa.String(length=200), nullable=True),
        sa.Column('datasource_name', sa.String(length=2000), nullable=True),
        sa.Column('database_id', sa.Integer(), nullable=True),
        sa.Column('full_table_name', sa.String(length=2000), nullable=True),
        sa.Column('viz_type', sa.String(length=250), nullable=True),
        sa.Column('params', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('department', sa.Text(), nullable=True),
        sa.Column('cache_timeout', sa.Integer(), nullable=True),
        sa.Column('perm', sa.String(length=1000), nullable=True),
        sa.Column('changed_by_fk', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.Column('created_by_fk', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('dashboard_slices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('dashboard_id', sa.Integer(), nullable=True),
        sa.Column('slice_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['dashboard_id'], ['dashboards.id'], ),
        sa.ForeignKeyConstraint(['slice_id'], ['slices.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('dashboard_user',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.Column('dashboard_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['dashboard_id'], ['dashboards.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('database_account',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.Column('database_id', sa.Integer(), nullable=True),
        sa.Column('username', sa.String(length=255), nullable=True),
        sa.Column('password', EncryptedType(), nullable=True),
        sa.ForeignKeyConstraint(['database_id'], ['dbs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('query',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.String(length=11), nullable=False),
        sa.Column('database_id', sa.Integer(), nullable=False),
        sa.Column('tmp_table_name', sa.String(length=256), nullable=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.Column('status', sa.String(length=16), nullable=True),
        sa.Column('tab_name', sa.String(length=256), nullable=True),
        sa.Column('sql_editor_id', sa.String(length=256), nullable=True),
        sa.Column('schema', sa.String(length=256), nullable=True),
        sa.Column('sql', sa.Text(), nullable=True),
        sa.Column('select_sql', sa.Text(), nullable=True),
        sa.Column('executed_sql', sa.Text(), nullable=True),
        sa.Column('limit', sa.Integer(), nullable=True),
        sa.Column('limit_used', sa.Boolean(), nullable=True, server_default="0"),
        sa.Column('limit_reached', sa.Boolean(), nullable=True, server_default="0"),
        sa.Column('select_as_cta', sa.Boolean(), nullable=True),
        sa.Column('select_as_cta_used', sa.Boolean(), nullable=True, server_default="0"),
        sa.Column('progress', sa.Integer(), nullable=True, server_default="0"),
        sa.Column('rows', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('results_key', sa.String(length=64), nullable=True),
        sa.Column('start_time', sa.Numeric(precision=20, scale=6), nullable=True),
        sa.Column('end_time', sa.Numeric(precision=20, scale=6), nullable=True),
        sa.Column('changed_on', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['database_id'], ['dbs.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('client_id')
    )
    op.create_index('ti_user_id_changed_on', 'query', ['user_id', 'changed_on'], unique=False)
    op.create_table('slice_user',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.Column('slice_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['slice_id'], ['slices.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('hdfs_connection',
        sa.Column('created_on', sa.DateTime(), nullable=True),
        sa.Column('changed_on', sa.DateTime(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('connection_name', sa.String(length=256), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('online', sa.Boolean(), nullable=True, server_default="0"),
        sa.Column('httpfs', sa.String(length=256), nullable=True),
        sa.Column('database_id', sa.Integer(), sa.ForeignKey("dbs.id"), nullable=True),
        sa.Column('webhdfs_url', sa.String(length=256), nullable=True),
        sa.Column('fs_defaultfs', sa.String(length=256), nullable=True),
        sa.Column('logical_name', sa.String(length=256), nullable=True),
        sa.Column('principal', sa.String(length=256), nullable=True),
        sa.Column('hdfs_user', sa.String(length=256), nullable=True),
        sa.Column('keytab_file', sa.LargeBinary(), nullable=True),
        sa.Column('changed_by_fk', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.Column('created_by_fk', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.ForeignKeyConstraint(['database_id'], ['dbs.id'], ),
        sa.PrimaryKeyConstraint('id')
        )
    op.create_table('dataset',
        sa.Column('created_on', sa.DateTime(), nullable=True),
        sa.Column('changed_on', sa.DateTime(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('dataset_name', sa.String(length=250), nullable=False),
        sa.Column('dataset_type', sa.String(length=250), nullable=True),
        sa.Column('online', sa.Boolean(), nullable=True, server_default="0"),
        sa.Column('main_dttm_col', sa.String(length=250), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('default_endpoint', sa.Text(), nullable=True),
        sa.Column('database_id', sa.Integer(), nullable=False),
        sa.Column('is_featured', sa.Boolean(), nullable=True),
        sa.Column('filter_select_enabled', sa.Boolean(), nullable=True, server_default="1"),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('offset', sa.Integer(), nullable=True, server_default="0"),
        sa.Column('cache_timeout', sa.Integer(), nullable=True),
        sa.Column('schema', sa.String(length=255), nullable=True),
        sa.Column('table_name', sa.String(length=250), nullable=True),
        sa.Column('sql', sa.Text(), nullable=True),
        sa.Column('params', sa.Text(), nullable=True),
        sa.Column('perm', sa.String(length=1000), nullable=True),
        sa.Column('changed_by_fk', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.Column('created_by_fk', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.ForeignKeyConstraint(['database_id'], ['dbs.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('dataset_name')
    )
    op.create_table('hdfs_table',
        sa.Column('created_on', sa.DateTime(), nullable=True),
        sa.Column('changed_on', sa.DateTime(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('hdfs_path', sa.String(length=256), nullable=False),
        sa.Column('separator', sa.String(length=256), nullable=False),
        sa.Column('file_type', sa.String(length=32), nullable=True),
        sa.Column('quote', sa.String(length=8), nullable=True),
        sa.Column('skip_rows', sa.Integer(), nullable=True),
        sa.Column('next_as_header', sa.Boolean(), nullable=True),
        sa.Column('skip_more_rows', sa.Integer(), nullable=True),
        sa.Column('nrows', sa.Integer(), nullable=True),
        sa.Column('charset', sa.String(length=32), nullable=True),
        sa.Column('hdfs_connection_id', sa.Integer(), sa.ForeignKey("hdfs_connection.id"), nullable=True),
        sa.Column('dataset_id', sa.Integer(), nullable=True),
        sa.Column('changed_by_fk', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.Column('created_by_fk', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.ForeignKeyConstraint(['hdfs_connection_id'], ['hdfs_connection.id'], ),
        sa.PrimaryKeyConstraint('id')
        )
    op.create_table('sql_metrics',
        sa.Column('created_on', sa.DateTime(), nullable=True),
        sa.Column('changed_on', sa.DateTime(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('metric_name', sa.String(length=512), nullable=True),
        sa.Column('verbose_name', sa.String(length=1024), nullable=True),
        sa.Column('metric_type', sa.String(length=32), nullable=True),
        sa.Column('dataset_id', sa.Integer(), nullable=True),
        sa.Column('expression', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_restricted', sa.Boolean(), nullable=True, server_default="0"),
        sa.Column('d3format', sa.String(length=128), nullable=True),
        sa.Column('changed_by_fk', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.Column('created_by_fk', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.ForeignKeyConstraint(['dataset_id'], ['dataset.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('table_columns',
        sa.Column('created_on', sa.DateTime(), nullable=True),
        sa.Column('changed_on', sa.DateTime(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('dataset_id', sa.Integer(), nullable=True),
        sa.Column('column_name', sa.String(length=255), nullable=True),
        sa.Column('verbose_name', sa.String(length=1024), nullable=True),
        sa.Column('is_dttm', sa.Boolean(), nullable=True, server_default="0"),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default="1"),
        sa.Column('type', sa.String(length=32), nullable=True),
        sa.Column('groupby', sa.Boolean(), nullable=True, server_default="0"),
        sa.Column('count_distinct', sa.Boolean(), nullable=True, server_default="0"),
        sa.Column('sum', sa.Boolean(), nullable=True, server_default="0"),
        sa.Column('avg', sa.Boolean(), nullable=True, server_default="0"),
        sa.Column('max', sa.Boolean(), nullable=True, server_default="0"),
        sa.Column('min', sa.Boolean(), nullable=True, server_default="0"),
        sa.Column('filterable', sa.Boolean(), nullable=True, server_default="1"),
        sa.Column('expression', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('python_date_format', sa.String(length=255), nullable=True),
        sa.Column('database_expression', sa.String(length=255), nullable=True),
        sa.Column('changed_by_fk', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.Column('created_by_fk', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.ForeignKeyConstraint(['dataset_id'], ['dataset.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('table_columns')
    op.drop_table('sql_metrics')
    op.drop_table('dataset')
    op.drop_table('slice_user')
    op.drop_index('ti_user_id_changed_on', table_name='query')
    op.drop_table('query')
    op.drop_table('database_account')
    op.drop_table('dashboard_user')
    op.drop_table('dashboard_slices')
    op.drop_table('slices')
    op.drop_table('logs')
    op.drop_table('favstar')
    op.drop_table('dbs')
    op.drop_table('dashboards')
    op.drop_table('daily_number')
    op.drop_table('hdfs_connection')
    op.drop_table('hdfs_table')
    # ### end Alembic commands ###
