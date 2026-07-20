from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.enums import UserRoleName
from app.models.user import LoginOTP, Role, User, UserRole


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_password_hashing():
    hashed = hash_password("123456")
    assert hashed != "123456"
    assert verify_password("123456", hashed)
    assert not verify_password("000000", hashed)


@pytest.mark.asyncio
async def test_otp_login_and_me(client: AsyncClient, db_session: AsyncSession, customer: User):
    code = "123456"
    db_session.add(
        LoginOTP(
            email=customer.email,
            code_hash=hash_password(code),
            attempts=0,
            expires_at=datetime.now(UTC) + timedelta(minutes=10),
        )
    )
    await db_session.commit()

    res = await client.post(
        "/api/v1/auth/verify-otp",
        json={"email": customer.email, "otp": code},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["user"]["email"] == customer.email
    assert body["access_token"]
    assert body["refresh_token"]

    me = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["user"]["full_name"] == "Test Customer"


@pytest.mark.asyncio
async def test_admin_forbidden_for_customer(client: AsyncClient, db_session: AsyncSession, customer: User):
    code = "654321"
    db_session.add(
        LoginOTP(
            email=customer.email,
            code_hash=hash_password(code),
            attempts=0,
            expires_at=datetime.now(UTC) + timedelta(minutes=10),
        )
    )
    await db_session.commit()
    login = await client.post(
        "/api/v1/auth/verify-otp",
        json={"email": customer.email, "otp": code},
    )
    token = login.json()["access_token"]
    res = await client.get("/api/v1/admin/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_request_otp_unknown_email_is_generic(client: AsyncClient):
    res = await client.post("/api/v1/auth/request-otp", json={"email": "nobody@example.com"})
    assert res.status_code == 200
    assert "login code" in res.json()["message"].lower()


@pytest.mark.asyncio
async def test_unknown_order_is_404(client: AsyncClient, db_session: AsyncSession, customer: User):
    other = User(
        email="other@example.com",
        full_name="Other",
        password_hash=None,
        email_verified=True,
        is_active=True,
    )
    db_session.add(other)
    await db_session.flush()
    role = (
        await db_session.execute(select(Role).where(Role.name == UserRoleName.CUSTOMER.value))
    ).scalar_one()
    db_session.add(UserRole(user_id=other.id, role_id=role.id))
    code = "111222"
    db_session.add(
        LoginOTP(
            email=other.email,
            code_hash=hash_password(code),
            attempts=0,
            expires_at=datetime.now(UTC) + timedelta(minutes=10),
        )
    )
    await db_session.commit()

    login = await client.post("/api/v1/auth/verify-otp", json={"email": other.email, "otp": code})
    token = login.json()["access_token"]
    res = await client.get(
        "/api/v1/orders/00000000-0000-0000-0000-000000000099",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 404
