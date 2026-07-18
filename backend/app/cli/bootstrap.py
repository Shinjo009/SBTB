import argparse
import asyncio
import getpass
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.enums import UserRoleName
from app.models.settings import StoreSettings
from app.models.user import Role, User, UserRole
from app.services.auth import AuthService


async def create_admin(email: str, full_name: str, password: str) -> None:
    async with AsyncSessionLocal() as db:
        await AuthService(db).ensure_roles()
        existing = await db.scalar(select(User).where(User.email == email.lower()))
        if existing:
            print("User already exists; promoting to admin if needed.")
            user = existing
        else:
            user = User(
                email=email.lower().strip(),
                full_name=full_name.strip(),
                password_hash=hash_password(password),
                email_verified=True,
            )
            db.add(user)
            await db.flush()
        admin_role = await db.scalar(select(Role).where(Role.name == UserRoleName.ADMIN.value))
        customer_role = await db.scalar(select(Role).where(Role.name == UserRoleName.CUSTOMER.value))
        existing_roles = {ur.role_id for ur in (await db.scalars(select(UserRole).where(UserRole.user_id == user.id)))}
        if admin_role and admin_role.id not in existing_roles:
            db.add(UserRole(user_id=user.id, role_id=admin_role.id))
        if customer_role and customer_role.id not in existing_roles:
            db.add(UserRole(user_id=user.id, role_id=customer_role.id))
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
    admin_parser.add_argument("--email")
    admin_parser.add_argument("--name", default="Store Admin")
    admin_parser.add_argument("--password")
    sub.add_parser("seed")
    args = parser.parse_args()
    if args.command == "create-admin":
        email = args.email or input("Admin email: ").strip()
        password = args.password or getpass.getpass("Admin password: ")
        if len(password) < 8:
            print("Password must be at least 8 characters")
            sys.exit(1)
        asyncio.run(create_admin(email, args.name, password))
    elif args.command == "seed":
        asyncio.run(seed_demo())


if __name__ == "__main__":
    main()
