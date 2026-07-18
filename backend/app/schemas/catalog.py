from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class CategoryIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=140)
    description: str | None = None
    parent_id: str | None = None
    sort_order: int = 0
    is_active: bool = True


class CategoryOut(ORMModel):
    id: str
    name: str
    slug: str
    description: str | None
    parent_id: str | None
    sort_order: int
    is_active: bool


class ProductImageOut(ORMModel):
    id: str
    url: str
    alt_text: str | None
    sort_order: int
    is_primary: bool


class ProductIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    slug: str = Field(min_length=2, max_length=220)
    sku: str = Field(min_length=2, max_length=64)
    category_id: str | None = None
    short_description: str | None = Field(default=None, max_length=300)
    description: str | None = None
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    compare_at_price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    status: str = "DRAFT"
    is_featured: bool = False
    is_new_arrival: bool = False
    is_best_seller: bool = False
    stock_quantity: int = Field(default=0, ge=0)
    low_stock_threshold: int = Field(default=5, ge=0)


class ProductOut(ORMModel):
    id: str
    name: str
    slug: str
    sku: str
    category_id: str | None
    short_description: str | None
    description: str | None
    price: Decimal
    compare_at_price: Decimal | None
    status: str
    is_featured: bool
    is_new_arrival: bool
    is_best_seller: bool
    currency: str
    images: list[ProductImageOut] = []
    available_stock: int = 0
    on_hand: int = 0
    reserved: int = 0
    low_stock_threshold: int = 5
