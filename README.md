# Soccer Multiverse

A soccer simulation app where characters from different universes (Pokemon, Star Wars, etc.) form teams and compete in matches with real-time event streaming.

## Features

- **Universes & Players** — Import characters from fictional universes as soccer players with physical attributes (height, weight)
- **Team Generation** — Auto-generate 5-player teams (1 GK + 4 field players) based on player physical stats
- **Match Simulation** — Deterministic match engine that generates events based on team/player ratings, streamed via SSE for a live ticker experience
- **Dashboard** — Overview of universes with player/team counts

## Tech Stack

**Backend:**
- [FastAPI](https://fastapi.tiangolo.com) + [SQLModel](https://sqlmodel.tiangolo.com) + PostgreSQL
- JWT authentication, Alembic migrations
- SSE streaming for live match events

**Frontend:**
- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [TanStack Router](https://tanstack.com/router) (file-based routing) + [TanStack React Query](https://tanstack.com/query)
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- Auto-generated OpenAPI client

**Infrastructure:**
- Docker Compose for local development
- AWS CDK (TypeScript) for production: ECS Fargate + S3/CloudFront + RDS PostgreSQL
- GitHub Actions CI/CD

## Quick Start

```bash
# Start all services
docker compose up -d

# Import players (first time)
docker compose exec backend python app/import_players.py

# Frontend dev server (with hot reload)
cd frontend && bun run dev
```

The app is available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

Default login: `admin@example.com` / `admin1234`

## Architecture

- [Infrastructure](docs/architecture-infra.md) — AWS deployment architecture
- [Backend](docs/architecture-backend.md) — FastAPI application structure
- [Frontend](docs/architecture-frontend.md) — React application structure

## Development

See [development.md](./development.md) for detailed development setup.

## Deployment

- **Local/Staging (Docker Compose):** See [deployment.md](./deployment.md)
- **AWS (CDK):** See [infra/](./infra/) and the [infrastructure docs](docs/architecture-infra.md)
