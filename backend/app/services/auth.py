from datetime import UTC, datetime, timedelta

from fastapi import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import user_role_names
from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    generate_token,
    hash_password,
    hash_token,
    needs_rehash,
    verify_password,
)
from app.models.enums import UserRoleName
from app.models.user import AuthSession, PasswordReset, Role, User, UserRole
from app.schemas.auth import UserOut
from app.services.email import branded_email, get_email_service
from app.services.otp import OTPService


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

    async def signup(self, *, full_name: str, email: str, password: str) -> User:
        email_norm = email.lower().strip()
        existing = await self.db.scalar(select(User).where(User.email == email_norm))
        if existing:
            raise ValueError("Unable to create account")
        await self.ensure_roles()
        role = await self.db.scalar(select(Role).where(Role.name == UserRoleName.CUSTOMER.value))
        user = User(
            full_name=full_name.strip(),
            email=email_norm,
            password_hash=hash_password(password),
            email_verified=False,
        )
        self.db.add(user)
        await self.db.flush()
        self.db.add(UserRole(user_id=user.id, role_id=role.id))
        await self.db.commit()
        try:
            await OTPService().issue(email=email_norm, purpose="verify")
        except ValueError:
            # Roll back the unverified user if email cannot be sent
            await self.db.delete(user)
            await self.db.commit()
            raise
        return user

    async def verify_email(self, *, email: str, otp: str) -> User:
        email_norm = email.lower().strip()
        ok = await OTPService().verify(email=email_norm, otp=otp, purpose="verify")
        if not ok:
            raise ValueError("Invalid or expired verification code")
        user = await self.db.scalar(select(User).where(User.email == email_norm))
        if not user:
            raise ValueError("Invalid or expired verification code")
        user.email_verified = True
        user.email_verified_at = datetime.now(UTC)
        await self.db.commit()
        html = branded_email(
            "Welcome to Scrunchies By The Bunch",
            f"<p>Hi {user.full_name},</p><p>Your email is verified. Happy shopping!</p>",
        )
        try:
            get_email_service().send(to=user.email, subject="Welcome!", html=html)
        except Exception:
            pass
        return user

    async def authenticate(self, *, email: str, password: str) -> User:
        email_norm = email.lower().strip()
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.roles).selectinload(UserRole.role))
            .where(User.email == email_norm, User.is_active.is_(True))
        )
        user = result.scalar_one_or_none()
        if not user or not verify_password(password, user.password_hash):
            raise ValueError("Invalid email or password")
        if needs_rehash(user.password_hash):
            user.password_hash = hash_password(password)
            await self.db.commit()
        return user

    async def create_session(self, user: User, response: Response, *, ip: str | None, ua: str | None) -> str:
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
        await self.db.commit()
        access = create_access_token(user.id, extra={"roles": user_role_names(user)})
        csrf = generate_token(16)
        self._set_auth_cookies(response, access=access, refresh=refresh, csrf=csrf)
        return csrf

    def _set_auth_cookies(self, response: Response, *, access: str, refresh: str, csrf: str) -> None:
        common = {
            "httponly": True,
            "secure": self.settings.cookie_secure,
            "samesite": self.settings.cookie_samesite,
            "path": "/",
        }
        response.set_cookie(
            "access_token",
            access,
            max_age=self.settings.access_token_expire_minutes * 60,
            **common,
        )
        response.set_cookie(
            "refresh_token",
            refresh,
            max_age=self.settings.refresh_token_expire_days * 86400,
            **common,
        )
        response.set_cookie(
            "csrf_token",
            csrf,
            max_age=self.settings.refresh_token_expire_days * 86400,
            httponly=False,
            secure=self.settings.cookie_secure,
            samesite=self.settings.cookie_samesite,
            path="/",
        )

    async def refresh(self, refresh_token: str, response: Response) -> tuple[User, str]:
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
        if not session or session.expires_at < datetime.now(UTC) or not session.user.is_active:
            raise ValueError("Session expired")
        user = session.user
        session.revoked_at = datetime.now(UTC)
        await self.db.flush()
        csrf = await self.create_session(user, response, ip=session.ip_address, ua=session.user_agent)
        return user, csrf

    async def logout(self, refresh_token: str | None, response: Response) -> None:
        if refresh_token:
            result = await self.db.execute(
                select(AuthSession).where(AuthSession.refresh_token_hash == hash_token(refresh_token))
            )
            session = result.scalar_one_or_none()
            if session and not session.revoked_at:
                session.revoked_at = datetime.now(UTC)
                await self.db.commit()
        for name in ("access_token", "refresh_token", "csrf_token"):
            response.delete_cookie(name, path="/")

    async def forgot_password(self, email: str) -> None:
        email_norm = email.lower().strip()
        user = await self.db.scalar(select(User).where(User.email == email_norm))
        if not user:
            return
        token = generate_token()
        self.db.add(
            PasswordReset(
                user_id=user.id,
                token_hash=hash_token(token),
                expires_at=datetime.now(UTC) + timedelta(hours=1),
            )
        )
        await self.db.commit()
        reset_url = f"{self.settings.frontend_url}/reset-password?token={token}"
        html = branded_email(
            "Reset your password",
            f"<p>Hi {user.full_name},</p><p><a href='{reset_url}'>Reset password</a></p><p>This link expires in 1 hour.</p>",
        )
        try:
            get_email_service().send(to=user.email, subject="Password reset", html=html)
        except Exception:
            pass

    async def reset_password(self, *, token: str, password: str) -> None:
        result = await self.db.execute(
            select(PasswordReset).where(
                PasswordReset.token_hash == hash_token(token),
                PasswordReset.used_at.is_(None),
            )
        )
        row = result.scalar_one_or_none()
        if not row or row.expires_at < datetime.now(UTC):
            raise ValueError("Invalid or expired reset link")
        user = await self.db.scalar(select(User).where(User.id == row.user_id))
        if not user:
            raise ValueError("Invalid or expired reset link")
        user.password_hash = hash_password(password)
        row.used_at = datetime.now(UTC)
        sessions = await self.db.scalars(
            select(AuthSession).where(AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None))
        )
        now = datetime.now(UTC)
        for session in sessions:
            session.revoked_at = now
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
