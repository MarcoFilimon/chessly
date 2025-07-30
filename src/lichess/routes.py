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


@router.get('/stream_moves/{gameId}', status_code=status.HTTP_200_OK)
async def stream_moves(gameId: str):
    from fastapi.responses import StreamingResponse
    import httpx
    import asyncio # For potential sleep in real scenarios
    lichess_token = "lip_XFJ3gGeNWTZmxpb3R8CG"
    url = f"https://lichess.org/api/stream/game/{gameId}"

    headers = {
        "Authorization": f"Bearer {lichess_token}",
        "Accept": "text/event-stream" # Explicitly request SSE
    }

    # Set a longer timeout for the initial connection, or a None for infinite read timeout
    # You might want a connect timeout but no read timeout for streams.
    # httpx.Timeout(connect=10.0, read=None, write=10.0, pool=None)
    # For a streaming response, the `read` timeout needs to be handled carefully.
    # Often, you let the client decide when to close, or the server for inactivity.
    timeout_config = httpx.Timeout(120.0, connect=10.0, read=None)

    async def event_generator():
        try:
            async with httpx.AsyncClient(timeout=timeout_config) as client:
                async with client.stream("GET", url, headers=headers, follow_redirects=True) as response:
                    # Check the initial response status
                    if response.status_code != 200:
                        yield f"data: {{\"error\": \"Failed to connect to Lichess stream: {response.status_code}\", \"details\": \"{await response.text()}\"}}\n\n"
                        return

                    # Iterate over the stream as chunks arrive
                    async for chunk in response.aiter_bytes():
                        # Lichess sends JSON objects, one per line, potentially preceded by 'event: '
                        # You'll need to parse this for each event.
                        # For a simple pass-through, just yield the chunk.
                        # For more robust parsing, you'd buffer and split by newlines.

                        # Example of simple processing (assuming each chunk is a full event line)
                        # In reality, chunks might split event lines, so a buffer is better.
                        chunk_str = chunk.decode('utf-8')

                        # Lichess events are typically newline-separated JSON objects
                        # The `data:` prefix is for SSE, so we prepend it.
                        # It's better to process complete lines if possible.

                        # A more robust parser would buffer lines and then yield.
                        # For demonstration, let's assume chunks roughly align with events or we process lines.
                        # Lichess typically sends one JSON object per line, followed by a newline.
                        # `data:` prefix is required for SSE.

                        # Lichess stream sends each event as a JSON string followed by `\n` or `\r\n`.
                        # We need to prepend `data: ` and append `\n\n` for standard SSE format.
                        # For simplicity, let's yield each chunk as an SSE event.
                        # This might send partial JSON if chunk splits an event, so a proper parser is recommended for production.

                        # A better way is to buffer and yield complete lines:
                        # (This requires managing a buffer across chunks, which is more complex for a simple example)

                        # For now, let's yield the raw text and rely on the client to parse JSON from it
                        # For a proper SSE stream, each event must be `data: {json_payload}\n\n`

                        # Let's refine the yield to adhere to SSE spec
                        for line in chunk_str.splitlines():
                            if line.strip(): # Only process non-empty lines
                                # Lichess sends raw JSON, so we need to wrap it for SSE
                                # Example: {"type": "gameFull", ...}
                                # We need to send: data: {"type": "gameFull", ...}\n\n
                                yield f"data: {line}\n\n"
                        await asyncio.sleep(0.01) # Small sleep to yield control
        except httpx.TimeoutException:
            # Handle timeout specifically for the stream connection
            yield f"data: {{\"error\": \"Lichess stream connection timed out.\"}}\n\n"
        except httpx.RequestError as exc:
            yield f"data: {{\"error\": \"HTTP request error for Lichess stream: {str(exc)}\"}}\n\n"
        except Exception as e:
            yield f"data: {{\"error\": \"An unexpected error occurred in stream: {type(e).__name__}\", \"details\": \"{str(e)}\"}}\n\n"
        finally:
            print("Lichess stream connection closed.") # Log when the stream ends

    # Return a StreamingResponse from FastAPI
    return StreamingResponse(event_generator(), media_type="text/event-stream")

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
