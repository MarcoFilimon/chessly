from typing import Any, Callable
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from fastapi import FastAPI, status
from sqlalchemy.exc import SQLAlchemyError


class Chessly(Exception):
    """This is the base class for all chessly errors"""

    pass


class InvalidToken(Chessly):
    """User has provided an invalid or expired token"""

    pass

class InvalidLichessToken(Chessly):
    """Lichess toekn is missing or could not be decrypted."""

    pass


class RevokedToken(Chessly):
    """User has provided a token that has been revoked"""

    pass


class AccessTokenRequired(Chessly):
    """User has provided a refresh token when an access token is needed"""

    pass


class RefreshTokenRequired(Chessly):
    """User has provided an access token when a refresh token is needed"""

    pass


class UserAlreadyExists(Chessly):
    """User has provided an email for a user who exists during sign up."""

    pass


class InvalidCredentials(Chessly):
    """User has provided wrong email or password during log in."""

    pass


class InsufficientPermission(Chessly):
    """User does not have the neccessary permissions to perform an action."""
    pass


class UserNotFound(Chessly):
    """User Not found"""
    pass


class TournamentNotFound(Chessly):
    """Tournament Not found"""
    pass


class PlayerNotFound(Chessly):
    """Tournament Not found"""
    pass


class PlayerAlreadyExists(Chessly):
    """Tournament Not found"""
    pass

class TournamentFull(Chessly):
    """Tournament is full"""
    pass


class AccountNotVerified(Exception):
    """Account not yet verified"""
    pass


class NewPasswordsException(Exception):
    """Passwords do not match"""
    pass


class PasswordResetRequestTimeout(Exception):
    """Password reset request has timed out."""
    pass


class TournamentAlreadyExists(Exception):
    """Tournament with this name already exists."""
    pass

class TournamentStarted(Exception):
    """Tournament already started or finished."""
    pass

class TournamentNotFinished(Exception):
    """Not all games have results. Cannot finish the tournament."""
    pass


def create_exception_handler(
    status_code: int, initial_detail: Any
) -> Callable[[Request, Exception], JSONResponse]:

    async def exception_handler(request: Request, exc: Chessly):

        return JSONResponse(content=initial_detail, status_code=status_code)

    return exception_handler



def register_all_errors(app: FastAPI):
    app.add_exception_handler(
        UserAlreadyExists,
        create_exception_handler(
            status_code=status.HTTP_403_FORBIDDEN,
            initial_detail={
                "message": "User with email already exists.",
                "error_code": "user_exists",
            },
        ),
    )

    app.add_exception_handler(
        UserNotFound,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_detail={
                "message": "User not found.",
                "error_code": "user_not_found",
            },
        ),
    )
    app.add_exception_handler(
        TournamentNotFound,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_detail={
                "message": "Tournament not found.",
                "error_code": "tournament_not_found`",
            },
        ),
    )
    app.add_exception_handler(
        PlayerNotFound,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_detail={
                "message": "Player not found.",
                "error_code": "player_not_found`",
            },
        ),
    )
    app.add_exception_handler(
        PlayerAlreadyExists,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_detail={
                "message": "Player already exists.",
                "error_code": "player_already_exists`",
            },
        ),
    )
    app.add_exception_handler(
        TournamentFull,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_detail={
                "message": "Maximum number of players has been achieved.",
                "error_code": "tournament_full`",
            },
        ),
    )
    app.add_exception_handler(
        InvalidCredentials,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Invalid credentials.",
                "error_code": "invalid_credentials",
            },
        ),
    )
    app.add_exception_handler(
        InvalidToken,
        create_exception_handler(
            status_code=status.HTTP_401_UNAUTHORIZED,
            initial_detail={
                "message": "Token is invalid or expired.",
                "resolution": "Please get new token.",
                "error_code": "invalid_token",
            },
        ),
    )
    app.add_exception_handler(
        InvalidLichessToken,
        create_exception_handler(
            status_code=status.HTTP_401_UNAUTHORIZED,
            initial_detail={
                "message": "Lichess toekn is missing or could not be decrypted. Please input a valid token.",
                "resolution": "Please provide a valid token from lichess.",
                "error_code": "invalid_lichess_token",
            },
        ),
    )
    app.add_exception_handler(
        RevokedToken,
        create_exception_handler(
            status_code=status.HTTP_401_UNAUTHORIZED,
            initial_detail={
                "message": "Token is invalid or has been revoked.",
                "resolution": "Please get new token.",
                "error_code": "token_revoked",
            },
        ),
    )
    app.add_exception_handler(
        AccessTokenRequired,
        create_exception_handler(
            status_code=status.HTTP_401_UNAUTHORIZED,
            initial_detail={
                "message": "Please provide a valid access token.",
                "resolution": "Please get an access token.",
                "error_code": "access_token_required",
            },
        ),
    )
    app.add_exception_handler(
        RefreshTokenRequired,
        create_exception_handler(
            status_code=status.HTTP_403_FORBIDDEN,
            initial_detail={
                "message": "Please provide a valid refresh token.",
                "resolution": "Please get an refresh token.",
                "error_code": "refresh_token_required",
            },
        ),
    )
    app.add_exception_handler(
        InsufficientPermission,
        create_exception_handler(
            status_code=status.HTTP_401_UNAUTHORIZED,
            initial_detail={
                "message": "You do not have enough permissions to perform this action.",
                "error_code": "insufficient_permissions",
            },
        ),
    )

    app.add_exception_handler(
        AccountNotVerified,
        create_exception_handler(
            status_code=status.HTTP_403_FORBIDDEN,
            initial_detail={
                "message": "Account not verified.",
                "resolution":"Please check your email for verification details.",
                "error_code": "account_not_verified"
            },
        ),
    )

    app.add_exception_handler(
        NewPasswordsException,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "New password do not match.",
                "resolution":"Please make sure the two passwords match.",
                "error_code": "password_not_matching"
            },
        ),
    )

    app.add_exception_handler(
        PasswordResetRequestTimeout,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Password request has timed out.",
                "resolution":"Please request a password request again.",
                "error_code": "password_request_timeout"
            },
        ),
    )

    app.add_exception_handler(
        TournamentAlreadyExists,
        create_exception_handler(
            status_code=status.HTTP_403_FORBIDDEN,
            initial_detail={
                "message": "Tournament with this name already exists.",
                "error_code": "tournament_name_not_unique",
            },
        ),
    )
    app.add_exception_handler(
        TournamentStarted,
        create_exception_handler(
            status_code=status.HTTP_403_FORBIDDEN,
            initial_detail={
                "message": "Tournament already started or finished.",
                "error_code": "tournament_already_started",
            },
        ),
    )
    app.add_exception_handler(
        TournamentNotFinished,
        create_exception_handler(
            status_code=status.HTTP_403_FORBIDDEN,
            initial_detail={
                "message": "Not all games have a result.",
                "error_code": "tournament_cannot_finish",
            },
        ),
    )

    @app.exception_handler(500)
    async def internal_server_error(request, exc):

        return JSONResponse(
            content={
                "message": "Oops! Something went wrong.",
                "error_code": "server_error",
            },
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


    @app.exception_handler(SQLAlchemyError)
    async def database__error(request, exc):
        print(str(exc))
        return JSONResponse(
            content={
                "message": "Oops! Something went wrong.",
                "error_code": "server_error",
            },
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )