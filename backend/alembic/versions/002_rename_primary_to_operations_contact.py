"""Rename primary_contact_* columns to operations_contact_*

Revision ID: 002
Revises: 001
"""
from alembic import op

revision = "002"
down_revision = "001"


def upgrade() -> None:
    op.alter_column("suppliers", "primary_contact_name", new_column_name="operations_contact_name")
    op.alter_column("suppliers", "primary_contact_title", new_column_name="operations_contact_title")
    op.alter_column("suppliers", "primary_contact_email", new_column_name="operations_contact_email")
    op.alter_column("suppliers", "primary_contact_phone", new_column_name="operations_contact_phone")


def downgrade() -> None:
    op.alter_column("suppliers", "operations_contact_name", new_column_name="primary_contact_name")
    op.alter_column("suppliers", "operations_contact_title", new_column_name="primary_contact_title")
    op.alter_column("suppliers", "operations_contact_email", new_column_name="primary_contact_email")
    op.alter_column("suppliers", "operations_contact_phone", new_column_name="primary_contact_phone")
