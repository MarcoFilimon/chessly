from pydantic import BaseModel, Field, field_validator
from src.utils.enums import *

class Move(BaseModel):
    gameId: str
    move: str