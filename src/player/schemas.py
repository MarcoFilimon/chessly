from pydantic import BaseModel, Field, field_validator


class PlayerValidatorMixin(BaseModel):
    @field_validator("name", check_fields=False)
    def name_length(cls, v):
        if v is None:
            return v
        if len(v) < 3:
            raise ValueError("Player name must be at least 3 characters long.")
        if len(v) > 10:
            raise ValueError("Player name cannot be longer than 10 characters.")
        return v

    @field_validator("rating", check_fields=False)
    def rating_interval(cls, v):
        if v is None:
            return v
        if v < 400:
            raise ValueError("Player rating cannot be lower than 400.")
        if v > 4000:
            raise ValueError("Player rating cannot exceed 4000.")
        return v

class PlayerBase(PlayerValidatorMixin):
    name: str
    rating: int
    # country: str = Field(min_length=3, max_length=25)
    # age: int
    # title: str


class PlayerCreate(PlayerBase):
    pass


class PlayerUpdate(PlayerValidatorMixin):
    name: str | None = Field(default=None)
    rating: int | None = Field(default=None)
    # country: str | None = Field(default=None, min_length=3, max_length=25)
    # age: int | None = Field(default=None)
    # title: str | None = Field(default=None)


class Player(PlayerBase):
    id: int