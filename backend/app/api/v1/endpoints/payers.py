from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.supplier import Supplier
from app.models.payer import Payer
from app.api.deps import get_current_supplier
from app.schemas.payer import PayerBulkCreate, PayerListResponse, PayerRead

router = APIRouter(tags=["payers"])


@router.get("/suppliers/{supplier_id}/payers", response_model=PayerListResponse)
async def list_payers(
    supplier_id: UUID,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """List all payers for a supplier."""
    if str(current_supplier.id) != str(supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(Payer).where(Payer.supplier_id == supplier_id).order_by(Payer.created_at)
    )
    payers = result.scalars().all()
    return PayerListResponse(payers=payers, total=len(payers))


@router.post("/suppliers/{supplier_id}/payers", response_model=List[PayerRead])
async def add_payers(
    supplier_id: UUID,
    body: PayerBulkCreate,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Add one or more payers for a supplier."""
    if str(current_supplier.id) != str(supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    new_payers = []
    for payer_data in body.payers:
        payer = Payer(
            supplier_id=supplier_id,
            payer_name=payer_data.payer_name,
            network_type=payer_data.network_type,
        )
        db.add(payer)
        new_payers.append(payer)

    await db.commit()
    for p in new_payers:
        await db.refresh(p)

    return new_payers


@router.delete("/payers/{payer_id}", status_code=204)
async def delete_payer(
    payer_id: UUID,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Delete a payer."""
    result = await db.execute(select(Payer).where(Payer.id == payer_id))
    payer = result.scalar_one_or_none()
    if not payer:
        raise HTTPException(status_code=404, detail="Payer not found")
    if str(payer.supplier_id) != str(current_supplier.id):
        raise HTTPException(status_code=403, detail="Access denied")

    await db.delete(payer)
    await db.commit()
