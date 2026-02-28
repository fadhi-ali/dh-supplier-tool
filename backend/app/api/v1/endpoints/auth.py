from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.supplier import Supplier
from app.api.deps import create_access_token, get_current_supplier
from app.schemas.auth import (
    RefreshTokenResponse,
    SendMagicLinkRequest,
    SendMagicLinkResponse,
    VerifyMagicLinkRequest,
    VerifyMagicLinkResponse,
    VerifyTokenRequest,
    VerifyTokenResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/verify-token", response_model=VerifyTokenResponse)
async def verify_token(body: VerifyTokenRequest, db: AsyncSession = Depends(get_db)):
    """Validate an invite token and return supplier context."""
    result = await db.execute(
        select(Supplier).where(Supplier.invite_token == body.invite_token)
    )
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Invalid invite token")

    # If already verified, issue a JWT so the frontend can skip the magic link flow
    access_token = None
    if supplier.email_verified:
        access_token = create_access_token(supplier.id)

    return VerifyTokenResponse(
        supplier_id=supplier.id,
        email=supplier.email,
        email_verified=supplier.email_verified,
        company_name=supplier.company_name,
        current_step=supplier.current_step,
        status=supplier.status.value,
        access_token=access_token,
    )


@router.post("/send-magic-link", response_model=SendMagicLinkResponse)
async def send_magic_link(body: SendMagicLinkRequest, db: AsyncSession = Depends(get_db)):
    """Send a magic link email for passwordless auth."""
    result = await db.execute(
        select(Supplier).where(Supplier.email == body.email)
    )
    supplier = result.scalar_one_or_none()

    if supplier:
        token = secrets.token_urlsafe(32)
        supplier.magic_link_token = token
        supplier.magic_link_expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.MAGIC_LINK_EXPIRATION_MINUTES
        )
        await db.commit()

        from app.services.notifications import send_magic_link_email
        send_magic_link_email(supplier.email, token)

    # Always return success to prevent email enumeration
    return SendMagicLinkResponse(message="If the email is registered, a magic link has been sent.")


@router.post("/verify-magic-link", response_model=VerifyMagicLinkResponse)
async def verify_magic_link(body: VerifyMagicLinkRequest, db: AsyncSession = Depends(get_db)):
    """Verify a magic link token and return a JWT session."""
    result = await db.execute(
        select(Supplier).where(Supplier.magic_link_token == body.token)
    )
    supplier = result.scalar_one_or_none()

    if not supplier:
        raise HTTPException(status_code=400, detail="Invalid or expired magic link")

    if supplier.magic_link_expires_at and supplier.magic_link_expires_at < datetime.now(timezone.utc):
        supplier.magic_link_token = None
        supplier.magic_link_expires_at = None
        await db.commit()
        raise HTTPException(status_code=400, detail="Magic link has expired")

    # Mark email as verified and clear magic link
    supplier.email_verified = True
    supplier.magic_link_token = None
    supplier.magic_link_expires_at = None
    await db.commit()

    access_token = create_access_token(supplier.id)

    return VerifyMagicLinkResponse(
        access_token=access_token,
        supplier_id=supplier.id,
    )


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(
    current_supplier: Supplier = Depends(get_current_supplier),
):
    """Exchange a valid JWT for a fresh one with extended expiry."""
    new_token = create_access_token(current_supplier.id)
    return RefreshTokenResponse(access_token=new_token)
