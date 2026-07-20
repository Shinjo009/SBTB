from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, user_role_names
from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import AuthMeOut, LoginIn, RefreshIn, SignupIn, TokenPairOut, UserOut
from app.schemas.common import MessageOut
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenPairOut)
async def signup(payload: SignupIn, request: Request, db: AsyncSession = Depends(get_db)) -> TokenPairOut:
    await rate_limit(request, key="signup", limit=15, window_seconds=3600)
    service = AuthService(db)
    try:
        user = await service.signup(
            full_name=payload.full_name,
            email=payload.email,
            password=payload.password,
            phone=payload.phone,
        )
        return await service.login(
            email=user.email,
            password=payload.password,
            ip=request.client.host if request.client else None,
            ua=request.headers.get("user-agent"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/login", response_model=TokenPairOut)
async def login(payload: LoginIn, request: Request, db: AsyncSession = Depends(get_db)) -> TokenPairOut:
    await rate_limit(request, key="login", limit=30, window_seconds=900)
    try:
        return await AuthService(db).login(
            email=payload.email,
            password=payload.password,
            ip=request.client.host if request.client else None,
            ua=request.headers.get("user-agent"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


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
