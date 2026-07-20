from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, user_role_names
from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import AuthMeOut, RefreshIn, RequestOTPIn, TokenPairOut, UserOut, VerifyOTPIn
from app.schemas.common import MessageOut
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


@router.post("/request-otp", response_model=MessageOut)
async def request_otp(payload: RequestOTPIn, request: Request, db: AsyncSession = Depends(get_db)) -> MessageOut:
    await rate_limit(request, key="request_otp", limit=20, window_seconds=3600)
    try:
        await AuthService(db).request_login_otp(email=payload.email)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)) from exc
    return MessageOut(message="If an account exists for this email, a login code was sent.")


@router.post("/verify-otp", response_model=TokenPairOut)
async def verify_otp(payload: VerifyOTPIn, request: Request, db: AsyncSession = Depends(get_db)) -> TokenPairOut:
    await rate_limit(request, key="verify_otp", limit=40, window_seconds=3600)
    try:
        _user, tokens = await AuthService(db).verify_login_otp(
            email=payload.email,
            otp=payload.otp,
            ip=request.client.host if request.client else None,
            ua=request.headers.get("user-agent"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return tokens


@router.post("/refresh", response_model=TokenPairOut)
async def refresh(payload: RefreshIn, request: Request, db: AsyncSession = Depends(get_db)) -> TokenPairOut:
    try:
        return await AuthService(db).refresh_tokens(
            payload.refresh_token,
            ip=request.client.host if request.client else None,
            ua=request.headers.get("user-agent"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.post("/logout", response_model=MessageOut)
async def logout(payload: RefreshIn, db: AsyncSession = Depends(get_db)) -> MessageOut:
    await AuthService(db).logout(payload.refresh_token)
    return MessageOut(message="Logged out")


@router.get("/me", response_model=AuthMeOut)
async def me(user: User = Depends(get_current_user)) -> AuthMeOut:
    return AuthMeOut(
        user=UserOut(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            phone=user.phone,
            email_verified=user.email_verified,
            roles=user_role_names(user),
        )
    )
