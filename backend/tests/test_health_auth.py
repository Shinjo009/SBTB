import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.enums import UserRoleName
from app.models.user import Role, User, UserRole


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_password_hashing():
    hashed = hash_password("password123")
    assert hashed != "password123"
    assert verify_password("password123", hashed)
    assert not verify_password("wrong-password", hashed)


@pytest.mark.asyncio
async def test_signup_login_and_me(client: AsyncClient):
    signup = await client.post(
        "/api/v1/auth/signup",
        json={
            "full_name": "Aisha Khan",
            "email": "aisha@example.com",
            "password": "password123",
            "confirm_password": "password123",
        },
    )
    assert signup.status_code == 200
    body = signup.json()
    assert body["user"]["email"] == "aisha@example.com"
    assert body["access_token"]
    assert body["refresh_token"]

    me = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["user"]["full_name"] == "Aisha Khan"

    bad = await client.post(
        "/api/v1/auth/login",
        json={"email": "aisha@example.com", "password": "wrong-password"},
    )
    assert bad.status_code == 401

    good = await client.post(
        "/api/v1/auth/login",
        json={"email": "aisha@example.com", "password": "password123"},
    )
    assert good.status_code == 200
    assert good.json()["user"]["email"] == "aisha@example.com"


@pytest.mark.asyncio
async def test_admin_forbidden_for_customer(client: AsyncClient, customer: User):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": customer.email, "password": "password123"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    res = await client.get("/api/v1/admin/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_login_unknown_email(client: AsyncClient):
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "password123"},
    )
    assert res.status_code == 401
    assert "invalid" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_unknown_order_is_404(client: AsyncClient, db_session: AsyncSession, customer: User):
    other = User(
        email="other@example.com",
        full_name="Other",
        password_hash=hash_password("password123"),
        email_verified=True,
        is_active=True,
    )
    db_session.add(other)
    await db_session.flush()
    role = (
        await db_session.execute(select(Role).where(Role.name == UserRoleName.CUSTOMER.value))
    ).scalar_one()
    db_session.add(UserRole(user_id=other.id, role_id=role.id))
    await db_session.commit()

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": other.email, "password": "password123"},
    )
    token = login.json()["access_token"]
    res = await client.get(
        "/api/v1/orders/00000000-0000-0000-0000-000000000099",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 404
