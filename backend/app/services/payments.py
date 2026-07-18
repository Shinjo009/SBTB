from abc import ABC, abstractmethod
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.security import generate_token
from app.models.audit import AdminAuditLog
from app.models.enums import OrderStatus, PaymentStatus, ReservationStatus
from app.models.inventory import Inventory, InventoryReservation
from app.models.order import Order, OrderStatusHistory
from app.models.payment import Payment, PaymentVerification
from app.models.settings import StoreSettings
from app.services.email import branded_email, get_email_service


class PaymentService(ABC):
    @abstractmethod
    async def create_payment_attempt(self, order: Order) -> Payment: ...

    @abstractmethod
    async def submit_payment(
        self, payment: Payment, *, upi_reference: str, screenshot_key: str | None, screenshot_url: str | None
    ) -> Payment: ...

    @abstractmethod
    async def approve(self, payment: Payment, admin_id: str) -> Payment: ...

    @abstractmethod
    async def decline(self, payment: Payment, admin_id: str, reason: str | None) -> Payment: ...


class ManualUPIPaymentService(PaymentService):
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.settings = get_settings()

    async def get_store_settings(self) -> StoreSettings:
        settings = await self.db.scalar(select(StoreSettings).limit(1))
        if not settings:
            settings = StoreSettings()
            self.db.add(settings)
            await self.db.commit()
            await self.db.refresh(settings)
        return settings

    async def create_payment_attempt(self, order: Order) -> Payment:
        store = await self.get_store_settings()
        expires = datetime.now(UTC) + timedelta(minutes=self.settings.payment_window_minutes)
        payment = Payment(
            order_id=order.id,
            provider="manual_upi",
            status=PaymentStatus.PENDING.value,
            amount=order.total,
            currency=order.currency,
            upi_id_snapshot=store.upi_id,
            reference_code=f"SBTB-{generate_token(6).upper()}",
            expires_at=expires,
        )
        order.payment_expires_at = expires
        order.status = OrderStatus.PENDING_PAYMENT.value
        self.db.add(payment)
        await self.db.commit()
        await self.db.refresh(payment)
        return payment

    async def submit_payment(
        self,
        payment: Payment,
        *,
        upi_reference: str,
        screenshot_key: str | None,
        screenshot_url: str | None,
        customer_note: str | None = None,
    ) -> Payment:
        await self.db.refresh(payment, attribute_names=["order"])
        now = datetime.now(UTC)
        if payment.status != PaymentStatus.PENDING.value:
            raise ValueError("Payment cannot be submitted in its current state")
        if payment.expires_at < now:
            await self.expire_payment(payment)
            raise ValueError("Payment window has expired")
        ref = upi_reference.strip().upper()
        if len(ref) < 6:
            raise ValueError("Invalid UPI reference")
        existing = await self.db.scalar(
            select(PaymentVerification).where(PaymentVerification.upi_reference == ref)
        )
        if existing:
            raise ValueError("This UPI reference was already submitted")
        payment.status = PaymentStatus.VERIFICATION_PENDING.value
        payment.submitted_at = now
        payment.order.status = OrderStatus.PAYMENT_VERIFICATION_PENDING.value
        self.db.add(
            PaymentVerification(
                payment_id=payment.id,
                upi_reference=ref,
                screenshot_object_key=screenshot_key,
                screenshot_url=screenshot_url,
                customer_note=customer_note,
            )
        )
        self.db.add(
            OrderStatusHistory(
                order_id=payment.order_id,
                from_status=OrderStatus.PENDING_PAYMENT.value,
                to_status=OrderStatus.PAYMENT_VERIFICATION_PENDING.value,
                note="Customer submitted payment for verification",
            )
        )
        await self.db.commit()
        await self.db.refresh(payment)
        html = branded_email(
            "Payment submitted",
            f"<p>We received your payment details for order <strong>{payment.order.order_number}</strong>.</p>"
            "<p>We're verifying your payment. You'll get another email once confirmed.</p>",
        )
        try:
            get_email_service().send(
                to=payment.order.user.email if payment.order.user else "",
                subject=f"Payment submitted · {payment.order.order_number}",
                html=html,
            )
        except Exception:
            pass
        return payment

    async def expire_payment(self, payment: Payment) -> None:
        if payment.status != PaymentStatus.PENDING.value:
            return
        payment.status = PaymentStatus.EXPIRED.value
        order = await self.db.get(Order, payment.order_id)
        if order and order.status == OrderStatus.PENDING_PAYMENT.value:
            order.status = OrderStatus.PAYMENT_EXPIRED.value
            self.db.add(
                OrderStatusHistory(
                    order_id=order.id,
                    from_status=OrderStatus.PENDING_PAYMENT.value,
                    to_status=OrderStatus.PAYMENT_EXPIRED.value,
                    note="Payment window expired",
                )
            )
            await self._release_reservations(order.id)
        await self.db.commit()

    async def _release_reservations(self, order_id: str) -> None:
        reservations = await self.db.scalars(
            select(InventoryReservation).where(
                InventoryReservation.order_id == order_id,
                InventoryReservation.status == ReservationStatus.ACTIVE.value,
            )
        )
        for reservation in reservations:
            inv = await self.db.scalar(
                select(Inventory).where(Inventory.product_id == reservation.product_id).with_for_update()
            )
            if inv:
                inv.reserved = max(inv.reserved - reservation.quantity, 0)
                inv.version += 1
            reservation.status = ReservationStatus.RELEASED.value

    async def _consume_reservations(self, order_id: str) -> None:
        reservations = await self.db.scalars(
            select(InventoryReservation).where(
                InventoryReservation.order_id == order_id,
                InventoryReservation.status == ReservationStatus.ACTIVE.value,
            )
        )
        for reservation in reservations:
            inv = await self.db.scalar(
                select(Inventory).where(Inventory.product_id == reservation.product_id).with_for_update()
            )
            if not inv or inv.reserved < reservation.quantity or inv.on_hand < reservation.quantity:
                raise ValueError("Inventory inconsistency during payment approval")
            inv.on_hand -= reservation.quantity
            inv.reserved -= reservation.quantity
            inv.version += 1
            reservation.status = ReservationStatus.CONSUMED.value

    async def approve(self, payment: Payment, admin_id: str) -> Payment:
        result = await self.db.execute(
            select(Payment)
            .options(selectinload(Payment.order).selectinload(Order.user), selectinload(Payment.verification))
            .where(Payment.id == payment.id)
            .with_for_update()
        )
        payment = result.scalar_one()
        if payment.status != PaymentStatus.VERIFICATION_PENDING.value:
            raise ValueError("Payment is not awaiting verification")
        prev = payment.status
        order_prev = payment.order.status
        await self._consume_reservations(payment.order_id)
        payment.status = PaymentStatus.PAID.value
        payment.verified_at = datetime.now(UTC)
        payment.verified_by_id = admin_id
        payment.order.status = OrderStatus.PROCESSING.value
        self.db.add(
            OrderStatusHistory(
                order_id=payment.order_id,
                from_status=order_prev,
                to_status=OrderStatus.PROCESSING.value,
                note="Payment approved",
                changed_by_id=admin_id,
            )
        )
        self.db.add(
            AdminAuditLog(
                admin_id=admin_id,
                action="PAYMENT_APPROVE",
                entity_type="payment",
                entity_id=payment.id,
                previous_values={"status": prev, "order_status": order_prev},
                new_values={"status": payment.status, "order_status": payment.order.status},
            )
        )
        await self.db.commit()
        html = branded_email(
            "Payment confirmed!",
            f"<p>Hi {payment.order.shipping_full_name},</p>"
            f"<p>Payment confirmed for order <strong>{payment.order.order_number}</strong>.</p>"
            f"<p>Amount: ₹{payment.amount}</p><p>Your order is now being processed.</p>",
        )
        try:
            get_email_service().send(
                to=payment.order.user.email,
                subject=f"Payment confirmed · {payment.order.order_number}",
                html=html,
            )
        except Exception:
            pass
        return payment

    async def decline(self, payment: Payment, admin_id: str, reason: str | None) -> Payment:
        result = await self.db.execute(
            select(Payment)
            .options(selectinload(Payment.order).selectinload(Order.user))
            .where(Payment.id == payment.id)
            .with_for_update()
        )
        payment = result.scalar_one()
        if payment.status != PaymentStatus.VERIFICATION_PENDING.value:
            raise ValueError("Payment is not awaiting verification")
        prev = payment.status
        order_prev = payment.order.status
        payment.status = PaymentStatus.DECLINED.value
        payment.verified_at = datetime.now(UTC)
        payment.verified_by_id = admin_id
        payment.decline_reason = reason
        payment.order.status = OrderStatus.PAYMENT_DECLINED.value
        await self._release_reservations(payment.order_id)
        self.db.add(
            OrderStatusHistory(
                order_id=payment.order_id,
                from_status=order_prev,
                to_status=OrderStatus.PAYMENT_DECLINED.value,
                note=reason or "Payment verification unsuccessful",
                changed_by_id=admin_id,
            )
        )
        self.db.add(
            AdminAuditLog(
                admin_id=admin_id,
                action="PAYMENT_DECLINE",
                entity_type="payment",
                entity_id=payment.id,
                previous_values={"status": prev},
                new_values={"status": payment.status},
                note=reason,
            )
        )
        await self.db.commit()
        html = branded_email(
            "Payment verification update",
            f"<p>Hi {payment.order.shipping_full_name},</p>"
            f"<p>We could not verify payment for order <strong>{payment.order.order_number}</strong>.</p>"
            f"<p>{reason or 'Payment verification was unsuccessful. Please contact support if you believe this is a mistake.'}</p>",
        )
        try:
            get_email_service().send(
                to=payment.order.user.email,
                subject=f"Payment verification update · {payment.order.order_number}",
                html=html,
            )
        except Exception:
            pass
        return payment

    async def expire_due_payments(self) -> int:
        now = datetime.now(UTC)
        payments = await self.db.scalars(
            select(Payment).where(
                Payment.status == PaymentStatus.PENDING.value,
                Payment.expires_at < now,
            )
        )
        count = 0
        for payment in payments:
            await self.expire_payment(payment)
            count += 1
        return count


def get_payment_service(db: AsyncSession) -> PaymentService:
    return ManualUPIPaymentService(db)
