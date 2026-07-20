import math

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_admin, require_csrf
from app.db.session import get_db
from app.models.enums import OrderStatus, PaymentStatus
from app.models.inventory import Inventory
from app.models.order import Order
from app.models.payment import Payment
from app.models.user import User
from app.schemas.auth import CreateUserIn
from app.schemas.catalog import CategoryIn, CategoryOut, ProductIn, ProductOut
from app.schemas.common import MessageOut, Page
from app.services.catalog import CatalogService
from app.services.payments import ManualUPIPaymentService
from app.services.storage import get_storage
router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_csrf), Depends(require_admin)])


@router.get("/dashboard")
async def dashboard(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    total_orders = await db.scalar(select(func.count()).select_from(Order)) or 0
    revenue = await db.scalar(
        select(func.coalesce(func.sum(Order.total), 0)).where(
            Order.status.in_(
                [
                    OrderStatus.PAID.value,
                    OrderStatus.PROCESSING.value,
                    OrderStatus.SHIPPED.value,
                    OrderStatus.DELIVERED.value,
                ]
            )
        )
    )
    pending_payments = await db.scalar(
        select(func.count()).select_from(Payment).where(
            Payment.status == PaymentStatus.VERIFICATION_PENDING.value
        )
    ) or 0
    processing = await db.scalar(
        select(func.count()).select_from(Order).where(Order.status == OrderStatus.PROCESSING.value)
    ) or 0
    low_stock = await db.scalar(
        select(func.count()).select_from(Inventory).where(
            (Inventory.on_hand - Inventory.reserved) <= Inventory.low_stock_threshold
        )
    ) or 0
    customers = await db.scalar(select(func.count()).select_from(User)) or 0
    return {
        "total_orders": total_orders,
        "revenue": revenue,
        "pending_payments": pending_payments,
        "processing_orders": processing,
        "low_stock_products": low_stock,
        "total_customers": customers,
    }


@router.get("/categories", response_model=list[CategoryOut])
async def admin_categories(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    return await CatalogService(db).list_categories(active_only=False)


@router.post("/categories", response_model=CategoryOut)
async def create_category(
    payload: CategoryIn, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    return await CatalogService(db).create_category(payload)


@router.put("/categories/{category_id}", response_model=CategoryOut)
async def update_category(
    category_id: str,
    payload: CategoryIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    try:
        return await CatalogService(db).update_category(category_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/categories/{category_id}", response_model=MessageOut)
async def delete_category(
    category_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    try:
        await CatalogService(db).delete_category(category_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MessageOut(message="Category deleted")


@router.get("/products", response_model=Page[ProductOut])
async def admin_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    items, total = await CatalogService(db).list_products(page=page, page_size=page_size, q=q, admin=True)
    return Page(items=items, total=total, page=page, page_size=page_size, pages=max(1, math.ceil(total / page_size)) if total else 0)


@router.post("/products", response_model=ProductOut)
async def create_product(
    payload: ProductIn, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    return await CatalogService(db).create_product(payload)


@router.put("/products/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: str,
    payload: ProductIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    try:
        return await CatalogService(db).update_product(product_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/products/{product_id}/images")
async def upload_product_image(
    product_id: str,
    file: UploadFile = File(...),
    alt_text: str | None = Form(default=None),
    is_primary: bool = Form(default=False),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    key, url, width, height = await get_storage().save_image(file, folder="products")
    try:
        image = await CatalogService(db).add_image(
            product_id,
            url=url,
            object_key=key,
            alt=alt_text,
            width=width,
            height=height,
            primary=is_primary,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return image


@router.get("/payments/pending")
async def pending_payments(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(
        select(Payment)
        .options(
            selectinload(Payment.order).selectinload(Order.items),
            selectinload(Payment.order).selectinload(Order.user),
            selectinload(Payment.verification),
        )
        .where(Payment.status == PaymentStatus.VERIFICATION_PENDING.value)
        .order_by(Payment.submitted_at.asc())
    )
    payments = result.scalars().unique().all()
    return [
        {
            "id": p.id,
            "order_id": p.order_id,
            "order_number": p.order.order_number,
            "customer": p.order.user.full_name,
            "email": p.order.user.email,
            "phone": p.order.shipping_phone,
            "amount": p.amount,
            "upi_reference": p.verification.upi_reference if p.verification else None,
            "screenshot_url": p.verification.screenshot_url if p.verification else None,
            "submitted_at": p.submitted_at,
            "expires_at": p.expires_at,
            "items": [
                {"name": i.product_name, "qty": i.quantity, "price": i.unit_price} for i in p.order.items
            ],
        }
        for p in payments
    ]


class PaymentDecision(BaseModel):
    reason: str | None = None


@router.post("/payments/{payment_id}/approve", response_model=MessageOut)
async def approve_payment(
    payment_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    payment = await db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    try:
        await ManualUPIPaymentService(db).approve(payment, admin.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MessageOut(message="Payment approved")


@router.post("/payments/{payment_id}/decline", response_model=MessageOut)
async def decline_payment(
    payment_id: str,
    payload: PaymentDecision,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    payment = await db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    try:
        await ManualUPIPaymentService(db).decline(payment, admin.id, payload.reason)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MessageOut(message="Payment declined")


@router.get("/customers")
async def list_customers(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    users = await db.scalars(select(User).order_by(User.created_at.desc()).limit(200))
    out = []
    for user in users:
        order_count = await db.scalar(select(func.count()).select_from(Order).where(Order.user_id == user.id))
        out.append(
            {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "phone": user.phone,
                "email_verified": user.email_verified,
                "created_at": user.created_at,
                "order_count": order_count or 0,
            }
        )
    return out


@router.post("/customers")
async def create_customer(
    payload: CreateUserIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    from app.services.auth import AuthService

    try:
        user = await AuthService(db).create_user(
            email=payload.email,
            full_name=payload.full_name,
            phone=payload.phone,
            is_admin=payload.is_admin,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "email_verified": user.email_verified,
        "created_at": user.created_at,
        "order_count": 0,
        "roles": [ur.role.name for ur in user.roles if ur.role],
    }


@router.get("/orders")
async def admin_orders(
    status_filter: str | None = Query(default=None, alias="status"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    stmt = (
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.user), selectinload(Order.payments))
        .order_by(Order.created_at.desc())
        .limit(200)
    )
    if status_filter:
        stmt = stmt.where(Order.status == status_filter)
    orders = (await db.execute(stmt)).scalars().unique().all()
    return [
        {
            "id": o.id,
            "order_number": o.order_number,
            "status": o.status,
            "total": o.total,
            "customer": o.user.full_name,
            "email": o.user.email,
            "created_at": o.created_at,
        }
        for o in orders
    ]


@router.get("/settings")
async def get_settings(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    return await ManualUPIPaymentService(db).get_store_settings()


class SettingsIn(BaseModel):
    store_name: str = Field(min_length=2, max_length=120)
    support_email: str
    announcement_banner: str | None = None
    upi_id: str | None = None
    payment_instructions: str | None = None
    shipping_info: str | None = None
    low_stock_default: int = Field(default=5, ge=0)
    is_storefront_live: bool = True


@router.put("/settings")
async def update_settings(
    payload: SettingsIn, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    settings = await ManualUPIPaymentService(db).get_store_settings()
    for key, value in payload.model_dump().items():
        setattr(settings, key, value)
    await db.commit()
    await db.refresh(settings)
    return settings


@router.post("/settings/upi-qr")
async def upload_upi_qr(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    key, url, _, _ = await get_storage().save_image(file, folder="settings")
    settings = await ManualUPIPaymentService(db).get_store_settings()
    settings.upi_qr_object_key = key
    settings.upi_qr_url = url
    await db.commit()
    return {"upi_qr_url": url}

