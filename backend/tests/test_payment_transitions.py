from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.enums import OrderStatus, PaymentStatus, UserRoleName
from app.models.order import Order
from app.models.payment import Payment
from app.models.user import Role, User, UserRole
from app.services.payments import ManualUPIPaymentService


async def _admin(db: AsyncSession) -> User:
    role = (
        await db.execute(select(Role).where(Role.name == UserRoleName.ADMIN.value))
    ).scalar_one_or_none()
    if not role:
        role = Role(name=UserRoleName.ADMIN.value)
        db.add(role)
        await db.flush()
    user = User(
        email=f"admin-{uuid4().hex[:8]}@example.com",
        full_name="Admin",
        password_hash=hash_password("Password123!"),
        email_verified=True,
    )
    db.add(user)
    await db.flush()
    db.add(UserRole(user_id=user.id, role_id=role.id))
    await db.commit()
    return user


@pytest.mark.asyncio
async def test_cannot_approve_pending_payment(db_session: AsyncSession, customer: User):
    admin = await _admin(db_session)
    order = Order(
        order_number=f"SBTB{uuid4().hex[:6].upper()}",
        user_id=customer.id,
        status=OrderStatus.PENDING_PAYMENT.value,
        subtotal=Decimal("100.00"),
        shipping_amount=Decimal("0.00"),
        total=Decimal("100.00"),
        shipping_full_name="Test",
        shipping_phone="9999999999",
        shipping_line1="Line 1",
        shipping_city="Mumbai",
        shipping_state="MH",
        shipping_postal_code="400001",
    )
    db_session.add(order)
    await db_session.flush()
    payment = Payment(
        order_id=order.id,
        provider="manual_upi",
        status=PaymentStatus.PENDING.value,
        amount=Decimal("100.00"),
        reference_code=f"REF-{uuid4().hex[:6]}",
        expires_at=datetime.now(UTC) + timedelta(minutes=20),
    )
    db_session.add(payment)
    await db_session.commit()

    with pytest.raises(ValueError, match="awaiting verification"):
        await ManualUPIPaymentService(db_session).approve(payment, admin.id)


@pytest.mark.asyncio
async def test_expire_pending_payment(db_session: AsyncSession, customer: User):
    order = Order(
        order_number=f"SBTB{uuid4().hex[:6].upper()}",
        user_id=customer.id,
        status=OrderStatus.PENDING_PAYMENT.value,
        subtotal=Decimal("100.00"),
        shipping_amount=Decimal("0.00"),
        total=Decimal("100.00"),
        shipping_full_name="Test",
        shipping_phone="9999999999",
        shipping_line1="Line 1",
        shipping_city="Mumbai",
        shipping_state="MH",
        shipping_postal_code="400001",
    )
    db_session.add(order)
    await db_session.flush()
    payment = Payment(
        order_id=order.id,
        provider="manual_upi",
        status=PaymentStatus.PENDING.value,
        amount=Decimal("100.00"),
        reference_code=f"REF-{uuid4().hex[:6]}",
        expires_at=datetime.now(UTC) - timedelta(minutes=1),
    )
    db_session.add(payment)
    await db_session.commit()

    count = await ManualUPIPaymentService(db_session).expire_due_payments()
    assert count == 1
    await db_session.refresh(payment)
    await db_session.refresh(order)
    assert payment.status == PaymentStatus.EXPIRED.value
    assert order.status == OrderStatus.PAYMENT_EXPIRED.value
