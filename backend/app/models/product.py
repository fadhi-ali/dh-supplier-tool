import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, List

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    supplier_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False)

    product_name: Mapped[str] = mapped_column(String, nullable=False)
    hcpcs_code: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    retail_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    hcpcs_fee_schedule: Mapped[Optional[Dict]] = mapped_column(JSONB, nullable=True)
    sku: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    manufacturer: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    variant_size: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    fulfillment_types: Mapped[Optional[List]] = mapped_column(JSONB, nullable=True)
    ai_confidence: Mapped[Optional[Dict]] = mapped_column(JSONB, nullable=True)
    approved_by_supplier: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    supplier = relationship("Supplier", back_populates="products")
