"""add ratings table

Revision ID: f4b1d2a9c7e3
Revises: c2e7a1b8d4f6
Create Date: 2026-05-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f4b1d2a9c7e3'
down_revision = 'c2e7a1b8d4f6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'ratings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=1), nullable=False),
        sa.Column('mark_id', sa.Integer(), nullable=False),
        sa.Column('rating', sa.SmallInteger(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'type', 'mark_id', name='uq_rating_user_type_mark'),
    )


def downgrade():
    op.drop_table('ratings')
