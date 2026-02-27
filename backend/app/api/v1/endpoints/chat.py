from __future__ import annotations

import json
import logging

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.supplier import Supplier
from app.models.product import Product
from app.models.payer import Payer
from app.models.payer_exclusion import PayerExclusion
from app.models.service_area import ServiceArea
from app.api.deps import get_current_supplier
from app.schemas.chat import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])

SYSTEM_PROMPT_TEMPLATE = """You are the Doorbell Health onboarding assistant. You help DME supplier partners complete their onboarding to the Doorbell Health marketplace platform.

You are an on-demand assistant — the supplier can ask you questions at any point during the onboarding process. Be concise, helpful, and knowledgeable about DME industry terminology.

Context about the supplier's current onboarding state:
{supplier_context_json}

The supplier is currently on Step {current_step} of 11.

Here's what each step covers:
1. Company Information (Tax ID, NPI, contacts)
2. Tier Selection (Tier 1 = Doorbell transacts via marketplace + Stripe; Tier 2 = supplier owns transaction, Doorbell sends order packet)
3. Product Catalog & Pricing (upload in any format, AI normalizes, supplier reviews)
4. Accepted Payers (insurance plans + network types: HMO, PPO, EPO, etc.)
5. Payer-Product Exclusions (flag exceptions where specific payers don't apply to specific products)
6. Geographic Service Area & Delivery Timeframes (by state/city/zip with delivery days per zone)
7. Operations Setup (shipping fees, return policy, customer support info)
8. Order Transmittal Preference (secure email, fax, or API integration)
9. Stripe Connected Account (Tier 1 only — payment setup)
10. SLAs & Ways of Working (acknowledgment of service level expectations)
11. Review & Submit

Guidelines:
- Answer questions about any step, even if the supplier isn't on that step yet
- If on Step 5 (exclusions), proactively ask about common exclusion patterns: "Do you accept Medicaid for all product categories? Are there products you only fulfill for commercial plans?"
- Explain Tier 1 vs Tier 2 differences clearly when asked
- You cannot modify the supplier's data — only advise
- You cannot negotiate commission rates or contract terms
- If a question is outside your scope, direct the supplier to their Doorbell partnership contact
- Keep responses concise — 2-3 sentences for simple questions, more for complex ones"""


async def _build_supplier_context(supplier: Supplier, db: AsyncSession) -> dict:
    """Build a JSON-serializable context dict from the supplier's onboarding state."""
    # Count products
    prod_result = await db.execute(
        select(func.count()).select_from(Product).where(Product.supplier_id == supplier.id)
    )
    product_count = prod_result.scalar() or 0

    # Get payer names
    payer_result = await db.execute(
        select(Payer.payer_name, Payer.network_type)
        .where(Payer.supplier_id == supplier.id)
    )
    payers = [{"name": r[0], "network_type": r[1]} for r in payer_result.all()]

    # Count exclusions
    excl_result = await db.execute(
        select(func.count()).select_from(PayerExclusion).where(PayerExclusion.supplier_id == supplier.id)
    )
    exclusion_count = excl_result.scalar() or 0

    # Get service areas
    sa_result = await db.execute(
        select(ServiceArea.state, ServiceArea.standard_delivery_days, ServiceArea.expedited_delivery_days)
        .where(ServiceArea.supplier_id == supplier.id)
    )
    service_areas = [
        {"state": r[0], "standard_days": r[1], "expedited_days": r[2]}
        for r in sa_result.all()
    ]

    return {
        "company_name": supplier.company_name,
        "tier": supplier.tier.value if supplier.tier else None,
        "product_count": product_count,
        "payers": payers,
        "payer_count": len(payers),
        "exclusion_count": exclusion_count,
        "service_areas": service_areas,
        "service_area_count": len(service_areas),
        "order_transmittal": supplier.order_transmittal_preference.value if supplier.order_transmittal_preference else None,
        "stripe_complete": supplier.stripe_onboarding_complete,
        "sla_acknowledged": supplier.sla_acknowledged,
        "status": supplier.status.value,
    }


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the AI onboarding assistant."""
    if str(current_supplier.id) != str(body.supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="AI assistant is not configured")

    # Build context
    context = await _build_supplier_context(current_supplier, db)
    context_json = json.dumps(context, indent=2, default=str)

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        supplier_context_json=context_json,
        current_step=body.current_step,
    )

    # Call Claude
    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": body.message}],
        )

        reply = ""
        for block in response.content:
            if block.type == "text":
                reply += block.text

        return ChatResponse(message=reply)

    except Exception:
        logger.exception("Chat API call failed")
        raise HTTPException(status_code=500, detail="Failed to get response from AI assistant")
