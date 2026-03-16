# AGENTS.md — Soccer Multiverse v2

## Project Overview

Soccer simulation app where characters from fictional universes (Pokemon, Star Wars) form teams and compete in matches. FastAPI + SQLModel backend, React + TypeScript frontend, PostgreSQL database, Docker Compose for local dev, AWS CDK for production deployment.

- **Project name**: Soccer Multiverse 2
- **Stack name**: `soccer-multiverse2`
- **Default superuser**: `admin@example.com` / `admin1234`

## Tech Stack

| Layer      | Tech                                                                  |
|------------|-----------------------------------------------------------------------|
| Backend    | FastAPI, SQLModel, Pydantic, Alembic, PostgreSQL (psycopg), PyJWT     |
| Frontend   | React 19, TypeScript, TanStack Router + Query, Tailwind CSS, shadcn/ui |
| Testing    | pytest + coverage (backend), Playwright (frontend E2E)                |
| Tooling    | uv (Python), bun (JS), ruff + mypy (Python lint), biome (JS lint)    |
| Infra      | Docker Compose (local), AWS CDK TypeScript (production: ECS Fargate + S3/CloudFront + RDS) |

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── universes.py  # Universe CRUD
│   │   │   │   ├── players.py    # Player list/detail (optional universe filter)
│   │   │   │   ├── teams.py      # Team list, get, generate, delete
│   │   │   │   ├── matches.py    # Simulate, list, detail, SSE stream
│   │   │   │   ├── users.py      # User management
│   │   │   │   ├── login.py      # Auth endpoints
│   │   │   │   ├── utils.py      # Health check
│   │   │   │   └── private.py    # Dev-only endpoints
│   │   │   ├── deps.py           # Dependency injection (SessionDep, CurrentUser)
│   │   │   └── main.py           # APIRouter aggregation
│   │   ├── services/
│   │   │   ├── team_generator.py      # Assigns players to positions by physical attributes
│   │   │   ├── match_simulator.py     # Deterministic match simulation engine
│   │   │   └── external_players.py    # Fetches players from Pokemon/Star Wars APIs
│   │   ├── core/
│   │   │   ├── config.py         # Settings from env / .env (pydantic-settings)
│   │   │   ├── db.py             # SQLModel engine + init_db
│   │   │   └── security.py       # Password hashing (argon2/bcrypt), JWT creation
│   │   ├── alembic/              # DB migrations
│   │   ├── models.py             # SQLModel table & schema models (all entities in one file)
│   │   ├── crud.py               # CRUD operations for all entities
│   │   ├── main.py               # FastAPI app creation
│   │   ├── import_players.py     # Management command: import players from external APIs
│   │   └── initial_data.py       # Management command: seed superuser
│   ├── tests/
│   │   ├── conftest.py           # Session-scoped DB fixture, TestClient, auth headers
│   │   ├── api/routes/           # API endpoint tests
│   │   ├── crud/                 # CRUD function tests (user, universe, player, team)
│   │   ├── services/             # Service tests (team_generator)
│   │   └── utils/                # Test helpers (random data, auth, factories)
│   ├── scripts/                  # prestart.sh, test.sh, lint.sh, format.sh
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── client/               # Auto-generated OpenAPI client (DO NOT edit manually)
│   │   ├── components/
│   │   │   ├── Universes/        # UniverseCard (dashboard stat card)
│   │   │   ├── Players/          # columns.tsx (DataTable column definitions)
│   │   │   ├── Teams/            # GenerateTeam, TeamCard, DeleteTeam
│   │   │   ├── Matches/          # SimulateMatch, MatchLiveTicker, MatchCard, MatchEventItem
│   │   │   ├── Common/           # DataTable (server-side pagination), UniverseFilter
│   │   │   ├── Sidebar/          # AppSidebar, Main, User
│   │   │   ├── Admin/            # User management components
│   │   │   ├── UserSettings/     # Profile + password change
│   │   │   └── ui/               # shadcn/ui primitives
│   │   ├── hooks/
│   │   │   ├── useAuth.ts        # Auth state + login/logout mutations
│   │   │   ├── useMatchStream.ts # SSE hook for live match events (fetch + ReadableStream)
│   │   │   └── useCustomToast.ts # Toast notifications
│   │   ├── routes/               # TanStack Router file-based routes
│   │   │   ├── _layout.tsx       # Auth guard + sidebar wrapper
│   │   │   ├── _layout/
│   │   │   │   ├── index.tsx     # Dashboard (universe stat cards)
│   │   │   │   ├── players.tsx   # Players page (DataTable + universe filter)
│   │   │   │   ├── teams.tsx     # Teams page (team cards + generate)
│   │   │   │   ├── matches.tsx   # Matches page (match cards + simulate + live ticker)
│   │   │   │   ├── admin.tsx     # Admin panel
│   │   │   │   └── settings.tsx  # User settings
│   │   │   └── login.tsx, signup.tsx, etc.
│   │   └── main.tsx
│   ├── tests/                    # Playwright E2E tests
│   └── package.json
├── infra/                        # AWS CDK (TypeScript)
│   ├── bin/app.ts                # CDK app entry point
│   └── lib/
│       ├── config.ts             # Environment config (staging/production)
│       ├── network-stack.ts      # VPC, subnets, NAT Gateway
│       ├── database-stack.ts     # RDS PostgreSQL + Secrets Manager
│       ├── backend-stack.ts      # ECR, ECS Fargate, ALB
│       └── frontend-stack.ts     # S3 bucket, CloudFront distribution
├── docs/                         # Architecture documentation (Mermaid diagrams)
├── scripts/                      # generate-client.sh, test.sh, test-local.sh
├── compose.yml                   # Production Docker Compose
├── compose.override.yml          # Dev overrides (volume mount, Traefik, Mailcatcher)
└── .env                          # Environment variables
```

## Common Commands

### Docker Compose (full stack)

```bash
docker compose up -d                          # Start all services
docker compose logs -f backend                # Follow backend logs
docker compose exec backend bash              # Shell into backend
docker compose up -d backend --build          # Rebuild after changes
docker compose down -v --remove-orphans       # Clean slate
```

### Backend (Python / FastAPI)

```bash
cd backend && uv sync                         # Install deps
cd backend && fastapi dev app/main.py         # Run locally (needs DB)
docker compose exec backend bash scripts/tests-start.sh          # Tests in Docker
cd backend && uv run pytest tests/ -x -v      # Tests locally
cd backend && bash scripts/lint.sh            # All lint checks
```

### Database Migrations (Alembic)

```bash
docker compose exec backend alembic revision --autogenerate -m "Description"
docker compose exec backend alembic upgrade head
docker compose exec backend alembic downgrade -1
```

### Management Commands

```bash
docker compose exec backend python app/initial_data.py     # Seed superuser
docker compose exec backend python app/import_players.py   # Import Pokemon + Star Wars
```

### Frontend (React / TypeScript)

```bash
cd frontend && bun install                    # Install deps
cd frontend && bun run dev                    # Dev server
cd frontend && bun run build                  # Production build
cd frontend && bun run lint                   # Biome lint
bash scripts/generate-client.sh               # Regenerate OpenAPI client
```

### CDK Infrastructure

```bash
cd infra && npm install                       # Install CDK deps
cd infra && npx cdk synth -c env=staging      # Synthesize CloudFormation
cd infra && npx cdk deploy -c env=staging --all  # Deploy all stacks
cd infra && npx cdk diff -c env=staging       # Preview changes
```

## Domain Model

### Entities

- **Universe** — a named universe (e.g. "Pokemon", "Star Wars") with players and teams
- **Player** — a character with physical attributes (name, height, weight), belongs to a universe, optionally assigned to a team with a position
- **Team** — a generated team of 5 players (1 GK + 4 field players), belongs to a universe
- **Match** — a simulated match between two teams from the same universe, with a final score and status (PENDING → LIVE → FINISHED)
- **MatchEvent** — an individual event during a match (KICKOFF, ATTACK, SHOT, GOAL, SAVE, TACKLE, FOUL, HALFTIME, FULLTIME) with minute, description, and running score
- **Position** — enum: `GOALIE`, `DEFENCE`, `OFFENCE`

### Relationships

```
Universe ──1:N──> Player
Universe ──1:N──> Team
Universe ──1:N──> Match
Team     ──1:N──> Player (with position assignment)
Match    ──N:1──> Team (home_team)
Match    ──N:1──> Team (away_team)
Match    ──1:N──> MatchEvent
MatchEvent ──N:1──> Player (optional, the player involved)
```

### Team Generation Logic (`backend/app/services/team_generator.py`)

Takes a universe_id and configuration (defenders + attackers = 4), fetches random unassigned players:
1. **Goalie** — tallest player
2. **Defenders** — heaviest remaining players
3. **Attackers** — shortest remaining players

### Match Simulation (`backend/app/services/match_simulator.py`)

Deterministic engine that generates events based on player physical stats:
- `TeamStats` derived from player attributes: goalie rating (height), defence rating (weight), attack rating (inverse height)
- Simulates possessions per half, alternating attacking team
- Each possession: ATTACK → tackle chance → SHOT → goal/save
- Results persisted then streamed via SSE (`GET /matches/{id}/stream`) with artificial delays

### External Data Import (`backend/app/services/external_players.py`)

- `fetch_pokemon_players()` — PokeAPI (150 Pokemon), height (dm→cm), weight (hg→kg)
- `fetch_starwars_players()` — SWAPI (~82 characters), handles "unknown" values

## Development Workflow

### Adding a New Model / Endpoint

1. **Define the model** in `backend/app/models.py`
2. **Add CRUD functions** in `backend/app/crud.py`
3. **Create route file** in `backend/app/api/routes/` and register in `backend/app/api/main.py`
4. **Create migration**: `docker compose exec backend alembic revision --autogenerate -m "Add Model"`
5. **Apply migration**: `docker compose exec backend alembic upgrade head`
6. **Regenerate frontend client**: `bash scripts/generate-client.sh`
7. **Build frontend components** using the generated types

### Model Pattern (SQLModel)

Each entity follows this pattern:
- `EntityBase(SQLModel)` — shared fields
- `EntityCreate(EntityBase)` — creation request
- `EntityUpdate(SQLModel)` — partial update (all optional)
- `Entity(ModelBase, EntityBase, table=True)` — DB table (inherits `id`, `created_at`, `updated_at`)
- `EntityPublic(EntityBase)` — response (adds `id`, `created_at`)
- `EntitiesPublic(SQLModel)` — paginated list (`data: list[EntityPublic]`, `count: int`)

### Frontend Patterns

- **Data fetching**: `useSuspenseQuery` with Suspense boundaries and Skeleton fallbacks
- **Mutations**: `useMutation` + `queryClient.invalidateQueries` + toast notifications
- **Universe filter**: URL search params (`?universe=<id>`) via `validateSearch` with Zod
- **Server-side pagination**: `DataTable` component with `totalCount`/`pageIndex`/`pageSize` props
- **SSE streaming**: `useMatchStream` hook using `fetch` + ReadableStream (not EventSource — needs auth headers)

## Key Configuration (.env)

Settings loaded via `pydantic-settings` in `backend/app/core/config.py`:

- `POSTGRES_SERVER`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `SECRET_KEY` — JWT signing key
- `FIRST_SUPERUSER` / `FIRST_SUPERUSER_PASSWORD` — seeded on first startup
- `BACKEND_CORS_ORIGINS` — comma-separated allowed origins
- `ENVIRONMENT` — `local`, `staging`, or `production`

## Coding Conventions

- **Python**: `ruff format` + `ruff check` + `mypy --strict`
- **TypeScript/JS**: `biome` format + lint
- **API prefix**: all routes under `/api/v1/`
- **UUIDs**: all primary keys are `uuid.UUID`
- **Timestamps**: `created_at` / `updated_at` with UTC timezone
- **CRUD functions**: keyword-only args (`*`), `session: Session` first param
- **Frontend client**: auto-generated — never edit `frontend/src/client/` manually

## Gotchas

- **PostgreSQL reserved words**: `position` and `match` are reserved. The project uses custom enum type names (`playerposition`, `matchstatus`, `matcheventtype`) and explicit table names (`__tablename__ = "matches"`) to avoid conflicts.
- **Alembic autogenerate**: always review generated migrations before applying. Doesn't handle enum renames, data migrations, or column quoting automatically.
- **Test cleanup order**: `conftest.py` deletes in FK order: MatchEvent → Match → Player → Team → Universe → User. Update this when adding new models with FK relationships.
- **Docker build context**: `backend/Dockerfile` uses the project root as context (mounts `uv.lock` and `pyproject.toml` from root). Use `docker build -f backend/Dockerfile .` from root.
