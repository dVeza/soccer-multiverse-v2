import uuid

import pytest
from sqlmodel import Session

from app import crud
from app.models import (
    PlayerCreate,
    Position,
    TeamConfigurationRequest,
    UniverseCreate,
)
from app.services.team_generator import generate_team


@pytest.fixture
def universe_with_players(db: Session):
    """Create a universe with 5 test players of varying physical attributes."""
    universe = crud.create_universe(
        session=db,
        universe_in=UniverseCreate(
            name=f"Test Universe {uuid.uuid4().hex[:8]}",
            description="For testing",
        ),
    )
    test_players_data = [
        ("Player 1", 180.0, 80.0),
        ("Player 2", 185.0, 85.0),
        ("Player 3", 170.0, 75.0),
        ("Player 4", 175.0, 82.0),
        ("Player 5", 182.0, 88.0),
    ]
    players = []
    for name, height, weight in test_players_data:
        player = crud.create_player(
            session=db,
            player_in=PlayerCreate(
                name=name, height=height, weight=weight, universe_id=universe.id
            ),
        )
        players.append(player)
    return universe, players


def test_generate_team(db: Session, universe_with_players):
    universe, _ = universe_with_players
    config = TeamConfigurationRequest(defenders=2, attackers=2)

    team = generate_team(session=db, universe_id=universe.id, config=config)

    db.refresh(team)
    assert len(team.players) == 5

    positions = [p.position for p in team.players]
    assert positions.count(Position.GOALIE) == 1
    assert positions.count(Position.DEFENCE) == 2
    assert positions.count(Position.OFFENCE) == 2


def test_generate_team_raises_when_not_enough_players(db: Session):
    """A universe with fewer unassigned players than needed should raise ValueError."""
    universe = crud.create_universe(
        session=db,
        universe_in=UniverseCreate(
            name=f"Small Universe {uuid.uuid4().hex[:8]}",
            description="Too few players",
        ),
    )
    # Only create 2 players — need 5
    for i in range(2):
        crud.create_player(
            session=db,
            player_in=PlayerCreate(
                name=f"Lonely Player {i}",
                height=180.0,
                weight=80.0,
                universe_id=universe.id,
            ),
        )

    config = TeamConfigurationRequest(defenders=2, attackers=2)
    with pytest.raises(ValueError, match="Not enough unassigned players"):
        generate_team(session=db, universe_id=universe.id, config=config)


def test_goalie_is_the_tallest_player(db: Session, universe_with_players):
    universe, _ = universe_with_players
    config = TeamConfigurationRequest(defenders=2, attackers=2)

    team = generate_team(session=db, universe_id=universe.id, config=config)

    db.refresh(team)
    goalie = next(p for p in team.players if p.position == Position.GOALIE)
    assert goalie.height == max(p.height for p in team.players)


def test_defenders_are_heavier_than_attackers(db: Session, universe_with_players):
    universe, _ = universe_with_players
    config = TeamConfigurationRequest(defenders=2, attackers=2)

    team = generate_team(session=db, universe_id=universe.id, config=config)

    db.refresh(team)
    defenders = [p for p in team.players if p.position == Position.DEFENCE]
    attackers = [p for p in team.players if p.position == Position.OFFENCE]
    assert max(p.weight for p in defenders) > max(p.weight for p in attackers)


def test_offensive_team_has_more_attackers_than_defenders(
    db: Session, universe_with_players
):
    universe, _ = universe_with_players
    config = TeamConfigurationRequest(defenders=1, attackers=3)

    team = generate_team(session=db, universe_id=universe.id, config=config)

    db.refresh(team)
    defenders = [p for p in team.players if p.position == Position.DEFENCE]
    attackers = [p for p in team.players if p.position == Position.OFFENCE]
    assert len(attackers) > len(defenders)


def test_team_configuration_validation():
    """defenders + attackers must equal 4."""
    with pytest.raises(ValueError, match="exactly 4 field players"):
        TeamConfigurationRequest(defenders=1, attackers=1)

    with pytest.raises(ValueError, match="exactly 4 field players"):
        TeamConfigurationRequest(defenders=3, attackers=3)
