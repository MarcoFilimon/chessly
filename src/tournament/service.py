from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.db.models import Tournament
from src.utils.errors import *
from .schemas import TournamentCreate, TournamentUpdate

from src.utils.errors import (
    TournamentNotFound
)


class TournamentService:
    async def get_tournament(self, id: int, session: AsyncSession):
        tournament = await session.get(Tournament, id)
        if tournament is None:
            raise TournamentNotFound()
        return tournament

    async def create_tournament(self, payload: TournamentCreate, session: AsyncSession):
        statement = select(Tournament).where(Tournament.name == payload.name)
        result = await session.exec(statement)
        tournament = result.first()
        if tournament:
            raise TournamentAlreadyExists()

        new_tournament = Tournament.model_validate(payload)
        session.add(new_tournament)
        await session.commit()
        await session.refresh(new_tournament)
        return new_tournament

    async def update_tournament(self, id: int, payload: TournamentUpdate, session: AsyncSession):
        tournament = await self.get_tournament(id, session)
        tournament.sqlmodel_update(payload.model_dump(exclude_unset=True))

        session.add(tournament)
        await session.commit()
        await session.refresh(tournament)
        return tournament
