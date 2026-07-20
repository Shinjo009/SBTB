from datetime import UTC, datetime, timedelta
import logging

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
from app.models.user import AuthSession, Role, User, UserRole
from app.schemas.auth import TokenPairOut, UserOut

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.settings = get_settings()

    async def ensure_roles(self) -> None:
        for name in (
            UserRoleName.CUSTOMER.value,
            UserRoleName.MANAGER.value,
            UserRoleName.ADMIN.value,
        ):
            exists = await self.db.scalar(select(Role).where(Role.name == name))
            if not exists:
                self.db.add(Role(name=name))
        await self.db.commit()

    async def _load_user(self, user_id: str) -> User:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.roles).selectinload(UserRole.role))
            .where(User.id == user_id)
        )
        return result.scalar_one()

    async def create_user(
        self,
        *,
        email: str,
        full_name: str,
        password: str,
        phone: str | None = None,
        role: str = UserRoleName.CUSTOMER.value,
        is_admin: bool = False,
    ) -> User:
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters")
        email_norm = email.lower().strip()
        existing = await self.db.scalar(select(User).where(User.email == email_norm))
        if existing:
            raise ValueError("A user with this email already exists")
        await self.ensure_roles()
        now = datetime.now(UTC)
        user = User(
            email=email_norm,
            full_name=full_name.strip(),
            phone=(phone or "").strip() or None,
            password_hash=hash_password(password),
            is_active=True,
            email_verified=True,
            email_verified_at=now,
        )
        self.db.add(user)
        await self.db.flush()
        roles_to_assign = [UserRoleName.CUSTOMER.value]
        if is_admin or role == UserRoleName.ADMIN.value:
            roles_to_assign.append(UserRoleName.ADMIN.value)
        elif role == UserRoleName.MANAGER.value:
            roles_to_assign.append(UserRoleName.MANAGER.value)
        for role_name in roles_to_assign:
            role_row = await self.db.scalar(select(Role).where(Role.name == role_name))
            if role_row:
                self.db.add(UserRole(user_id=user.id, role_id=role_row.id))
        await self.db.commit()
        return await self._load_user(user.id)

    async def ensure_admin(self, *, email: str, full_name: str, password: str) -> User:
        """Create or update the primary admin account (password from env on each boot)."""
        await self.ensure_roles()
        email_norm = email.lower().strip()
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.roles).selectinload(UserRole.role))
            .where(User.email == email_norm)
        )
        user = result.scalar_one_or_none()
        now = datetime.now(UTC)
        if user:
            user.full_name = full_name.strip()
            user.password_hash = hash_password(password)
            user.is_active = True
            user.email_verified = True
            user.email_verified_at = user.email_verified_at or now
        else:
            user = User(
                email=email_norm,
                full_name=full_name.strip(),
                password_hash=hash_password(password),
                is_active=True,
                email_verified=True,
                email_verified_at=now,
            )
            self.db.add(user)
            await self.db.flush()

        admin_role = await self.db.scalar(select(Role).where(Role.name == UserRoleName.ADMIN.value))
        customer_role = await self.db.scalar(select(Role).where(Role.name == UserRoleName.CUSTOMER.value))
        existing_role_ids = {ur.role_id for ur in user.roles}
        if customer_role and customer_role.id not in existing_role_ids:
            self.db.add(UserRole(user_id=user.id, role_id=customer_role.id))
        if admin_role and admin_role.id not in existing_role_ids:
            self.db.add(UserRole(user_id=user.id, role_id=admin_role.id))
        await self.db.commit()
        return await self._load_user(user.id)

    async def signup(
        self, *, full_name: str, email: str, password: str, phone: str | None = None
    ) -> User:
        return await self.create_user(
            email=email,
            full_name=full_name,
            password=password,
            phone=phone,
            role=UserRoleName.CUSTOMER.value,
        )

    async def authenticate(self, *, email: str, password: str) -> User:
        email_norm = email.lower().strip()
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.roles).selectinload(UserRole.role))
            .where(User.email == email_norm, User.is_active.is_(True))
        )
        user = result.scalar_one_or_none()
        if not user or not user.password_hash or not verify_password(password, user.password_hash):
            raise ValueError("Invalid email or password")
        if needs_rehash(user.password_hash):
            user.password_hash = hash_password(password)
            await self.db.commit()
        return user

    async def login(
        self, *, email: str, password: str, ip: str | None = None, ua: str | None = None
    ) -> TokenPairOut:
        user = await self.authenticate(email=email, password=password)
        user.last_login = datetime.now(UTC)
        await self.db.flush()
        tokens = await self.issue_tokens(user, ip=ip, ua=ua)
        await self.db.commit()
        return tokens

    async def invite_team_member(
        self, *, full_name: str, email: str, password: str, role: str
    ) -> User:
        role_norm = role.strip().upper()
        if role_norm not in {UserRoleName.ADMIN.value, UserRoleName.MANAGER.value}:
            raise ValueError("Role must be ADMIN or MANAGER")
        return await self.create_user(
            email=email,
            full_name=full_name,
            password=password,
            role=role_norm,
            is_admin=role_norm == UserRoleName.ADMIN.value,
        )

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
