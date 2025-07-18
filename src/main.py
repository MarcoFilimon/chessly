from fastapi import FastAPI
from .utils.errors import register_all_errors
from .utils.middleware import register_middleware
from .utils import config
from src import auth, tournament

app = FastAPI(**config.app_config)

register_all_errors(app)
register_middleware(app)

app.include_router(auth.AuthRouter)
app.include_router(tournament.TournamentRouter)