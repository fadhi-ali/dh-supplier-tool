import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ServiceArea(Base):
    __tablename__ = "service_areas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    supplier_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False)

    state: Mapped[str] = mapped_column(String, nullable=False)
    cities: Mapped[Optional[List]] = mapped_column(JSONB, nullable=True)
    zip_codes: Mapped[Optional[List]] = mapped_column(JSONB, nullable=True)
    standard_delivery_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    expedited_delivery_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    supplier = relationship("Supplier", back_populates="service_areas")
