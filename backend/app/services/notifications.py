"""
Notification service for supplier onboarding events.

Uses Gmail SMTP when SMTP_USER and SMTP_PASSWORD are configured.
Falls back to console logging when not configured.
"""

from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import TYPE_CHECKING

from app.config import settings

if TYPE_CHECKING:
    from app.models.supplier import Supplier
    from app.models.correction import Correction

logger = logging.getLogger("notifications")


def _send_email(to_email: str, subject: str, body_html: str) -> None:
    """Send an email via SMTP or log to console as fallback."""
    logger.info("=" * 60)
    logger.info("EMAIL -> %s", to_email)
    logger.info("SUBJECT: %s", subject)
    logger.info("BODY: %s", body_html)
    logger.info("=" * 60)

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.info("SMTP not configured; email logged only.")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = settings.FROM_EMAIL or settings.SMTP_USER
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info("Email sent successfully to %s", to_email)
    except Exception as e:
        logger.error("Failed to send email via SMTP: %s", e)


def send_magic_link_email(email: str, token: str) -> None:
    """Send a magic link for passwordless authentication."""
    link = f"{settings.FRONTEND_URL}/onboard?magic_link_token={token}"
    subject = "Your Doorbell Health login link"
    body_html = (
        "<p>Hi,</p>"
        "<p>Click the link below to access your supplier portal:</p>"
        f'<p><a href="{link}">{link}</a></p>'
        f"<p>This link expires in {settings.MAGIC_LINK_EXPIRATION_MINUTES} minutes.</p>"
        "<p>If you did not request this link, please ignore this email.</p>"
    )
    _send_email(email, subject, body_html)


def send_submission_confirmation(supplier: Supplier) -> None:
    """Notify supplier that their application has been submitted."""
    subject = "Your onboarding application has been submitted"
    body_html = (
        f"<p>Hi {supplier.primary_contact_name or 'there'},</p>"
        f"<p>Your application for <strong>{supplier.company_name or 'your company'}</strong> "
        "has been submitted and is now under review.</p>"
        "<p>We'll notify you of any updates.</p>"
        "<p>Thank you,<br>Doorbell Health Team</p>"
    )
    _send_email(supplier.email, subject, body_html)


def send_status_update(supplier: Supplier, new_status: str) -> None:
    """Notify supplier of a status change."""
    status_display = new_status.replace("_", " ").title()
    subject = f"Your onboarding status has been updated to: {status_display}"
    body_html = (
        f"<p>Hi {supplier.primary_contact_name or 'there'},</p>"
        f"<p>The status of your onboarding application for "
        f"<strong>{supplier.company_name or 'your company'}</strong> "
        f"has been updated to: <strong>{status_display}</strong>.</p>"
        "<p>Thank you,<br>Doorbell Health Team</p>"
    )
    _send_email(supplier.email, subject, body_html)


def send_correction_request(supplier: Supplier, corrections: list[Correction]) -> None:
    """Notify supplier that corrections have been requested."""
    subject = "Action needed on your onboarding application"
    items = "".join(f"<li><strong>Step {c.step_number}:</strong> {c.comment}</li>" for c in corrections)
    body_html = (
        f"<p>Hi {supplier.primary_contact_name or 'there'},</p>"
        f"<p>Corrections have been requested for your "
        f"<strong>{supplier.company_name or 'your company'}</strong> application:</p>"
        f"<ul>{items}</ul>"
        "<p>Please log in and address these items, then resubmit.</p>"
        "<p>Thank you,<br>Doorbell Health Team</p>"
    )
    _send_email(supplier.email, subject, body_html)


def send_approval_notification(supplier: Supplier) -> None:
    """Notify supplier that their application has been approved."""
    subject = "Congratulations! Your onboarding has been approved"
    body_html = (
        f"<p>Hi {supplier.primary_contact_name or 'there'},</p>"
        f"<p>Great news! Your onboarding application for "
        f"<strong>{supplier.company_name or 'your company'}</strong> has been approved.</p>"
        "<p>Our team will be in touch shortly to finalize going live.</p>"
        "<p>Thank you,<br>Doorbell Health Team</p>"
    )
    _send_email(supplier.email, subject, body_html)


def send_ops_notification(message: str) -> None:
    """Notify the ops team of an event."""
    logger.info("=" * 60)
    logger.info("OPS TEAM: %s", message)
    logger.info("=" * 60)
