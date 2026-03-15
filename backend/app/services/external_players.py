import logging
import uuid

import httpx

from app.models import PlayerCreate

logger = logging.getLogger(__name__)

POKEMON_API_BASE = "https://pokeapi.co/api/v2/pokemon"
SWAPI_BASE = "https://swapi.dev/api/people/"


def fetch_pokemon_players(
    universe_id: uuid.UUID, limit: int = 150
) -> list[PlayerCreate]:
    """Fetch Pokemon from PokeAPI and return them as PlayerCreate objects.

    Caps at `limit` Pokemon (default 150 — original generation).
    Height is converted from decimetres to cm, weight from hectograms to kg.
    """
    logger.info("Starting Pokemon player fetch (limit=%d)", limit)
    players: list[PlayerCreate] = []
    offset = 0
    batch_size = 100

    with httpx.Client(timeout=30.0) as client:
        while len(players) < limit:
            fetch_count = min(batch_size, limit - len(players))
            url = f"{POKEMON_API_BASE}?limit={fetch_count}&offset={offset}"
            response = client.get(url)
            response.raise_for_status()
            data = response.json()

            if not data["results"]:
                break

            logger.info(
                "Fetching Pokemon batch: offset=%d, count=%d",
                offset,
                len(data["results"]),
            )

            for pokemon in data["results"]:
                detail_response = client.get(pokemon["url"])
                detail_response.raise_for_status()
                detail = detail_response.json()

                players.append(
                    PlayerCreate(
                        name=detail["name"].capitalize(),
                        height=detail["height"] * 10.0,  # decimetres → cm
                        weight=detail["weight"] / 10.0,  # hectograms → kg
                        universe_id=universe_id,
                    )
                )

            offset += fetch_count
            if offset >= data.get("count", 0):
                break

    logger.info("Completed Pokemon fetch. Total players: %d", len(players))
    return players


def fetch_starwars_players(universe_id: uuid.UUID) -> list[PlayerCreate]:
    """Fetch Star Wars characters from SWAPI and return them as PlayerCreate objects.

    Handles 'unknown' height/mass values with sensible defaults.
    """
    logger.info("Starting Star Wars character fetch")
    players: list[PlayerCreate] = []
    page = 1

    with httpx.Client(timeout=30.0) as client:
        while True:
            url = f"{SWAPI_BASE}?page={page}"
            response = client.get(url)
            response.raise_for_status()
            data = response.json()

            logger.info(
                "Fetching Star Wars batch: page=%d, count=%d",
                page,
                len(data["results"]),
            )

            for character in data["results"]:
                try:
                    height = float(character["height"])
                except (ValueError, TypeError):
                    height = 175.0

                try:
                    weight = float(character["mass"].replace(",", ""))
                except (ValueError, TypeError, AttributeError):
                    weight = 75.0

                players.append(
                    PlayerCreate(
                        name=character["name"],
                        height=height,
                        weight=weight,
                        universe_id=universe_id,
                    )
                )

            if not data.get("next"):
                break

            page += 1

    logger.info("Completed Star Wars fetch. Total players: %d", len(players))
    return players
