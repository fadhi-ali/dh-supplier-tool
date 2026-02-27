from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


class VerifyTokenRequest(BaseModel):
    invite_token: str


class VerifyTokenResponse(BaseModel):
    supplier_id: UUID
    email: str
    email_verified: bool
    company_name: Optional[str] = None
    current_step: int
    status: str
    access_token: Optional[str] = None


class SendMagicLinkRequest(BaseModel):
    email: EmailStr


class SendMagicLinkResponse(BaseModel):
    message: str


class VerifyMagicLinkRequest(BaseModel):
    token: str


class VerifyMagicLinkResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    supplier_id: UUID
