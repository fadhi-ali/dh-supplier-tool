from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class ExclusionCreate(BaseModel):
    payer_id: UUID
    product_id: Optional[UUID] = None
    category: Optional[str] = None


class ExclusionRead(BaseModel):
    id: UUID
    supplier_id: UUID
    payer_id: UUID
    product_id: Optional[UUID] = None
    category: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ExclusionListResponse(BaseModel):
    exclusions: List[ExclusionRead]
    total: int
