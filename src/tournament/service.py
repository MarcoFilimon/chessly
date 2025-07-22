from sqlmodel import desc, select, asc
from sqlmodel.ext.asyncio.session import AsyncSession

from src.db.models import Tournament, User
from .schemas import TournamentCreate, TournamentUpdate

from src.utils.errors import (
    TournamentNotFound,
    TournamentAlreadyExists,
    InsufficientPermission
)


class TournamentService:
    async def get_tournament(self, id: int, session: AsyncSession):
        tournament = await session.get(Tournament, id)
        if tournament is None:
            raise TournamentNotFound()
        return tournament

    async def delete_tournament(self, id: int, session: AsyncSession):
        tournament = await self.get_tournament(id, session)
        await session.delete(tournament)
        await session.commit()

    async def create_tournament(self, payload: TournamentCreate, user_id: int, session: AsyncSession):
        statement = select(Tournament).where(Tournament.name == payload.name)
        result = await session.exec(statement)
        tournament = result.first()
        if tournament:
            raise TournamentAlreadyExists()
        new_tournament = Tournament.model_validate(payload)
        new_tournament.manager_id = user_id
        session.add(new_tournament)
        await session.commit()
        await session.refresh(new_tournament)
        return new_tournament

    async def update_tournament(self, id: int, payload: TournamentUpdate, current_user: User, session: AsyncSession):
        tournament = await self.get_tournament(id, session)
        if tournament.manager_id == current_user.id or current_user.role == "admin":
            tournament.sqlmodel_update(payload.model_dump(exclude_unset=True))
            session.add(tournament)
            await session.commit()
            await session.refresh(tournament)
            return tournament
        else:
            InsufficientPermission()

    async def get_all_tournaments(self, user_id: int, limit: int, sort: str, session: AsyncSession):
        order = desc(Tournament.start_date) if sort == "desc" else asc(Tournament.start_date)
        if user_id is not None:
            statement = select(Tournament).where(Tournament.manager_id == user_id).limit(limit).order_by(order)
        else:
            statement = select(Tournament).limit(limit).order_by(order)
        result = await session.exec(statement)
        return result.all()