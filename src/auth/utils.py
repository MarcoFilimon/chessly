from passlib.context import CryptContext
import jwt
from src.utils.config import Config
from datetime import datetime, timedelta
import logging
import uuid
from itsdangerous import URLSafeTimedSerializer
import tzlocal
from cryptography.fernet import Fernet, InvalidToken


from src.utils.errors import *

pwd_cxt = CryptContext(schemes=["bcrypt"])

class Hash():
    def bcrypt(password: str):
        return pwd_cxt.hash(password)

    def verify(hashed_password, plain_password):
        return pwd_cxt.verify(plain_password, hashed_password)

def create_token(data: dict, expiry: timedelta = None, refresh: bool = False):
    to_encode = data.copy()
    local_tz = tzlocal.get_localzone()
    expire = datetime.now(local_tz) + expiry
    to_encode.update({"exp": expire})
    to_encode.update({"refresh": refresh})
    to_encode.update({"jti": str(uuid.uuid4())})
    encoded_jwt = jwt.encode(to_encode, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    try:
        token_data = jwt.decode(
            jwt=token, key=Config.JWT_SECRET, algorithms=[Config.JWT_ALGORITHM]
        )

        return token_data

    except jwt.PyJWTError as e:
        logging.exception(e)
        return None

serializer = URLSafeTimedSerializer(
    secret_key=Config.JWT_SECRET,
    salt="email-configuration"
)

def create_url_safe_token(data: dict):
    token = serializer.dumps(data)
    return token


def decode_url_safe_token(token: str):
    try:
        token_data = serializer.loads(token, max_age=300) # 300 secs / 5 min token expiry
        return token_data
    except Exception as e:
        # raise e
        logging.error(str(e))



fernet = Fernet(Config.LICHESS_KEY.encode())

def encrypt_lichess_token(lichess_token: str) -> str:
    if not lichess_token:
        raise ValueError("No Lichess token provided for encryption.")
    encrypted = fernet.encrypt(lichess_token.encode())
    return encrypted.decode()

def decrypt_lichess_token(encrypted_token: str) -> str:
    if not encrypted_token:
        raise ValueError("No encrypted token provided for decryption.")
    try:
        decrypted = fernet.decrypt(encrypted_token.encode())
        if not decrypted:
            raise InvalidLichessToken()
        return decrypted.decode()
    except InvalidToken:
        # Custom error or logging can go here
        raise InvalidLichessToken("Failed to decrypt Lichess token: Invalid or corrupted token.")
    except Exception as e:
        print("Fernet decryption error:", e)
        raise