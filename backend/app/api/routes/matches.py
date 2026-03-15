import asyncio
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app import crud
from app.api.deps import SessionDep
from app.models import (
    MatchCreate,
    MatchesPublic,
    MatchEventSSE,
    MatchPublic,
    MatchPublicWithDetails,
)
from app.services.match_simulator import run_simulation

router = APIRouter(prefix="/matches", tags=["matches"])


@router.post("/simulate", response_model=MatchPublic)
def simulate_match_endpoint(
    *, session: SessionDep, match_in: MatchCreate
) -> Any:
    """
    Simulate a match between two teams. Creates the match, runs the
    simulation engine, persists all events, and returns the completed match.
    """
    try:
        db_match, _ = run_simulation(
            session=session,
            home_team_id=match_in.home_team_id,
            away_team_id=match_in.away_team_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    session.refresh(db_match)
    return db_match


@router.get("/", response_model=MatchesPublic)
def read_matches(
    session: SessionDep,
    universe_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Retrieve matches, optionally filtered by universe."""
    if universe_id is not None:
        universe = crud.get_universe(session=session, id=universe_id)
        if not universe:
            raise HTTPException(status_code=404, detail="Universe not found")
    matches, count = crud.get_matches(
        session=session, universe_id=universe_id, skip=skip, limit=limit
    )
    return MatchesPublic(data=matches, count=count)


@router.get("/{id}", response_model=MatchPublicWithDetails)
def read_match(session: SessionDep, id: uuid.UUID) -> Any:
    """Get match by ID with team details and all events."""
    db_match = crud.get_match(session=session, id=id)
    if not db_match:
        raise HTTPException(status_code=404, detail="Match not found")
    return db_match


@router.get("/{id}/stream")
async def stream_match_events(
    session: SessionDep, id: uuid.UUID
) -> StreamingResponse:
    """
    Stream match events via SSE for a live ticker experience.
    Events are streamed with artificial delays to simulate real-time playback.
    """
    db_match = crud.get_match(session=session, id=id)
    if not db_match:
        raise HTTPException(status_code=404, detail="Match not found")

    events = crud.get_match_events(session=session, match_id=id)
    if not events:
        raise HTTPException(
            status_code=404, detail="No events found for this match"
        )

    async def event_generator():
        for event in events:
            sse_data = MatchEventSSE(
                event_type=event.event_type,
                minute=event.minute,
                description=event.description,
                home_score=event.home_score,
                away_score=event.away_score,
                player_id=event.player_id,
            )
            yield f"data: {sse_data.model_dump_json()}\n\n"
            await asyncio.sleep(1.2)
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
