import mimetypes
import uuid
from abc import ABC, abstractmethod
from io import BytesIO
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image

from app.core.config import get_settings

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 5 * 1024 * 1024


class StorageService(ABC):
    @abstractmethod
    async def save_image(self, file: UploadFile, *, folder: str) -> tuple[str, str, int, int]: ...


class LocalStorageService(StorageService):
    async def save_image(self, file: UploadFile, *, folder: str) -> tuple[str, str, int, int]:
        settings = get_settings()
        data = await file.read()
        if len(data) > MAX_BYTES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image too large")
        try:
            image = Image.open(BytesIO(data))
            image.verify()
            image = Image.open(BytesIO(data))
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image") from exc
        mime = Image.MIME.get(image.format or "", "")
        if mime not in ALLOWED_TYPES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image type")
        ext = mimetypes.guess_extension(mime) or ".jpg"
        key = f"{folder}/{uuid.uuid4().hex}{ext}"
        dest_dir = Path(settings.local_upload_dir) / folder
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = Path(settings.local_upload_dir) / key
        image.save(dest)
        url = f"{settings.backend_url}/uploads/{key}"
        return key, url, image.width, image.height


class S3StorageService(StorageService):
    async def save_image(self, file: UploadFile, *, folder: str) -> tuple[str, str, int, int]:
        import boto3

        settings = get_settings()
        data = await file.read()
        if len(data) > MAX_BYTES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image too large")
        try:
            image = Image.open(BytesIO(data))
            image.verify()
            image = Image.open(BytesIO(data))
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image") from exc
        mime = Image.MIME.get(image.format or "", "")
        if mime not in ALLOWED_TYPES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image type")
        ext = mimetypes.guess_extension(mime) or ".jpg"
        key = f"{folder}/{uuid.uuid4().hex}{ext}"
        client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint or None,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
        )
        buffer = BytesIO()
        image.save(buffer, format=image.format)
        buffer.seek(0)
        client.upload_fileobj(buffer, settings.s3_bucket, key, ExtraArgs={"ContentType": mime})
        base = settings.s3_public_base_url.rstrip("/")
        url = f"{base}/{key}" if base else f"{settings.s3_endpoint}/{settings.s3_bucket}/{key}"
        return key, url, image.width, image.height


def get_storage() -> StorageService:
    settings = get_settings()
    if settings.storage_backend == "s3":
        return S3StorageService()
    return LocalStorageService()
