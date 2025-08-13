from pydantic import BaseModel, Field, EmailStr, field_validator
from datetime import datetime
from src.db.models import Tournament


class UserValidatorMixin(BaseModel):
    @field_validator("username", check_fields=False)
    def name_length(cls, v):
        if v is None:
            return v
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters long.")
        if len(v) > 20:
            raise ValueError("Username cannot be longer than 20 characters.")
        return v

    @field_validator("password", check_fields=False)
    def password_length(cls, v):
        if v is None:
            return v
        if len(v) < 3:
            raise ValueError("Password must be at least 3 characters long.")
        return v


class UserBase(UserValidatorMixin):
    username: str
    email: EmailStr
    first_name: str | None = None
    last_name: str | None = None


class UserCreate(UserBase):
    password: str


class UserUpdate(UserValidatorMixin):
    username: str | None = None
    password: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    lichess_token: str | None = None

class User(UserBase):
    id: int
    # tournaments: list[Tournament] | None = None
    is_verified: bool
    created_at: datetime


class UserLogIn(UserValidatorMixin):
    username: str
    password: str | None = None


class Emails(BaseModel):
    adresses: list[EmailStr]


class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    new_password: str
    confirmed_new_password: str