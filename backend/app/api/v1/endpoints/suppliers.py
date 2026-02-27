from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.supplier import Supplier, SupplierStatus
from app.models.correction import Correction
from app.api.deps import get_current_supplier
from app.schemas.admin import CorrectionRead
from app.schemas.supplier import (
    SupplierRead,
    SupplierStatusResponse,
    SupplierSubmitResponse,
    SupplierUpdate,
)
from app.services.notifications import send_submission_confirmation, send_ops_notification

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("/{supplier_id}", response_model=SupplierRead)
async def get_supplier(
    supplier_id: UUID,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Get full supplier record."""
    if str(current_supplier.id) != str(supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")
    return current_supplier


@router.patch("/{supplier_id}", response_model=SupplierRead)
async def update_supplier(
    supplier_id: UUID,
    body: SupplierUpdate,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Update any supplier fields (auto-save)."""
    if str(current_supplier.id) != str(supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_supplier, field, value)

    if "sla_acknowledged" in update_data and update_data["sla_acknowledged"]:
        current_supplier.sla_acknowledged_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(current_supplier)
    return current_supplier


@router.post("/{supplier_id}/submit", response_model=SupplierSubmitResponse)
async def submit_supplier(
    supplier_id: UUID,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Submit supplier application for review."""
    if str(current_supplier.id) != str(supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    allowed = (SupplierStatus.in_progress, SupplierStatus.action_needed)
    if current_supplier.status not in allowed:
        raise HTTPException(status_code=400, detail="Supplier cannot be submitted from current status")

    # Server-side validation
    errors: list[str] = []
    if not current_supplier.company_name:
        errors.append("Company name is required")
    if not current_supplier.tier:
        errors.append("Tier selection is required")
    if not current_supplier.sla_acknowledged:
        errors.append("SLA must be acknowledged")
    if not current_supplier.order_transmittal_preference:
        errors.append("Order transmittal preference is required")

    # Eager-load related data for validation
    result = await db.execute(
        select(Supplier)
        .where(Supplier.id == supplier_id)
        .options(
            selectinload(Supplier.products),
            selectinload(Supplier.payers),
            selectinload(Supplier.service_areas),
        )
    )
    loaded = result.scalar_one()

    approved_products = [p for p in loaded.products if p.approved_by_supplier]
    if len(approved_products) == 0:
        errors.append("At least one approved product is required")
    if len(loaded.payers) == 0:
        errors.append("At least one payer is required")
    if len(loaded.service_areas) == 0:
        errors.append("At least one service area is required")

    # Tier 1 requires Stripe
    if current_supplier.tier and current_supplier.tier.value == "tier_1":
        if not current_supplier.stripe_onboarding_complete:
            errors.append("Stripe onboarding must be completed for Tier 1")

    if errors:
        raise HTTPException(status_code=422, detail="; ".join(errors))

    # If resubmitting from action_needed, resolve outstanding corrections
    if current_supplier.status == SupplierStatus.action_needed:
        correction_result = await db.execute(
            select(Correction).where(
                Correction.supplier_id == supplier_id,
                Correction.resolved == False,
            )
        )
        for correction in correction_result.scalars().all():
            correction.resolved = True

    current_supplier.status = SupplierStatus.submitted
    current_supplier.submitted_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(current_supplier)

    send_submission_confirmation(current_supplier)
    send_ops_notification(f"New supplier submission: {current_supplier.company_name}")

    return SupplierSubmitResponse(
        id=current_supplier.id,
        status=current_supplier.status.value,
        submitted_at=current_supplier.submitted_at,
    )


@router.get("/{supplier_id}/status", response_model=SupplierStatusResponse)
async def get_supplier_status(
    supplier_id: UUID,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Get current supplier status."""
    if str(current_supplier.id) != str(supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    return SupplierStatusResponse(
        id=current_supplier.id,
        status=current_supplier.status.value,
        current_step=current_supplier.current_step,
        submitted_at=current_supplier.submitted_at,
        approved_at=current_supplier.approved_at,
    )


@router.get("/{supplier_id}/corrections", response_model=list[CorrectionRead])
async def get_corrections(
    supplier_id: UUID,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Get unresolved corrections for the supplier."""
    if str(current_supplier.id) != str(supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(Correction)
        .where(Correction.supplier_id == supplier_id, Correction.resolved == False)
        .order_by(Correction.step_number)
    )
    return result.scalars().all()
