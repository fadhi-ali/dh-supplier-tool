from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.models.supplier import Supplier, SupplierStatus
from app.models.correction import Correction
from app.schemas.admin import (
    AdminActionResponse,
    AdminSupplierDetail,
    AdminSupplierListItem,
    AdminSupplierListResponse,
    CorrectionRead,
    RequestCorrectionsBody,
)
from app.services.notifications import (
    send_status_update,
    send_correction_request,
    send_approval_notification,
    send_ops_notification,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

async def verify_admin(x_admin_password: str = Header(...)) -> None:
    if x_admin_password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")


@router.get("/suppliers", response_model=AdminSupplierListResponse)
async def list_suppliers(
    status: Optional[str] = None,
    limit: int = 25,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_admin),
):
    """List suppliers with optional status filter and pagination."""
    base_query = select(Supplier).order_by(Supplier.submitted_at.desc().nulls_last(), Supplier.updated_at.desc())

    if status and status != "all":
        try:
            status_enum = SupplierStatus(status)
            base_query = base_query.where(Supplier.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    # Total count before pagination
    count_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = count_result.scalar() or 0

    # Apply pagination
    result = await db.execute(base_query.offset(offset).limit(limit))
    suppliers = result.scalars().all()

    items = []
    for s in suppliers:
        items.append(AdminSupplierListItem(
            id=s.id,
            company_name=s.company_name,
            operations_contact_name=s.operations_contact_name,
            operations_contact_email=s.operations_contact_email,
            tier=s.tier.value if s.tier else None,
            status=s.status.value,
            current_step=s.current_step,
            submitted_at=s.submitted_at,
            updated_at=s.updated_at,
        ))

    return AdminSupplierListResponse(suppliers=items, total=total)


@router.post("/suppliers/invite")
async def invite_supplier(
    body: dict,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_admin),
):
    """Create a new supplier with an invite token."""
    email = body.get("email", "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email is required")

    existing = await db.execute(select(Supplier).where(Supplier.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A supplier with this email already exists")

    invite_token = str(uuid.uuid4())
    supplier = Supplier(
        invite_token=invite_token,
        email=email,
        status=SupplierStatus.in_progress,
        current_step=1,
    )
    db.add(supplier)
    await db.commit()
    await db.refresh(supplier)

    return {
        "id": str(supplier.id),
        "email": supplier.email,
        "invite_token": supplier.invite_token,
        "status": supplier.status.value,
        "current_step": supplier.current_step,
    }


@router.get("/suppliers/{supplier_id}", response_model=AdminSupplierDetail)
async def get_supplier_detail(
    supplier_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_admin),
):
    """Get full supplier detail with all related data."""
    result = await db.execute(
        select(Supplier)
        .where(Supplier.id == supplier_id)
        .options(
            selectinload(Supplier.products),
            selectinload(Supplier.payers),
            selectinload(Supplier.payer_exclusions),
            selectinload(Supplier.service_areas),
            selectinload(Supplier.corrections),
        )
    )
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    return AdminSupplierDetail(
        id=supplier.id,
        email=supplier.email,
        email_verified=supplier.email_verified,
        company_name=supplier.company_name,
        company_address=supplier.company_address,
        tax_id=supplier.tax_id,
        npi=supplier.npi,
        operations_contact_name=supplier.operations_contact_name,
        operations_contact_title=supplier.operations_contact_title,
        operations_contact_email=supplier.operations_contact_email,
        operations_contact_phone=supplier.operations_contact_phone,
        escalation_contact_name=supplier.escalation_contact_name,
        escalation_contact_title=supplier.escalation_contact_title,
        escalation_contact_email=supplier.escalation_contact_email,
        escalation_contact_phone=supplier.escalation_contact_phone,
        tier=supplier.tier.value if supplier.tier else None,
        order_transmittal_preference=supplier.order_transmittal_preference.value if supplier.order_transmittal_preference else None,
        transmittal_destination=supplier.transmittal_destination,
        shipping_fee_structure=supplier.shipping_fee_structure,
        return_policy=supplier.return_policy,
        support_hours=supplier.support_hours,
        support_phone=supplier.support_phone,
        support_email=supplier.support_email,
        after_hours_process=supplier.after_hours_process,
        stripe_account_id=supplier.stripe_account_id,
        stripe_onboarding_complete=supplier.stripe_onboarding_complete,
        sla_acknowledged=supplier.sla_acknowledged,
        sla_acknowledged_by=supplier.sla_acknowledged_by,
        sla_acknowledged_at=supplier.sla_acknowledged_at,
        current_step=supplier.current_step,
        status=supplier.status.value,
        submitted_at=supplier.submitted_at,
        approved_at=supplier.approved_at,
        created_at=supplier.created_at,
        updated_at=supplier.updated_at,
        products=supplier.products,
        payers=supplier.payers,
        exclusions=supplier.payer_exclusions,
        service_areas=supplier.service_areas,
        corrections=supplier.corrections,
    )


@router.post("/suppliers/{supplier_id}/claim", response_model=AdminActionResponse)
async def claim_for_review(
    supplier_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_admin),
):
    """Claim a supplier submission for review."""
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    if supplier.status != SupplierStatus.submitted:
        raise HTTPException(status_code=400, detail=f"Cannot claim supplier with status '{supplier.status.value}'")

    supplier.status = SupplierStatus.under_review
    await db.commit()

    send_status_update(supplier, "under_review")
    send_ops_notification(f"Supplier claimed for review: {supplier.company_name}")

    return AdminActionResponse(id=supplier.id, status="under_review", message="Supplier claimed for review")


@router.post("/suppliers/{supplier_id}/request-corrections", response_model=AdminActionResponse)
async def request_corrections(
    supplier_id: UUID,
    body: RequestCorrectionsBody,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_admin),
):
    """Request corrections from the supplier."""
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    if supplier.status not in (SupplierStatus.submitted, SupplierStatus.under_review):
        raise HTTPException(status_code=400, detail=f"Cannot request corrections for status '{supplier.status.value}'")

    # Create correction records
    for item in body.corrections:
        correction = Correction(
            supplier_id=supplier_id,
            step_number=item.step_number,
            comment=item.comment,
            created_by=body.reviewer_name,
        )
        db.add(correction)

    supplier.status = SupplierStatus.action_needed
    await db.commit()

    # Reload corrections for notification
    result2 = await db.execute(
        select(Correction)
        .where(Correction.supplier_id == supplier_id, Correction.resolved == False)
    )
    correction_records = result2.scalars().all()

    send_correction_request(supplier, correction_records)
    send_ops_notification(f"Corrections requested for: {supplier.company_name}")

    return AdminActionResponse(id=supplier.id, status="action_needed", message="Corrections requested")


@router.post("/suppliers/{supplier_id}/approve", response_model=AdminActionResponse)
async def approve_supplier(
    supplier_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_admin),
):
    """Approve a supplier."""
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    if supplier.status not in (SupplierStatus.submitted, SupplierStatus.under_review):
        raise HTTPException(status_code=400, detail=f"Cannot approve supplier with status '{supplier.status.value}'")

    supplier.status = SupplierStatus.approved
    supplier.approved_at = datetime.now(timezone.utc)
    await db.commit()

    send_approval_notification(supplier)
    send_ops_notification(f"Supplier approved: {supplier.company_name}")

    return AdminActionResponse(id=supplier.id, status="approved", message="Supplier approved")


@router.post("/suppliers/{supplier_id}/go-live", response_model=AdminActionResponse)
async def go_live(
    supplier_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_admin),
):
    """Mark a supplier as live."""
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    if supplier.status != SupplierStatus.approved:
        raise HTTPException(status_code=400, detail=f"Cannot go live from status '{supplier.status.value}'")

    supplier.status = SupplierStatus.live
    await db.commit()

    send_status_update(supplier, "live")
    send_ops_notification(f"Supplier is now LIVE: {supplier.company_name}")

    return AdminActionResponse(id=supplier.id, status="live", message="Supplier is now live")
