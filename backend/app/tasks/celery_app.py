from celery import Celery
from celery.schedules import crontab

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "sbtb",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)
celery_app.conf.timezone = "UTC"
celery_app.conf.beat_schedule = {
    "expire-payments-every-minute": {
        "task": "app.tasks.jobs.expire_payments",
        "schedule": 60.0,
    },
}
celery_app.autodiscover_tasks(["app.tasks"])
