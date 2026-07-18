from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cart import Cart, CartItem
from app.models.catalog import Product
from app.models.enums import ProductStatus
from app.models.inventory import Inventory


class CartService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_or_create_user_cart(self, user_id: str) -> Cart:
        cart = await self.db.scalar(select(Cart).where(Cart.user_id == user_id))
        if cart:
            return cart
        cart = Cart(user_id=user_id)
        self.db.add(cart)
        await self.db.commit()
        await self.db.refresh(cart)
        return cart

    async def get_cart_detail(self, cart_id: str) -> dict:
        result = await self.db.execute(
            select(Cart)
            .options(
                selectinload(Cart.items)
                .selectinload(CartItem.product)
                .selectinload(Product.images),
                selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.inventory),
            )
            .where(Cart.id == cart_id)
        )
        cart = result.scalar_one()
        items = []
        subtotal = Decimal("0.00")
        for item in cart.items:
            product = item.product
            available = product.inventory.available if product.inventory else 0
            line = product.price * item.quantity
            subtotal += line
            primary = next((img.url for img in product.images if img.is_primary), None)
            if not primary and product.images:
                primary = product.images[0].url
            items.append(
                {
                    "id": item.id,
                    "product_id": product.id,
                    "name": product.name,
                    "slug": product.slug,
                    "price": product.price,
                    "quantity": item.quantity,
                    "line_total": line,
                    "available_stock": available,
                    "image_url": primary,
                }
            )
        return {"id": cart.id, "items": items, "subtotal": subtotal, "item_count": sum(i["quantity"] for i in items)}

    async def add_item(self, cart_id: str, product_id: str, quantity: int = 1) -> dict:
        if quantity < 1:
            raise ValueError("Quantity must be at least 1")
        product = await self.db.scalar(
            select(Product)
            .options(selectinload(Product.inventory))
            .where(Product.id == product_id, Product.status == ProductStatus.ACTIVE.value)
        )
        if not product or not product.inventory:
            raise ValueError("Product unavailable")
        item = await self.db.scalar(
            select(CartItem).where(CartItem.cart_id == cart_id, CartItem.product_id == product_id)
        )
        new_qty = (item.quantity if item else 0) + quantity
        if new_qty > product.inventory.available:
            raise ValueError("Not enough stock available")
        if item:
            item.quantity = new_qty
        else:
            self.db.add(CartItem(cart_id=cart_id, product_id=product_id, quantity=quantity))
        await self.db.commit()
        return await self.get_cart_detail(cart_id)

    async def update_item(self, cart_id: str, item_id: str, quantity: int) -> dict:
        item = await self.db.scalar(
            select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart_id)
        )
        if not item:
            raise ValueError("Cart item not found")
        if quantity < 1:
            await self.db.delete(item)
            await self.db.commit()
            return await self.get_cart_detail(cart_id)
        inv = await self.db.scalar(select(Inventory).where(Inventory.product_id == item.product_id))
        if not inv or quantity > inv.available:
            raise ValueError("Not enough stock available")
        item.quantity = quantity
        await self.db.commit()
        return await self.get_cart_detail(cart_id)

    async def remove_item(self, cart_id: str, item_id: str) -> dict:
        item = await self.db.scalar(
            select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart_id)
        )
        if item:
            await self.db.delete(item)
            await self.db.commit()
        return await self.get_cart_detail(cart_id)

    async def clear(self, cart_id: str) -> None:
        items = await self.db.scalars(select(CartItem).where(CartItem.cart_id == cart_id))
        for item in items:
            await self.db.delete(item)
        await self.db.commit()
