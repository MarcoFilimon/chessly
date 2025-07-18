from fastapi import FastAPI
from .errors import register_all_errors
from .middleware import register_middleware
from . import config
from src import auth

app = FastAPI(**config.app_config)

register_all_errors(app)
register_middleware(app)

app.include_router(auth.AuthRouter)