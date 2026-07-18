import logging
import sys


SENSITIVE_KEYS = {
    "password",
    "password_hash",
    "otp",
    "token",
    "access_token",
    "refresh_token",
    "smtp_app_password",
    "secret_key",
    "csrf_secret",
    "authorization",
}


class RedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.args, dict):
            record.args = {
                k: "***" if str(k).lower() in SENSITIVE_KEYS else v for k, v in record.args.items()
            }
        message = str(record.getMessage())
        for key in SENSITIVE_KEYS:
            if key in message.lower():
                record.msg = "[redacted log content]"
                record.args = ()
                break
        return True


def setup_logging() -> None:
    root = logging.getLogger()
    if root.handlers:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s")
    )
    handler.addFilter(RedactingFilter())
    root.addHandler(handler)
    root.setLevel(logging.INFO)
