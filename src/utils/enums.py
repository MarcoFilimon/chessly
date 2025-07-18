from enum import Enum, unique

@unique
class TimeControl(Enum):
    BULLET = "Bullet"
    BLITZ = "Blitz"
    RAPID = "Rapid"
    CLASICCAL = "Classical"
