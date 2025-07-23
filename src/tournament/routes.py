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


@router.get('/{id}', response_model=Tournament, status_code=status.HTTP_200_OK)
async def get_tournament(
    id: int,
    session: AsyncSession = Depends(db.get_session)
) -> list[Tournament]:
    """
    Retrieves tournament be ID.
    """
    tournament = await service.get_tournament(id, session)
    return tournament


@router.delete('/{id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_tournament(
    id: int,
    session: AsyncSession = Depends(db.get_session)
):
    """
    Delete tournament be ID.
    """
    await service.delete_tournament(id, session)


@router.post('/{id}/start', response_model=Tournament, status_code=status.HTTP_200_OK)
async def start_tournament(
    id: int,
    _ : bool = Depends(full_access),
    session: AsyncSession = Depends(db.get_session)
):
    """
    Start tournament: set status to Ongoing and generate all round pairings.
    """
    tournament = await service.start_tournament(id, session)
    return tournament


@router.put('/{id}/round_result/{round_number}', response_model=Tournament, status_code=status.HTTP_200_OK)
async def update_round_result(
    id: int,
    round_number: int,
    payload: RoundResult,
    _ : bool = Depends(full_access),
    session: AsyncSession = Depends(db.get_session)
):
    '''
    Update the results of a certain round.
    '''
    tournament = await service.update_results(id, round_number, payload, session)
    return tournament


@router.post('/{id}/generate_players', response_model=Tournament, status_code=status.HTTP_200_OK)
async def start_tournament(
    id: int,
    _ : bool = Depends(full_access),
    session: AsyncSession = Depends(db.get_session)
):
    """
    Generate all players for a given tournament.
    Random names with random ratings.
    """
    tournament = await service.generate_players(id, session)
    return tournament
