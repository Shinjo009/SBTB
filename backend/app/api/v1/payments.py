from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_verified_user, require_csrf
from app.core.config import get_settings
from app.db.session import get_db
from app.models.enums import OrderStatus, ReservationStatus
from app.models.inventory import Inventory, InventoryReservation
from app.models.order import Order, OrderItem
from app.models.payment import Payment
from app.models.user import User
from app.services.payments import ManualUPIPaymentService
from app.services.storage import get_storage

router = APIRouter(prefix="/payments", tags=["payments"], dependencies=[Depends(require_csrf)])


@router.post("/{payment_id}/submit")
async def submit_payment(
    payment_id: str,
    upi_reference: str = Form(...),
    customer_note: str | None = Form(default=None),
    screenshot: UploadFile | None = File(default=None),
    user: User = Depends(get_verified_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Payment)
        .options(selectinload(Payment.order).selectinload(Order.user), selectinload(Payment.verification))
        .where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()
    if not payment or payment.order.user_id != user.id:
        raise HTTPException(status_code=404, detail="Payment not found")
    screenshot_key = screenshot_url = None
    if screenshot and screenshot.filename:
        screenshot_key, screenshot_url, _, _ = await get_storage().save_image(screenshot, folder="payments")
    try:
        payment = await ManualUPIPaymentService(db).submit_payment(
            payment,
            upi_reference=upi_reference,
            screenshot_key=screenshot_key,
            screenshot_url=screenshot_url,
            customer_note=customer_note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {
        "id": payment.id,
        "status": payment.status,
        "message": "Payment submitted. We're verifying your payment.",
    }


@router.post("/{payment_id}/retry")
async def retry_payment(
    payment_id: str,
    user: User = Depends(get_verified_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Payment).options(selectinload(Payment.order)).where(Payment.id == payment_id)
    )
    old = result.scalar_one_or_none()
    if not old or old.order.user_id != user.id:
        raise HTTPException(status_code=404, detail="Payment not found")
    if old.order.status not in {OrderStatus.PAYMENT_EXPIRED.value, OrderStatus.PAYMENT_DECLINED.value}:
        raise HTTPException(status_code=400, detail="Payment retry not allowed")

    order = old.order
    settings = get_settings()
    expires = datetime.now(UTC) + timedelta(minutes=settings.payment_window_minutes)
    items = await db.scalars(select(OrderItem).where(OrderItem.order_id == order.id))
    for item in items:
        inv = await db.scalar(
            select(Inventory).where(Inventory.product_id == item.product_id).with_for_update()
        )
        if not inv or inv.available < item.quantity:
            raise HTTPException(status_code=400, detail=f"Not enough stock for {item.product_name}")
        inv.reserved += item.quantity
        inv.version += 1
        db.add(
            InventoryReservation(
                order_id=order.id,
                product_id=item.product_id,
                quantity=item.quantity,
                status=ReservationStatus.ACTIVE.value,
                expires_at=expires,
            )
        )
    order.status = OrderStatus.PENDING_PAYMENT.value
    order.payment_expires_at = expires
    payment_svc = ManualUPIPaymentService(db)
    payment = await payment_svc.create_payment_attempt(order)
    store = await payment_svc.get_store_settings()
    return {
        "order_id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "payment": {
            "id": payment.id,
            "status": payment.status,
            "amount": payment.amount,
            "reference_code": payment.reference_code,
            "expires_at": payment.expires_at,
            "upi_id": payment.upi_id_snapshot or store.upi_id,
            "upi_qr_url": store.upi_qr_url,
            "payment_instructions": store.payment_instructions,
        },
    }
