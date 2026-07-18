from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.security import generate_token
from app.models.cart import Cart, CartItem
from app.models.catalog import Product
from app.models.enums import OrderStatus, ProductStatus, ReservationStatus
from app.models.inventory import Inventory, InventoryReservation
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.payment import Payment
from app.models.settings import StoreSettings
from app.models.user import User
from app.services.cart import CartService
from app.services.email import branded_email, get_email_service
from app.services.payments import ManualUPIPaymentService


class CheckoutService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.settings = get_settings()

    async def create_order(
        self,
        user: User,
        *,
        address: dict,
        idempotency_key: str | None = None,
    ) -> dict:
        if idempotency_key:
            existing = await self.db.scalar(select(Order).where(Order.idempotency_key == idempotency_key))
            if existing:
                payment = await self.db.scalar(
                    select(Payment)
                    .where(Payment.order_id == existing.id)
                    .order_by(Payment.created_at.desc())
                )
                store = await ManualUPIPaymentService(self.db).get_store_settings()
                return self._order_payload(existing, payment, store)

        cart_svc = CartService(self.db)
        cart = await cart_svc.get_or_create_user_cart(user.id)
        result = await self.db.execute(
            select(Cart)
            .options(
                selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.inventory)
            )
            .where(Cart.id == cart.id)
        )
        cart = result.scalar_one()
        if not cart.items:
            raise ValueError("Cart is empty")

        expires = datetime.now(UTC) + timedelta(minutes=self.settings.payment_window_minutes)
        order_number = f"SBTB{datetime.now(UTC).strftime('%y%m%d')}{generate_token(3).upper()}"
        subtotal = Decimal("0.00")
        line_rows: list[tuple[Product, int, Decimal]] = []

        for item in cart.items:
            inv = await self.db.scalar(
                select(Inventory).where(Inventory.product_id == item.product_id).with_for_update()
            )
            product = await self.db.scalar(
                select(Product).where(
                    Product.id == item.product_id, Product.status == ProductStatus.ACTIVE.value
                )
            )
            if not product or not inv:
                raise ValueError("A product in your cart is unavailable")
            if item.quantity > inv.available:
                raise ValueError(f"Not enough stock for {product.name}")
            line_total = product.price * item.quantity
            subtotal += line_total
            line_rows.append((product, item.quantity, line_total))
            inv.reserved += item.quantity
            inv.version += 1

        shipping_amount = Decimal("0.00")
        order = Order(
            order_number=order_number,
            user_id=user.id,
            status=OrderStatus.PENDING_PAYMENT.value,
            subtotal=subtotal,
            shipping_amount=shipping_amount,
            total=subtotal + shipping_amount,
            shipping_full_name=address["full_name"],
            shipping_phone=address["phone"],
            shipping_line1=address["line1"],
            shipping_line2=address.get("line2"),
            shipping_landmark=address.get("landmark"),
            shipping_city=address["city"],
            shipping_state=address["state"],
            shipping_postal_code=address["postal_code"],
            shipping_country=address.get("country") or "India",
            payment_expires_at=expires,
            idempotency_key=idempotency_key,
        )
        self.db.add(order)
        await self.db.flush()

        for product, qty, line_total in line_rows:
            self.db.add(
                OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    product_name=product.name,
                    sku=product.sku,
                    unit_price=product.price,
                    quantity=qty,
                    line_total=line_total,
                )
            )
            self.db.add(
                InventoryReservation(
                    order_id=order.id,
                    product_id=product.id,
                    quantity=qty,
                    status=ReservationStatus.ACTIVE.value,
                    expires_at=expires,
                )
            )

        self.db.add(
            OrderStatusHistory(
                order_id=order.id,
                from_status=None,
                to_status=OrderStatus.PENDING_PAYMENT.value,
                changed_by_id=user.id,
                note="Order created",
            )
        )
        payment_svc = ManualUPIPaymentService(self.db)
        store = await payment_svc.get_store_settings()
        payment = await payment_svc.create_payment_attempt(order)
        await cart_svc.clear(cart.id)

        html = branded_email(
            "Order placed",
            f"<p>Hi {order.shipping_full_name},</p>"
            f"<p>Your order <strong>{order.order_number}</strong> is awaiting UPI payment of ₹{order.total}.</p>"
            f"<p>Complete payment within {self.settings.payment_window_minutes} minutes.</p>",
        )
        try:
            get_email_service().send(to=user.email, subject=f"Order placed · {order.order_number}", html=html)
        except Exception:
            pass
        return self._order_payload(order, payment, store)

    def _order_payload(self, order: Order, payment: Payment | None, store: StoreSettings) -> dict:
        return {
            "order_id": order.id,
            "order_number": order.order_number,
            "status": order.status,
            "total": order.total,
            "currency": order.currency,
            "payment": {
                "id": payment.id if payment else None,
                "status": payment.status if payment else None,
                "amount": payment.amount if payment else order.total,
                "reference_code": payment.reference_code if payment else None,
                "expires_at": payment.expires_at.isoformat() if payment else None,
                "upi_id": (payment.upi_id_snapshot if payment else None) or store.upi_id,
                "upi_qr_url": store.upi_qr_url,
                "payment_instructions": store.payment_instructions,
            },
        }
