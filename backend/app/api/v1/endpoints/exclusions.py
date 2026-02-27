from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.supplier import Supplier
from app.models.payer_exclusion import PayerExclusion
from app.api.deps import get_current_supplier
from app.schemas.payer_exclusion import ExclusionCreate, ExclusionListResponse, ExclusionRead

router = APIRouter(tags=["payer_exclusions"])


@router.get("/suppliers/{supplier_id}/exclusions", response_model=ExclusionListResponse)
async def list_exclusions(
    supplier_id: UUID,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """List all payer exclusions for a supplier."""
    if str(current_supplier.id) != str(supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(PayerExclusion)
        .where(PayerExclusion.supplier_id == supplier_id)
        .order_by(PayerExclusion.created_at)
    )
    exclusions = result.scalars().all()
    return ExclusionListResponse(exclusions=exclusions, total=len(exclusions))


@router.post("/suppliers/{supplier_id}/exclusions", response_model=ExclusionRead)
async def add_exclusion(
    supplier_id: UUID,
    body: ExclusionCreate,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Add a payer exclusion."""
    if str(current_supplier.id) != str(supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    exclusion = PayerExclusion(
        supplier_id=supplier_id,
        payer_id=body.payer_id,
        product_id=body.product_id,
        category=body.category,
    )
    db.add(exclusion)
    await db.commit()
    await db.refresh(exclusion)
    return exclusion


@router.delete("/exclusions/{exclusion_id}", status_code=204)
async def delete_exclusion(
    exclusion_id: UUID,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Delete a payer exclusion."""
    result = await db.execute(
        select(PayerExclusion).where(PayerExclusion.id == exclusion_id)
    )
    exclusion = result.scalar_one_or_none()
    if not exclusion:
        raise HTTPException(status_code=404, detail="Exclusion not found")
    if str(exclusion.supplier_id) != str(current_supplier.id):
        raise HTTPException(status_code=403, detail="Access denied")

    await db.delete(exclusion)
    await db.commit()
