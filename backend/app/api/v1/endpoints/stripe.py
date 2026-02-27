from __future__ import annotations

import logging
from typing import Optional
from uuid import UUID

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.supplier import Supplier
from app.api.deps import get_current_supplier

logger = logging.getLogger(__name__)

router = APIRouter(tags=["stripe"])

stripe.api_key = settings.STRIPE_SECRET_KEY


class AccountLinkResponse(BaseModel):
    url: str


class StripeStatusResponse(BaseModel):
    stripe_account_id: Optional[str] = None
    details_submitted: bool
    charges_enabled: bool
    onboarding_complete: bool


@router.post(
    "/suppliers/{supplier_id}/stripe/create-account-link",
    response_model=AccountLinkResponse,
)
async def create_account_link(
    supplier_id: UUID,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Connect onboarding link."""
    if str(current_supplier.id) != str(supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Create a Connect account if one doesn't exist yet
    if not current_supplier.stripe_account_id:
        account = stripe.Account.create(
            type="express",
            email=current_supplier.email,
            business_profile={"name": current_supplier.company_name or ""},
        )
        current_supplier.stripe_account_id = account.id
        await db.commit()
        await db.refresh(current_supplier)

    # Generate an account link for onboarding
    base_url = settings.FRONTEND_URL
    account_link = stripe.AccountLink.create(
        account=current_supplier.stripe_account_id,
        refresh_url=f"{base_url}/onboard/{current_supplier.invite_token}?stripe_refresh=1",
        return_url=f"{base_url}/onboard/{current_supplier.invite_token}?stripe_return=1",
        type="account_onboarding",
    )

    return AccountLinkResponse(url=account_link.url)


@router.post(
    "/suppliers/{supplier_id}/stripe/check-status",
    response_model=StripeStatusResponse,
)
async def check_stripe_status(
    supplier_id: UUID,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Check the Stripe Connect account status."""
    if str(current_supplier.id) != str(supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    if not current_supplier.stripe_account_id:
        return StripeStatusResponse(
            stripe_account_id=None,
            details_submitted=False,
            charges_enabled=False,
            onboarding_complete=False,
        )

    account = stripe.Account.retrieve(current_supplier.stripe_account_id)
    is_complete = bool(account.details_submitted and account.charges_enabled)

    if is_complete != current_supplier.stripe_onboarding_complete:
        current_supplier.stripe_onboarding_complete = is_complete
        await db.commit()
        await db.refresh(current_supplier)

    return StripeStatusResponse(
        stripe_account_id=current_supplier.stripe_account_id,
        details_submitted=bool(account.details_submitted),
        charges_enabled=bool(account.charges_enabled),
        onboarding_complete=is_complete,
    )
