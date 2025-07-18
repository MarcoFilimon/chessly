from fastapi import status, APIRouter, Depends
from fastapi.responses import JSONResponse
from .schemas import *
from src.utils.config import version
from .service import PlayerService
from sqlmodel.ext.asyncio.session import AsyncSession
from src.db import db

from src.auth.dependencies import (
    RoleChecker,
    get_current_user
)


router = APIRouter(
    prefix=f"/api/{version}/player",
    tags=["player"]
)

service = PlayerService()
full_access = RoleChecker(['admin', 'user'])


@router.post('/{tournament_id}', status_code=status.HTTP_201_CREATED, response_model=Player)
async def create_player(
    tournament_id: int,
    payload: PlayerCreate,
    _ : bool = Depends(full_access),
    session: AsyncSession = Depends(db.get_session)
) -> dict:
    '''
    Create new player.
    '''
    player = await service.create_player(tournament_id, payload, session)
    return player


@router.put('/{id}', status_code=status.HTTP_200_OK, response_model=Player)
async def update_player(
  id: int,
  payload: PlayerUpdate,
  _: bool = Depends(full_access),
  session: AsyncSession = Depends(db.get_session)
) -> dict:
    '''
    Update a player.
    '''
    player = await service.update_player(id, payload, session)
    return player