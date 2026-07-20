from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_verified_user, require_csrf, require_staff, user_role_names
from app.db.session import get_db
from app.models.enums import UserRoleName
from app.models.order import Order
from app.models.payment import Payment
from app.models.user import User
from app.services.payments import ManualUPIPaymentService

router = APIRouter(prefix="/orders", tags=["orders"])


async def _serialize_order(order: Order, db: AsyncSession) -> dict:
    payment = sorted(order.payments, key=lambda p: p.created_at, reverse=True)[0] if order.payments else None
    store = await ManualUPIPaymentService(db).get_store_settings()
    return {
        "id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "subtotal": order.subtotal,
        "shipping_amount": order.shipping_amount,
        "total": order.total,
        "currency": order.currency,
        "created_at": order.created_at,
        "payment_expires_at": order.payment_expires_at,
        "shipping": {
            "full_name": order.shipping_full_name,
            "phone": order.shipping_phone,
            "line1": order.shipping_line1,
            "line2": order.shipping_line2,
            "landmark": order.shipping_landmark,
            "city": order.shipping_city,
            "state": order.shipping_state,
            "postal_code": order.shipping_postal_code,
            "country": order.shipping_country,
        },
        "items": [
            {
                "id": item.id,
                "product_name": item.product_name,
                "sku": item.sku,
                "unit_price": item.unit_price,
                "quantity": item.quantity,
                "line_total": item.line_total,
            }
            for item in order.items
        ],
        "payment": {
            "id": payment.id,
            "status": payment.status,
            "amount": payment.amount,
            "reference_code": payment.reference_code,
            "expires_at": payment.expires_at,
            "upi_id": payment.upi_id_snapshot or store.upi_id,
            "upi_qr_url": store.upi_qr_url,
            "payment_instructions": store.payment_instructions,
            "submitted_at": payment.submitted_at,
            "verification": {
                "upi_reference": payment.verification.upi_reference,
                "screenshot_url": payment.verification.screenshot_url,
            }
            if payment and payment.verification
            else None,
        }
        if payment
        else None,
        "timeline": [
            {
                "from_status": h.from_status,
                "to_status": h.to_status,
                "note": h.note,
                "created_at": h.created_at,
            }
            for h in order.status_history
        ],
    }


@router.get("")
async def list_my_orders(user: User = Depends(get_verified_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.payments).selectinload(Payment.verification),
            selectinload(Order.status_history),
        )
        .where(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
    )
    return [await _serialize_order(o, db) for o in result.scalars().unique().all()]


@router.get("/{order_id}")
async def get_order(
    order_id: str,
    user: User = Depends(get_verified_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.payments).selectinload(Payment.verification),
            selectinload(Order.status_history),
        )
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    is_admin = UserRoleName.ADMIN.value in user_role_names(user)
    if order.user_id != user.id and not is_admin:
        raise HTTPException(status_code=404, detail="Order not found")
    return await _serialize_order(order, db)


@router.patch("/{order_id}/status", dependencies=[Depends(require_csrf), Depends(require_staff)])
async def update_order_status(
    order_id: str,
    payload: dict,
    admin: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    from app.models.enums import OrderStatus
    from app.models.order import OrderStatusHistory

    allowed = {
        OrderStatus.PROCESSING.value: {OrderStatus.SHIPPED.value},
        OrderStatus.SHIPPED.value: {OrderStatus.DELIVERED.value},
        OrderStatus.PAID.value: {OrderStatus.PROCESSING.value, OrderStatus.SHIPPED.value},
    }
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    new_status = payload.get("status")
    if new_status not in allowed.get(order.status, set()):
        raise HTTPException(status_code=400, detail="Invalid status transition")
    prev = order.status
    order.status = new_status
    db.add(
        OrderStatusHistory(
            order_id=order.id,
            from_status=prev,
            to_status=new_status,
            changed_by_id=admin.id,
            note=payload.get("note"),
        )
    )
    await db.commit()
    return {"id": order.id, "status": order.status}
