import logging

from fastapi import HTTPException, Request, status

from app.core.redis import get_redis

logger = logging.getLogger(__name__)


async def rate_limit(request: Request, *, key: str, limit: int, window_seconds: int) -> None:
    client_ip = request.client.host if request.client else "unknown"
    redis_key = f"rl:{key}:{client_ip}"
    try:
        redis = get_redis()
        current = await redis.incr(redis_key)
        if current == 1:
            await redis.expire(redis_key, window_seconds)
        if current > limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
            )
    except HTTPException:
        raise
    except Exception:
        logger.warning("Rate limiter unavailable; allowing request for %s", key)
