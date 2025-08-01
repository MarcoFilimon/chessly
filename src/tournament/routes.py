from fastapi import status, APIRouter, Depends
from .schemas import *
from src.utils.config import version
from .service import TournamentService, get_full_tournament_data
from sqlmodel.ext.asyncio.session import AsyncSession
from src.db import db
from src.db.models import User
from src.db.redis import *
import json


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
    await invalidate_user_tournaments_cache(user.id)
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
    await invalidate_user_tournaments_cache(user.id)
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
    cache_key = f"user:{user_id}:tournaments:{limit}:{sort}"
    # Try from redis cache
    cached = await redis_client.get(cache_key) # this returns a list of bytes
    if cached is not None and len(cached) != 0:
    # if False:
        # decode the bytes object to a uft-8 string
        cached_string = cached.decode("utf-8")

        # json.loads() returns a list of dictionaries
        tournaments_data = json.loads(cached_string)
        if tournaments_data:
        # Now, iterate over the list of dictionaries and validate each one
            tournaments = [Tournament.model_validate(t) for t in tournaments_data]
            return tournaments

    # not cached, get them from db
    tournaments = await service.get_all_tournaments(user_id, limit, sort, session)

    # cache results for future requests
    if tournaments:
        await invalidate_user_tournaments_cache(user_id) #! remove any old data if it exists
        await redis_client.set(
            cache_key,
            json.dumps([get_full_tournament_data(t) for t in tournaments]),
            ex=3600)

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
    session: AsyncSession = Depends(db.get_session),
    user: User = Depends(get_current_user)
):
    """
    Delete tournament be ID.
    """
    await invalidate_user_tournaments_cache(user.id)
    await service.delete_tournament(id, session)


@router.post('/{id}/start', response_model=Tournament, status_code=status.HTTP_200_OK)
async def start_tournament(
    id: int,
    _ : bool = Depends(full_access),
    session: AsyncSession = Depends(db.get_session),
    user: User = Depends(get_current_user)
):
    """
    Start tournament: set status to Ongoing and generate all round pairings.
    """
    await invalidate_user_tournaments_cache(user.id)
    tournament = await service.start_tournament(id, session)
    return tournament


@router.put('/{id}/round_result/{round_number}', response_model=Tournament, status_code=status.HTTP_200_OK)
async def save_round_results(
    id: int,
    round_number: int,
    payload: RoundResult,
    _ : bool = Depends(full_access),
    session: AsyncSession = Depends(db.get_session),
    user: User = Depends(get_current_user)
):
    '''
    Update the results of a certain round.
    '''
    await invalidate_user_tournaments_cache(user.id)
    tournament = await service.update_results(id, round_number, payload, session)
    return tournament


@router.post('/{id}/generate_players', response_model=Tournament, status_code=status.HTTP_200_OK)
async def generate_players(
    id: int,
    _ : bool = Depends(full_access),
    session: AsyncSession = Depends(db.get_session),
    user: User = Depends(get_current_user)
):
    """
    Generate all players for a given tournament.
    Random names with random ratings.
    """
    await invalidate_user_tournaments_cache(user.id)
    tournament = await service.generate_players(id, session)
    return tournament
