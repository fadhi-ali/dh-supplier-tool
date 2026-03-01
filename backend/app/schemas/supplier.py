from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


class SupplierRead(BaseModel):
    id: UUID
    invite_token: str
    email: str
    email_verified: bool
    company_name: Optional[str] = None
    company_address: Optional[str] = None
    tax_id: Optional[str] = None
    npi: Optional[str] = None
    operations_contact_name: Optional[str] = None
    operations_contact_title: Optional[str] = None
    operations_contact_email: Optional[str] = None
    operations_contact_phone: Optional[str] = None
    escalation_contact_name: Optional[str] = None
    escalation_contact_title: Optional[str] = None
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

    model_config = {"from_attributes": True}


class SupplierUpdate(BaseModel):
    company_name: Optional[str] = None
    company_address: Optional[str] = None
    tax_id: Optional[str] = None
    npi: Optional[str] = None
    operations_contact_name: Optional[str] = None
    operations_contact_title: Optional[str] = None
    operations_contact_email: Optional[str] = None
    operations_contact_phone: Optional[str] = None
    escalation_contact_name: Optional[str] = None
    escalation_contact_title: Optional[str] = None
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
    sla_acknowledged: Optional[bool] = None
    sla_acknowledged_by: Optional[str] = None
    current_step: Optional[int] = None


class SupplierSubmitResponse(BaseModel):
    id: UUID
    status: str
    submitted_at: datetime


class SupplierStatusResponse(BaseModel):
    id: UUID
    status: str
    current_step: int
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
