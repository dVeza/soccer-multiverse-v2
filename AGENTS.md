# AGENTS.md — Soccer Multiverse v2

## Project Overview

Full-stack app built on the **FastAPI full-stack template**. FastAPI + SQLModel backend, React + TypeScript frontend, PostgreSQL database, all orchestrated with Docker Compose.

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
│   │   │   ├── routes/        # API route handlers (items, users, login, utils, private)
│   │   │   ├── deps.py        # Dependency injection (SessionDep, CurrentUser, etc.)
│   │   │   └── main.py        # APIRouter aggregation
│   │   ├── core/
│   │   │   ├── config.py      # Settings from env / .env (pydantic-settings)
│   │   │   ├── db.py          # SQLModel engine + init_db
│   │   │   └── security.py    # Password hashing (argon2/bcrypt), JWT creation
│   │   ├── alembic/           # DB migrations
│   │   ├── email-templates/   # MJML source + built HTML email templates
│   │   ├── models.py          # SQLModel table & schema models (User, Item, etc.)
│   │   ├── crud.py            # CRUD operations
│   │   ├── main.py            # FastAPI app creation
│   │   └── utils.py           # Email sending utilities
│   ├── tests/                 # pytest tests mirroring app structure
│   ├── scripts/               # prestart.sh, test.sh, lint.sh, format.sh
│   └── pyproject.toml         # Python deps, ruff/mypy/coverage config
├── frontend/
│   ├── src/
│   │   ├── client/            # Auto-generated OpenAPI client (DO NOT edit manually)
│   │   ├── components/        # UI components (Admin, Items, UserSettings, Common, ui/)
│   │   ├── hooks/             # Custom React hooks (useAuth, useCustomToast, etc.)
│   │   ├── routes/            # TanStack Router file-based routes
│   │   └── main.tsx           # App entry point
│   ├── tests/                 # Playwright E2E tests
│   └── package.json
├── scripts/                   # Top-level orchestration scripts
│   ├── generate-client.sh     # Regenerates frontend OpenAPI client from backend
│   ├── test.sh                # Full Docker-based test run
│   └── test-local.sh          # Local Docker-based test run
├── compose.yml                # Production-like Docker Compose
├── compose.override.yml       # Dev overrides (volume mounts, live reload)
├── .env                       # Environment variables (loaded by Docker Compose & backend)
└── .pre-commit-config.yaml    # prek/pre-commit hooks config
```

## Common Commands

### Docker Compose (full stack)

```bash
# Start the full stack with live reload (watch mode)
docker compose watch

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
# Run inside the backend container (or locally with DB access)
docker compose exec backend bash

# Create a new migration after model changes
alembic revision --autogenerate -m "Describe the change"

# Apply migrations
alembic upgrade head

# Downgrade one revision
alembic downgrade -1

# View migration history
alembic history
alembic current
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

## Development Workflow

### Adding a New Model / Endpoint

1. **Define the model** in `backend/app/models.py` — create the SQLModel table class and request/response schemas
2. **Create migration**: `alembic revision --autogenerate -m "Add MyModel"` then `alembic upgrade head`
3. **Add CRUD functions** in `backend/app/crud.py`
4. **Create route file** in `backend/app/api/routes/` and register it in `backend/app/api/main.py`
5. **Regenerate frontend client**: `bash scripts/generate-client.sh`
6. **Build frontend components** using the generated client types

### Model Pattern (SQLModel)

The template follows a consistent pattern for each entity:

- `EntityBase(SQLModel)` — shared fields (used as base for API schemas + DB model)
- `EntityCreate(EntityBase)` — fields for creation endpoint
- `EntityUpdate(EntityBase)` — fields for update (all optional)
- `Entity(EntityBase, table=True)` — the DB table model (adds `id`, `created_at`, relationships)
- `EntityPublic(EntityBase)` — response schema (adds `id`)
- `EntitiesPublic(SQLModel)` — paginated list response (`data: list[EntityPublic]`, `count: int`)

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
- **Timestamps**: `created_at` fields use `datetime` with UTC timezone
- **Password hashing**: argon2 (primary) with bcrypt fallback via `pwdlib`
