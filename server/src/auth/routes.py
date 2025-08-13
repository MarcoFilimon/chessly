from fastapi import status, APIRouter, Depends
from fastapi.responses import JSONResponse
from .schemas import *
from src.utils.config import version, Config
from .service import UserService
from sqlmodel.ext.asyncio.session import AsyncSession
from src.db import db
from datetime import datetime
from .utils import create_token, decode_url_safe_token, Hash
from src.db import redis
from src.utils.errors import UserNotFound, NewPasswordsException, PasswordResetRequestTimeout
from datetime import datetime, timedelta
from src.utils.celery_tasks import send_email, long_task

from .dependencies import (
    AccessTokenBearer,
    RefreshTokenBearer,
    RoleChecker,
    get_current_user,
)

from src.utils.errors import InvalidToken

router = APIRouter(
    prefix=f"/api/{version}/auth",
    tags=["auth"]
)

service = UserService()
full_access = RoleChecker(['admin', 'user'])
admin_access = RoleChecker(['admin'])


@router.post('/register', status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate,
    session: AsyncSession = Depends(db.get_session)
) -> dict:
    '''
    Register new user. Send verification email handled by /verify/{token} endpoint.
    '''
    user = await service.register_user(payload, session)
    return {
        "message": "Account Created! Check your email to verify the account",
        "user": user,
    }


@router.post('/resend_verification', status_code=status.HTTP_200_OK)
async def resend_verification_mail(
    user: User = Depends(get_current_user)
) -> None:
    '''
    Resend verification email.
    '''
    if not user.is_verified:
        _ = await service.send_verification_email(user)
        return {
            "message": "The verification email has been sent."
        }
    return {
        "message": "The account is already verified."
    }

@router.post('/login', status_code=status.HTTP_200_OK)
async def login(
    payload: UserLogIn,
    session: AsyncSession = Depends(db.get_session)
) -> dict:
    '''
    Log in user. Returns access/refresh token.
    '''
    result = await service.log_in(payload, session)
    return result


@router.post('/refresh_token', status_code=status.HTTP_200_OK)
async def refresh_access_token(token_details: dict = Depends(RefreshTokenBearer())):
    '''
    Generate a new access token based on the refresh token.
    Refresh token expires in 2 days compared with 1h for access.
    '''
    expiry_timestamp = token_details["exp"]
    # If refresh token NOT expired (its datetime is higher than the current datetime) -> generate new access token
    if datetime.fromtimestamp(expiry_timestamp) > datetime.now():
        new_access_token = create_token({"username": token_details['username'], "role": token_details['role'], "user_id": token_details['user_id']}, expiry=timedelta(hours=Config.ACCESS_TOKEN_EXPIRY))
        return JSONResponse(
            content={
                "access_token": new_access_token
            },
            status_code=status.HTTP_200_OK
        )
    raise InvalidToken()


@router.get('/me', response_model=User, status_code=status.HTTP_200_OK)
async def get_current_user(
    user: User = Depends(get_current_user)
):
    '''
    Returns current logged in user.
    '''
    return user


@router.post('/logout', status_code=status.HTTP_200_OK)
async def logout(token_details: dict = Depends(AccessTokenBearer())):
    '''
    Logout user.
    '''
    jti = token_details["jti"]
    await redis.add_jti_to_blocklist(jti)
    return {"message": "Logged Out successfully."}


@router.delete('/{user_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    session: AsyncSession = Depends(db.get_session),
    _ : bool = Depends(admin_access)
):
    '''
    Delete user. (admin only)
    '''
    return await service.delete_user(user_id, session)


#? Why accept user_id here? Well, if you only want users to update themselves, you don't need it.
#? But you want also admins to update any users, you need the ID to know WHAT user to update.
@router.patch('/{user_id}', response_model=User, status_code=status.HTTP_200_OK)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    session: AsyncSession = Depends(db.get_session),
    _ : bool = Depends(full_access),
    current_user = Depends(get_current_user)
):
    '''
    Update user (only admin or current user can do it.)
    '''
    user = await service.update_user(user_id, payload, session, current_user)
    return user


@router.get('/verify/{token}', status_code=status.HTTP_200_OK)
async def verify_user_account(
    token: str,
    session: AsyncSession = Depends(db.get_session),
):
    '''
    After user registered, he will get a verification email.
    The email contains a link to this endpoint.
    '''
    token_data = decode_url_safe_token(token)
    user_email = token_data.get('email')
    if user_email:
        user = await service.get_user_by_email(user_email, session)
        _ = await service.update_user(user.id, {"is_verified": True}, session, None)
        return {"message: Account verified succesfully."}
    raise UserNotFound()


@router.post('/request_password_reset', status_code=status.HTTP_200_OK)
async def request_password_reset(
    payload: PasswordResetRequest
):
    '''
    Request password reset endpoint by sending an email.
    '''
    _ = await service.send_password_reset_request(payload)
    return {"message": "Reset password request has been sent! Check your email."}


@router.post('/reset_password/{token}', status_code=status.HTTP_200_OK)
async def reset_password(
    token: str,
    passwords: PasswordReset,
    session: AsyncSession = Depends(db.get_session),
):
    '''
    The email from /request_password_reset contains a link to this endpoint.
    User inputs new password.
    '''
    if passwords.new_password != passwords.confirmed_new_password:
        raise NewPasswordsException()

    token_data = decode_url_safe_token(token)
    if token_data is None:
        raise PasswordResetRequestTimeout()
    user_email = token_data.get('email')
    if user_email:
        user = await service.get_user_by_email(user_email, session)
        _ = await service.update_user(user.id, {"password": Hash.bcrypt(passwords.new_password)}, session, None)
        return {"message": "Password reset successfully."}

    return JSONResponse(
        content={"message": "Error occured during password reset."},
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )

@router.post('/send_mail')
async def send_mail(
    emails: Emails,
    _ : bool = Depends(full_access)
):
    '''
    Simple endpoint to send an email. Just a generic endpoint, nothing more
    '''
    email_addresses = emails.adresses
    html = "<h1>Welcome to the app.</h1>"
    subject = "Welcome"
    # send_email.delay(email_addresses, subject, html)
    await send_email(email_addresses, subject, html)
    return {"message": "Email has been sent succesfully."}


@router.get("/keep-alive")
async def keep_database_active(session: AsyncSession = Depends(db.get_session)):
    """
    This endpoint performs a simple query to keep the Neon database active.
    It returns a 200 status code if the connection is successful.
    """
    from sqlmodel import select
    from fastapi import HTTPException
    try:
        # A simple query that doesn't modify data, just to prove a connection is live.
        await session.exec(select(1))
        return {"status": "Database is active"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to database: {e}")


@router.post("/start-long-task")
async def start_long_task(payload: WebhookPayload):
    '''
    Just a test endpoint. I call this from Insomnia.
    In a real case scenario, a real endpoint would call long_task directly
    '''
    long_task.delay(payload.webhook_url)
    return {"message": "Task started"}


@router.post("/webhook-callback")
async def webhook_callback(payload: dict):
    '''
    Callback endpoint used by Celery when the task has been finished.
    '''
    print("Webhook processed.")
    return JSONResponse(
        content={
            "message": "Webhook processed"
        },
        status_code=status.HTTP_200_OK
    )