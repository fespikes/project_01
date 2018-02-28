"""modify unique constraint, add table 'number', add three columns for dashboard

Revision ID: 2_0_0
Revises: None
Create Date: 2017-11-16
"""

# revision identifiers, used by Alembic.
revision = '2_0_0'
down_revision = '1_0_0'

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.drop_constraint('database_name_owner_uc', 'dbs', type_='unique')
    op.drop_constraint('connection_name_owner_uc', 'hdfs_connection', type_='unique')
    op.drop_constraint('dataset_name_owner_uc', 'dataset', type_='unique')
    op.drop_constraint('slice_name_owner_uc', 'slices', type_='unique')
    op.drop_constraint('dashboard_title_owner_uc', 'dashboards', type_='unique')

    op.create_unique_constraint('dashboard_title_uc', 'dashboards', ['dashboard_title'])
    op.create_unique_constraint('slice_name_uc', 'slices', ['slice_name'])
    op.create_unique_constraint('dataset_name_uc', 'dataset', ['dataset_name'])
    op.create_unique_constraint('database_name_uc', 'dbs', ['database_name'])
    op.create_unique_constraint('hdfs_connection_name_uc', 'hdfs_connection', ['connection_name'])

    op.add_column('dashboards', sa.Column('image', sa.LargeBinary(length=(2**32)-1)))
    op.add_column('dashboards', sa.Column('need_capture', sa.Boolean(), server_default="1"))
    op.add_column('logs', sa.Column('username', sa.String(length=128)))

    op.create_table('number',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('obj_type', sa.String(length=32), nullable=False),
        sa.Column('username', sa.String(length=128), nullable=False),
        sa.Column('dt', sa.Date(), nullable=False),
        sa.Column('count', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('number_index_type', 'number', ['obj_type'])


def downgrade():
    op.drop_index('number_index_type', 'number')
    op.drop_table('number')

    op.drop_column('logs', 'username')
    op.drop_column('dashboards', 'image')
    op.drop_column('dashboards', 'need_capture')

    op.drop_constraint('database_name_uc', 'dbs', type_='unique')
    op.drop_constraint('hdfs_connection_name_uc', 'hdfs_connection', type_='unique')
    op.drop_constraint('dataset_name_uc', 'dataset', type_='unique')
    op.drop_constraint('slice_name_uc', 'slices', type_='unique')
    op.drop_constraint('dashboard_title_uc', 'dashboards', type_='unique')

    # back to 1_0_0, keep name to be globally unique
    op.create_unique_constraint('dashboard_title_owner_uc', 'dashboards', ['dashboard_title'])
    op.create_unique_constraint('slice_name_owner_uc', 'slices', ['slice_name'])
    op.create_unique_constraint('dataset_name_owner_uc', 'dataset', ['dataset_name'])
    op.create_unique_constraint('database_name_owner_uc', 'dbs', ['database_name'])
    op.create_unique_constraint('connection_name_owner_uc', 'hdfs_connection', ['connection_name'])

