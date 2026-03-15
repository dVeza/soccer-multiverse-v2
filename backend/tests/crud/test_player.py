import uuid

from sqlmodel import Session

from app import crud
from app.models import PlayerCreate, PlayerUpdate, Position, TeamCreate
from tests.utils.universe import create_random_player, create_random_universe


def test_create_player(db: Session) -> None:
    universe = create_random_universe(db)
    player_in = PlayerCreate(
        name="Test Player", height=180.0, weight=80.0, universe_id=universe.id
    )
    player = crud.create_player(session=db, player_in=player_in)
    assert player.name == "Test Player"
    assert player.height == 180.0
    assert player.weight == 80.0
    assert player.universe_id == universe.id
    assert player.id is not None


def test_get_player(db: Session) -> None:
    universe = create_random_universe(db)
    player = create_random_player(db, universe.id)
    retrieved = crud.get_player(session=db, id=player.id)
    assert retrieved is not None
    assert retrieved.id == player.id
    assert retrieved.name == player.name


def test_get_player_not_found(db: Session) -> None:
    retrieved = crud.get_player(session=db, id=uuid.uuid4())
    assert retrieved is None


def test_get_players(db: Session) -> None:
    universe = create_random_universe(db)
    p1 = create_random_player(db, universe.id)
    p2 = create_random_player(db, universe.id)
    players, count = crud.get_players(
        session=db, universe_id=universe.id
    )
    assert count == 2
    ids = [p.id for p in players]
    assert p1.id in ids
    assert p2.id in ids


def test_get_random_players_by_universe(db: Session) -> None:
    universe = create_random_universe(db)
    for _ in range(5):
        create_random_player(db, universe.id)
    random_players = crud.get_random_players_by_universe(
        session=db, universe_id=universe.id, count=3
    )
    assert len(random_players) == 3


def test_get_random_players_excludes_assigned(db: Session) -> None:
    universe = create_random_universe(db)
    players = [create_random_player(db, universe.id) for _ in range(5)]
    # Assign 2 players to a team
    team = crud.create_team(
        session=db,
        team_in=TeamCreate(name="Assigned Team", universe_id=universe.id),
    )
    crud.assign_player_to_team(
        session=db, player=players[0], team=team, position=Position.GOALIE
    )
    crud.assign_player_to_team(
        session=db, player=players[1], team=team, position=Position.DEFENCE
    )
    # Only 3 unassigned should be available
    random_players = crud.get_random_players_by_universe(
        session=db, universe_id=universe.id, count=5
    )
    assert len(random_players) == 3


def test_update_player(db: Session) -> None:
    universe = create_random_universe(db)
    player = create_random_player(db, universe.id)
    update_in = PlayerUpdate(name="Updated Player")
    updated = crud.update_player(session=db, db_player=player, player_in=update_in)
    assert updated.name == "Updated Player"
    assert updated.height == player.height  # unchanged


def test_delete_player(db: Session) -> None:
    universe = create_random_universe(db)
    player = create_random_player(db, universe.id)
    player_id = player.id
    crud.delete_player(session=db, db_player=player)
    assert crud.get_player(session=db, id=player_id) is None
