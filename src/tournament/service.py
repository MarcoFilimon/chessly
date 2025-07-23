from sqlmodel import desc, select, asc
from sqlmodel.ext.asyncio.session import AsyncSession

from src.db.models import Tournament, User, Round, Matchup, Player
from .schemas import TournamentCreate, TournamentUpdate, RoundResult
from src.utils.enums import Status, Format, Result

from src.utils.errors import (
    TournamentNotFound,
    TournamentAlreadyExists,
    InsufficientPermission,
    TournamentStarted
)

def berger_table_pairings(player_ids, double_round_robin=False):
    n = len(player_ids)
    rounds = []
    # Add dummy for bye if odd
    if n % 2 != 0:
        player_ids = player_ids + [None]
        n += 1

    num_rounds = n - 1
    rotation = player_ids[:-1]
    fixed = player_ids[-1]

    for round_num in range(num_rounds):
        pairings = []
        # Pair fixed with rotating player
        if round_num % 2 == 0:
            pairings.append((rotation[0], fixed))  # rotation[0] is white
        else:
            pairings.append((fixed, rotation[0]))  # fixed is white

        # Pair remaining
        for i in range(1, n // 2):
            a = rotation[i]
            b = rotation[-i]
            if round_num % 2 == 0:
                pairings.append((a, b))  # a is white
            else:
                pairings.append((b, a))  # b is white

        rounds.append(pairings)
        rotation = [rotation[-1]] + rotation[:-1]

    # For double round-robin, repeat and swap colors
    if double_round_robin:
        second_cycle = []
        for pairings in rounds:
            swapped = [(b, a) for (a, b) in pairings]
            second_cycle.append(swapped)
        rounds += second_cycle

    return rounds


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
        if tournament.status != Status.NOT_STARTED:
            raise TournamentStarted()
        if tournament.manager_id == current_user.id or current_user.role == "admin":
            tournament.sqlmodel_update(payload.model_dump(exclude_unset=True))
            session.add(tournament)
            await session.commit()
            await session.refresh(tournament)
            return tournament
        else:
            raise InsufficientPermission()

    async def get_all_tournaments(self, user_id: int, limit: int, sort: str, session: AsyncSession):
        order = desc(Tournament.start_date) if sort == "desc" else asc(Tournament.start_date)
        if user_id is not None:
            statement = select(Tournament).where(Tournament.manager_id == user_id).limit(limit).order_by(order)
        else:
            statement = select(Tournament).limit(limit).order_by(order)
        result = await session.exec(statement)
        return result.all()

    async def start_tournament(self, tournament_id: int, session: AsyncSession):
        tournament = await self.get_tournament(tournament_id, session)
        if tournament.status != Status.NOT_STARTED:
            raise TournamentStarted()

        tournament.status = Status.ONGOING
        session.add(tournament)
        await session.commit()
        await session.refresh(tournament)

        statement = select(Player).where(Player.tournament_id == tournament.id)
        result = await session.exec(statement)
        players = result.all()
        player_ids = [p.id for p in players]

        double_rr = tournament.format == Format.DOUBLE_ROUND_ROBIN
        rounds_pairings = berger_table_pairings(player_ids, double_round_robin=double_rr)

        for round_number, pairings in enumerate(rounds_pairings, start=1):
            round_obj = Round(
                tournament_id=tournament.id,
                round_number=round_number
            )
            session.add(round_obj)
            await session.commit()
            await session.refresh(round_obj)

            for white_id, black_id in pairings:
                if white_id is None or black_id is None:
                    continue  # Bye
                matchup = Matchup(
                    round_id=round_obj.id,
                    white_player_id=white_id,
                    black_player_id=black_id,
                    result=Result.NO_RESULT  # or default value
                )
                session.add(matchup)
            await session.commit()

        await session.refresh(tournament)
        return tournament

    async def get_matchups(self, tournament_id: int, round_number: int, session: AsyncSession):
        # Find the round by tournament_id and round_number
        statement = select(Round).where(
            (Round.tournament_id == tournament_id) &
            (Round.round_number == round_number)
        )
        round_obj = await session.exec(statement)
        round_obj = round_obj.first()
        if not round_obj:
            return []
        statement = select(Matchup).where(Matchup.round_id == round_obj.id)
        matchups = await session.exec(statement)
        return matchups.all()

    async def update_results(self, tournament_id: int, round_number: int, payload: RoundResult, session: AsyncSession):
        tournament = await self.get_tournament(tournament_id, session)
        results = payload.results  # A list of {matchupId, result}

        matchups = await self.get_matchups(tournament_id, round_number, session)
        matchup_dict = {m.id: m for m in matchups}

        for r in results:
            matchup_id = r.matchupId
            result = r.result
            matchup = matchup_dict.get(matchup_id)
            if matchup:
                matchup.result = result
                session.add(matchup)

        await session.commit()
        await session.refresh(tournament)
        return tournament
