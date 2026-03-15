from enum import Enum
from typing import Optional

import uuid
from datetime import datetime, timezone

from pydantic import EmailStr, field_validator
from sqlalchemy import Column, DateTime
from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


class ModelBase(SQLModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"onupdate": get_datetime_utc}
    )


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(ModelBase, UserBase, table=True):
    hashed_password: str


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# ==================== Position Enum ====================


class Position(str, Enum):
    GOALIE = "GOALIE"
    DEFENCE = "DEFENCE"
    OFFENCE = "OFFENCE"


# ==================== Universe Models ====================


class UniverseBase(SQLModel):
    name: str = Field(max_length=255)
    description: str | None = Field(default=None, max_length=500)


class UniverseCreate(UniverseBase):
    pass


class UniverseUpdate(SQLModel):
    name: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=500)


class Universe(ModelBase, UniverseBase, table=True):
    players: list["Player"] = Relationship(
        back_populates="universe", cascade_delete=True
    )
    teams: list["Team"] = Relationship(
        back_populates="universe", cascade_delete=True
    )


class UniversePublic(UniverseBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UniversesPublic(SQLModel):
    data: list[UniversePublic]
    count: int


# ==================== Player Models ====================


class PlayerBase(SQLModel):
    name: str = Field(max_length=255)
    height: float
    weight: float


class PlayerCreate(PlayerBase):
    universe_id: uuid.UUID


class PlayerUpdate(SQLModel):
    name: str | None = Field(default=None, max_length=255)
    height: float | None = None
    weight: float | None = None


class Player(ModelBase, PlayerBase, table=True):
    universe_id: uuid.UUID = Field(foreign_key="universe.id")
    team_id: uuid.UUID | None = Field(default=None, foreign_key="team.id")
    position: Position | None = Field(
        default=None,
        sa_column=Column(
            SAEnum(Position, name="playerposition"), nullable=True
        ),
    )
    universe: Universe = Relationship(back_populates="players")
    team: Optional["Team"] = Relationship(back_populates="players")


class PlayerPublic(PlayerBase):
    id: uuid.UUID
    universe_id: uuid.UUID
    team_id: uuid.UUID | None = None
    position: Position | None = None
    created_at: datetime | None = None


class PlayersPublic(SQLModel):
    data: list[PlayerPublic]
    count: int


# ==================== Team Models ====================


class TeamBase(SQLModel):
    name: str = Field(max_length=255)


class TeamCreate(TeamBase):
    universe_id: uuid.UUID


class TeamUpdate(SQLModel):
    name: str | None = Field(default=None, max_length=255)


class Team(ModelBase, TeamBase, table=True):
    universe_id: uuid.UUID = Field(foreign_key="universe.id")
    universe: Universe = Relationship(back_populates="teams")
    players: list[Player] = Relationship(back_populates="team")


class TeamPublic(TeamBase):
    id: uuid.UUID
    universe_id: uuid.UUID
    created_at: datetime | None = None


class TeamPublicWithPlayers(TeamPublic):
    players: list[PlayerPublic] = []


class TeamsPublic(SQLModel):
    data: list[TeamPublic]
    count: int


# ==================== Team Configuration Request ====================


class TeamConfigurationRequest(SQLModel):
    defenders: int = 2
    attackers: int = 2

    @field_validator("defenders")
    @classmethod
    def validate_defenders(cls, v: int) -> int:
        if v < 0 or v > 4:
            raise ValueError("Defenders must be between 0 and 4")
        return v

    @field_validator("attackers")
    @classmethod
    def validate_attackers(cls, v: int, info: object) -> int:
        if v < 0 or v > 4:
            raise ValueError("Attackers must be between 0 and 4")
        defenders = info.data.get("defenders", 2)  # type: ignore[union-attr]
        if defenders + v != 4:
            raise ValueError(
                "Team must have exactly 4 field players (defenders + attackers)"
            )
        return v


###### Generic models ######

# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)
