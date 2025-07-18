from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from src.db.models import Tournament

class UserBase(BaseModel):
    username: str = Field(min_length=3, max_length=10)
    email: EmailStr = Field(min_length=5, max_length=40)
    first_name: str | None = None
    last_name: str | None = None


class UserCreate(UserBase):
    password: str = Field(min_length=8)


class UserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=10)
    email: EmailStr | None = Field(default=None, min_length=5, max_length=40)
    password: str | None = Field(default=None, min_length=8)
    first_name: str | None = None
    last_name: str | None = None

class User(UserBase):
    id: int
    # tournaments: list[Tournament] | None = None
    is_verified: bool
    created_at: datetime


class UserLogIn(BaseModel):
    username: str = Field(min_length=3, max_length=10)
    password: str | None = Field(min_length=8)


class Emails(BaseModel):
    adresses: list[EmailStr]


class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    new_password: str
    confirmed_new_password: str