from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class StoreSettings(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "store_settings"

    store_name: Mapped[str] = mapped_column(String(120), default="Scrunchies By The Bunch", nullable=False)
    support_email: Mapped[str] = mapped_column(String(255), default="sbtb.vasudharanade@gmail.com", nullable=False)
    announcement_banner: Mapped[str | None] = mapped_column(String(300), nullable=True)
    upi_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    upi_qr_object_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    upi_qr_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    payment_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    shipping_info: Mapped[str | None] = mapped_column(Text, nullable=True)
    low_stock_default: Mapped[int] = mapped_column(default=5, nullable=False)
    is_storefront_live: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
