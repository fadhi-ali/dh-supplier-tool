"""
Notification service for supplier onboarding events.

TODO: Replace with SES/SendGrid integration.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.supplier import Supplier
    from app.models.correction import Correction

logger = logging.getLogger("notifications")


def send_submission_confirmation(supplier: Supplier) -> None:
    """Notify supplier that their application has been submitted."""
    logger.info("=" * 60)
    logger.info("EMAIL → %s", supplier.email)
    logger.info("SUBJECT: Your onboarding application has been submitted")
    logger.info(
        "BODY: Hi %s, your application for %s has been submitted and is now under review. "
        "We'll notify you of any updates.",
        supplier.primary_contact_name or "there",
        supplier.company_name or "your company",
    )
    logger.info("=" * 60)


def send_status_update(supplier: Supplier, new_status: str) -> None:
    """Notify supplier of a status change."""
    logger.info("=" * 60)
    logger.info("EMAIL → %s", supplier.email)
    logger.info("SUBJECT: Your onboarding status has been updated to: %s", new_status)
    logger.info(
        "BODY: Hi %s, the status of your onboarding application for %s has been updated to: %s.",
        supplier.primary_contact_name or "there",
        supplier.company_name or "your company",
        new_status,
    )
    logger.info("=" * 60)


def send_correction_request(supplier: Supplier, corrections: list[Correction]) -> None:
    """Notify supplier that corrections have been requested."""
    logger.info("=" * 60)
    logger.info("EMAIL → %s", supplier.email)
    logger.info("SUBJECT: Action needed on your onboarding application")
    logger.info(
        "BODY: Hi %s, corrections have been requested for your %s application:",
        supplier.primary_contact_name or "there",
        supplier.company_name or "your company",
    )
    for c in corrections:
        logger.info("  - Step %d: %s", c.step_number, c.comment)
    logger.info("Please log in and address these items, then resubmit.")
    logger.info("=" * 60)


def send_approval_notification(supplier: Supplier) -> None:
    """Notify supplier that their application has been approved."""
    logger.info("=" * 60)
    logger.info("EMAIL → %s", supplier.email)
    logger.info("SUBJECT: Congratulations! Your onboarding has been approved.")
    logger.info(
        "BODY: Hi %s, great news! Your onboarding application for %s has been approved. "
        "Our team will be in touch shortly to finalize going live.",
        supplier.primary_contact_name or "there",
        supplier.company_name or "your company",
    )
    logger.info("=" * 60)


def send_ops_notification(message: str) -> None:
    """Notify the ops team of an event."""
    logger.info("=" * 60)
    logger.info("OPS TEAM: %s", message)
    logger.info("=" * 60)
