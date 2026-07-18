from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.catalog import Category, Product, ProductImage
from app.models.enums import ProductStatus
from app.models.inventory import Inventory
from app.schemas.catalog import CategoryIn, ProductIn, ProductOut


class CatalogService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_categories(self, *, active_only: bool = True) -> list[Category]:
        stmt = select(Category).order_by(Category.sort_order, Category.name)
        if active_only:
            stmt = stmt.where(Category.is_active.is_(True))
        return list((await self.db.scalars(stmt)).all())

    async def create_category(self, data: CategoryIn) -> Category:
        category = Category(**data.model_dump())
        self.db.add(category)
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def update_category(self, category_id: str, data: CategoryIn) -> Category:
        category = await self.db.get(Category, category_id)
        if not category:
            raise ValueError("Category not found")
        for key, value in data.model_dump().items():
            setattr(category, key, value)
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def delete_category(self, category_id: str) -> None:
        category = await self.db.get(Category, category_id)
        if not category:
            raise ValueError("Category not found")
        product_count = await self.db.scalar(
            select(func.count()).select_from(Product).where(Product.category_id == category_id)
        )
        if product_count:
            raise ValueError("Cannot delete category with products")
        await self.db.delete(category)
        await self.db.commit()

    def _serialize(self, product: Product) -> ProductOut:
        inv = product.inventory
        return ProductOut(
            id=product.id,
            name=product.name,
            slug=product.slug,
            sku=product.sku,
            category_id=product.category_id,
            short_description=product.short_description,
            description=product.description,
            price=product.price,
            compare_at_price=product.compare_at_price,
            status=product.status,
            is_featured=product.is_featured,
            is_new_arrival=product.is_new_arrival,
            is_best_seller=product.is_best_seller,
            currency=product.currency,
            images=product.images,
            available_stock=inv.available if inv else 0,
            on_hand=inv.on_hand if inv else 0,
            reserved=inv.reserved if inv else 0,
            low_stock_threshold=inv.low_stock_threshold if inv else 5,
        )

    async def list_products(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        q: str | None = None,
        category: str | None = None,
        sort: str = "newest",
        min_price: Decimal | None = None,
        max_price: Decimal | None = None,
        in_stock: bool | None = None,
        featured: bool | None = None,
        new_arrival: bool | None = None,
        best_seller: bool | None = None,
        admin: bool = False,
    ) -> tuple[list[ProductOut], int]:
        stmt = (
            select(Product)
            .options(selectinload(Product.images), selectinload(Product.inventory))
            .join(Inventory, Inventory.product_id == Product.id, isouter=True)
        )
        if not admin:
            stmt = stmt.where(Product.status == ProductStatus.ACTIVE.value)
        if q:
            like = f"%{q.strip()}%"
            stmt = stmt.where(or_(Product.name.ilike(like), Product.short_description.ilike(like)))
        if category:
            stmt = stmt.join(Category).where(or_(Category.slug == category, Category.id == category))
        if min_price is not None:
            stmt = stmt.where(Product.price >= min_price)
        if max_price is not None:
            stmt = stmt.where(Product.price <= max_price)
        if featured is not None:
            stmt = stmt.where(Product.is_featured.is_(featured))
        if new_arrival is not None:
            stmt = stmt.where(Product.is_new_arrival.is_(new_arrival))
        if best_seller is not None:
            stmt = stmt.where(Product.is_best_seller.is_(best_seller))
        if in_stock:
            stmt = stmt.where((Inventory.on_hand - Inventory.reserved) > 0)

        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total = await self.db.scalar(count_stmt) or 0

        if sort == "price_asc":
            stmt = stmt.order_by(Product.price.asc())
        elif sort == "price_desc":
            stmt = stmt.order_by(Product.price.desc())
        elif sort == "name":
            stmt = stmt.order_by(Product.name.asc())
        else:
            stmt = stmt.order_by(Product.created_at.desc())

        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        products = list((await self.db.scalars(stmt)).unique().all())
        return [self._serialize(p) for p in products], total

    async def get_by_slug(self, slug: str, *, admin: bool = False) -> ProductOut:
        stmt = (
            select(Product)
            .options(selectinload(Product.images), selectinload(Product.inventory))
            .where(Product.slug == slug)
        )
        if not admin:
            stmt = stmt.where(Product.status == ProductStatus.ACTIVE.value)
        product = (await self.db.scalars(stmt)).first()
        if not product:
            raise ValueError("Product not found")
        return self._serialize(product)

    async def create_product(self, data: ProductIn) -> ProductOut:
        payload = data.model_dump()
        stock = payload.pop("stock_quantity")
        low = payload.pop("low_stock_threshold")
        product = Product(**payload)
        self.db.add(product)
        await self.db.flush()
        self.db.add(Inventory(product_id=product.id, on_hand=stock, reserved=0, low_stock_threshold=low))
        await self.db.commit()
        return await self.get_by_slug(product.slug, admin=True)

    async def update_product(self, product_id: str, data: ProductIn) -> ProductOut:
        product = await self.db.get(Product, product_id)
        if not product:
            raise ValueError("Product not found")
        payload = data.model_dump()
        stock = payload.pop("stock_quantity")
        low = payload.pop("low_stock_threshold")
        for key, value in payload.items():
            setattr(product, key, value)
        inv = await self.db.scalar(select(Inventory).where(Inventory.product_id == product.id))
        if not inv:
            inv = Inventory(product_id=product.id, on_hand=stock, reserved=0, low_stock_threshold=low)
            self.db.add(inv)
        else:
            if stock < inv.reserved:
                raise ValueError("Stock cannot be less than reserved quantity")
            inv.on_hand = stock
            inv.low_stock_threshold = low
            inv.version += 1
        await self.db.commit()
        return await self.get_by_slug(product.slug, admin=True)

    async def add_image(
        self, product_id: str, *, url: str, object_key: str, alt: str | None, width: int, height: int, primary: bool
    ) -> ProductImage:
        product = await self.db.get(Product, product_id)
        if not product:
            raise ValueError("Product not found")
        if primary:
            images = await self.db.scalars(select(ProductImage).where(ProductImage.product_id == product_id))
            for img in images:
                img.is_primary = False
        count = await self.db.scalar(
            select(func.count()).select_from(ProductImage).where(ProductImage.product_id == product_id)
        )
        image = ProductImage(
            product_id=product_id,
            url=url,
            object_key=object_key,
            alt_text=alt,
            width=width,
            height=height,
            is_primary=primary or count == 0,
            sort_order=count or 0,
        )
        self.db.add(image)
        await self.db.commit()
        await self.db.refresh(image)
        return image
