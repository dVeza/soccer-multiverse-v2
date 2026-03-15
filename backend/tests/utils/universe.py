import uuid

from sqlmodel import Session

from app import crud
from app.models import Player, PlayerCreate, Universe, UniverseCreate


def create_random_universe(db: Session) -> Universe:
    name = f"Universe {uuid.uuid4().hex[:8]}"
    universe_in = UniverseCreate(name=name, description="Test universe")
    return crud.create_universe(session=db, universe_in=universe_in)


def create_random_player(db: Session, universe_id: uuid.UUID) -> Player:
    name = f"Player {uuid.uuid4().hex[:8]}"
    player_in = PlayerCreate(
        name=name,
        height=round(170 + 30 * (uuid.uuid4().int % 100) / 100, 1),
        weight=round(60 + 40 * (uuid.uuid4().int % 100) / 100, 1),
        universe_id=universe_id,
    )
    return crud.create_player(session=db, player_in=player_in)
