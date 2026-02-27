from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


# --- Correction schemas ---

class CorrectionItem(BaseModel):
    step_number: int
    comment: str


class CorrectionRead(BaseModel):
    id: UUID
    supplier_id: UUID
    step_number: int
    comment: str
    resolved: bool
    created_by: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RequestCorrectionsBody(BaseModel):
    reviewer_name: str
    corrections: List[CorrectionItem]


# --- Admin supplier list ---

class AdminSupplierListItem(BaseModel):
    id: UUID
    company_name: Optional[str] = None
    primary_contact_name: Optional[str] = None
    primary_contact_email: Optional[str] = None
    tier: Optional[str] = None
    status: str
    current_step: int
    submitted_at: Optional[datetime] = None
    updated_at: datetime

    model_config = {"from_attributes": True}


class AdminSupplierListResponse(BaseModel):
    suppliers: List[AdminSupplierListItem]
    total: int


# --- Admin supplier detail ---

class ProductSummary(BaseModel):
    id: UUID
    product_name: str
    hcpcs_code: Optional[str] = None
    category: Optional[str] = None
    retail_price: Optional[Decimal] = None
    variant_size: Optional[str] = None
    fulfillment_types: Optional[List[str]] = None
    sku: Optional[str] = None
    manufacturer: Optional[str] = None
    approved_by_supplier: bool

    model_config = {"from_attributes": True}


class PayerSummary(BaseModel):
    id: UUID
    payer_name: str
    network_type: str

    model_config = {"from_attributes": True}


class ExclusionSummary(BaseModel):
    id: UUID
    payer_id: UUID
    product_id: Optional[UUID] = None
    category: Optional[str] = None

    model_config = {"from_attributes": True}


class ServiceAreaSummary(BaseModel):
    id: UUID
    state: str
    cities: Optional[List[str]] = None
    zip_codes: Optional[List[str]] = None
    standard_delivery_days: Optional[int] = None
    expedited_delivery_days: Optional[int] = None

    model_config = {"from_attributes": True}


class AdminSupplierDetail(BaseModel):
    id: UUID
    email: str
    email_verified: bool
    company_name: Optional[str] = None
    company_address: Optional[str] = None
    tax_id: Optional[str] = None
    npi: Optional[str] = None
    primary_contact_name: Optional[str] = None
    primary_contact_email: Optional[str] = None
    primary_contact_phone: Optional[str] = None
    escalation_contact_name: Optional[str] = None
    escalation_contact_email: Optional[str] = None
    escalation_contact_phone: Optional[str] = None
    tier: Optional[str] = None
    order_transmittal_preference: Optional[str] = None
    transmittal_destination: Optional[str] = None
    shipping_fee_structure: Optional[dict] = None
    return_policy: Optional[dict] = None
    support_hours: Optional[str] = None
    support_phone: Optional[str] = None
    support_email: Optional[str] = None
    after_hours_process: Optional[str] = None
    stripe_account_id: Optional[str] = None
    stripe_onboarding_complete: bool
    sla_acknowledged: bool
    sla_acknowledged_by: Optional[str] = None
    sla_acknowledged_at: Optional[datetime] = None
    current_step: int
    status: str
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    products: List[ProductSummary]
    payers: List[PayerSummary]
    exclusions: List[ExclusionSummary]
    service_areas: List[ServiceAreaSummary]
    corrections: List[CorrectionRead]

    model_config = {"from_attributes": True}


# --- Action responses ---

class AdminActionResponse(BaseModel):
    id: UUID
    status: str
    message: str
