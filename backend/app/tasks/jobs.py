import asyncio
import logging

from app.db.session import AsyncSessionLocal
from app.services.payments import ManualUPIPaymentService
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


async def _expire() -> int:
    async with AsyncSessionLocal() as db:
        return await ManualUPIPaymentService(db).expire_due_payments()


@celery_app.task(name="app.tasks.jobs.expire_payments")
def expire_payments() -> int:
    count = asyncio.run(_expire())
    if count:
        logger.info("Expired %s payment(s)", count)
    return count
