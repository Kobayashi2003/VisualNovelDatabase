"""add users.email

Revision ID: b8c3e1f6a204
Revises: d2f1a8c4b6e0
Create Date: 2026-05-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b8c3e1f6a204'
down_revision = 'd2f1a8c4b6e0'
branch_labels = None
depends_on = None


def upgrade():
    # Add nullable first so existing rows can be backfilled before NOT NULL.
    op.add_column('users', sa.Column('email', sa.String(length=255), nullable=True))
    # Backfill the pre-existing account, which predates the email column.
    # If other email-less accounts exist, add UPDATE statements for them here,
    # otherwise the NOT NULL step below will fail.
    op.execute("UPDATE users SET email = 'jacklink853@gmail.com' WHERE username = 'kobayashi'")
    op.alter_column('users', 'email', nullable=False)
    op.create_unique_constraint('uq_users_email', 'users', ['email'])


def downgrade():
    op.drop_constraint('uq_users_email', 'users', type_='unique')
    op.drop_column('users', 'email')
