from enum import Enum, unique

@unique
class TimeControl(Enum):
    BULLET = "Bullet"
    BLITZ = "Blitz"
    RAPID = "Rapid"
    CLASICCAL = "Classical"

@unique
class Status(Enum):
    NOT_STARTED = "Not Started"
    ONGOING = "Ongoing"
    FINISHED = "Finished"
