from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class ServiceAreaCreate(BaseModel):
    state: str
    cities: Optional[List[str]] = None
    zip_codes: Optional[List[str]] = None
    standard_delivery_days: Optional[int] = None
    expedited_delivery_days: Optional[int] = None


class ServiceAreaRead(BaseModel):
    id: UUID
    supplier_id: UUID
    state: str
    cities: Optional[List[str]] = None
    zip_codes: Optional[List[str]] = None
    standard_delivery_days: Optional[int] = None
    expedited_delivery_days: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ServiceAreaListResponse(BaseModel):
    service_areas: List[ServiceAreaRead]
    total: int
