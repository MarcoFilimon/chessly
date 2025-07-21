from fastapi import status, APIRouter, Depends
from fastapi.responses import JSONResponse
from .schemas import *
from src.utils.config import version
from .service import TournamentService
from sqlmodel.ext.asyncio.session import AsyncSession
from src.db import db
from src.db.models import User


from src.auth.dependencies import (
    AccessTokenBearer,
    RoleChecker,
    get_current_user
)

router = APIRouter(
    prefix=f"/api/{version}/tournament",
    tags=["tournament"]
)

acccess_token_bearer = AccessTokenBearer()
service = TournamentService()
full_access = RoleChecker(['admin', 'user'])
admin_access = RoleChecker(['admin'])


@router.post('/', status_code=status.HTTP_201_CREATED, response_model=Tournament)
async def create_tournament(
    payload: TournamentCreate,
    user: User = Depends(get_current_user),
    _ : bool = Depends(full_access),
    session: AsyncSession = Depends(db.get_session)
) -> dict:
    '''
    Create new tournament.
    '''
    tournament = await service.create_tournament(payload, user.id, session)
    return tournament


@router.put('/{id}', status_code=status.HTTP_200_OK, response_model=Tournament)
async def update_tournament(
    id: int,
    payload: TournamentUpdate,
    user: User = Depends(get_current_user),
    _ : bool = Depends(full_access),
    session: AsyncSession = Depends(db.get_session)
) -> dict:
    '''
    Update a tournament.
    '''
    tournament = await service.update_tournament(id, payload, user, session)
    return tournament


# e.g: {{ _.url }}/?limit=5&sort=avsc
@router.get('/', response_model=list[Tournament], status_code=status.HTTP_200_OK)
async def get_user_tournaments(
    limit: int = 10,
    sort: str = "desc",
    token_details: dict = Depends(acccess_token_bearer),
    session: AsyncSession = Depends(db.get_session)
) -> list[Tournament]:
    """
    Retrieves all tournaments for current user. (up to the limit + sorted for start date)
    """
    user_id = int(token_details["user_id"]) # get current user id from token
    tournaments = await service.get_all_tournaments(user_id, limit, sort, session)
    return tournaments