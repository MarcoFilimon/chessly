from pydantic import BaseModel, Field, field_validator
from datetime import date
from src.utils.enums import TimeControl
from src.db.models import Player


class TournamentBase(BaseModel):
    name: str = Field(min_length=3, max_length=25)
    location: str = Field(min_length=3, max_length=25)
    start_date: date
    end_date: date
    time_control: TimeControl

    @field_validator("time_control", mode="before")
    def normalize_time_control(cls, v):
        if isinstance(v, str):
            for member in TimeControl:
                if v.lower() == member.value.lower():
                    return member
            raise ValueError(f"Invalid time_control: {v}")
        return v


class TournamentCreate(TournamentBase):
    pass


class TournamentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=3, max_length=10)
    location: str | None = Field(default=None, min_length=3, max_length=10)
    start_date: date | None = Field(default=None)
    end_date: date | None = Field(default=None)
    time_control: TimeControl | None = Field(default=None)


class Tournament(TournamentBase):
    id: int
    players: list[Player] | None = None