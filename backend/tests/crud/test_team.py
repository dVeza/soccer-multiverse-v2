import uuid

from sqlmodel import Session

from app import crud
from app.models import Position, TeamCreate, TeamUpdate
from tests.utils.universe import create_random_player, create_random_universe


def test_create_team(db: Session) -> None:
    universe = create_random_universe(db)
    team_in = TeamCreate(name="Test Team", universe_id=universe.id)
    team = crud.create_team(session=db, team_in=team_in)
    assert team.name == "Test Team"
    assert team.universe_id == universe.id
    assert team.id is not None


def test_get_team(db: Session) -> None:
    universe = create_random_universe(db)
    team = crud.create_team(
        session=db,
        team_in=TeamCreate(name="Get Team", universe_id=universe.id),
    )
    retrieved = crud.get_team(session=db, id=team.id)
    assert retrieved is not None
    assert retrieved.id == team.id
    assert retrieved.name == team.name


def test_get_team_not_found(db: Session) -> None:
    retrieved = crud.get_team(session=db, id=uuid.uuid4())
    assert retrieved is None


def test_get_teams(db: Session) -> None:
    universe = create_random_universe(db)
    t1 = crud.create_team(
        session=db,
        team_in=TeamCreate(name="Team A", universe_id=universe.id),
    )
    t2 = crud.create_team(
        session=db,
        team_in=TeamCreate(name="Team B", universe_id=universe.id),
    )
    teams, count = crud.get_teams(session=db, universe_id=universe.id)
    assert count == 2
    ids = [t.id for t in teams]
    assert t1.id in ids
    assert t2.id in ids


def test_update_team(db: Session) -> None:
    universe = create_random_universe(db)
    team = crud.create_team(
        session=db,
        team_in=TeamCreate(name="Old Name", universe_id=universe.id),
    )
    update_in = TeamUpdate(name="New Name")
    updated = crud.update_team(session=db, db_team=team, team_in=update_in)
    assert updated.name == "New Name"


def test_delete_team(db: Session) -> None:
    universe = create_random_universe(db)
    team = crud.create_team(
        session=db,
        team_in=TeamCreate(name="Delete Me", universe_id=universe.id),
    )
    team_id = team.id
    crud.delete_team(session=db, db_team=team)
    assert crud.get_team(session=db, id=team_id) is None


def test_assign_player_to_team(db: Session) -> None:
    universe = create_random_universe(db)
    player = create_random_player(db, universe.id)
    team = crud.create_team(
        session=db,
        team_in=TeamCreate(name="Assignment Team", universe_id=universe.id),
    )
    updated_player = crud.assign_player_to_team(
        session=db, player=player, team=team, position=Position.GOALIE
    )
    assert updated_player.team_id == team.id
    assert updated_player.position == Position.GOALIE
