from pydantic import BaseModel, EmailStr, Field, field_validator


class SignupIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)
    phone: str | None = Field(default=None, max_length=20)

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, value: str, info) -> str:
        if "password" in info.data and value != info.data["password"]:
            raise ValueError("Passwords do not match")
        return value


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshIn(BaseModel):
    refresh_token: str


class CreateUserIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone: str | None = Field(default=None, max_length=20)


class InviteTeamIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
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
