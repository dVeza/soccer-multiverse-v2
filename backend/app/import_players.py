"""Management command to import players from external APIs.

Usage:
    docker compose exec backend python app/import_players.py
"""

import logging

from sqlmodel import Session

from app import crud
from app.core.db import engine
from app.models import UniverseCreate
from app.services.external_players import fetch_pokemon_players, fetch_starwars_players

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SOURCES = [
    {
        "name": "Pokemon",
        "description": "Pokemon universe",
        "fetch": fetch_pokemon_players,
    },
    {
        "name": "Star Wars",
        "description": "Star Wars universe",
        "fetch": fetch_starwars_players,
    },
]


def import_all() -> None:
    with Session(engine) as session:
        for source in SOURCES:
            name = source["name"]
            logger.info("Processing %s...", name)

            universe = crud.get_universe_by_name(session=session, name=name)
            if not universe:
                universe = crud.create_universe(
                    session=session,
                    universe_in=UniverseCreate(
                        name=name, description=source["description"]
                    ),
                )
                logger.info("Created universe: %s", name)

            _, existing_count = crud.get_players(
                session=session, universe_id=universe.id, limit=1
            )
            if existing_count > 0:
                logger.info(
                    "Skipping %s — %d players already exist", name, existing_count
                )
                continue

            logger.info("Fetching %s players from API...", name)
            players = source["fetch"](universe.id)

            for player_in in players:
                crud.create_player(session=session, player_in=player_in)

            logger.info("Imported %d players into %s", len(players), name)

    logger.info("Done.")


if __name__ == "__main__":
    import_all()
