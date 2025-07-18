from pydantic import BaseModel, Field

class PlayerBase(BaseModel):
    name: str = Field(min_length=3, max_length=25)
    country: str = Field(min_length=3, max_length=25)
    rating: int
    age: int
    title: str


class PlayerCreate(PlayerBase):
    pass


class PlayerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=3, max_length=25)
    country: str | None = Field(default=None, min_length=3, max_length=25)
    rating: int | None = Field(default=None)
    age: int | None = Field(default=None)
    title: int | None = Field(default=None)


class Player(PlayerBase):
    id: int