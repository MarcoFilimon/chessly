from fastapi import status, APIRouter, Depends, Query, HTTPException
from fastapi.responses import JSONResponse
from .schemas import *
from src.utils.config import version
from .service import LichessService
from src.auth.utils import *
from sqlmodel.ext.asyncio.session import AsyncSession
from src.db import db
import httpx

from src.auth.dependencies import (
    RoleChecker,
    get_current_user,
)


router = APIRouter(
    prefix=f"/api/{version}/lichess",
    tags=["lichess"]
)

service = LichessService()
full_access = RoleChecker(['admin', 'user'])
admin_access = RoleChecker(['admin'])

@router.post('/lichess/follow/{username}', status_code=status.HTTP_201_CREATED)
async def follow_lichess_user(username: str, current_user=Depends(get_current_user)):
    # https://lichess.org/api#tag/Relations/operation/followUser
    url = f"https://lichess.org/api/rel/follow/{username}"
    lichess_token = decrypt_lichess_token(current_user.lichess_token)
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
async def send_dm(username: str, payload: dict, current_user=Depends(get_current_user)):
    # https://lichess.org/api#tag/Messaging/operation/inboxUsername
    url = f"https://lichess.org/inbox/{username}"
    lichess_token = decrypt_lichess_token(current_user.lichess_token)
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
async def get_user_info(current_user=Depends(get_current_user)):
    # https://lichess.org/api#tag/Account/operation/accountMe
    url = "https://lichess.org/api/account"
    lichess_token = decrypt_lichess_token(current_user.lichess_token)
    headers = {
        "Authorization": f"Bearer {lichess_token}"
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            return {"data": response.json()}
        else:

            return {"error:" f"Failed to fetch data: {response.status_code}"}


@router.get('/ongoing_games', status_code=status.HTTP_200_OK)
async def get_ongoing_games(current_user=Depends(get_current_user)):
    # https://lichess.org/api#tag/Games/operation/apiAccountPlaying
    url = "https://lichess.org/api/account/playing"
    lichess_token = decrypt_lichess_token(current_user.lichess_token)
    headers = {
        "Authorization": f"Bearer {lichess_token}"
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            return {"data": response.json()}
        else:
            return {"error:" f"Failed to fetch data: {response.status_code}"}


@router.post('/sse_token')
async def get_sse_token(current_user=Depends(get_current_user)):
    '''
    One time short lived token for my SSE game event.
    Why? EventSource does not support custom headers (cannot send my auth token).
    This way, I'm creating a safe url token everytime I open a game so I can retrieve
    the lichess_token of the current user in stream_moves() endpoint.
    '''
    data = {
        "user_id": current_user.id,
        "purpose": "sse",
    }
    token = create_url_safe_token(data)
    return {"sse_token": token}


@router.get('/stream_moves/{gameId}', status_code=status.HTTP_200_OK)
async def stream_moves(gameId: str, sse_token: str = Query(...),  session: AsyncSession = Depends(db.get_session)):

    # https://lichess.org/api#tag/Games/operation/streamGame
    # url = f"https://lichess.org/api/stream/game/{gameId}"

    # https://lichess.org/api#tag/Board/operation/boardGameStream
    url = f"https://lichess.org/api/board/game/stream/{gameId}"

    from fastapi.responses import StreamingResponse
    from src.auth.service import UserService
    user_service = UserService()
    user_data = decode_url_safe_token(sse_token)
    if not user_data or user_data.get("purpose") != "sse":
        raise HTTPException(status_code=401, detail="Invalid or expired SSE token")
    user = await user_service.get_user(user_data["user_id"], session)
    lichess_token = decrypt_lichess_token(user.lichess_token)

    headers = {
        "Authorization": f"Bearer {lichess_token}",
        "Accept": "text/event-stream" # Explicitly request SSE
    }

    timeout_config = httpx.Timeout(120.0, connect=10.0, read=None)

    async def event_generator():
        buffer = ""
        try:
            async with httpx.AsyncClient(timeout=timeout_config) as client:
                async with client.stream("GET", url, headers=headers, follow_redirects=True) as response:
                    if response.status_code != 200:
                        yield f"data: {{\"error\": \"Failed to connect to Lichess stream: {response.status_code}\", \"details\": \"{await response.text()}\"}}\n\n"
                        return

                    async for chunk in response.aiter_bytes():
                        chunk_str = chunk.decode('utf-8')
                        buffer += chunk_str
                        while '\n' in buffer:
                            line, buffer = buffer.split('\n', 1)
                            if line.strip():
                                # print("Sending SSE line:", line.strip())  # <--- Add this
                                yield f"data: {line.strip()}\n\n"
                        # await asyncio.sleep(0.01)
        except httpx.TimeoutException:
            yield f"data: {{\"error\": \"Lichess stream connection timed out.\"}}\n\n"
        except httpx.RequestError as exc:
            yield f"data: {{\"error\": \"HTTP request error for Lichess stream: {str(exc)}\"}}\n\n"
        except Exception as e:
            yield f"data: {{\"error\": \"An unexpected error occurred in stream: {type(e).__name__}\", \"details\": \"{str(e)}\"}}\n\n"
        # finally:
            # print("Lichess stream connection closed.")

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post('/make_move', status_code=status.HTTP_201_CREATED)
async def make_move(payload: Move, current_user=Depends(get_current_user)):
    data = payload.model_dump(exclude_unset=True)
    # https://lichess.org/api#tag/Board/operation/boardGameMove
    url = f"https://lichess.org/api/board/game/{data['gameId']}/move/{data['move']}"
    lichess_token = decrypt_lichess_token(current_user.lichess_token)
    headers = {
        "Authorization": f"Bearer {lichess_token}"
    }
    params = {}
    # params["offeringDraw"] = "true"
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, params=params)
        if response.status_code == 200:
            return {"message": "Success"}
        else:
            return {
                "error": f"Failed to make the move {data['move']}: {response.status_code}",
                "details": response.text
            }


@router.post('/resign/{gameId}', status_code=status.HTTP_201_CREATED)
async def resign(gameId: str, current_user=Depends(get_current_user)):
    # https://lichess.org/api#tag/Board/operation/boardGameResign
    url = f"https://lichess.org/api/board/game/{gameId}/resign"
    lichess_token = decrypt_lichess_token(current_user.lichess_token)
    headers = {
        "Authorization": f"Bearer {lichess_token}"
    }
    params = {}
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, params=params)
        if response.status_code == 200:
            return {"message": "Success"}
        else:
            return {
                "error": f"Failed to resign: {response.status_code}",
                "details": response.text
            }


@router.post('/draw/{gameId}', status_code=status.HTTP_201_CREATED)
async def draw(gameId: str, current_user=Depends(get_current_user)):
    # https://lichess.org/api#tag/Board/operation/boardGameDraw
    url = f"https://lichess.org/api/board/game/{gameId}/draw/yes"
    lichess_token = decrypt_lichess_token(current_user.lichess_token)
    headers = {
        "Authorization": f"Bearer {lichess_token}"
    }
    params = {}
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, params=params)
        if response.status_code == 200:
            return {"message": "Success"}
        else:
            return {
                "error": f"Failed to draw: {response.status_code}",
                "details": response.text
            }


@router.post('/challenge/create/{username}', status_code=status.HTTP_201_CREATED)
async def create_challenge(username: str, current_user=Depends(get_current_user)):
    # https://lichess.org/api#tag/Challenges/operation/challengeCreate
    url = f"https://lichess.org/api/challenge/{username}"
    lichess_token = decrypt_lichess_token(current_user.lichess_token)
    headers = {
        "Authorization": f"Bearer {lichess_token}"
    }
    params = {}
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, params=params)
        if response.status_code == 200:
            return {"message": "Success"}
        else:
            return {
                "error": f"Failed to send challenge: {response.status_code}",
                "details": response.text
            }


@router.get('/challenges', status_code=status.HTTP_200_OK)
async def get_challenges(current_user=Depends(get_current_user)):
    # https://lichess.org/api#tag/Challenges/operation/challengeList
    url = "https://lichess.org/api/challenge"
    lichess_token = decrypt_lichess_token(current_user.lichess_token)
    headers = {
        "Authorization": f"Bearer {lichess_token}"
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            return {"data": response.json()}
        else:

            return {"error:" f"Failed to get challenges: {response.status_code}"}


@router.post('/challenge/accept/{challengeId}', status_code=status.HTTP_201_CREATED)
async def accept_challenge(challengeId: str, current_user=Depends(get_current_user)):
    # https://lichess.org/api#tag/Challenges/operation/challengeAccept
    url = f"https://lichess.org/api/challenge/{challengeId}/accept"
    lichess_token = decrypt_lichess_token(current_user.lichess_token)
    headers = {
        "Authorization": f"Bearer {lichess_token}"
    }
    params = {}
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, params=params)
        if response.status_code == 200:
            return {"message": "Success"}
        else:
            return {
                "error": f"Failed to accept challenge: {response.status_code}",
                "details": response.text
            }


@router.post('/challenge/cancel/{challengeId}', status_code=status.HTTP_201_CREATED)
async def cancel_challenge(challengeId: str, current_user=Depends(get_current_user)):
    # https://lichess.org/api#tag/Challenges/operation/challengeCancel
    url = f"https://lichess.org/api/challenge/{challengeId}/cancel"
    lichess_token = decrypt_lichess_token(current_user.lichess_token)
    headers = {
        "Authorization": f"Bearer {lichess_token}"
    }
    params = {}
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, params=params)
        if response.status_code == 200:
            return {"message": "Success"}
        else:
            return {
                "error": f"Failed to cancel challenge: {response.status_code}",
                "details": response.text
            }


@router.post('/challenge/decline/{challengeId}', status_code=status.HTTP_201_CREATED)
async def decline_challenge(challengeId: str, current_user=Depends(get_current_user)):
    # https://lichess.org/api#tag/Challenges/operation/challengeDecline
    url = f"https://lichess.org/api/challenge/{challengeId}/decline"
    lichess_token = decrypt_lichess_token(current_user.lichess_token)
    headers = {
        "Authorization": f"Bearer {lichess_token}"
    }
    params = {}
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, params=params)
        if response.status_code == 200:
            return {"message": "Success"}
        else:
            return {
                "error": f"Failed to decline challenge: {response.status_code}",
                "details": response.text
            }


@router.post('/challenge/AI', status_code=status.HTTP_201_CREATED)
async def challenge_lichessAI(current_user=Depends(get_current_user)):
    # https://lichess.org/api#tag/Challenges/operation/challengeAi
    url = f"https://lichess.org/api/challenge/ai"
    lichess_token = decrypt_lichess_token(current_user.lichess_token)
    headers = {
        "Authorization": f"Bearer {lichess_token}"
    }
    data = {"level": 5}  # <-- send as form data
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, data=data)
        if response.status_code == 201:
            return {"message": "Success"}
        else:
            # Raise an HTTP error so the frontend can catch it
            detail = response.text
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to challenge the LichessAI: {response.status_code} - {detail}"
            )
