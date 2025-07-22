from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.db.models import Player
from src.utils.errors import *
from .schemas import PlayerCreate, PlayerUpdate

from src.utils.errors import (
    PlayerNotFound,
    PlayerAlreadyExists
)


class PlayerService:
    async def get_player(self, id: int, session: AsyncSession):
        player = await session.get(Player, id)
        if player is None:
            raise PlayerNotFound()
        return player

    async def get_players(self, tournament_id: int, session: AsyncSession):
        statement = select(Player).where(Player.tournament_id == tournament_id)
        result = await session.exec(statement)
        return result.all()

    async def create_player(self, tournament_id: int, payload: PlayerCreate, session: AsyncSession):
        statement = select(Player).where(Player.name == payload.name)
        result = await session.exec(statement)
        player = result.first()
        if player:
            raise PlayerAlreadyExists()

        new_player = Player.model_validate(payload)
        new_player.tournament_id = tournament_id
        session.add(new_player)
        await session.commit()
        await session.refresh(new_player)
        return new_player

    async def update_player(self, id: int, payload: PlayerUpdate, session: AsyncSession):
        player = await self.get_player(id, session)
        player.sqlmodel_update(payload.model_dump(exclude_unset=True))

        session.add(player)
        await session.commit()
        await session.refresh(player)
        return player
