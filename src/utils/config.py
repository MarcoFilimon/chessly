from pydantic_settings import BaseSettings, SettingsConfigDict

description = """
Chessly is a chess tournament bracket maker.
"""

tags_metadata = [
]

version = "v1"
version_prefix =f"/api/{version}"

app_config = {
    "title": "Chessly",
    "description": description,
    "version": version,
    "license_info": {"name": "MIT License", "url": "https://opensource.org/license/mit"},
    "contact": {
        "name": "Filimon Marco",
        "url": "https://github.com/MarcoFilimon",
        "email": "marcofilim@gmail.com",
    },
    "terms_of_service": "https://example.com/tos",
    "openapi_url": f"{version_prefix}/openapi.json",
    "docs_url": f"{version_prefix}/docs",
    "redoc_url": f"{version_prefix}/redoc",
    "openapi_tags": tags_metadata
}

#! url for local postgresql db with pgadmin4
# DATABASE_URL=postgresql+asyncpg://postgres:1234@localhost/postgres

# Takes the db url from .env file
class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str
    REFRESH_TOKEN_EXPIRY: int
    ACCESS_TOKEN_EXPIRY: int
    ADMIN_SECRET: str
    REDIS_URL: str
    LICHESS_KEY: str

    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    MAIL_PORT: int
    MAIL_SERVER: str
    MAIL_FROM_NAME: str
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    USE_CREDENTIALS: bool = True
    VALIDATE_CERTS: bool = True
    DOMAIN: str

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")



# Create an instance of the class to be used where needed.
Config = Settings()

# Settings for background tasks with celery & redis
broker_url = Config.REDIS_URL
result_backend = Config.REDIS_URL