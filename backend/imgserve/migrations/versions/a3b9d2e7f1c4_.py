"""Add last_accessed_at to image tables for LRU bookkeeping.

Revision ID: a3b9d2e7f1c4
Revises: 97fc1b33bfec
Create Date: 2026-05-23 17:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = 'a3b9d2e7f1c4'
down_revision = '97fc1b33bfec'
branch_labels = None
depends_on = None


TABLES = ['ch', 'cv', 'cvt', 'sf', 'sft']


def upgrade():
    for table in TABLES:
        op.add_column(table, sa.Column('last_accessed_at', sa.DateTime(), nullable=True))


def downgrade():
    for table in TABLES:
        op.drop_column(table, 'last_accessed_at')
