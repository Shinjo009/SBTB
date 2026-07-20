from datetime import UTC, datetime, timedelta
import logging

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import user_role_names
from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    generate_otp,
    generate_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.enums import UserRoleName
from app.models.user import AuthSession, LoginOTP, Role, User, UserRole
from app.schemas.auth import TokenPairOut, UserOut
from app.services.email import branded_email, get_email_service

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.settings = get_settings()

    async def ensure_roles(self) -> None:
        for name in (UserRoleName.CUSTOMER.value, UserRoleName.ADMIN.value):
            exists = await self.db.scalar(select(Role).where(Role.name == name))
            if not exists:
                self.db.add(Role(name=name))
        await self.db.commit()

    async def create_user(
        self,
        *,
        email: str,
        full_name: str,
        phone: str | None = None,
        role: str = UserRoleName.CUSTOMER.value,
        is_admin: bool = False,
    ) -> User:
        email_norm = email.lower().strip()
        existing = await self.db.scalar(select(User).where(User.email == email_norm))
        if existing:
            raise ValueError("A user with this email already exists")
        await self.ensure_roles()
        user = User(
            email=email_norm,
            full_name=full_name.strip(),
            phone=(phone or "").strip() or None,
            password_hash=None,
            is_active=True,
            email_verified=True,
            email_verified_at=datetime.now(UTC),
        )
        self.db.add(user)
        await self.db.flush()
        roles_to_assign = [UserRoleName.CUSTOMER.value]
        if is_admin or role == UserRoleName.ADMIN.value:
            roles_to_assign.append(UserRoleName.ADMIN.value)
        for role_name in roles_to_assign:
            role_row = await self.db.scalar(select(Role).where(Role.name == role_name))
            if role_row:
                self.db.add(UserRole(user_id=user.id, role_id=role_row.id))
        await self.db.commit()
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.roles).selectinload(UserRole.role))
            .where(User.id == user.id)
        )
        return result.scalar_one()

    async def request_login_otp(self, *, email: str) -> None:
        email_norm = email.lower().strip()
        user = await self.db.scalar(
            select(User).where(User.email == email_norm, User.is_active.is_(True))
        )
        # Do not reveal whether the email exists
        if not user:
            return

        latest = await self.db.scalar(
            select(LoginOTP)
            .where(LoginOTP.email == email_norm, LoginOTP.consumed_at.is_(None))
            .order_by(LoginOTP.created_at.desc())
            .limit(1)
        )
        if latest:
            created = latest.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=UTC)
            if (datetime.now(UTC) - created).total_seconds() < 60:
                raise ValueError("Please wait before requesting another code")

        code = generate_otp(6)
        self.db.add(
            LoginOTP(
                email=email_norm,
                code_hash=hash_password(code),
                attempts=0,
                expires_at=datetime.now(UTC) + timedelta(minutes=self.settings.otp_expire_minutes),
            )
        )
        await self.db.commit()

        html = branded_email(
            "Your login code",
            f"<p>Your Scrunchies By The Bunch login code is:</p>"
            f"<p style='font-size:28px;letter-spacing:8px;font-weight:bold;'>{code}</p>"
            f"<p>This code expires in {self.settings.otp_expire_minutes} minutes.</p>",
        )

        should_email = self.settings.email_enabled
        sent = False
        if should_email:
            sent = get_email_service().send(
                to=email_norm,
                subject="Your Scrunchies By The Bunch login code",
                html=html,
                text=f"Your login code is {code}",
            )
        if not sent:
            logger.warning("OTP email not sent. Login code for %s: %s", email_norm, code)

    async def verify_login_otp(
        self, *, email: str, otp: str, ip: str | None = None, ua: str | None = None
    ) -> tuple[User, TokenPairOut]:
        email_norm = email.lower().strip()
        user_result = await self.db.execute(
            select(User)
            .options(selectinload(User.roles).selectinload(UserRole.role))
            .where(User.email == email_norm, User.is_active.is_(True))
        )
        user = user_result.scalar_one_or_none()
        if not user:
            raise ValueError("Invalid or expired verification code")

        otp_row = await self.db.scalar(
            select(LoginOTP)
            .where(LoginOTP.email == email_norm, LoginOTP.consumed_at.is_(None))
            .order_by(LoginOTP.created_at.desc())
            .limit(1)
        )
        if not otp_row:
            raise ValueError("Invalid or expired verification code")
        expires_at = otp_row.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if expires_at < datetime.now(UTC):
            raise ValueError("Invalid or expired verification code")
        if otp_row.attempts >= 5:
            raise ValueError("Too many verification attempts. Request a new code.")

        if not verify_password(otp, otp_row.code_hash):
            otp_row.attempts += 1
            await self.db.commit()
            raise ValueError("Invalid or expired verification code")

        otp_row.consumed_at = datetime.now(UTC)
        await self.db.execute(
            delete(LoginOTP).where(LoginOTP.email == email_norm, LoginOTP.id != otp_row.id)
        )
        user.last_login = datetime.now(UTC)
        if not user.email_verified:
            user.email_verified = True
            user.email_verified_at = datetime.now(UTC)
        await self.db.flush()

        tokens = await self.issue_tokens(user, ip=ip, ua=ua)
        await self.db.commit()
        return user, tokens

    async def issue_tokens(self, user: User, *, ip: str | None, ua: str | None) -> TokenPairOut:
        refresh = generate_token()
        expires = datetime.now(UTC) + timedelta(days=self.settings.refresh_token_expire_days)
        self.db.add(
            AuthSession(
                user_id=user.id,
                refresh_token_hash=hash_token(refresh),
                expires_at=expires,
                ip_address=ip,
                user_agent=(ua or "")[:255] or None,
            )
        )
        await self.db.flush()
        access = create_access_token(user.id, extra={"roles": user_role_names(user)})
        return TokenPairOut(
            access_token=access,
            refresh_token=refresh,
            token_type="bearer",
            user=self.to_user_out(user),
        )

    async def refresh_tokens(self, refresh_token: str, *, ip: str | None, ua: str | None) -> TokenPairOut:
        if not refresh_token:
            raise ValueError("Session expired")
        result = await self.db.execute(
            select(AuthSession)
            .options(
                selectinload(AuthSession.user).selectinload(User.roles).selectinload(UserRole.role)
            )
            .where(
                AuthSession.refresh_token_hash == hash_token(refresh_token),
                AuthSession.revoked_at.is_(None),
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError("Session expired")
        expires_at = session.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if expires_at < datetime.now(UTC) or not session.user.is_active:
            raise ValueError("Session expired")
        user = session.user
        session.revoked_at = datetime.now(UTC)
        await self.db.flush()
        tokens = await self.issue_tokens(user, ip=ip or session.ip_address, ua=ua or session.user_agent)
        await self.db.commit()
        return tokens

    async def logout(self, refresh_token: str | None) -> None:
        if not refresh_token:
            return
        result = await self.db.execute(
            select(AuthSession).where(AuthSession.refresh_token_hash == hash_token(refresh_token))
        )
        session = result.scalar_one_or_none()
        if session and not session.revoked_at:
            session.revoked_at = datetime.now(UTC)
            await self.db.commit()

    def to_user_out(self, user: User) -> UserOut:
        return UserOut(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            phone=user.phone,
            email_verified=user.email_verified,
            roles=user_role_names(user),
        )
