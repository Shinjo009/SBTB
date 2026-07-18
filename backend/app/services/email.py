import logging
import smtplib
from abc import ABC, abstractmethod
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class EmailService(ABC):
    @abstractmethod
    def send(self, *, to: str, subject: str, html: str, text: str | None = None) -> None: ...


class SMTPEmailService(EmailService):
    def send(self, *, to: str, subject: str, html: str, text: str | None = None) -> None:
        settings = get_settings()
        if not settings.smtp_app_password:
            logger.warning("SMTP password not configured; skipping email to %s", to)
            return
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
        except Exception:
            logger.exception("Failed to send email to %s", to)
            raise


def get_email_service() -> EmailService:
    return SMTPEmailService()


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
