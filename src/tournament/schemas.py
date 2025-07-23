from pydantic import BaseModel, Field, field_validator
from datetime import date
from src.utils.enums import *
from src.db.models import Player


class TournamentValidatorMixin(BaseModel):
    @field_validator("name", check_fields=False)
    def name_length(cls, v):
        if v is None:
            return v
        if len(v) < 3:
            raise ValueError("Tournament name must be at least 3 characters long.")
        if len(v) > 20:
            raise ValueError("Tournament name cannot be longer than 20 characters.")
        return v

    @field_validator("location", check_fields=False)
    def location_length(cls, v):
        if v is None:
            return v
        if len(v) < 3:
            raise ValueError("Tournament location must be at least 3 characters long.")
        if len(v) > 20:
            raise ValueError("Tournament location cannot be longer than 20 characters.")
        return v

    @field_validator("time_control", mode="before", check_fields=False)
    def normalize_time_control(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            for member in TimeControl:
                if v.lower() == member.value.lower():
                    return member
            raise ValueError(f"Invalid time_control: {v}")
        return v

    @field_validator("nb_of_players", check_fields=False)
    def nb_of_players_check(cls, v):
        if v is None:
            return v
        if v < 2:
            raise ValueError("Minimum number of 2 players needed.")
        if v > 64:
            raise ValueError("Maximum number of 64 players exceeded.")


class TournamentBase(TournamentValidatorMixin):
    name: str
    location: str
    start_date: date
    end_date: date
    time_control: TimeControl
    status: Status | None = Status.NOT_STARTED.value
    format: Format
    nb_of_players: int


class TournamentCreate(TournamentBase):
    pass


class TournamentUpdate(TournamentValidatorMixin):
    name: str | None = Field(default=None)
    location: str | None = Field(default=None)
    nb_of_players: int | None = Field(default=None)
    start_date: date | None = Field(default=None)
    end_date: date | None = Field(default=None)
    time_control: TimeControl | None = Field(default=None)
    status: Status | None = Field(default=None)
    format: Format | None = Field(default=None)


class Tournament(TournamentBase):
    id: int
    players: list[Player] | None = None