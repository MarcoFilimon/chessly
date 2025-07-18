from sqlmodel import SQLModel, Field, Column, Relationship
import sqlalchemy.dialects.postgresql as pg
import sqlalchemy as sa
from datetime import datetime, date
from src.utils.enums import TimeControl


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    hashed_pass: str = Field(exclude=True)
    email: str = Field(unique=True, index=True)
    first_name: str | None = Field(default=None)
    last_name: str | None = Field(default=None)
    role: str = Field(
        sa_column=Column(pg.VARCHAR, nullable=False, server_default="user")
    )
    is_verified: bool = Field(default=False)
    created_at: datetime = Field(sa_column=Column(pg.TIMESTAMP, default=datetime.now))

    tournaments: list["Tournament"] = Relationship(
        back_populates="manager", sa_relationship_kwargs={"lazy": "selectin"}, cascade_delete=True
    )


    def __repr__(self) -> str:
        return f"<User {self.username}>"


class Tournament(SQLModel, table=True):
    __tablename__ = "tournaments"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    federation: str
    time_control: TimeControl = Field(
        default=None,
        sa_column=sa.Column(
            sa.Enum(TimeControl, name="timecontrol", native_enum=False),
            nullable=True
        )
    )
    start_date: date
    end_date: date

    # ------------------ User relationship -----------------

    manager_id: int | None = Field(
        default=None, foreign_key="users.id", nullable=False, ondelete="CASCADE"
    )
    manager: User = Relationship(
        back_populates="tournaments", sa_relationship_kwargs={"lazy": "selectin"}
    )

    # ------------------ Player relationship -----------------

    players: list["Player"] = Relationship(
        back_populates="tournament", sa_relationship_kwargs={"lazy": "selectin"}, cascade_delete=True
    )

    def __repr__(self) -> str:
        return f"<Tournament {self.name}>"


class Player(SQLModel, table=True):
    __tablename__ = "players"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    rating: int = Field(ge=1, le=4000)
    age: int = Field(ge=1, le=125)
    country: str
    title: str

    # -------------- Tournament relationship

    tournament_id: int | None = Field(
        default=None, foreign_key="tournaments.id", nullable=False, ondelete="CASCADE"
    )
    tournament: Tournament = Relationship(
        back_populates="players", sa_relationship_kwargs={"lazy": "selectin"}
    )