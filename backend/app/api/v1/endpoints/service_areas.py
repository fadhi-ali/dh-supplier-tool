from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.supplier import Supplier
from app.models.service_area import ServiceArea
from app.api.deps import get_current_supplier
from app.schemas.service_area import ServiceAreaCreate, ServiceAreaListResponse, ServiceAreaRead

router = APIRouter(tags=["service_areas"])


@router.get("/suppliers/{supplier_id}/service-areas", response_model=ServiceAreaListResponse)
async def list_service_areas(
    supplier_id: UUID,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """List all service areas for a supplier."""
    if str(current_supplier.id) != str(supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(ServiceArea)
        .where(ServiceArea.supplier_id == supplier_id)
        .order_by(ServiceArea.created_at)
    )
    areas = result.scalars().all()
    return ServiceAreaListResponse(service_areas=areas, total=len(areas))


@router.post("/suppliers/{supplier_id}/service-areas", response_model=ServiceAreaRead)
async def add_service_area(
    supplier_id: UUID,
    body: ServiceAreaCreate,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Add or update a service area."""
    if str(current_supplier.id) != str(supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Upsert by supplier_id + state
    result = await db.execute(
        select(ServiceArea).where(
            ServiceArea.supplier_id == supplier_id,
            ServiceArea.state == body.state,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        for field, value in body.model_dump(exclude_unset=True).items():
            setattr(existing, field, value)
        await db.commit()
        await db.refresh(existing)
        return existing

    area = ServiceArea(supplier_id=supplier_id, **body.model_dump())
    db.add(area)
    await db.commit()
    await db.refresh(area)
    return area


@router.delete("/service-areas/{area_id}", status_code=204)
async def delete_service_area(
    area_id: UUID,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Delete a service area."""
    result = await db.execute(select(ServiceArea).where(ServiceArea.id == area_id))
    area = result.scalar_one_or_none()
    if not area:
        raise HTTPException(status_code=404, detail="Service area not found")
    if str(area.supplier_id) != str(current_supplier.id):
        raise HTTPException(status_code=403, detail="Access denied")

    await db.delete(area)
    await db.commit()
