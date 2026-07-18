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
    hashed = hash_password("Password123!")
    assert hashed != "Password123!"
    assert verify_password("Password123!", hashed)
    assert not verify_password("wrong", hashed)


@pytest.mark.asyncio
async def test_login_and_me(client: AsyncClient, customer: User):
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "customer@example.com", "password": "Password123!"},
    )
    assert res.status_code == 200
    assert res.json()["user"]["email"] == "customer@example.com"
    assert "csrf_token" in res.json()
    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["user"]["full_name"] == "Test Customer"


@pytest.mark.asyncio
async def test_admin_forbidden_for_customer(client: AsyncClient, customer: User):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "customer@example.com", "password": "Password123!"},
    )
    assert login.status_code == 200
    res = await client.get("/api/v1/admin/dashboard")
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_unknown_order_is_404(client: AsyncClient, db_session: AsyncSession, customer: User):
    other = User(
        email="other@example.com",
        full_name="Other",
        password_hash=hash_password("Password123!"),
        email_verified=True,
    )
    db_session.add(other)
    await db_session.flush()
    role = (
        await db_session.execute(select(Role).where(Role.name == UserRoleName.CUSTOMER.value))
    ).scalar_one()
    db_session.add(UserRole(user_id=other.id, role_id=role.id))
    await db_session.commit()

    await client.post("/api/v1/auth/login", json={"email": other.email, "password": "Password123!"})
    res = await client.get("/api/v1/orders/00000000-0000-0000-0000-000000000099")
    assert res.status_code == 404
