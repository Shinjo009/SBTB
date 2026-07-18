from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_csrf, user_role_names
from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    AuthMeOut,
    ForgotPasswordIn,
    LoginIn,
    OTPVerifyIn,
    ResendOTPIn,
    ResetPasswordIn,
    SignupIn,
    UserOut,
)
from app.schemas.common import MessageOut
from app.services.auth import AuthService
from app.services.otp import OTPService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=MessageOut)
async def signup(payload: SignupIn, request: Request, db: AsyncSession = Depends(get_db)) -> MessageOut:
    await rate_limit(request, key="signup", limit=10, window_seconds=3600)
    try:
        await AuthService(db).signup(
            full_name=payload.full_name, email=payload.email, password=payload.password
        )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to create account")
    return MessageOut(message="Account created. Check your email for a verification code.")


@router.post("/verify-email", response_model=MessageOut)
async def verify_email(payload: OTPVerifyIn, request: Request, db: AsyncSession = Depends(get_db)) -> MessageOut:
    await rate_limit(request, key="otp_verify", limit=20, window_seconds=3600)
    try:
        await AuthService(db).verify_email(email=payload.email, otp=payload.otp)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return MessageOut(message="Email verified successfully")


@router.post("/resend-otp", response_model=MessageOut)
async def resend_otp(payload: ResendOTPIn, request: Request) -> MessageOut:
    await rate_limit(request, key="otp_resend", limit=10, window_seconds=3600)
    try:
        await OTPService().issue(email=payload.email, purpose="verify")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)) from exc
    return MessageOut(message="If the account exists, a new code was sent.")


@router.post("/login", response_model=AuthMeOut)
async def login(
    payload: LoginIn,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AuthMeOut:
    await rate_limit(request, key="login", limit=20, window_seconds=900)
    service = AuthService(db)
    try:
        user = await service.authenticate(email=payload.email, password=payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    csrf = await service.create_session(
        user,
        response,
        ip=request.client.host if request.client else None,
        ua=request.headers.get("user-agent"),
    )
    return AuthMeOut(user=service.to_user_out(user), csrf_token=csrf)


@router.post("/refresh", response_model=AuthMeOut)
async def refresh(
    response: Response,
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
) -> AuthMeOut:
    service = AuthService(db)
    try:
        user, csrf = await service.refresh(refresh_token or "", response)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    return AuthMeOut(user=service.to_user_out(user), csrf_token=csrf)


@router.post("/logout", response_model=MessageOut, dependencies=[Depends(require_csrf)])
async def logout(
    response: Response,
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
) -> MessageOut:
    await AuthService(db).logout(refresh_token, response)
    return MessageOut(message="Logged out")


@router.get("/me", response_model=AuthMeOut)
async def me(request: Request, user: User = Depends(get_current_user)) -> AuthMeOut:
    return AuthMeOut(
        user=UserOut(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            phone=user.phone,
            email_verified=user.email_verified,
            roles=user_role_names(user),
        ),
        csrf_token=request.cookies.get("csrf_token") or "",
    )


@router.post("/forgot-password", response_model=MessageOut)
async def forgot_password(
    payload: ForgotPasswordIn, request: Request, db: AsyncSession = Depends(get_db)
) -> MessageOut:
    await rate_limit(request, key="forgot", limit=10, window_seconds=3600)
    await AuthService(db).forgot_password(payload.email)
    return MessageOut(message="If an account exists, a reset link was sent.")


@router.post("/reset-password", response_model=MessageOut)
async def reset_password(payload: ResetPasswordIn, db: AsyncSession = Depends(get_db)) -> MessageOut:
    try:
        await AuthService(db).reset_password(token=payload.token, password=payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return MessageOut(message="Password updated successfully")
