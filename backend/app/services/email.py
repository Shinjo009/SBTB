import logging
import smtplib
from abc import ABC, abstractmethod
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class EmailService(ABC):
    @abstractmethod
    def send(self, *, to: str, subject: str, html: str, text: str | None = None) -> bool:
        """Send email. Returns True if delivered to provider, False if skipped."""


class SMTPEmailService(EmailService):
    def send(self, *, to: str, subject: str, html: str, text: str | None = None) -> bool:
        settings = get_settings()
        if not settings.smtp_app_password or settings.smtp_app_password.strip().lower() in {
            "temp",
            "pending",
            "changeme",
        }:
            logger.warning("SMTP password not configured; skipping email to %s", to)
            return False
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = settings.smtp_email
        message["To"] = to
        message.attach(MIMEText(text or "Please view this email in an HTML-capable client.", "plain"))
        message.attach(MIMEText(html, "html"))
        try:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as server:
                if settings.smtp_use_tls:
                    server.starttls()
                server.login(settings.smtp_email, settings.smtp_app_password)
                server.sendmail(settings.smtp_email, [to], message.as_string())
            return True
        except Exception:
            logger.exception("Failed to send email to %s via SMTP", to)
            return False


class ResendEmailService(EmailService):
    """HTTPS email API — works on Render free tier (SMTP ports are blocked)."""

    def send(self, *, to: str, subject: str, html: str, text: str | None = None) -> bool:
        settings = get_settings()
        payload = {
            "from": settings.resend_from_email,
            "to": [to],
            "subject": subject,
            "html": html,
        }
        if text:
            payload["text"] = text
        try:
            response = httpx.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.resend_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=30,
            )
            if response.status_code >= 400:
                logger.error("Resend failed (%s): %s", response.status_code, response.text)
                return False
            return True
        except Exception:
            logger.exception("Failed to send email to %s via Resend", to)
            return False


def get_email_service() -> EmailService:
    settings = get_settings()
    if not settings.email_enabled:
        return _NoopEmailService()
    if settings.resend_api_key.strip():
        return ResendEmailService()
    return SMTPEmailService()


class _NoopEmailService(EmailService):
    def send(self, *, to: str, subject: str, html: str, text: str | None = None) -> bool:
        logger.info("EMAIL_ENABLED=false; skipped email to %s (%s)", to, subject)
        return False


def branded_email(title: str, body_html: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#fff7f5;font-family:Georgia,serif;color:#1a1a1a;">
      <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:24px;padding:32px;border:1px solid #f0d6d0;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background:#f3d4ce;border-radius:999px;padding:10px 18px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;">Scrunchies By The Bunch</div>
        </div>
        <h1 style="font-size:24px;margin:0 0 16px;">{title}</h1>
        <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#333;">{body_html}</div>
        <p style="margin-top:28px;font-size:12px;color:#888;font-family:Arial,sans-serif;">Made with love for soft girl energy.</p>
      </div>
    </body>
    </html>
    """
