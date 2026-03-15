from sqlmodel import Session

from app import crud
from app.models import UniverseCreate, UniverseUpdate
from tests.utils.universe import create_random_universe


def test_create_universe(db: Session) -> None:
    universe_in = UniverseCreate(name="Test Create", description="A test universe")
    universe = crud.create_universe(session=db, universe_in=universe_in)
    assert universe.name == "Test Create"
    assert universe.description == "A test universe"
    assert universe.id is not None
    assert universe.created_at is not None


def test_get_universe(db: Session) -> None:
    universe = create_random_universe(db)
    retrieved = crud.get_universe(session=db, id=universe.id)
    assert retrieved is not None
    assert retrieved.id == universe.id
    assert retrieved.name == universe.name


def test_get_universe_not_found(db: Session) -> None:
    import uuid

    retrieved = crud.get_universe(session=db, id=uuid.uuid4())
    assert retrieved is None


def test_get_universe_by_name(db: Session) -> None:
    universe = create_random_universe(db)
    retrieved = crud.get_universe_by_name(session=db, name=universe.name)
    assert retrieved is not None
    assert retrieved.id == universe.id


def test_get_universes(db: Session) -> None:
    u1 = create_random_universe(db)
    u2 = create_random_universe(db)
    universes, count = crud.get_universes(session=db)
    assert count >= 2
    ids = [u.id for u in universes]
    assert u1.id in ids
    assert u2.id in ids


def test_update_universe(db: Session) -> None:
    universe = create_random_universe(db)
    update_in = UniverseUpdate(name="Updated Name")
    updated = crud.update_universe(
        session=db, db_universe=universe, universe_in=update_in
    )
    assert updated.name == "Updated Name"
    assert updated.description == universe.description  # unchanged


def test_delete_universe(db: Session) -> None:
    universe = create_random_universe(db)
    universe_id = universe.id
    crud.delete_universe(session=db, db_universe=universe)
    assert crud.get_universe(session=db, id=universe_id) is None
