"""
Seed script for creating test supplier records.

Usage:
    cd backend
    python -m scripts.seed

Creates 3 test suppliers with invite tokens:
  - test-tier1: Tier 1, status=submitted, with products, payers, service areas
  - test-tier2: Tier 2, status=in_progress, partially filled
  - test-partial: No tier, status=in_progress, only company info
"""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

# Add project root to path so we can import app modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.database import engine, async_session, Base
from app.models.supplier import Supplier, SupplierTier, SupplierStatus, OrderTransmittalPreference
from app.models.product import Product
from app.models.payer import Payer
from app.models.service_area import ServiceArea


async def seed():
    # Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # Check if seed data already exists
        existing = await db.execute(
            select(Supplier).where(Supplier.invite_token.in_(["test-tier1", "test-tier2", "test-partial"]))
        )
        if existing.scalars().first():
            print("Seed data already exists. Skipping.")
            return

        # --- Supplier 1: Tier 1, Submitted ---
        s1 = Supplier(
            invite_token="test-tier1",
            email="tier1@example.com",
            email_verified=True,
            company_name="MedEquip Pro",
            company_address="123 Medical Drive, Suite 400, Austin, TX 78701",
            tax_id="12-3456789",
            npi="1234567890",
            primary_contact_name="Sarah Johnson",
            primary_contact_email="sarah@medequippro.com",
            primary_contact_phone="(512) 555-0101",
            escalation_contact_name="Mike Chen",
            escalation_contact_email="mike@medequippro.com",
            escalation_contact_phone="(512) 555-0102",
            tier=SupplierTier.tier_1,
            order_transmittal_preference=OrderTransmittalPreference.api,
            transmittal_destination="https://api.medequippro.com/orders",
            shipping_fee_structure={
                "free_shipping_threshold": 100,
                "flat_rate": 9.99,
                "is_variable": False,
            },
            return_policy={
                "return_window_days": 30,
                "restocking_fee": 15,
                "restocking_fee_type": "percentage",
                "return_shipping_responsibility": "supplier",
                "condition_requirements": ["unopened", "original packaging"],
            },
            support_hours="Mon-Fri 8am-6pm CST",
            support_phone="(512) 555-0100",
            support_email="support@medequippro.com",
            after_hours_process="Email support@medequippro.com for non-urgent. Call (512) 555-0199 for emergencies.",
            stripe_account_id="acct_test_tier1_123",
            stripe_onboarding_complete=True,
            sla_acknowledged=True,
            sla_acknowledged_by="Sarah Johnson",
            sla_acknowledged_at=datetime.now(timezone.utc),
            current_step=11,
            status=SupplierStatus.submitted,
            submitted_at=datetime.now(timezone.utc),
        )
        db.add(s1)
        await db.flush()

        # Products for S1
        products = [
            Product(
                supplier_id=s1.id,
                product_name="Standard Wheelchair",
                hcpcs_code="K0001",
                category="Mobility",
                retail_price=Decimal("349.99"),
                sku="WC-STD-001",
                manufacturer="MobilityFirst",
                variant_size="Standard",
                fulfillment_types=["ship", "pickup"],
                approved_by_supplier=True,
            ),
            Product(
                supplier_id=s1.id,
                product_name="Lightweight Wheelchair",
                hcpcs_code="K0004",
                category="Mobility",
                retail_price=Decimal("599.99"),
                sku="WC-LW-002",
                manufacturer="MobilityFirst",
                variant_size="Standard",
                fulfillment_types=["ship"],
                approved_by_supplier=True,
            ),
            Product(
                supplier_id=s1.id,
                product_name="CPAP Machine",
                hcpcs_code="E0601",
                category="Respiratory",
                retail_price=Decimal("799.00"),
                sku="CPAP-001",
                manufacturer="ResMed",
                fulfillment_types=["ship"],
                approved_by_supplier=True,
            ),
            Product(
                supplier_id=s1.id,
                product_name="Hospital Bed - Semi Electric",
                hcpcs_code="E0260",
                category="Hospital Beds",
                retail_price=Decimal("1299.00"),
                sku="BED-SE-001",
                manufacturer="Invacare",
                fulfillment_types=["ship", "delivery"],
                approved_by_supplier=True,
            ),
            Product(
                supplier_id=s1.id,
                product_name="Knee Walker",
                hcpcs_code="E0118",
                category="Mobility",
                retail_price=Decimal("189.99"),
                sku="KW-001",
                manufacturer="Drive Medical",
                fulfillment_types=["ship", "pickup"],
                approved_by_supplier=True,
            ),
        ]
        for p in products:
            db.add(p)

        # Payers for S1
        payers = [
            Payer(supplier_id=s1.id, payer_name="Medicare", network_type="in_network"),
            Payer(supplier_id=s1.id, payer_name="UnitedHealthcare", network_type="in_network"),
            Payer(supplier_id=s1.id, payer_name="Aetna", network_type="in_network"),
            Payer(supplier_id=s1.id, payer_name="Blue Cross Blue Shield", network_type="in_network"),
            Payer(supplier_id=s1.id, payer_name="Cigna", network_type="out_of_network"),
        ]
        for p in payers:
            db.add(p)

        # Service Areas for S1
        areas = [
            ServiceArea(
                supplier_id=s1.id,
                state="TX",
                cities=["Austin", "San Antonio", "Houston", "Dallas"],
                standard_delivery_days=3,
                expedited_delivery_days=1,
            ),
            ServiceArea(
                supplier_id=s1.id,
                state="OK",
                cities=["Oklahoma City", "Tulsa"],
                standard_delivery_days=5,
                expedited_delivery_days=2,
            ),
            ServiceArea(
                supplier_id=s1.id,
                state="NM",
                standard_delivery_days=5,
                expedited_delivery_days=3,
            ),
        ]
        for a in areas:
            db.add(a)

        # --- Supplier 2: Tier 2, In Progress ---
        s2 = Supplier(
            invite_token="test-tier2",
            email="tier2@example.com",
            email_verified=True,
            company_name="HomeHealth Supplies",
            company_address="456 Wellness Blvd, Denver, CO 80202",
            tax_id="98-7654321",
            npi="0987654321",
            primary_contact_name="Emily Rivera",
            primary_contact_email="emily@homehealthsupplies.com",
            primary_contact_phone="(303) 555-0201",
            escalation_contact_name="James Park",
            escalation_contact_email="james@homehealthsupplies.com",
            escalation_contact_phone="(303) 555-0202",
            tier=SupplierTier.tier_2,
            order_transmittal_preference=OrderTransmittalPreference.secure_email,
            transmittal_destination="orders@homehealthsupplies.com",
            support_hours="Mon-Fri 9am-5pm MST",
            support_phone="(303) 555-0200",
            support_email="help@homehealthsupplies.com",
            current_step=7,
            status=SupplierStatus.in_progress,
        )
        db.add(s2)
        await db.flush()

        # A few products for S2
        s2_products = [
            Product(
                supplier_id=s2.id,
                product_name="Blood Pressure Monitor",
                hcpcs_code="A4670",
                category="Monitoring",
                retail_price=Decimal("79.99"),
                sku="BPM-001",
                manufacturer="Omron",
                fulfillment_types=["ship"],
                approved_by_supplier=True,
            ),
            Product(
                supplier_id=s2.id,
                product_name="Pulse Oximeter",
                category="Monitoring",
                retail_price=Decimal("39.99"),
                sku="POX-001",
                manufacturer="Masimo",
                fulfillment_types=["ship"],
                approved_by_supplier=False,
            ),
        ]
        for p in s2_products:
            db.add(p)

        # Payers for S2
        s2_payers = [
            Payer(supplier_id=s2.id, payer_name="Medicare", network_type="in_network"),
            Payer(supplier_id=s2.id, payer_name="Humana", network_type="in_network"),
        ]
        for p in s2_payers:
            db.add(p)

        # --- Supplier 3: Partial, No Tier ---
        s3 = Supplier(
            invite_token="test-partial",
            email="partial@example.com",
            email_verified=True,
            company_name="NewDME Corp",
            company_address="789 Startup Lane, Portland, OR 97201",
            primary_contact_name="Alex Kim",
            primary_contact_email="alex@newdme.com",
            current_step=2,
            status=SupplierStatus.in_progress,
        )
        db.add(s3)

        await db.commit()

        print("Seed data created successfully!")
        print()
        print("Test suppliers:")
        print(f"  1. MedEquip Pro       → /onboard/test-tier1   (Tier 1, Submitted)")
        print(f"  2. HomeHealth Supplies → /onboard/test-tier2   (Tier 2, In Progress, Step 7)")
        print(f"  3. NewDME Corp         → /onboard/test-partial (No Tier, In Progress, Step 2)")
        print()
        print("Admin dashboard: /admin (password: doorbell-ops-2024)")


if __name__ == "__main__":
    asyncio.run(seed())
