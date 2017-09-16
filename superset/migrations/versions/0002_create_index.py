"""create index

Revision ID: 0002
Revises: 0001
Create Date: 2017-05-10 10:26:56.139842

"""

# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001'

from alembic import op


def upgrade():
    op.create_index('index_online', 'dashboards', ['online'])
    op.create_index('index_online', 'slices', ['online'])
    op.create_index('index_online', 'dataset', ['online'])
    op.create_index('index_online', 'dbs', ['online'])
    op.create_index('index_online', 'hdfs_connection', ['online'])
    op.create_index('index_obj_type', 'daily_number', ['obj_type'])
    op.create_index('index_class_name', 'favstar', ['class_name'])
    op.create_index('index_action_type', 'logs', ['action_type'])


def downgrade():
    op.drop_index('index_online', 'dashboards')
    op.drop_index('index_online', 'slices')
    op.drop_index('index_online', 'dataset')
    op.drop_index('index_online', 'dbs')
    op.drop_index('index_online', 'hdfs_connection')
    op.drop_index('index_obj_type', 'daily_number')
    op.drop_index('index_class_name', 'favstar')
    op.drop_index('index_action_type', 'logs')
