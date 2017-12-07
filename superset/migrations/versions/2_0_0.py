"""add sroty layer

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
    op.add_column('dashboards', sa.Column('image', sa.LargeBinary(length=(2**32)-1)))
    op.add_column('dashboards', sa.Column('need_capture', sa.Boolean(), server_default="1"))
    op.create_table('stories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('story_name', sa.String(length=128), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('online', sa.Boolean(), nullable=True, server_default="0"),
        sa.Column('order_json', sa.Text(), nullable=True),
        sa.Column('created_on', sa.DateTime(), nullable=True),
        sa.Column('created_by_fk', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.Column('changed_on', sa.DateTime(), nullable=True),
        sa.Column('changed_by_fk', sa.Integer(), sa.ForeignKey("ab_user.id"), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('story_name', 'created_by_fk', name='story_name_owner_uc')
    )
    op.create_table('story_dashboards',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('story_id', sa.Integer(), nullable=True),
        sa.Column('dashboard_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['story_id'], ['stories.id'], ),
        sa.ForeignKeyConstraint(['dashboard_id'], ['dashboards.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('story_index_online', 'stories', ['online'])


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index('story_index_online', 'stories')
    op.drop_table('story_dashboards')
    op.drop_table('stories')
    op.drop_column('dashboards', 'image')
    op.drop_column('dashboards', 'need_capture')
    # ### end Alembic commands ###
