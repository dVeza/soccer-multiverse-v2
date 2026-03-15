from fastapi import APIRouter

from app.api.routes import login, players, private, teams, universes, users, utils
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(universes.router)
api_router.include_router(players.router)
api_router.include_router(teams.router)


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
