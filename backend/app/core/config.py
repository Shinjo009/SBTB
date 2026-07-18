import re
from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "development"
    secret_key: str = Field(default="dev-only-change-me")
    csrf_secret: str = Field(default="dev-only-csrf-change-me")
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"
    cors_origins: str = "http://localhost:5173"

    database_url: str = "postgresql+asyncpg://sbtb:sbtb@localhost:5432/sbtb"
    redis_url: str = "redis://localhost:6379/0"

    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 14
    otp_expire_minutes: int = 10
    payment_window_minutes: int = 20

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_email: str = "sbtb.vasudharanade@gmail.com"
    smtp_app_password: str = ""
    smtp_use_tls: bool = True

    storage_backend: str = "local"
    local_upload_dir: str = "./.uploads"
    s3_endpoint: str = ""
    s3_bucket: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_region: str = "us-east-1"
    s3_public_base_url: str = ""

    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        # Hosting providers expose sync-style URLs; the app uses the async driver.
        if value.startswith("postgres://"):
            value = "postgresql+asyncpg://" + value[len("postgres://") :]
        elif value.startswith("postgresql://") and "+asyncpg" not in value:
            value = "postgresql+asyncpg://" + value[len("postgresql://") :]
        # asyncpg rejects libpq's "sslmode" query parameter; drop it (use internal URLs).
        if "sslmode=" in value:
            value = re.sub(r"[?&]sslmode=[^&]*", "", value)
            value = re.sub(r"\?&", "?", value).rstrip("?&")
        return value

    @field_validator("cookie_samesite")
    @classmethod
    def validate_samesite(cls, value: str) -> str:
        allowed = {"lax", "strict", "none"}
        normalized = value.lower()
        if normalized not in allowed:
            raise ValueError("COOKIE_SAMESITE must be lax, strict, or none")
        return normalized

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
