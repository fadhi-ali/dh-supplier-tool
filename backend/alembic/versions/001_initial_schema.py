"""initial_schema

Revision ID: 001
Revises:
Create Date: 2026-02-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Enum types
supplier_tier = postgresql.ENUM("tier_1", "tier_2", name="suppliertier", create_type=False)
order_transmittal = postgresql.ENUM("secure_email", "fax", "api", name="ordertransmittalpreference", create_type=False)
supplier_status = postgresql.ENUM(
    "in_progress", "submitted", "under_review", "action_needed", "approved", "live",
    name="supplierstatus", create_type=False,
)
processing_status = postgresql.ENUM("uploaded", "processing", "completed", "failed", name="processingstatus", create_type=False)


def upgrade() -> None:
    # Create enum types
    supplier_tier.create(op.get_bind(), checkfirst=True)
    order_transmittal.create(op.get_bind(), checkfirst=True)
    supplier_status.create(op.get_bind(), checkfirst=True)
    processing_status.create(op.get_bind(), checkfirst=True)

    # --- suppliers ---
    op.create_table(
        "suppliers",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("invite_token", sa.String(), nullable=False, unique=True),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("email_verified", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("company_name", sa.String(), nullable=True),
        sa.Column("company_address", sa.Text(), nullable=True),
        sa.Column("tax_id", sa.String(), nullable=True),
        sa.Column("npi", sa.String(), nullable=True),
        sa.Column("primary_contact_name", sa.String(), nullable=True),
        sa.Column("primary_contact_email", sa.String(), nullable=True),
        sa.Column("primary_contact_phone", sa.String(), nullable=True),
        sa.Column("escalation_contact_name", sa.String(), nullable=True),
        sa.Column("escalation_contact_email", sa.String(), nullable=True),
        sa.Column("escalation_contact_phone", sa.String(), nullable=True),
        sa.Column("tier", supplier_tier, nullable=True),
        sa.Column("order_transmittal_preference", order_transmittal, nullable=True),
        sa.Column("transmittal_destination", sa.String(), nullable=True),
        sa.Column("shipping_fee_structure", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column("return_policy", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column("support_hours", sa.String(), nullable=True),
        sa.Column("support_phone", sa.String(), nullable=True),
        sa.Column("support_email", sa.String(), nullable=True),
        sa.Column("after_hours_process", sa.Text(), nullable=True),
        sa.Column("stripe_account_id", sa.String(), nullable=True),
        sa.Column("stripe_onboarding_complete", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("sla_acknowledged", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("sla_acknowledged_by", sa.String(), nullable=True),
        sa.Column("sla_acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_step", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("status", supplier_status, server_default=sa.text("'in_progress'"), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_suppliers_invite_token", "suppliers", ["invite_token"], unique=True)

    # --- products ---
    op.create_table(
        "products",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("supplier_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("product_name", sa.String(), nullable=False),
        sa.Column("hcpcs_code", sa.String(), nullable=True),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("retail_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("hcpcs_fee_schedule", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column("sku", sa.String(), nullable=True),
        sa.Column("manufacturer", sa.String(), nullable=True),
        sa.Column("variant_size", sa.String(), nullable=True),
        sa.Column("fulfillment_types", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column("ai_confidence", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column("approved_by_supplier", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- payers ---
    op.create_table(
        "payers",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("supplier_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("payer_name", sa.String(), nullable=False),
        sa.Column("network_type", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- payer_exclusions ---
    op.create_table(
        "payer_exclusions",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("supplier_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("payer_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("payers.id"), nullable=False),
        sa.Column("product_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=True),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- service_areas ---
    op.create_table(
        "service_areas",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("supplier_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("state", sa.String(), nullable=False),
        sa.Column("cities", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column("zip_codes", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column("standard_delivery_days", sa.Integer(), nullable=True),
        sa.Column("expedited_delivery_days", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- catalog_uploads ---
    op.create_table(
        "catalog_uploads",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("supplier_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("original_filename", sa.String(), nullable=False),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.Column("file_type", sa.String(), nullable=False),
        sa.Column("processing_status", processing_status, server_default=sa.text("'uploaded'"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("catalog_uploads")
    op.drop_table("service_areas")
    op.drop_table("payer_exclusions")
    op.drop_table("payers")
    op.drop_table("products")
    op.drop_table("suppliers")

    processing_status.drop(op.get_bind(), checkfirst=True)
    supplier_status.drop(op.get_bind(), checkfirst=True)
    order_transmittal.drop(op.get_bind(), checkfirst=True)
    supplier_tier.drop(op.get_bind(), checkfirst=True)
