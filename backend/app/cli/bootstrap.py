import argparse
import asyncio
import sys

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.settings import StoreSettings
from app.services.auth import AuthService


async def create_admin(email: str, full_name: str) -> None:
    async with AsyncSessionLocal() as db:
        user = await AuthService(db).create_user(
            email=email,
            full_name=full_name,
            is_admin=True,
        )
        settings = await db.scalar(select(StoreSettings).limit(1))
        if not settings:
            db.add(StoreSettings())
            await db.commit()
        print(f"Admin ready: {user.email}")


async def seed_demo() -> None:
    from decimal import Decimal

    from app.models.catalog import Category, Product
    from app.models.enums import ProductStatus
    from app.models.inventory import Inventory
    from app.models.settings import StoreSettings

    async with AsyncSessionLocal() as db:
        settings = await db.scalar(select(StoreSettings).limit(1))
        if not settings:
            db.add(StoreSettings(payment_instructions="Pay the exact amount via UPI and submit your UTR."))
        cats = [
            ("Scrunchies", "scrunchies"),
            ("Satin Scrunchies", "satin-scrunchies"),
            ("Hair Accessories", "hair-accessories"),
            ("Gift Sets", "gift-sets"),
            ("New Arrivals", "new-arrivals"),
        ]
        cat_ids = {}
        for idx, (name, slug) in enumerate(cats):
            existing = await db.scalar(select(Category).where(Category.slug == slug))
            if existing:
                cat_ids[slug] = existing.id
                continue
            cat = Category(name=name, slug=slug, sort_order=idx, is_active=True)
            db.add(cat)
            await db.flush()
            cat_ids[slug] = cat.id

        products = [
            ("Blush Satin Scrunchie", "blush-satin-scrunchie", "SKU-BLUSH-01", "satin-scrunchies", "149.00", True, True),
            ("Mint Floral Scrunchie", "mint-floral-scrunchie", "SKU-MINT-01", "scrunchies", "129.00", True, False),
            ("Lavender Dream Scrunchie", "lavender-dream-scrunchie", "SKU-LAV-01", "new-arrivals", "159.00", False, True),
            ("Peach Bow Hair Tie", "peach-bow-hair-tie", "SKU-BOW-01", "hair-accessories", "199.00", True, False),
            ("Sunset Gift Set", "sunset-gift-set", "SKU-GIFT-01", "gift-sets", "499.00", True, True),
        ]
        for name, slug, sku, cat, price, featured, best in products:
            exists = await db.scalar(select(Product).where(Product.slug == slug))
            if exists:
                continue
            product = Product(
                name=name,
                slug=slug,
                sku=sku,
                category_id=cat_ids[cat],
                short_description="Soft, handmade, and photo-ready.",
                description="Demo product for Scrunchies By The Bunch. Replace with real catalog copy and photos.",
                price=Decimal(price),
                compare_at_price=Decimal(price) + Decimal("50.00"),
                status=ProductStatus.ACTIVE.value,
                is_featured=featured,
                is_new_arrival=True,
                is_best_seller=best,
            )
            db.add(product)
            await db.flush()
            db.add(Inventory(product_id=product.id, on_hand=25, reserved=0, low_stock_threshold=5))
        await db.commit()
        print("Demo seed complete.")


def main() -> None:
    parser = argparse.ArgumentParser(description="SBTB management commands")
    sub = parser.add_subparsers(dest="command", required=True)
    admin_parser = sub.add_parser("create-admin")
    admin_parser.add_argument("--email", required=True)
    admin_parser.add_argument("--name", default="Store Admin")
    sub.add_parser("seed")
    args = parser.parse_args()
    if args.command == "create-admin":
        try:
            asyncio.run(create_admin(args.email, args.name))
        except ValueError as exc:
            print(str(exc))
            sys.exit(1)
    elif args.command == "seed":
        asyncio.run(seed_demo())


if __name__ == "__main__":
    main()
