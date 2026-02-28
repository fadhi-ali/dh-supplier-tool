from __future__ import annotations

import asyncio
import logging
import os
import uuid as uuid_mod
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db, async_session
from app.models.supplier import Supplier
from app.models.catalog_upload import CatalogUpload, ProcessingStatus
from app.models.product import Product
from app.api.deps import get_current_supplier
from app.schemas.product import (
    CatalogUploadResponse,
    ProductApproveResponse,
    ProductCreate,
    ProductListResponse,
    ProductRead,
    ProductUpdate,
    UploadStatusResponse,
)
from app.services.catalog_processor import process_catalog

logger = logging.getLogger(__name__)

router = APIRouter(tags=["products"])


async def _safe_process_catalog(upload_id: UUID, supplier_id: UUID) -> None:
    """Wrapper around process_catalog that marks the upload as failed on unhandled errors."""
    try:
        await process_catalog(upload_id, supplier_id)
    except Exception:
        logger.exception("Catalog processing failed for upload %s", upload_id)
        try:
            async with async_session() as db:
                result = await db.execute(
                    select(CatalogUpload).where(CatalogUpload.id == upload_id)
                )
                upload = result.scalar_one_or_none()
                if upload and upload.processing_status != ProcessingStatus.failed:
                    upload.processing_status = ProcessingStatus.failed
                    await db.commit()
        except Exception:
            logger.exception("Failed to mark upload %s as failed", upload_id)


@router.post("/suppliers/{supplier_id}/products/upload", response_model=CatalogUploadResponse)
async def upload_catalog(
    supplier_id: UUID,
    file: UploadFile = File(...),
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Upload a product catalog file for AI processing."""
    if str(current_supplier.id) != str(supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    upload_dir = os.path.join(settings.UPLOAD_DIR, str(supplier_id))
    os.makedirs(upload_dir, exist_ok=True)

    file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
    stored_filename = f"{uuid_mod.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, stored_filename)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    upload = CatalogUpload(
        supplier_id=supplier_id,
        original_filename=file.filename or "unknown",
        file_path=file_path,
        file_type=file.content_type or "application/octet-stream",
        processing_status=ProcessingStatus.uploaded,
    )
    db.add(upload)
    await db.commit()
    await db.refresh(upload)

    # Trigger async processing with safety wrapper
    asyncio.create_task(_safe_process_catalog(upload.id, supplier_id))

    return CatalogUploadResponse(
        upload_id=upload.id,
        original_filename=upload.original_filename,
        processing_status=upload.processing_status.value,
    )


@router.get("/suppliers/{supplier_id}/products/upload-status", response_model=UploadStatusResponse)
async def get_upload_status(
    supplier_id: UUID,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Poll the processing status of the most recent catalog upload."""
    if str(current_supplier.id) != str(supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(CatalogUpload)
        .where(CatalogUpload.supplier_id == supplier_id)
        .order_by(CatalogUpload.created_at.desc())
        .limit(1)
    )
    upload = result.scalar_one_or_none()
    if not upload:
        return UploadStatusResponse(processing_status="none", product_count=0)

    # Count products for this supplier
    prod_result = await db.execute(
        select(Product).where(Product.supplier_id == supplier_id)
    )
    products = prod_result.scalars().all()

    return UploadStatusResponse(
        upload_id=upload.id,
        original_filename=upload.original_filename,
        processing_status=upload.processing_status.value,
        product_count=len(products),
    )


@router.get("/suppliers/{supplier_id}/products", response_model=ProductListResponse)
async def list_products(
    supplier_id: UUID,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """List all products for a supplier."""
    if str(current_supplier.id) != str(supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(Product).where(Product.supplier_id == supplier_id).order_by(Product.created_at)
    )
    products = result.scalars().all()
    return ProductListResponse(products=products, total=len(products))


@router.post("/suppliers/{supplier_id}/products", response_model=ProductRead)
async def create_product(
    supplier_id: UUID,
    body: ProductCreate,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Manually add a product."""
    if str(current_supplier.id) != str(supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    product = Product(
        supplier_id=supplier_id,
        product_name=body.product_name,
        hcpcs_code=body.hcpcs_code,
        category=body.category,
        retail_price=body.retail_price,
        variant_size=body.variant_size,
        sku=body.sku,
        manufacturer=body.manufacturer,
        fulfillment_types=body.fulfillment_types,
        approved_by_supplier=False,
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


@router.patch("/products/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: UUID,
    body: ProductUpdate,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Update an individual product."""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if str(product.supplier_id) != str(current_supplier.id):
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    await db.commit()
    await db.refresh(product)
    return product


@router.post("/suppliers/{supplier_id}/products/approve", response_model=ProductApproveResponse)
async def approve_products(
    supplier_id: UUID,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Mark all products for a supplier as approved."""
    if str(current_supplier.id) != str(supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(Product).where(
            Product.supplier_id == supplier_id,
            Product.approved_by_supplier == False,
        )
    )
    products = result.scalars().all()
    for product in products:
        product.approved_by_supplier = True

    await db.commit()
    return ProductApproveResponse(approved_count=len(products))


@router.delete("/products/{product_id}", status_code=204)
async def delete_product(
    product_id: UUID,
    current_supplier: Supplier = Depends(get_current_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Delete a product."""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if str(product.supplier_id) != str(current_supplier.id):
        raise HTTPException(status_code=403, detail="Access denied")

    await db.delete(product)
    await db.commit()
