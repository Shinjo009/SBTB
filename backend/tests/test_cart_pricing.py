from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import Product
from app.models.enums import ProductStatus
from app.models.inventory import Inventory
from app.models.user import User
from app.services.cart import CartService


@pytest.mark.asyncio
async def test_cart_uses_server_price(db_session: AsyncSession, customer: User):
    product = Product(
        name="Test Scrunchie",
        slug="test-scrunchie",
        sku="TEST-001",
        price=Decimal("199.00"),
        status=ProductStatus.ACTIVE.value,
    )
    db_session.add(product)
    await db_session.flush()
    db_session.add(Inventory(product_id=product.id, on_hand=10, reserved=0))
    await db_session.commit()

    svc = CartService(db_session)
    cart = await svc.get_or_create_user_cart(customer.id)
    detail = await svc.add_item(cart.id, product.id, 2)
    assert detail["subtotal"] == Decimal("398.00")
    assert detail["items"][0]["price"] == Decimal("199.00")


@pytest.mark.asyncio
async def test_cart_blocks_oversell(db_session: AsyncSession, customer: User):
    product = Product(
        name="Limited Scrunchie",
        slug="limited-scrunchie",
        sku="TEST-002",
        price=Decimal("99.00"),
        status=ProductStatus.ACTIVE.value,
    )
    db_session.add(product)
    await db_session.flush()
    db_session.add(Inventory(product_id=product.id, on_hand=1, reserved=0))
    await db_session.commit()

    svc = CartService(db_session)
    cart = await svc.get_or_create_user_cart(customer.id)
    with pytest.raises(ValueError, match="stock"):
        await svc.add_item(cart.id, product.id, 2)
