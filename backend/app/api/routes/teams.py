import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from app import crud
from app.api.deps import SessionDep
from app.models import (
    Message,
    TeamConfigurationRequest,
    TeamPublicWithPlayers,
    TeamsPublic,
)
from app.services.team_generator import generate_team

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("/", response_model=TeamsPublic)
def read_teams(
    session: SessionDep,
    universe_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Retrieve teams for a universe."""
    universe = crud.get_universe(session=session, id=universe_id)
    if not universe:
        raise HTTPException(status_code=404, detail="Universe not found")
    teams, count = crud.get_teams_by_universe(
        session=session, universe_id=universe_id, skip=skip, limit=limit
    )
    return TeamsPublic(data=teams, count=count)


@router.get("/{id}", response_model=TeamPublicWithPlayers)
def read_team(session: SessionDep, id: uuid.UUID) -> Any:
    """Get team by ID with players."""
    team = crud.get_team(session=session, id=id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.post("/generate", response_model=TeamPublicWithPlayers)
def generate_team_endpoint(
    *,
    session: SessionDep,
    universe_id: uuid.UUID,
    config: TeamConfigurationRequest | None = None,
) -> Any:
    """Generate a team by assigning random players from a universe to positions."""
    if config is None:
        config = TeamConfigurationRequest()

    universe = crud.get_universe(session=session, id=universe_id)
    if not universe:
        raise HTTPException(status_code=404, detail="Universe not found")

    try:
        team = generate_team(
            session=session, universe_id=universe_id, config=config
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return team


@router.delete("/{id}")
def delete_team(session: SessionDep, id: uuid.UUID) -> Message:
    """Delete a team."""
    team = crud.get_team(session=session, id=id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    crud.delete_team(session=session, db_team=team)
    return Message(message="Team deleted successfully")
