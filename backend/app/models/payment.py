from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import PaymentStatus


class Payment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "payments"

    order_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("orders.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[str] = mapped_column(String(40), default="manual_upi", nullable=False)
    status: Mapped[str] = mapped_column(
        String(40), default=PaymentStatus.PENDING.value, nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    upi_id_snapshot: Mapped[str | None] = mapped_column(String(120), nullable=True)
    reference_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    decline_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    order = relationship("Order", back_populates="payments")
    verification: Mapped["PaymentVerification | None"] = relationship(
        back_populates="payment", uselist=False, cascade="all, delete-orphan"
    )


class PaymentVerification(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "payment_verifications"
    __table_args__ = (UniqueConstraint("upi_reference", name="uq_upi_reference"),)

    payment_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("payments.id", ondelete="CASCADE"), unique=True
    )
    upi_reference: Mapped[str] = mapped_column(String(120), nullable=False)
    screenshot_object_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    screenshot_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    customer_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    payment: Mapped[Payment] = relationship(back_populates="verification")
