import logging

from azure.cosmos.aio import CosmosClient
from app import config

logger = logging.getLogger(__name__)

_client = None
_expenses_container = None


async def get_expenses_container():
    """Return the expenses container proxy, creating client lazily."""
    global _client, _expenses_container

    if _expenses_container is not None:
        return _expenses_container

    if not config.COSMOS_ENDPOINT or not config.COSMOS_KEY:
        raise RuntimeError(
            "Cosmos DB not configured. Set COSMOS_ENDPOINT and COSMOS_KEY in .env"
        )

    _client = CosmosClient(config.COSMOS_ENDPOINT, credential=config.COSMOS_KEY)
    database = _client.get_database_client(config.COSMOS_DATABASE)
    _expenses_container = database.get_container_client("expenses")
    logger.info("Cosmos DB connected (db=%s, container=expenses)", config.COSMOS_DATABASE)
    return _expenses_container
