import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from app import crud
from app.api.deps import SessionDep
from app.models import (
    Message,
    UniverseCreate,
    UniversePublic,
    UniversesPublic,
    UniverseUpdate,
)

router = APIRouter(prefix="/universes", tags=["universes"])


@router.get("/", response_model=UniversesPublic)
def read_universes(
    session: SessionDep, skip: int = 0, limit: int = 100
) -> Any:
    """Retrieve universes."""
    universes, count = crud.get_universes(session=session, skip=skip, limit=limit)
    return UniversesPublic(data=universes, count=count)


@router.get("/{id}", response_model=UniversePublic)
def read_universe(session: SessionDep, id: uuid.UUID) -> Any:
    """Get universe by ID."""
    universe = crud.get_universe(session=session, id=id)
    if not universe:
        raise HTTPException(status_code=404, detail="Universe not found")
    return universe


@router.post("/", response_model=UniversePublic)
def create_universe(*, session: SessionDep, universe_in: UniverseCreate) -> Any:
    """Create new universe."""
    existing = crud.get_universe_by_name(session=session, name=universe_in.name)
    if existing:
        raise HTTPException(
            status_code=400, detail="A universe with this name already exists"
        )
    universe = crud.create_universe(session=session, universe_in=universe_in)
    return universe


@router.put("/{id}", response_model=UniversePublic)
def update_universe(
    *, session: SessionDep, id: uuid.UUID, universe_in: UniverseUpdate
) -> Any:
    """Update a universe."""
    universe = crud.get_universe(session=session, id=id)
    if not universe:
        raise HTTPException(status_code=404, detail="Universe not found")
    universe = crud.update_universe(
        session=session, db_universe=universe, universe_in=universe_in
    )
    return universe


@router.delete("/{id}")
def delete_universe(session: SessionDep, id: uuid.UUID) -> Message:
    """Delete a universe."""
    universe = crud.get_universe(session=session, id=id)
    if not universe:
        raise HTTPException(status_code=404, detail="Universe not found")
    crud.delete_universe(session=session, db_universe=universe)
    return Message(message="Universe deleted successfully")
