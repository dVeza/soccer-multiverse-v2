import random
import uuid
from dataclasses import dataclass

from sqlmodel import Session

from app import crud
from app.models import (
    Match,
    MatchEvent,
    MatchEventType,
    MatchStatus,
    Player,
    Position,
    Team,
)


@dataclass
class SimulationConfig:
    possessions_per_half: int = 4
    seed: int | None = None


@dataclass
class SimulationEvent:
    minute: int
    event_type: MatchEventType
    description: str
    player_id: uuid.UUID | None = None
    home_score: int = 0
    away_score: int = 0


@dataclass
class TeamStats:
    """Derived performance attributes from player physical stats."""

    team: Team
    players: list[Player]
    goalie_rating: float = 0.0
    defence_rating: float = 0.0
    attack_rating: float = 0.0

    def __post_init__(self) -> None:
        goalies = [p for p in self.players if p.position == Position.GOALIE]
        defenders = [p for p in self.players if p.position == Position.DEFENCE]
        attackers = [p for p in self.players if p.position == Position.OFFENCE]

        if goalies:
            # Taller goalie = better saves (normalize 150-220cm to 0-1)
            self.goalie_rating = min((goalies[0].height - 150) / 70, 1.0)
        if defenders:
            # Heavier defenders = better tackling (normalize 50-120kg to 0-1)
            avg_weight = sum(p.weight for p in defenders) / len(defenders)
            self.defence_rating = min((avg_weight - 50) / 70, 1.0)
        if attackers:
            # Lighter/shorter attackers = faster (invert: lower height = better)
            avg_height = sum(p.height for p in attackers) / len(attackers)
            self.attack_rating = max(1.0 - (avg_height - 150) / 70, 0.0)


def simulate_match(
    *,
    home_team: Team,
    home_players: list[Player],
    away_team: Team,
    away_players: list[Player],
    config: SimulationConfig | None = None,
) -> list[SimulationEvent]:
    """
    Pure simulation function. Generates match events based on player stats.
    No database access — takes teams/players as input, returns events.
    """
    if config is None:
        config = SimulationConfig()

    seed = config.seed
    if seed is None:
        seed = hash((str(home_team.id), str(away_team.id))) % (2**32)
    rng = random.Random(seed)

    home_stats = TeamStats(team=home_team, players=home_players)
    away_stats = TeamStats(team=away_team, players=away_players)

    events: list[SimulationEvent] = []
    home_score = 0
    away_score = 0
    total_possessions = config.possessions_per_half * 2

    # Kickoff
    events.append(
        SimulationEvent(
            minute=0,
            event_type=MatchEventType.KICKOFF,
            description=f"Kick-off! {home_team.name} vs {away_team.name}",
            home_score=home_score,
            away_score=away_score,
        )
    )

    for poss in range(total_possessions):
        half = 1 if poss < config.possessions_per_half else 2
        poss_in_half = (
            poss if half == 1 else poss - config.possessions_per_half
        )
        minute = (
            (45 * poss_in_half) // config.possessions_per_half
            + (0 if half == 1 else 45)
        )
        minute = max(1, min(minute, 90))

        # Halftime
        if poss == config.possessions_per_half:
            events.append(
                SimulationEvent(
                    minute=45,
                    event_type=MatchEventType.HALFTIME,
                    description="Half-time!",
                    home_score=home_score,
                    away_score=away_score,
                )
            )

        # Alternate possession
        if poss % 2 == 0:
            att_stats, def_stats = home_stats, away_stats
            is_home_attacking = True
        else:
            att_stats, def_stats = away_stats, home_stats
            is_home_attacking = False

        attackers = [p for p in att_stats.players if p.position == Position.OFFENCE]
        defenders = [p for p in def_stats.players if p.position == Position.DEFENCE]
        goalie_list = [p for p in def_stats.players if p.position == Position.GOALIE]

        attacker = rng.choice(attackers) if attackers else att_stats.players[0]
        defender = rng.choice(defenders) if defenders else def_stats.players[0]
        goalie = goalie_list[0] if goalie_list else def_stats.players[0]

        # Attack event
        events.append(
            SimulationEvent(
                minute=minute,
                event_type=MatchEventType.ATTACK,
                description=f"{attacker.name} leads an attack for {att_stats.team.name}",
                player_id=attacker.id,
                home_score=home_score,
                away_score=away_score,
            )
        )

        # Tackle attempt
        tackle_chance = def_stats.defence_rating * 0.4
        if rng.random() < tackle_chance:
            events.append(
                SimulationEvent(
                    minute=minute,
                    event_type=MatchEventType.TACKLE,
                    description=f"{defender.name} makes a strong tackle on {attacker.name}",
                    player_id=defender.id,
                    home_score=home_score,
                    away_score=away_score,
                )
            )
            if rng.random() < 0.3:
                events.append(
                    SimulationEvent(
                        minute=minute,
                        event_type=MatchEventType.FOUL,
                        description=f"Foul by {defender.name} on {attacker.name}!",
                        player_id=defender.id,
                        home_score=home_score,
                        away_score=away_score,
                    )
                )
            continue

        # Shot
        events.append(
            SimulationEvent(
                minute=minute,
                event_type=MatchEventType.SHOT,
                description=f"{attacker.name} takes a shot!",
                player_id=attacker.id,
                home_score=home_score,
                away_score=away_score,
            )
        )

        # Goal or save
        goal_chance = att_stats.attack_rating * 0.5
        save_chance = def_stats.goalie_rating * 0.5
        if rng.random() < goal_chance - save_chance + 0.3:
            if is_home_attacking:
                home_score += 1
            else:
                away_score += 1
            events.append(
                SimulationEvent(
                    minute=minute,
                    event_type=MatchEventType.GOAL,
                    description=(
                        f"GOAL! {attacker.name} scores for {att_stats.team.name}! "
                        f"({home_score} - {away_score})"
                    ),
                    player_id=attacker.id,
                    home_score=home_score,
                    away_score=away_score,
                )
            )
        else:
            events.append(
                SimulationEvent(
                    minute=minute,
                    event_type=MatchEventType.SAVE,
                    description=f"Great save by {goalie.name}!",
                    player_id=goalie.id,
                    home_score=home_score,
                    away_score=away_score,
                )
            )

    # Full-time
    events.append(
        SimulationEvent(
            minute=90,
            event_type=MatchEventType.FULLTIME,
            description=f"Full-time! {home_team.name} {home_score} - {away_score} {away_team.name}",
            home_score=home_score,
            away_score=away_score,
        )
    )

    return events


def run_simulation(
    *,
    session: Session,
    home_team_id: uuid.UUID,
    away_team_id: uuid.UUID,
    config: SimulationConfig | None = None,
) -> tuple[Match, list[MatchEvent]]:
    """
    Full orchestration: validate teams, create match, simulate, persist events.
    Raises ValueError for business rule violations.
    """
    home_team = crud.get_team(session=session, id=home_team_id)
    if not home_team:
        raise ValueError("Home team not found")
    away_team = crud.get_team(session=session, id=away_team_id)
    if not away_team:
        raise ValueError("Away team not found")

    if home_team.universe_id != away_team.universe_id:
        raise ValueError("Both teams must be from the same universe")
    if home_team_id == away_team_id:
        raise ValueError("A team cannot play against itself")

    home_players = home_team.players
    away_players = away_team.players

    if len(home_players) != 5:
        raise ValueError(
            f"Home team must have exactly 5 players, has {len(home_players)}"
        )
    if len(away_players) != 5:
        raise ValueError(
            f"Away team must have exactly 5 players, has {len(away_players)}"
        )

    # Create match
    db_match = crud.create_match(
        session=session,
        universe_id=home_team.universe_id,
        home_team_id=home_team_id,
        away_team_id=away_team_id,
    )
    crud.update_match_status(
        session=session, db_match=db_match, status=MatchStatus.LIVE
    )

    # Run simulation
    sim_events = simulate_match(
        home_team=home_team,
        home_players=home_players,
        away_team=away_team,
        away_players=away_players,
        config=config,
    )

    # Persist events
    db_events = [
        MatchEvent(
            match_id=db_match.id,
            minute=e.minute,
            event_type=e.event_type,
            description=e.description,
            player_id=e.player_id,
            home_score=e.home_score,
            away_score=e.away_score,
        )
        for e in sim_events
    ]
    crud.create_match_events_bulk(session=session, events=db_events)

    # Update final score and status
    final = sim_events[-1]
    crud.update_match_score(
        session=session,
        db_match=db_match,
        home_score=final.home_score,
        away_score=final.away_score,
    )
    crud.update_match_status(
        session=session, db_match=db_match, status=MatchStatus.FINISHED
    )

    return db_match, db_events
