import uuid

from sqlmodel import Session

from app import crud
from app.models import Position, TeamConfigurationRequest, TeamCreate


def generate_team(
    *,
    session: Session,
    universe_id: uuid.UUID,
    config: TeamConfigurationRequest,
) -> crud.Team:
    total_players = 1 + config.defenders + config.attackers  # 1 goalie + field players

    available_players = crud.get_random_players_by_universe(
        session=session, universe_id=universe_id, count=total_players
    )

    if len(available_players) < total_players:
        raise ValueError(
            f"Not enough unassigned players in universe. "
            f"Need {total_players}, found {len(available_players)}."
        )

    team_name = f"Team {uuid.uuid4().hex[:6]}"
    db_team = crud.create_team(
        session=session,
        team_in=TeamCreate(name=team_name, universe_id=universe_id),
    )

    # Goalie: tallest player
    goalie = max(available_players, key=lambda p: p.height)
    crud.assign_player_to_team(
        session=session, player=goalie, team=db_team, position=Position.GOALIE
    )
    available_players.remove(goalie)

    # Defenders: heaviest remaining players
    by_weight = sorted(available_players, key=lambda p: p.weight, reverse=True)
    for defender in by_weight[: config.defenders]:
        crud.assign_player_to_team(
            session=session, player=defender, team=db_team, position=Position.DEFENCE
        )
        available_players.remove(defender)

    # Attackers: shortest remaining players
    by_height = sorted(available_players, key=lambda p: p.height)
    for attacker in by_height[: config.attackers]:
        crud.assign_player_to_team(
            session=session, player=attacker, team=db_team, position=Position.OFFENCE
        )
        available_players.remove(attacker)

    session.refresh(db_team)
    return db_team
