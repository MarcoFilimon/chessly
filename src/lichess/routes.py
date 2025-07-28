from fastapi import status, APIRouter, Depends
from fastapi.responses import JSONResponse
from .schemas import *
from src.utils.config import version, Config
from .service import LichessService
from sqlmodel.ext.asyncio.session import AsyncSession
from src.db import db
from datetime import datetime
from src.db import redis
from src.utils.errors import UserNotFound, NewPasswordsException, PasswordResetRequestTimeout
from datetime import datetime, timedelta
import time

from src.auth.dependencies import (
    AccessTokenBearer,
    RefreshTokenBearer,
    RoleChecker,
    get_current_user,
)

from src.utils.errors import InvalidToken

router = APIRouter(
    prefix=f"/api/{version}/lichess",
    tags=["lichess"]
)

service = LichessService()
full_access = RoleChecker(['admin', 'user'])
admin_access = RoleChecker(['admin'])


@router.get('/top_10', status_code=status.HTTP_200_OK)
async def get_top_ten():
    import httpx
    url = "https://lichess.org/api/player"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        if response.status_code == 200:
            return {"data": response.json()}
        else:
            return {"error:" f"Failed to fetch data: {response.status_code}"}


@router.post('/lichess/follow/{username}', status_code=status.HTTP_201_CREATED)
async def follow_lichess_user(username: str):
    import httpx
    url = f"https://lichess.org/api/rel/follow/{username}"
    # Replace with your actual Lichess API token
    lichess_token = "lip_XFJ3gGeNWTZmxpb3R8CG"
    headers = {
        "Authorization": f"Bearer {lichess_token}"
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers)
        if response.status_code == 200:
            return {"message": f"Successfully followed {username} on Lichess."}
        else:
            return {
                "error": f"Failed to follow {username}: {response.status_code}",
                "details": response.text
            }


@router.post('/lichess/inbox/{username}', status_code=status.HTTP_201_CREATED)
async def send_dm(username: str, payload: dict):
    import httpx
    url = f"https://lichess.org/inbox/{username}"
    lichess_token = "lip_XFJ3gGeNWTZmxpb3R8CG"
    headers = {
        "Authorization": f"Bearer {lichess_token}"
    }
    # If Lichess expects form data, use data=
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, data=payload)
        if response.status_code == 200:
            return {"message": f"Successfully sent a message to {username}"}
        else:
            return {
                "error": f"Failed to send a message to {username}: {response.status_code}",
                "details": response.text
            }


@router.get('/', status_code=status.HTTP_200_OK)
async def get_user_info():
    import httpx
    url = "https://lichess.org/api/account"
    lichess_token = "lip_XFJ3gGeNWTZmxpb3R8CG"
    headers = {
        "Authorization": f"Bearer {lichess_token}"
    }
    # I
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            return {"data": response.json()}
        else:

            return {"error:" f"Failed to fetch data: {response.status_code}"}


@router.get('/ongoing_games', status_code=status.HTTP_200_OK)
async def get_ongoing_games():
    import httpx
    url = "https://lichess.org/api/account/playing"
    lichess_token = "lip_XFJ3gGeNWTZmxpb3R8CG"
    headers = {
        "Authorization": f"Bearer {lichess_token}"
    }
    # I
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            return {"data": response.json()}
        else:
            return {"error:" f"Failed to fetch data: {response.status_code}"}


@router.post('/make_move', status_code=status.HTTP_201_CREATED)
async def make_move(payload: Move):
    import httpx
    data = payload.model_dump(exclude_unset=True)
    url = f"https://lichess.org/api/board/game/{data['gameId']}/move/{data['move']}"
    lichess_token = "lip_XFJ3gGeNWTZmxpb3R8CG"
    headers = {
        "Authorization": f"Bearer {lichess_token}"
    }
    params = {}
    params["offeringDraw"] = "true"
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, params=params)
        if response.status_code == 200:
            return {"message": "Success"}
        else:
            return {
                "error": f"Failed to make the move {data['move']}: {response.status_code}",
                "details": response.text
            }

@router.get('/game_state/{gameId}', status_code=status.HTTP_200_OK)
async def get_game_state(
    gameId: str
):
    import httpx
    url = f"https://lichess.org/api/board/game/stream/{gameId}"
    lichess_token = "lip_XFJ3gGeNWTZmxpb3R8CG"
    headers = {
        "Authorization": f"Bearer {lichess_token}"
    }
    async with httpx.AsyncClient(timeout=None) as client:
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            return {"data": response.text}
        else:
            return {"error:" f"Failed to fetch data: {response.status_code}"}

