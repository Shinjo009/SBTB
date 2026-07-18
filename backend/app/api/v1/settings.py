from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.payments import ManualUPIPaymentService

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/store")
async def public_store_settings(db: AsyncSession = Depends(get_db)):
    settings = await ManualUPIPaymentService(db).get_store_settings()
    return {
        "store_name": settings.store_name,
        "support_email": settings.support_email,
        "announcement_banner": settings.announcement_banner,
        "shipping_info": settings.shipping_info,
        "is_storefront_live": settings.is_storefront_live,
    }
