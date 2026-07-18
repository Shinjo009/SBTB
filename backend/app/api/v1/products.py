import math
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.catalog import CategoryOut, ProductOut
from app.schemas.common import Page
from app.services.catalog import CatalogService

router = APIRouter(tags=["catalog"])


@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)) -> list[CategoryOut]:
    return await CatalogService(db).list_categories(active_only=True)


@router.get("/products", response_model=Page[ProductOut])
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=60),
    q: str | None = None,
    category: str | None = None,
    sort: str = "newest",
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    in_stock: bool | None = None,
    featured: bool | None = None,
    new_arrival: bool | None = None,
    best_seller: bool | None = None,
    db: AsyncSession = Depends(get_db),
) -> Page[ProductOut]:
    items, total = await CatalogService(db).list_products(
        page=page,
        page_size=page_size,
        q=q,
        category=category,
        sort=sort,
        min_price=min_price,
        max_price=max_price,
        in_stock=in_stock,
        featured=featured,
        new_arrival=new_arrival,
        best_seller=best_seller,
    )
    return Page(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, math.ceil(total / page_size)) if total else 0,
    )


@router.get("/products/{slug}", response_model=ProductOut)
async def get_product(slug: str, db: AsyncSession = Depends(get_db)) -> ProductOut:
    try:
        return await CatalogService(db).get_by_slug(slug)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
