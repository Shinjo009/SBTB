from pydantic import BaseModel, Field, model_validator
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_verified_user, require_csrf
from app.db.session import get_db
from app.models.address import Address
from app.models.user import User
from app.services.checkout import CheckoutService

router = APIRouter(prefix="/checkout", tags=["checkout"], dependencies=[Depends(require_csrf)])


class CheckoutAddress(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=8, max_length=20)
    line1: str = Field(min_length=3, max_length=255)
    line2: str | None = None
    landmark: str | None = None
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    postal_code: str = Field(min_length=4, max_length=20)
    country: str = "India"


class CheckoutIn(BaseModel):
    address_id: str | None = None
    address: CheckoutAddress | None = None

    @model_validator(mode="after")
    def require_one(self) -> "CheckoutIn":
        if not self.address_id and not self.address:
            raise ValueError("Provide address_id or address")
        return self


@router.post("/create-order")
async def create_order(
    payload: CheckoutIn,
    user: User = Depends(get_verified_user),
    db: AsyncSession = Depends(get_db),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    if payload.address_id:
        address = await db.get(Address, payload.address_id)
        if not address or address.user_id != user.id:
            raise HTTPException(status_code=404, detail="Address not found")
        address_data = {
            "full_name": address.full_name,
            "phone": address.phone,
            "line1": address.line1,
            "line2": address.line2,
            "landmark": address.landmark,
            "city": address.city,
            "state": address.state,
            "postal_code": address.postal_code,
            "country": address.country,
        }
    else:
        assert payload.address is not None
        address_data = payload.address.model_dump()
    try:
        return await CheckoutService(db).create_order(
            user, address=address_data, idempotency_key=idempotency_key
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
