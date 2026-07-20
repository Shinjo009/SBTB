from pydantic import BaseModel, EmailStr, Field, field_validator


class SignupIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)


class RequestOTPIn(BaseModel):
    email: EmailStr


class VerifyOTPIn(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class RefreshIn(BaseModel):
    refresh_token: str


class CreateUserIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)
    is_admin: bool = False


class InviteTeamIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    role: str = "MANAGER"

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        normalized = value.strip().upper()
        if normalized not in {"ADMIN", "MANAGER"}:
            raise ValueError("Role must be ADMIN or MANAGER")
        return normalized


class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    phone: str | None = None
    email_verified: bool
    roles: list[str]

    model_config = {"from_attributes": True}


class TokenPairOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class AuthMeOut(BaseModel):
    user: UserOut
