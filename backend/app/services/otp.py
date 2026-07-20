import logging
import time

from app.core.config import get_settings
from app.core.redis import get_redis
from app.core.security import generate_otp, hash_token
from app.services.email import branded_email, get_email_service

logger = logging.getLogger(__name__)

_memory: dict[str, tuple[str, float]] = {}


class OTPService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.redis = get_redis()
        self.ttl = self.settings.otp_expire_minutes * 60

    def _key(self, purpose: str, email: str) -> str:
        return f"otp:{purpose}:{email.lower()}"

    def _attempts_key(self, purpose: str, email: str) -> str:
        return f"otp_attempts:{purpose}:{email.lower()}"

    def _resend_key(self, purpose: str, email: str) -> str:
        return f"otp_resend:{purpose}:{email.lower()}"

    async def _set(self, key: str, value: str, ttl: int) -> None:
        try:
            await self.redis.setex(key, ttl, value)
        except Exception:
            _memory[key] = (value, time.time() + ttl)

    async def _get(self, key: str) -> str | None:
        try:
            return await self.redis.get(key)
        except Exception:
            item = _memory.get(key)
            if not item:
                return None
            value, expires = item
            if expires < time.time():
                _memory.pop(key, None)
                return None
            return value

    async def _delete(self, key: str) -> None:
        try:
            await self.redis.delete(key)
        except Exception:
            _memory.pop(key, None)

    async def _exists(self, key: str) -> bool:
        try:
            return bool(await self.redis.exists(key))
        except Exception:
            return (await self._get(key)) is not None

    async def _incr(self, key: str, ttl: int) -> int:
        try:
            current = await self.redis.incr(key)
            if current == 1:
                await self.redis.expire(key, ttl)
            return int(current)
        except Exception:
            raw = await self._get(key)
            current = int(raw or "0") + 1
            await self._set(key, str(current), ttl)
            return current

    async def issue(self, *, email: str, purpose: str = "verify") -> None:
        resend_key = self._resend_key(purpose, email)
        if await self._exists(resend_key):
            raise ValueError("Please wait before requesting another code")
        otp = generate_otp()
        await self._set(self._key(purpose, email), hash_token(otp), self.ttl)
        await self._set(resend_key, "1", 60)
        await self._delete(self._attempts_key(purpose, email))
        html = branded_email(
            "Verify your email",
            f"<p>Your verification code is:</p>"
            f"<p style='font-size:28px;letter-spacing:8px;font-weight:bold;'>{otp}</p>"
            f"<p>This code expires in {self.settings.otp_expire_minutes} minutes.</p>",
        )
        sent = get_email_service().send(
            to=email,
            subject="Your Scrunchies By The Bunch verification code",
            html=html,
            text=f"Your verification code is {otp}",
        )
        if not sent:
            await self._delete(self._key(purpose, email))
            await self._delete(resend_key)
            if not self.settings.is_production:
                logger.warning("DEV OTP for %s: %s", email, otp)
            raise ValueError(
                "Unable to send verification email. Configure RESEND_API_KEY on the server."
            )

    async def verify(self, *, email: str, otp: str, purpose: str = "verify") -> bool:
        attempts_key = self._attempts_key(purpose, email)
        attempts = int((await self._get(attempts_key)) or 0)
        if attempts >= 5:
            raise ValueError("Too many verification attempts. Request a new code.")
        stored = await self._get(self._key(purpose, email))
        await self._incr(attempts_key, self.ttl)
        if not stored or stored != hash_token(otp):
            return False
        await self._delete(self._key(purpose, email))
        await self._delete(attempts_key)
        return True
