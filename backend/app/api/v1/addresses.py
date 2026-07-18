from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_verified_user, require_csrf
from app.db.session import get_db
from app.models.address import Address
from app.models.user import User
from app.schemas.common import ORMModel

router = APIRouter(prefix="/addresses", tags=["addresses"], dependencies=[Depends(require_csrf)])


class AddressIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=8, max_length=20)
    line1: str = Field(min_length=3, max_length=255)
    line2: str | None = None
    landmark: str | None = None
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    postal_code: str = Field(min_length=4, max_length=20)
    country: str = "India"
    is_default: bool = False


class AddressOut(ORMModel):
    id: str
    full_name: str
    phone: str
    line1: str
    line2: str | None
    landmark: str | None
    city: str
    state: str
    postal_code: str
    country: str
    is_default: bool


@router.get("", response_model=list[AddressOut])
async def list_addresses(user: User = Depends(get_verified_user), db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(select(Address).where(Address.user_id == user.id).order_by(Address.is_default.desc()))
    return list(rows)


@router.post("", response_model=AddressOut)
async def create_address(
    payload: AddressIn, user: User = Depends(get_verified_user), db: AsyncSession = Depends(get_db)
):
    if payload.is_default:
        await db.execute(update(Address).where(Address.user_id == user.id).values(is_default=False))
    address = Address(user_id=user.id, **payload.model_dump())
    db.add(address)
    await db.commit()
    await db.refresh(address)
    return address


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(
    address_id: str, user: User = Depends(get_verified_user), db: AsyncSession = Depends(get_db)
):
    address = await db.get(Address, address_id)
    if not address or address.user_id != user.id:
        raise HTTPException(status_code=404, detail="Address not found")
    await db.delete(address)
    await db.commit()
