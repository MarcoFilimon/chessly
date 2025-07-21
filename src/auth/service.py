from fastapi.responses import JSONResponse
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.db.models import User
from .schemas import UserCreate, UserLogIn, UserUpdate, PasswordResetRequest
from .utils import *
from src.utils.config import Config
from src.utils.errors import *
from src.utils.celery_tasks import send_email


class UserService:
    async def send_verification_email(self, user: User):
        token = create_url_safe_token({"email": user.email})
        link = f"http://{Config.DOMAIN}/api/v1/auth/verify/{token}"
        html = f"""
        <h1>Verify your Email</h1>
        <p>Please click this <a href="{link}">link</a> to verify your email</p>
        """
        emails = [user.email]
        subject = "Verify Your email"
        send_email.delay(emails, subject, html)

    async def get_user(self, user_id: int, session: AsyncSession):
        user = await session.get(User, user_id)
        if user is None:
            raise UserNotFound()
        return user

    async def get_user_by_name(self, username: str, session: AsyncSession):
        statement = select(User).where(User.username == username)
        user = await session.exec(statement)
        if user:
            return user.first()
        else:
            raise UserNotFound()

    async def get_user_by_email(self, email: str, session: AsyncSession):
        statement = select(User).where(User.email == email)
        user = await session.exec(statement)
        if user:
            return user.first()
        else:
            raise UserNotFound()

    async def register_user(self, payload: UserCreate, session: AsyncSession):
        new_user = payload.model_dump()
        check_user = await self.get_user_by_email(payload.email, session)
        if check_user:
            raise UserAlreadyExists()
        user = User(**new_user)
        password = new_user["password"]
        user.hashed_pass = Hash.bcrypt(password)
        await self.send_verification_email(user)
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

    async def log_in(self, payload: UserLogIn, session: AsyncSession):
        username = payload.username
        password = payload.password
        user = await self.get_user_by_name(username, session)
        if not user or not Hash.verify(user.hashed_pass, password):
            raise InvalidCredentials()
        token = create_access_token({"username": username, "role": user.role, "user_id": user.id}, expiry=timedelta(hours=Config.ACCESS_TOKEN_EXPIRY))
        refresh_token = create_access_token({"username": username, "user_id": user.id}, expiry=timedelta(hours=Config.REFRESH_TOKEN_EXPIRY), refresh=True)
        return JSONResponse(
            content={
                "message": "Login successful.",
                "user": {
                    "username": user.username,
                    "email": user.email,
                    "id": user.id,
                    "is_verified": user.is_verified
                },
                "token": token,
                "refresh_token": refresh_token
            }
        )

    async def delete_user(self, user_id: int, session: AsyncSession):
        user = await self.get_user(user_id, session)
        await session.delete(user)
        await session.commit()
        return True

    async def update_user(self, user_id: int, payload: UserUpdate, session: AsyncSession, current_user: User | None = None):
        '''
        For verification email, only change the is_verified to True.
        For resetting password, password will be in the payload
        '''
        user = await self.get_user(user_id, session)
        if current_user is None:
            if "is_verified" in payload and payload["is_verified"] is not None:
                setattr(user, "is_verified", True)
            if "password" in payload and payload["password"] is not None:
                setattr(user, "hashed_pass", payload["password"])
            await session.commit()
            await session.refresh(user)
            return user

        '''
        For update endpoint, check if user who requested is admin or current logged in user.
        '''
        if user.id == current_user.id or current_user.role == "admin":
            updated_data = payload.model_dump(exclude_unset=True)
            for key, value in updated_data.items():
                if key == "password":
                    continue
                setattr(user, key, value)

            if "password" in updated_data:
                user.hashed_pass = Hash.bcrypt(updated_data["password"])

            await session.commit()
            await session.refresh(user)
            return user
        else:
            raise InsufficientPermission()


    async def send_password_reset_request(self, payload: PasswordResetRequest):
        token = create_url_safe_token({"email": payload.email})
        link = f"http://{Config.DOMAIN}/api/v1/auth/reset_password/{token}"
        html = f"""
        <h1>Reset your password</h1>
        <p>Please click this <a href="{link}">link</a> to reset your password.</p>
        """
        emails = [payload.email]
        subject = "Reset your password"

        send_email.delay(emails, subject, html)
        return

