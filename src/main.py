from fastapi import FastAPI
from .utils.errors import register_all_errors
from .utils.middleware import register_middleware
from .utils import config
from src import auth, tournament, player, lichess
from fastapi.staticfiles import StaticFiles

app = FastAPI(**config.app_config)

app.mount("/fe", StaticFiles(directory="fe", html=True), name="fe")

register_all_errors(app)
register_middleware(app)

app.include_router(auth.AuthRouter)
app.include_router(tournament.TournamentRouter)
app.include_router(player.PlayerRouter)
app.include_router(lichess.LichessRouter)