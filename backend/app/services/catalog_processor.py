from __future__ import annotations

import base64
import json
import logging
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any
from uuid import UUID

import anthropic
import pandas as pd
import pdfplumber
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session
from app.models.catalog_upload import CatalogUpload, ProcessingStatus
from app.models.product import Product

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a DME (Durable Medical Equipment) product catalog parser for Doorbell Health.

Given raw product catalog data from a supplier, extract and normalize each product into this exact JSON schema:

{
  "products": [
    {
      "product_name": "string",
      "hcpcs_code": "string or null",
      "category": "string — one of: Respiratory/CPAP, Mobility, Diabetes/CGM, Orthopedic, Wound Care, Ostomy, Urological, Nutrition/Enteral, Breast Pumps, Other",
      "retail_price": number or null,
      "variant_size": "string or null",
      "fulfillment_types": ["array of: mail_delivery, home_delivery, home_delivery_setup, in_store_pickup"] or null,
      "sku": "string or null",
      "manufacturer": "string or null",
      "confidence": {
        "product_name": "high|medium|low",
        "hcpcs_code": "high|medium|low",
        "category": "high|medium|low",
        "retail_price": "high|medium|low",
        "variant_size": "high|medium|low",
        "fulfillment_types": "high|medium|low",
        "sku": "high|medium|low",
        "manufacturer": "high|medium|low"
      }
    }
  ]
}

Rules:
- Map product descriptions to the closest HCPCS code if you can identify it with high confidence
- Categorize products into the standard categories listed above
- If a field cannot be determined from the data, set it to null and confidence to "low"
- If a field is clearly present in the data, set confidence to "high"
- If you're inferring a field (e.g., guessing category from product name), set confidence to "medium"
- For fulfillment_types, infer from product type if not explicitly stated (e.g., CPAP machines likely need home_delivery_setup, supplies can be mail_delivery)
- Preserve the supplier's original product names — don't rename them
- Return valid JSON only, no markdown"""


# ---------------------------------------------------------------------------
# File parsing layer
# ---------------------------------------------------------------------------

def parse_csv_or_excel(file_path: str) -> str:
    """Read CSV or Excel into a string representation."""
    path = Path(file_path)
    if path.suffix.lower() == ".csv":
        df = pd.read_csv(file_path)
    else:
        df = pd.read_excel(file_path)

    # Truncate to first 500 rows to stay within token limits
    if len(df) > 500:
        df = df.head(500)
        logger.warning("Truncated catalog to 500 rows for AI processing")

    return df.to_string(index=False)


def parse_pdf(file_path: str) -> str:
    """Extract tables and text from a PDF."""
    text_parts: list[str] = []
    with pdfplumber.open(file_path) as pdf:
        for i, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            if tables:
                for table in tables:
                    rows = []
                    for row in table:
                        rows.append("\t".join(cell or "" for cell in row))
                    text_parts.append("\n".join(rows))
            else:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)

            # Limit to 20 pages
            if i >= 19:
                logger.warning("Truncated PDF to 20 pages for AI processing")
                break

    return "\n\n".join(text_parts)


def encode_image(file_path: str) -> tuple[str, str]:
    """Base64-encode an image file and return (data, media_type)."""
    path = Path(file_path)
    suffix = path.suffix.lower()
    media_type_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }
    media_type = media_type_map.get(suffix, "image/png")
    data = base64.standard_b64encode(path.read_bytes()).decode("utf-8")
    return data, media_type


def extract_content(file_path: str, file_type: str) -> tuple[str | None, tuple[str, str] | None]:
    """
    Extract content from the file.
    Returns (text_content, image_tuple_or_none).
    """
    suffix = Path(file_path).suffix.lower()

    if suffix in (".csv", ".xlsx", ".xls"):
        return parse_csv_or_excel(file_path), None
    elif suffix == ".pdf":
        return parse_pdf(file_path), None
    elif suffix in (".jpg", ".jpeg", ".png"):
        return None, encode_image(file_path)
    else:
        # Try to read as text
        try:
            return Path(file_path).read_text(errors="replace")[:50000], None
        except Exception:
            return None, None


# ---------------------------------------------------------------------------
# AI normalization layer
# ---------------------------------------------------------------------------

async def call_claude(text_content: str | None, image_data: tuple[str, str] | None) -> list[dict[str, Any]]:
    """Send content to Claude and get normalized products back."""
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    user_content: list[dict[str, Any]] = []

    if image_data:
        b64_data, media_type = image_data
        user_content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": media_type,
                "data": b64_data,
            },
        })
        user_content.append({
            "type": "text",
            "text": "Extract all products from this catalog image.",
        })
    elif text_content:
        user_content.append({
            "type": "text",
            "text": f"Extract all products from this catalog data:\n\n{text_content}",
        })
    else:
        raise ValueError("No content to process")

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )

    # Extract text from response
    raw_text = ""
    for block in response.content:
        if block.type == "text":
            raw_text += block.text

    # Strip any markdown fences
    raw_text = raw_text.strip()
    if raw_text.startswith("```"):
        lines = raw_text.split("\n")
        # Remove first line (```json) and last line (```)
        lines = [l for l in lines if not l.strip().startswith("```")]
        raw_text = "\n".join(lines)

    parsed = json.loads(raw_text)
    return parsed.get("products", [])


# ---------------------------------------------------------------------------
# Main processing function
# ---------------------------------------------------------------------------

async def process_catalog(upload_id: UUID, supplier_id: UUID) -> None:
    """
    Process a catalog upload:
    1. Parse the file
    2. Send to Claude for normalization
    3. Create product records
    4. Update upload status
    """
    async with async_session() as db:
        try:
            # Fetch the upload record
            result = await db.execute(
                select(CatalogUpload).where(CatalogUpload.id == upload_id)
            )
            upload = result.scalar_one_or_none()
            if not upload:
                logger.error("Upload %s not found", upload_id)
                return

            # Mark as processing
            upload.processing_status = ProcessingStatus.processing
            await db.commit()

            # Parse file
            logger.info("Parsing file: %s", upload.file_path)
            text_content, image_data = extract_content(upload.file_path, upload.file_type)

            if not text_content and not image_data:
                raise ValueError(f"Could not extract content from {upload.original_filename}")

            # Call Claude
            logger.info("Sending to Claude for normalization...")
            ai_products = await call_claude(text_content, image_data)
            logger.info("Claude returned %d products", len(ai_products))

            # Create product records
            for item in ai_products:
                price = None
                if item.get("retail_price") is not None:
                    try:
                        price = Decimal(str(item["retail_price"]))
                    except (InvalidOperation, ValueError):
                        price = None

                product = Product(
                    supplier_id=supplier_id,
                    product_name=item.get("product_name", "Unknown Product"),
                    hcpcs_code=item.get("hcpcs_code"),
                    category=item.get("category"),
                    retail_price=price,
                    variant_size=item.get("variant_size"),
                    fulfillment_types=item.get("fulfillment_types"),
                    sku=item.get("sku"),
                    manufacturer=item.get("manufacturer"),
                    ai_confidence=item.get("confidence"),
                    approved_by_supplier=False,
                )
                db.add(product)

            # Mark as completed
            upload.processing_status = ProcessingStatus.completed
            await db.commit()
            logger.info("Catalog processing completed for upload %s", upload_id)

        except Exception:
            logger.exception("Catalog processing failed for upload %s", upload_id)
            # Mark as failed
            try:
                result = await db.execute(
                    select(CatalogUpload).where(CatalogUpload.id == upload_id)
                )
                upload = result.scalar_one_or_none()
                if upload:
                    upload.processing_status = ProcessingStatus.failed
                    await db.commit()
            except Exception:
                logger.exception("Failed to update upload status to failed")
