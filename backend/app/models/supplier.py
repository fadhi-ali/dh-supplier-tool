import enum
import uuid
from datetime import datetime
from typing import Optional, Dict

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SupplierTier(str, enum.Enum):
    tier_1 = "tier_1"
    tier_2 = "tier_2"


class OrderTransmittalPreference(str, enum.Enum):
    secure_email = "secure_email"
    fax = "fax"
    api = "api"


class SupplierStatus(str, enum.Enum):
    in_progress = "in_progress"
    submitted = "submitted"
    under_review = "under_review"
    action_needed = "action_needed"
    approved = "approved"
    live = "live"


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invite_token: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    magic_link_token: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    magic_link_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    company_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    company_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tax_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    npi: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    primary_contact_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    primary_contact_email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    primary_contact_phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    escalation_contact_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    escalation_contact_email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    escalation_contact_phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    tier: Mapped[Optional[SupplierTier]] = mapped_column(Enum(SupplierTier), nullable=True)
    order_transmittal_preference: Mapped[Optional[OrderTransmittalPreference]] = mapped_column(
        Enum(OrderTransmittalPreference), nullable=True
    )
    transmittal_destination: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    shipping_fee_structure: Mapped[Optional[Dict]] = mapped_column(JSONB, nullable=True)
    return_policy: Mapped[Optional[Dict]] = mapped_column(JSONB, nullable=True)

    support_hours: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    support_phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    support_email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    after_hours_process: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    stripe_account_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    stripe_onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False)

    sla_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    sla_acknowledged_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    sla_acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    current_step: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[SupplierStatus] = mapped_column(
        Enum(SupplierStatus), default=SupplierStatus.in_progress
    )

    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    products = relationship("Product", back_populates="supplier", cascade="all, delete-orphan")
    payers = relationship("Payer", back_populates="supplier", cascade="all, delete-orphan")
    payer_exclusions = relationship("PayerExclusion", back_populates="supplier", cascade="all, delete-orphan")
    service_areas = relationship("ServiceArea", back_populates="supplier", cascade="all, delete-orphan")
    catalog_uploads = relationship("CatalogUpload", back_populates="supplier", cascade="all, delete-orphan")
    corrections = relationship("Correction", back_populates="supplier", cascade="all, delete-orphan")
