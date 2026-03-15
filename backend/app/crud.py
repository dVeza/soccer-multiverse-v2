import uuid
from typing import Any

from sqlalchemy.sql.expression import func
from sqlmodel import Session, col, select

from app.core.security import get_password_hash, verify_password
from app.models import (
    Player,
    PlayerCreate,
    PlayerUpdate,
    Position,
    Team,
    TeamCreate,
    TeamUpdate,
    Universe,
    UniverseCreate,
    UniverseUpdate,
    User,
    UserCreate,
    UserUpdate,
)


def create_user(*, session: Session, user_create: UserCreate) -> User:
    db_obj = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def get_user_by_email(*, session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    session_user = session.exec(statement).first()
    return session_user


# Dummy hash to use for timing attack prevention when user is not found
# This is an Argon2 hash of a random password, used to ensure constant-time comparison
DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$MjQyZWE1MzBjYjJlZTI0Yw$YTU4NGM5ZTZmYjE2NzZlZjY0ZWY3ZGRkY2U2OWFjNjk"


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
    if not db_user:
        # Prevent timing attacks by running password verification even when user doesn't exist
        # This ensures the response time is similar whether or not the email exists
        verify_password(password, DUMMY_HASH)
        return None
    verified, updated_password_hash = verify_password(password, db_user.hashed_password)
    if not verified:
        return None
    if updated_password_hash:
        db_user.hashed_password = updated_password_hash
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
    return db_user


# ==================== Universe CRUD ====================


def create_universe(
    *, session: Session, universe_in: UniverseCreate
) -> Universe:
    db_universe = Universe.model_validate(universe_in)
    session.add(db_universe)
    session.commit()
    session.refresh(db_universe)
    return db_universe


def get_universe(*, session: Session, id: uuid.UUID) -> Universe | None:
    return session.get(Universe, id)


def get_universe_by_name(*, session: Session, name: str) -> Universe | None:
    statement = select(Universe).where(Universe.name == name)
    return session.exec(statement).first()


def get_universes(
    *, session: Session, skip: int = 0, limit: int = 100
) -> tuple[list[Universe], int]:
    count_statement = select(func.count()).select_from(Universe)
    count = session.exec(count_statement).one()
    statement = (
        select(Universe)
        .order_by(col(Universe.created_at).desc())
        .offset(skip)
        .limit(limit)
    )
    universes = list(session.exec(statement).all())
    return universes, count


def update_universe(
    *, session: Session, db_universe: Universe, universe_in: UniverseUpdate
) -> Universe:
    update_data = universe_in.model_dump(exclude_unset=True)
    db_universe.sqlmodel_update(update_data)
    session.add(db_universe)
    session.commit()
    session.refresh(db_universe)
    return db_universe


def delete_universe(*, session: Session, db_universe: Universe) -> None:
    session.delete(db_universe)
    session.commit()


# ==================== Player CRUD ====================


def create_player(*, session: Session, player_in: PlayerCreate) -> Player:
    db_player = Player.model_validate(player_in)
    session.add(db_player)
    session.commit()
    session.refresh(db_player)
    return db_player


def get_player(*, session: Session, id: uuid.UUID) -> Player | None:
    return session.get(Player, id)


def get_players_by_universe(
    *,
    session: Session,
    universe_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> tuple[list[Player], int]:
    count_statement = (
        select(func.count())
        .select_from(Player)
        .where(Player.universe_id == universe_id)
    )
    count = session.exec(count_statement).one()
    statement = (
        select(Player)
        .where(Player.universe_id == universe_id)
        .order_by(col(Player.created_at).desc())
        .offset(skip)
        .limit(limit)
    )
    players = list(session.exec(statement).all())
    return players, count


def get_random_players_by_universe(
    *, session: Session, universe_id: uuid.UUID, count: int
) -> list[Player]:
    statement = (
        select(Player)
        .where(Player.universe_id == universe_id)
        .where(Player.team_id.is_(None))  # type: ignore[union-attr]
        .order_by(func.random())
        .limit(count)
    )
    return list(session.exec(statement).all())


def update_player(
    *, session: Session, db_player: Player, player_in: PlayerUpdate
) -> Player:
    update_data = player_in.model_dump(exclude_unset=True)
    db_player.sqlmodel_update(update_data)
    session.add(db_player)
    session.commit()
    session.refresh(db_player)
    return db_player


def delete_player(*, session: Session, db_player: Player) -> None:
    session.delete(db_player)
    session.commit()


# ==================== Team CRUD ====================


def create_team(*, session: Session, team_in: TeamCreate) -> Team:
    db_team = Team.model_validate(team_in)
    session.add(db_team)
    session.commit()
    session.refresh(db_team)
    return db_team


def get_team(*, session: Session, id: uuid.UUID) -> Team | None:
    return session.get(Team, id)


def get_teams_by_universe(
    *,
    session: Session,
    universe_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> tuple[list[Team], int]:
    count_statement = (
        select(func.count())
        .select_from(Team)
        .where(Team.universe_id == universe_id)
    )
    count = session.exec(count_statement).one()
    statement = (
        select(Team)
        .where(Team.universe_id == universe_id)
        .order_by(col(Team.created_at).desc())
        .offset(skip)
        .limit(limit)
    )
    teams = list(session.exec(statement).all())
    return teams, count


def update_team(
    *, session: Session, db_team: Team, team_in: TeamUpdate
) -> Team:
    update_data = team_in.model_dump(exclude_unset=True)
    db_team.sqlmodel_update(update_data)
    session.add(db_team)
    session.commit()
    session.refresh(db_team)
    return db_team


def delete_team(*, session: Session, db_team: Team) -> None:
    session.delete(db_team)
    session.commit()


def assign_player_to_team(
    *,
    session: Session,
    player: Player,
    team: Team,
    position: Position,
) -> Player:
    player.team_id = team.id
    player.position = position
    session.add(player)
    session.commit()
    session.refresh(player)
    return player
