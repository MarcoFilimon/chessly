from sqlmodel import desc, select, asc
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import func

from src.db.models import Tournament, User, Round, Matchup, Player
from .schemas import TournamentCreate, TournamentUpdate, RoundResult
from src.utils.enums import Status, Format, Result
import random

from src.utils.errors import (
    TournamentNotFound,
    TournamentAlreadyExists,
    InsufficientPermission,
    TournamentStarted,
    TournamentNotFinished
)

from src.player.schemas import PlayerCreate
from src.player.service import PlayerService
player_service = PlayerService()


def get_full_tournament_data(t: Tournament):
    data = t.model_dump(mode="json")
    # Players
    data["players"] = [p.model_dump(mode="json") for p in getattr(t, "players", [])]
    # Build a lookup for players by ID
    player_lookup = {p.id: p for p in getattr(t, "players", [])}
    # Rounds with nested matchups and full player info
    data["rounds"] = []
    for r in getattr(t, "rounds", []):
        round_data = r.model_dump(mode="json")
        round_data["matchups"] = []
        for m in getattr(r, "matchups", []):
            matchup_data = m.model_dump(mode="json")
            # Replace player IDs with full player dicts
            white_player_obj = getattr(m, "white_player", None)
            black_player_obj = getattr(m, "black_player", None)
            # If these are IDs, look them up
            if isinstance(white_player_obj, int):
                white_player_obj = player_lookup.get(white_player_obj)
            if isinstance(black_player_obj, int):
                black_player_obj = player_lookup.get(black_player_obj)
            matchup_data["white_player"] = white_player_obj.model_dump(mode="json") if white_player_obj else None
            matchup_data["black_player"] = black_player_obj.model_dump(mode="json") if black_player_obj else None
            round_data["matchups"].append(matchup_data)
        data["rounds"].append(round_data)
    return data


def berger_table_pairings(player_ids, double_round_robin=False):
    n_players = len(player_ids)
    rounds = []
    # Add dummy for bye if odd
    if n_players % 2 != 0:
        player_ids = player_ids + [None]

    n = len(player_ids)
    num_rounds = n - 1  # Always n-1 rounds after dummy is added

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
        '''
        selectinload tells SQLAlchemy to fetch related objects (like rounds and their matchups) in advance, while the session is still open.
        This prevents the need for lazy loading after the session is closed, which causes the MissingGreenlet error.
        '''
        statement = (
            select(Tournament)
            .where(Tournament.id == id)
            .options(
                selectinload(Tournament.rounds).selectinload(Round.matchups),
                selectinload(Tournament.players)
            )
        )
        result = await session.exec(statement)
        tournament = result.first()
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

        # For finishing the tournament, check if all matchups have a result
        if tournament.status == Status.ONGOING and payload.status == Status.FINISHED:
        # Check all matchups in all rounds
            for rnd in tournament.rounds:
                for matchup in rnd.matchups:
                    if matchup.result == Result.NO_RESULT or not matchup.result:
                        raise TournamentNotFinished()

        if tournament.manager_id == current_user.id or current_user.role == "admin":
            tournament.sqlmodel_update(payload.model_dump(exclude_unset=True))
            session.add(tournament)
            await session.commit()
            tournament = await self.get_tournament(id, session)
            return tournament
        else:
            raise InsufficientPermission()

    async def get_all_tournaments(self, user_id: int, limit: int, sort: str, status: str, session: AsyncSession):
        status_key = next((e.name for e in Status if e.value == status), None)
        if not status_key:
            raise ValueError("Invalid status value")
        order = desc(Tournament.start_date) if sort == "desc" else asc(Tournament.start_date)
        statement = select(Tournament).where(Tournament.manager_id == user_id).limit(limit).order_by(order)
        if user_id is not None:
            # statement = select(Tournament).where(Tournament.manager_id == user_id).limit(limit).order_by(order)
            statement = select(Tournament).where((Tournament.manager_id == user_id) & (Tournament.status == status_key)).limit(limit).order_by(order)
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


    async def end_tournament(self, tournament_id: int, session: AsyncSession):
        tournament = await self.get_tournament(tournament_id, session)
        if tournament.status != Status.ONGOING:
            raise TournamentStarted("Tournament cannot be ended.")

        tournament.status = Status.FINISHED
        session.add(tournament)
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
        # After committing, always re-fetch the tournament with eager loading before returning it.
        tournament = await self.get_tournament(tournament_id, session)
        return tournament

    async def generate_players(self, tournament_id: int, session: AsyncSession):
        tournament = await self.get_tournament(tournament_id, session)
        nb_of_players = tournament.nb_of_players

        counter = 1
        if len(tournament.players) <= nb_of_players:
            counter = len(tournament.players) + 1
        while counter <= nb_of_players:
            payload = PlayerCreate(name=f"Player#{counter + 1}", rating=random.randint(400,4000))
            _ = await player_service.create_player(tournament_id, payload, session)
            counter += 1

        await session.commit()
        tournament = await self.get_tournament(tournament_id, session)
        return tournament

    async def total_tournaments(self, user_id: int, session: AsyncSession):
        statement = (
            select(Tournament.status, func.count())
            .where(Tournament.manager_id == user_id)
            .group_by(Tournament.status)
        )
        result = await session.exec(statement)
        rows = result.all()
        # Convert to dict: {status_value: count}
        return {status: count for status, count in rows}


    async def get_tournament_winner(self, tournament: Tournament) -> dict:
        '''
        Calculates the winner(s) of the tournament based on matchup results.
        Returns a dict: {player_id: points}
        '''
        scores = {}
        for player in tournament.players:
            scores[player.id] = 0

        for round_obj in tournament.rounds:
            for matchup in round_obj.matchups:
                # Score table: win=1, draw=0.5, loss=0
                if matchup.result == Result.WHITE_WINS:
                    scores[matchup.white_player_id] += 1
                elif matchup.result == Result.BLACK_WINS:
                    scores[matchup.black_player_id] += 1
                elif matchup.result == Result.DRAW:
                    scores[matchup.white_player_id] += 0.5
                    scores[matchup.black_player_id] += 0.5

        # Find the highest score
        max_score = max(scores.values())
        # generator expression
        winner_id = next(pid for pid, pts in scores.items() if pts == max_score)
        winner_obj = next(p for p in tournament.players if p.id == winner_id)
        return {
            "winner": winner_obj.model_dump(mode="json"),
            "score": max_score
        }