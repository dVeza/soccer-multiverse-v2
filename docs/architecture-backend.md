# Backend Architecture

## Overview

FastAPI application with a layered architecture: API routes delegate to services for business logic and CRUD functions for database operations. All models are defined in a single `models.py` file using SQLModel.

```mermaid
graph TB
    subgraph "FastAPI Application"
        main[main.py<br/>App + CORS + Sentry]
        router[api/main.py<br/>API Router]

        subgraph "API Routes"
            login[login.py<br/>OAuth2 token]
            users[users.py<br/>User CRUD]
            universes[universes.py<br/>Universe CRUD]
            players[players.py<br/>Player list/detail]
            teams[teams.py<br/>Team CRUD + generate]
            matches[matches.py<br/>Simulate + SSE stream]
        end

        subgraph "Services"
            tg[team_generator.py<br/>Generate teams from<br/>unassigned players]
            ms[match_simulator.py<br/>Deterministic match<br/>simulation engine]
        end

        crud[crud.py<br/>All database operations]
        models[models.py<br/>SQLModel tables + schemas]
        deps[deps.py<br/>Auth dependencies]
    end

    DB[(PostgreSQL)]
    SM[Secrets Manager]

    main --> router
    router --> login & users & universes & players & teams & matches
    teams --> tg
    matches --> ms
    tg --> crud
    ms --> crud
    login --> crud
    users --> crud
    universes --> crud
    players --> crud
    teams --> crud
    matches --> crud
    crud --> models
    models --> DB
    deps --> SM
```

## Domain Model

```mermaid
erDiagram
    Universe ||--o{ Player : has
    Universe ||--o{ Team : has
    Universe ||--o{ Match : has
    Team ||--o{ Player : contains
    Team ||--o{ Match : "home_team"
    Team ||--o{ Match : "away_team"
    Match ||--o{ MatchEvent : has
    Player ||--o{ MatchEvent : "involved_in"

    Universe {
        uuid id PK
        string name
        string description
        datetime created_at
    }

    Player {
        uuid id PK
        string name
        float height
        float weight
        uuid universe_id FK
        uuid team_id FK
        enum position "GOALIE | DEFENCE | OFFENCE"
    }

    Team {
        uuid id PK
        string name
        uuid universe_id FK
    }

    Match {
        uuid id PK
        uuid universe_id FK
        uuid home_team_id FK
        uuid away_team_id FK
        int home_score
        int away_score
        enum status "PENDING | LIVE | FINISHED"
    }

    MatchEvent {
        uuid id PK
        uuid match_id FK
        uuid player_id FK
        int minute
        enum event_type
        string description
        int home_score
        int away_score
    }
```

## Match Simulation Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as matches.py
    participant Sim as match_simulator.py
    participant CRUD as crud.py
    participant DB as PostgreSQL

    Client->>API: POST /matches/simulate<br/>{home_team_id, away_team_id}
    API->>Sim: run_simulation()
    Sim->>CRUD: get_team(home), get_team(away)
    CRUD->>DB: SELECT teams + players
    DB-->>Sim: Teams with players

    Sim->>Sim: Validate (same universe, 5 players each)
    Sim->>CRUD: create_match(PENDING)
    Sim->>CRUD: update_match_status(LIVE)
    Sim->>Sim: simulate_match() — pure function
    Note over Sim: Generates events based on<br/>player physical stats
    Sim->>CRUD: create_match_events_bulk()
    Sim->>CRUD: update_match_score() + status(FINISHED)
    API-->>Client: MatchPublic {id, score, status}

    Client->>API: GET /matches/{id}/stream
    API->>CRUD: get_match_events()
    CRUD->>DB: SELECT events ORDER BY minute
    loop Each event (1.2s delay)
        API-->>Client: SSE: data: {event JSON}
    end
    API-->>Client: SSE: data: [DONE]
```

## Authentication Flow

```mermaid
flowchart LR
    req[Request] -->|Authorization: Bearer token| oauth[OAuth2PasswordBearer]
    oauth --> decode[JWT Decode<br/>deps.py]
    decode --> lookup[DB Lookup<br/>session.get User]
    lookup -->|found| user[CurrentUser]
    lookup -->|not found| err[401 Unauthorized]
    user --> route[Route Handler]
```

## Team Generation Logic

Players are assigned positions based on physical attributes:

| Position | Selection Criteria | Rating Derivation |
|----------|-------------------|-------------------|
| Goalie (1) | Tallest available player | Height normalized (150-220cm) |
| Defence (N) | Heaviest remaining players | Avg weight normalized (50-120kg) |
| Offence (N) | Shortest remaining players | Inverse height (shorter = faster) |

Defenders + Attackers must equal 4 (total team size = 5).

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/login/access-token` | No | Get JWT token |
| GET | `/api/v1/users/me` | Yes | Current user |
| GET | `/api/v1/universes/` | No | List universes |
| GET | `/api/v1/players/` | No | List players (optional universe filter) |
| GET | `/api/v1/teams/` | No | List teams (optional universe filter) |
| POST | `/api/v1/teams/generate` | No | Generate team from universe players |
| GET | `/api/v1/matches/` | No | List matches (optional universe filter) |
| POST | `/api/v1/matches/simulate` | No | Simulate match between two teams |
| GET | `/api/v1/matches/{id}` | No | Match details with events |
| GET | `/api/v1/matches/{id}/stream` | No | SSE stream of match events |
