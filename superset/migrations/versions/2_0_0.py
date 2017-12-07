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


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('dashboards', 'image')
    op.drop_column('dashboards', 'need_capture')
    # ### end Alembic commands ###
