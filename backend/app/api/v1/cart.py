from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_verified_user, require_csrf
from app.db.session import get_db
from app.models.user import User
from app.services.cart import CartService

router = APIRouter(prefix="/cart", tags=["cart"], dependencies=[Depends(require_csrf)])


class CartItemIn(BaseModel):
    product_id: str
    quantity: int = Field(default=1, ge=1, le=50)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=0, le=50)


@router.get("")
async def get_cart(user: User = Depends(get_verified_user), db: AsyncSession = Depends(get_db)):
    svc = CartService(db)
    cart = await svc.get_or_create_user_cart(user.id)
    return await svc.get_cart_detail(cart.id)


@router.post("/items")
async def add_item(
    payload: CartItemIn,
    user: User = Depends(get_verified_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CartService(db)
    cart = await svc.get_or_create_user_cart(user.id)
    try:
        return await svc.add_item(cart.id, payload.product_id, payload.quantity)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/items/{item_id}")
async def update_item(
    item_id: str,
    payload: CartItemUpdate,
    user: User = Depends(get_verified_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CartService(db)
    cart = await svc.get_or_create_user_cart(user.id)
    try:
        return await svc.update_item(cart.id, item_id, payload.quantity)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/items/{item_id}")
async def remove_item(
    item_id: str,
    user: User = Depends(get_verified_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CartService(db)
    cart = await svc.get_or_create_user_cart(user.id)
    return await svc.remove_item(cart.id, item_id)
