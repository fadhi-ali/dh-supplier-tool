from __future__ import annotations

import logging

import stripe
from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select

from app.config import settings
from app.database import async_session
from app.models.supplier import Supplier

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if settings.STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # No webhook secret configured — parse raw payload (dev mode)
        import json
        event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)

    if event.type == "account.updated":
        account = event.data.object
        account_id = account.get("id")
        details_submitted = account.get("details_submitted", False)
        charges_enabled = account.get("charges_enabled", False)
        is_complete = bool(details_submitted and charges_enabled)

        async with async_session() as db:
            result = await db.execute(
                select(Supplier).where(Supplier.stripe_account_id == account_id)
            )
            supplier = result.scalar_one_or_none()

            if supplier and supplier.stripe_onboarding_complete != is_complete:
                supplier.stripe_onboarding_complete = is_complete
                await db.commit()
                logger.info(
                    "Stripe webhook: updated %s (%s) onboarding_complete=%s",
                    supplier.company_name,
                    account_id,
                    is_complete,
                )

    return {"status": "ok"}
