from datetime import datetime
from typing import List
from uuid import UUID

from pydantic import BaseModel


class PayerCreate(BaseModel):
    payer_name: str
    network_type: str


class PayerRead(BaseModel):
    id: UUID
    supplier_id: UUID
    payer_name: str
    network_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PayerListResponse(BaseModel):
    payers: List[PayerRead]
    total: int


class PayerBulkCreate(BaseModel):
    payers: List[PayerCreate]
