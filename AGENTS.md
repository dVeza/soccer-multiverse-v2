# AGENTS.md — Soccer Multiverse v2

## Project Overview

Full-stack app built on the **FastAPI full-stack template**. FastAPI + SQLModel backend, React + TypeScript frontend, PostgreSQL database, all orchestrated with Docker Compose.

The domain is a "soccer multiverse" — you can create universes (e.g. Pokemon, Star Wars), import characters from external APIs as players, and generate teams where players are assigned positions based on their physical attributes.

- **Project name**: Soccer Multiverse 2
- **Stack name**: `soccer-multiverse2`
- **Default superuser**: `admin@example.com` / `admin`

## Tech Stack

| Layer      | Tech                                                                  |
|------------|-----------------------------------------------------------------------|
| Backend    | FastAPI, SQLModel, Pydantic, Alembic, PostgreSQL (psycopg), PyJWT     |
| Frontend   | React 19, TypeScript, TanStack Router + Query, Tailwind CSS, shadcn/ui |
| Testing    | pytest + coverage (backend), Playwright (frontend E2E)                |
| Tooling    | uv (Python), bun (JS), ruff + mypy (Python lint), biome (JS lint)    |
| Infra      | Docker Compose, Traefik (reverse proxy), Mailcatcher (dev email)      |

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/        # API route handlers
│   │   │   │   ├── universes.py  # Universe CRUD endpoints
│   │   │   │   ├── players.py    # Player CRUD endpoints
│   │   │   │   ├── teams.py      # Team endpoints (list, get, generate, delete)
│   │   │   │   ├── users.py      # User management
│   │   │   │   ├── login.py      # Auth endpoints
│   │   │   │   ├── utils.py      # Health check, etc.
│   │   │   │   └── private.py    # Dev-only endpoints (local env)
│   │   │   ├── deps.py        # Dependency injection (SessionDep, CurrentUser, etc.)
│   │   │   └── main.py        # APIRouter aggregation
│   │   ├── services/
│   │   │   ├── team_generator.py     # Assigns players to positions by physical attributes
│   │   │   └── external_players.py   # Fetches players from Pokemon/Star Wars APIs
│   │   ├── core/
│   │   │   ├── config.py      # Settings from env / .env (pydantic-settings)
│   │   │   ├── db.py          # SQLModel engine + init_db
│   │   │   └── security.py    # Password hashing (argon2/bcrypt), JWT creation
│   │   ├── alembic/           # DB migrations
│   │   ├── email-templates/   # MJML source + built HTML email templates
│   │   ├── models.py          # SQLModel table & schema models
│   │   ├── crud.py            # CRUD operations for all entities
│   │   ├── main.py            # FastAPI app creation
│   │   ├── import_players.py  # Management command: import players from external APIs
│   │   ├── initial_data.py    # Management command: seed superuser
│   │   └── utils.py           # Email sending utilities
│   ├── tests/
│   │   ├── conftest.py        # Session-scoped DB fixture, TestClient, auth headers
│   │   ├── api/routes/        # API endpoint tests (login, users, private)
│   │   ├── crud/              # CRUD function tests (user, universe, player, team)
│   │   ├── services/          # Service tests (team_generator)
│   │   ├── utils/             # Test helpers (random data, auth, universe/player factories)
│   │   └── scripts/           # Pre-start script tests
│   ├── scripts/               # prestart.sh, test.sh, lint.sh, format.sh
│   └── pyproject.toml         # Python deps, ruff/mypy/coverage config
├── frontend/
│   ├── src/
│   │   ├── client/            # Auto-generated OpenAPI client (DO NOT edit manually)
│   │   ├── components/        # UI components (Admin, UserSettings, Common, ui/)
│   │   ├── hooks/             # Custom React hooks (useAuth, useCustomToast, etc.)
│   │   ├── routes/            # TanStack Router file-based routes
│   │   └── main.tsx           # App entry point
│   ├── tests/                 # Playwright E2E tests
│   └── package.json
├── scripts/                   # Top-level orchestration scripts
│   ├── generate-client.sh     # Regenerates frontend OpenAPI client from backend
│   ├── test.sh                # Full Docker-based test run
│   └── test-local.sh          # Local Docker-based test run
├── compose.yml                # Production Docker Compose (prestart runs migrations + seed)
├── compose.override.yml       # Dev overrides (volume mount, prestart skipped)
├── .env                       # Environment variables (loaded by Docker Compose & backend)
└── .pre-commit-config.yaml    # prek/pre-commit hooks config
```

## Common Commands

### Docker Compose (full stack)

```bash
# Start all services (dev mode — backend has volume mount, prestart skipped)
docker compose up -d

# View logs (all services or specific)
docker compose logs
docker compose logs backend
docker compose logs -f backend    # follow

# Stop a specific service (e.g. to run it locally instead)
docker compose stop frontend
docker compose stop backend

# Tear down everything including volumes (clean slate)
docker compose down -v --remove-orphans

# Shell into the running backend container
docker compose exec backend bash

# Rebuild backend after Dockerfile/dependency changes
docker compose up -d backend --build
```

### Backend (Python / FastAPI)

```bash
# Install dependencies
cd backend && uv sync

# Run backend locally (outside Docker, needs DB running)
cd backend && fastapi dev app/main.py

# Run tests inside Docker
docker compose exec backend bash scripts/tests-start.sh
docker compose exec backend bash scripts/tests-start.sh -x   # stop on first failure
docker compose exec backend bash scripts/tests-start.sh -k "test_name"  # filter

# Run tests locally (needs DB)
cd backend && uv run coverage run -m pytest tests/
cd backend && uv run pytest tests/ -x -v  # quick, no coverage

# Linting & formatting
cd backend && uv run ruff check app          # lint
cd backend && uv run ruff check app --fix    # lint + autofix
cd backend && uv run ruff format app         # format
cd backend && uv run mypy app                # type checking

# All lint checks at once
cd backend && bash scripts/lint.sh
```

### Database Migrations (Alembic)

```bash
# All alembic commands run inside the backend container
# Create a new migration after model changes
docker compose exec backend alembic revision --autogenerate -m "Describe the change"

# Apply migrations
docker compose exec backend alembic upgrade head

# Downgrade one revision
docker compose exec backend alembic downgrade -1

# View migration history
docker compose exec backend alembic history
docker compose exec backend alembic current
```

### Management Commands

```bash
# Seed initial superuser (runs automatically via prestart in production)
docker compose exec backend python app/initial_data.py

# Import players from external APIs (Pokemon + Star Wars)
docker compose exec backend python app/import_players.py
```

### Frontend (React / TypeScript)

```bash
# Install dependencies
cd frontend && bun install

# Run dev server locally (outside Docker)
cd frontend && bun run dev

# Build for production
cd frontend && bun run build

# Lint (biome)
cd frontend && bun run lint

# Regenerate the OpenAPI client from backend schema
# (backend must be importable — run from project root)
bash scripts/generate-client.sh

# E2E tests with Playwright (needs backend + DB running)
cd frontend && bunx playwright test
cd frontend && bunx playwright test --ui    # interactive UI mode
```

### Pre-commit Hooks (prek)

```bash
# Install hooks (from backend dir)
cd backend && uv run prek install -f

# Run all hooks manually
cd backend && uv run prek run --all-files
```

## Domain Model

### Entities

- **Universe** — a named universe (e.g. "Pokemon", "Star Wars") that contains players and teams
- **Player** — a character with physical attributes (name, height, weight), belongs to a universe, optionally assigned to a team with a position
- **Team** — a generated team of 5 players (1 goalie + defenders + attackers), belongs to a universe
- **Position** — enum: `GOALIE`, `DEFENCE`, `OFFENCE`

### Relationships

```
Universe ──1:N──> Player
Universe ──1:N──> Team
Team     ──1:N──> Player (with position assignment)
```

### Team Generation Logic (`backend/app/services/team_generator.py`)

The `generate_team()` function takes a universe_id and a configuration (defenders + attackers = 4), fetches random unassigned players, and assigns positions based on physical attributes:
1. **Goalie** — tallest player
2. **Defenders** — heaviest remaining players
3. **Attackers** — shortest remaining players

### External Data Import (`backend/app/services/external_players.py`)

- `fetch_pokemon_players()` — fetches from PokeAPI (capped at 150), converts height (decimetres→cm) and weight (hectograms→kg)
- `fetch_starwars_players()` — fetches from SWAPI (all ~82 characters), handles "unknown" values with defaults

## Development Workflow

### Adding a New Model / Endpoint

1. **Define the model** in `backend/app/models.py` — create the SQLModel table class and request/response schemas
2. **Add CRUD functions** in `backend/app/crud.py`
3. **Create route file** in `backend/app/api/routes/` and register it in `backend/app/api/main.py`
4. **Add tests** in `backend/tests/crud/` and/or `backend/tests/api/routes/`
5. **Create migration**: `docker compose exec backend alembic revision --autogenerate -m "Add MyModel"` then `docker compose exec backend alembic upgrade head`
6. **Regenerate frontend client**: `bash scripts/generate-client.sh`
7. **Build frontend components** using the generated client types

### Model Pattern (SQLModel)

The project follows a consistent pattern for each entity:

- `EntityBase(SQLModel)` — shared fields (used as base for API schemas + DB model)
- `EntityCreate(EntityBase)` — fields for creation endpoint
- `EntityUpdate(SQLModel)` — fields for update (all optional, independent base to allow partial updates)
- `Entity(ModelBase, EntityBase, table=True)` — the DB table model (inherits `id`, `created_at`, `updated_at` from `ModelBase`)
- `EntityPublic(EntityBase)` — response schema (adds `id`, `created_at`)
- `EntitiesPublic(SQLModel)` — paginated list response (`data: list[EntityPublic]`, `count: int`)

`ModelBase` provides: `id` (UUID PK), `created_at` (datetime UTC), `updated_at` (datetime UTC with onupdate).

### Dependency Injection (backend/app/api/deps.py)

Use these type aliases in route function signatures:
- `SessionDep` — SQLModel `Session`
- `CurrentUser` — authenticated user (via JWT)
- `get_current_active_superuser` — admin-only dependency

### Frontend Client

The `frontend/src/client/` directory is **auto-generated** from the backend OpenAPI schema. Never edit it manually. After backend API changes, regenerate with:

```bash
bash scripts/generate-client.sh
```

## Docker Compose Notes

### Local Dev Overrides (`compose.override.yml`)

- **Backend volume mount**: `./backend:/app/backend` — bidirectional sync, so files generated inside the container (e.g. alembic migrations) appear on the host
- **Prestart skipped**: overridden to `echo` — in local dev, run migrations and seeding manually instead of at boot
- **No `docker compose watch` needed**: the volume mount + `--reload` flag handle live reload

## Local URLs

| Service         | URL                          |
|-----------------|------------------------------|
| Frontend        | http://localhost:5173         |
| Backend API     | http://localhost:8000         |
| Swagger UI      | http://localhost:8000/docs    |
| ReDoc           | http://localhost:8000/redoc   |
| Adminer (DB UI) | http://localhost:8080         |
| Mailcatcher     | http://localhost:1080         |
| Traefik UI      | http://localhost:8090         |

## Key Configuration (.env)

Settings are loaded via `pydantic-settings` in `backend/app/core/config.py`. The `.env` at the project root is shared between Docker Compose and the backend. Key vars:

- `POSTGRES_SERVER`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `SECRET_KEY` — JWT signing key
- `FIRST_SUPERUSER` / `FIRST_SUPERUSER_PASSWORD` — seeded on first startup
- `BACKEND_CORS_ORIGINS` — comma-separated allowed origins
- `ENVIRONMENT` — `local`, `staging`, or `production`
- `SMTP_HOST` — set to enable real email sending (Mailcatcher in Docker dev)

## Coding Conventions

- **Python**: formatted with `ruff format`, linted with `ruff check`, type-checked with `mypy --strict`
- **TypeScript/JS**: formatted and linted with `biome`
- **API prefix**: all routes are under `/api/v1/`
- **UUIDs**: all primary keys are `uuid.UUID` (not auto-increment integers)
- **Timestamps**: `created_at` and `updated_at` use `datetime` with UTC timezone
- **Password hashing**: argon2 (primary) with bcrypt fallback via `pwdlib`
- **HTTP client**: use `httpx` (not `requests`) — it's in the project dependencies
- **CRUD functions**: use keyword-only args (`*`), take `session: Session` as first param, follow existing patterns in `crud.py`
- **Test pattern**: tests use the `db: Session` fixture from `conftest.py`, create data with random/unique values via helpers in `tests/utils/`

## Gotchas

- **PostgreSQL reserved words**: `position` is a reserved word in PostgreSQL. The `Player.position` column uses a custom enum type name (`playerposition`) to avoid the `position position` SQL syntax error. Be careful with column names — check against [PostgreSQL reserved words](https://www.postgresql.org/docs/current/sql-keywords-appendix.html).
- **Alembic autogenerate**: always review generated migration files before applying. Autogenerate doesn't handle everything (e.g. column quoting, data migrations, enum type renaming).
- **Test cleanup order**: `conftest.py` deletes tables in FK order: Player → Team → Universe → User. If you add new models with FK relationships, update the cleanup order.
