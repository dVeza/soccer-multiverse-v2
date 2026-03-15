import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from app import crud
from app.api.deps import SessionDep
from app.models import (
    Message,
    PlayerCreate,
    PlayerPublic,
    PlayersPublic,
    PlayerUpdate,
)

router = APIRouter(prefix="/players", tags=["players"])


@router.get("/", response_model=PlayersPublic)
def read_players(
    session: SessionDep,
    universe_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Retrieve players for a universe."""
    universe = crud.get_universe(session=session, id=universe_id)
    if not universe:
        raise HTTPException(status_code=404, detail="Universe not found")
    players, count = crud.get_players_by_universe(
        session=session, universe_id=universe_id, skip=skip, limit=limit
    )
    return PlayersPublic(data=players, count=count)


@router.get("/{id}", response_model=PlayerPublic)
def read_player(session: SessionDep, id: uuid.UUID) -> Any:
    """Get player by ID."""
    player = crud.get_player(session=session, id=id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@router.post("/", response_model=PlayerPublic)
def create_player(*, session: SessionDep, player_in: PlayerCreate) -> Any:
    """Create new player."""
    universe = crud.get_universe(session=session, id=player_in.universe_id)
    if not universe:
        raise HTTPException(status_code=404, detail="Universe not found")
    player = crud.create_player(session=session, player_in=player_in)
    return player


@router.put("/{id}", response_model=PlayerPublic)
def update_player(
    *, session: SessionDep, id: uuid.UUID, player_in: PlayerUpdate
) -> Any:
    """Update a player."""
    player = crud.get_player(session=session, id=id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    player = crud.update_player(session=session, db_player=player, player_in=player_in)
    return player


@router.delete("/{id}")
def delete_player(session: SessionDep, id: uuid.UUID) -> Message:
    """Delete a player."""
    player = crud.get_player(session=session, id=id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    crud.delete_player(session=session, db_player=player)
    return Message(message="Player deleted successfully")
