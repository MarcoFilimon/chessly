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

@unique
class Format(Enum):
    ROUND_ROBIN = "Round-Robin"
    DOUBLE_ROUND_ROBIN = 'Double-Round-Robin'
    SWISS = "Swiss"
    ELIMINATION = "Elimination"
    DOUBLE_ELIMINATION = "Double-Elimination"

@unique
class Result(Enum):
    NO_RESULT = "No-Result"
    WHITE_WINS = "White-Wins"
    BLACK_WINS = "Black-Wins"
    DRAW = "Draw"