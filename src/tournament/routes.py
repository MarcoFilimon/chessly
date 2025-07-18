from fastapi import status, APIRouter, Depends
from fastapi.responses import JSONResponse
from .schemas import *
from src.utils.config import version
from .service import TournamentService
from sqlmodel.ext.asyncio.session import AsyncSession
from src.db import db

from src.auth.dependencies import (
    RoleChecker,
    get_current_user
)


router = APIRouter(
    prefix=f"/api/{version}/tournament",
    tags=["tournament"]
)

service = TournamentService()
full_access = RoleChecker(['admin', 'user'])
admin_access = RoleChecker(['admin'])


@router.post('/', status_code=status.HTTP_201_CREATED, response_model=Tournament)
async def create_tournament(
    payload: TournamentCreate,
    _ : bool = Depends(full_access),
    session: AsyncSession = Depends(db.get_session)
) -> dict:
    '''
    Create new tournament.
    '''
    tournament = await service.create_tournament(payload, session)
    return tournament


@router.put('/{id}', status_code=status.HTTP_200_OK, response_model=Tournament)
async def update_tournament(
  id: int,
  payload: TournamentUpdate,
  _: bool = Depends(full_access),
  session: AsyncSession = Depends(db.get_session)
) -> dict:
    '''
    Update a tournament.
    '''
    tournament = await service.update_tournament(id, payload, session)
    return tournament