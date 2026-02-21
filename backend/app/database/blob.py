import logging

from azure.storage.blob import BlobServiceClient, ContentSettings
from app import config

logger = logging.getLogger(__name__)

CONTAINER_NAME = "folder-images"

_blob_service_client = None


def _get_blob_service_client():
    """Return BlobServiceClient, creating it lazily."""
    global _blob_service_client

    if _blob_service_client is not None:
        return _blob_service_client

    if not config.AZURE_STORAGE_CONNECTION_STRING:
        raise RuntimeError(
            "Azure Blob Storage not configured. Set AZURE_STORAGE_CONNECTION_STRING in .env"
        )

    _blob_service_client = BlobServiceClient.from_connection_string(
        config.AZURE_STORAGE_CONNECTION_STRING
    )
    logger.info("Azure Blob Storage connected (container=%s)", CONTAINER_NAME)
    return _blob_service_client


def upload_image(file_bytes: bytes, filename: str, content_type: str = "image/jpeg") -> str:
    """Upload image bytes to Blob Storage and return the public URL."""
    client = _get_blob_service_client()
    container_client = client.get_container_client(CONTAINER_NAME)
    blob_client = container_client.get_blob_client(filename)

    blob_client.upload_blob(
        file_bytes,
        overwrite=True,
        content_settings=ContentSettings(content_type=content_type),
    )

    logger.info("Uploaded image: %s", filename)
    return blob_client.url


def delete_image(filename: str):
    """Delete an image from Blob Storage. Silently ignores missing blobs."""
    try:
        client = _get_blob_service_client()
        container_client = client.get_container_client(CONTAINER_NAME)
        container_client.delete_blob(filename)
        logger.info("Deleted image: %s", filename)
    except Exception as e:
        logger.warning("Failed to delete image %s: %s", filename, e)
