"""add token_blocklist table and users.tokens_revoked_at

Revision ID: d2f1a8c4b6e0
Revises: b5a6e02abd26
Create Date: 2026-05-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd2f1a8c4b6e0'
down_revision = 'b5a6e02abd26'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('tokens_revoked_at', sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        'token_blocklist',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('jti', sa.String(length=36), nullable=False),
        sa.Column('token_type', sa.String(length=16), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('jti'),
    )


def downgrade():
    op.drop_table('token_blocklist')
    op.drop_column('users', 'tokens_revoked_at')
