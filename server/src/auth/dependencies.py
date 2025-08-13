from typing import Any
from fastapi import Depends, Request
from fastapi.security import HTTPBearer
from fastapi.security.http import HTTPAuthorizationCredentials
from sqlmodel.ext.asyncio.session import AsyncSession

from src.db.db import get_session
from src.db.models import User
from src.db.redis import token_in_blocklist
from .service import UserService
from .utils import *

from src.utils.errors import *

service = UserService()

class TokenBearer(HTTPBearer):
    '''
    Parent class. Decodes token, validates it, checks if its in the blocklist (redis).
    '''
    def __init__(self, auto_error=True):
        super().__init__(auto_error=auto_error)

    async def __call__(self, request: Request) -> HTTPAuthorizationCredentials | None:
        # call method checks if authorization is present and returns the token if so.
        creds = await super().__call__(request)
        token = creds.credentials
        token_data = decode_token(token)
        if token_data is None:
            raise InvalidToken()

        if await token_in_blocklist(token_data["jti"]):
            raise InvalidToken()

        self.verify_token_data(token_data)
        return token_data


    def verify_token_data(self, token_data):
        raise NotImplementedError("Please override this method in child classes.")


class AccessTokenBearer(TokenBearer):
    '''
    Child class of TokenBearer. Validates token
    '''
    def verify_token_data(self, token_data: dict) -> None:
        if token_data and token_data["refresh"]:
            raise AccessTokenBearer()

class RefreshTokenBearer(TokenBearer):
    '''
    Child class of TokenBearer. Validates refresh token
    '''
    def verify_token_data(self, token_data: dict) -> None:
        if token_data and not token_data["refresh"]:
            raise RefreshTokenRequired()


async def get_current_user(
    token_details: dict = Depends(AccessTokenBearer()),
    session: AsyncSession = Depends(get_session)
):
    '''
    Get currently logged in user, based on access token.
    Any endpoint with a dependency to this has to receive the Authorization Token in the header
    '''
    user_id = token_details['user_id']
    user = await service.get_user(user_id, session)
    return user


class RoleChecker:
    '''
    Check if current user has enough permission for a certain operation.
    E.g we want an endpoint to be available only for admins. We create a dependency to
    RoleChecker(["admin"]) and now all users that dont have 'admin' role, cannot access it.
    '''
    def __init__(self, allowed_roles: list[str]) -> None:
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> Any:
        if not current_user.is_verified:
            raise AccountNotVerified()
        if current_user and current_user.role in self.allowed_roles:
            return True
        raise InsufficientPermission()