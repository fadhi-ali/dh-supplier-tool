from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class ProductRead(BaseModel):
    id: UUID
    supplier_id: UUID
    product_name: str
    hcpcs_code: Optional[str] = None
    category: Optional[str] = None
    retail_price: Optional[Decimal] = None
    hcpcs_fee_schedule: Optional[dict] = None
    sku: Optional[str] = None
    manufacturer: Optional[str] = None
    variant_size: Optional[str] = None
    fulfillment_types: Optional[List[str]] = None
    ai_confidence: Optional[dict] = None
    approved_by_supplier: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    product_name: str
    hcpcs_code: Optional[str] = None
    category: Optional[str] = None
    retail_price: Optional[Decimal] = None
    sku: Optional[str] = None
    manufacturer: Optional[str] = None
    variant_size: Optional[str] = None
    fulfillment_types: Optional[List[str]] = None


class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    hcpcs_code: Optional[str] = None
    category: Optional[str] = None
    retail_price: Optional[Decimal] = None
    hcpcs_fee_schedule: Optional[dict] = None
    sku: Optional[str] = None
    manufacturer: Optional[str] = None
    variant_size: Optional[str] = None
    fulfillment_types: Optional[List[str]] = None


class ProductListResponse(BaseModel):
    products: List[ProductRead]
    total: int


class ProductApproveResponse(BaseModel):
    approved_count: int


class CatalogUploadResponse(BaseModel):
    upload_id: UUID
    original_filename: str
    processing_status: str


class UploadStatusResponse(BaseModel):
    upload_id: Optional[UUID] = None
    original_filename: Optional[str] = None
    processing_status: str
    product_count: int
