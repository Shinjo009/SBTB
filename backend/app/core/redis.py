from functools import lru_cache

import redis.asyncio as redis

from app.core.config import get_settings


@lru_cache
def get_redis() -> redis.Redis:
    settings = get_settings()
    return redis.from_url(settings.redis_url, decode_responses=True)


async def close_redis() -> None:
    client = get_redis()
    await client.aclose()
    get_redis.cache_clear()
