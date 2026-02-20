import logging

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app import config

logger = logging.getLogger(__name__)

_service = None


def get_calendar_service():
    """Return the Google Calendar API v3 service, creating it lazily."""
    global _service

    if _service is not None:
        return _service

    if not config.GOOGLE_CLIENT_ID or not config.GOOGLE_CLIENT_SECRET or not config.GOOGLE_REFRESH_TOKEN:
        raise RuntimeError(
            "Google Calendar not configured. "
            "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in .env"
        )

    creds = Credentials(
        token=None,
        refresh_token=config.GOOGLE_REFRESH_TOKEN,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=config.GOOGLE_CLIENT_ID,
        client_secret=config.GOOGLE_CLIENT_SECRET,
        scopes=["https://www.googleapis.com/auth/calendar"],
    )

    _service = build("calendar", "v3", credentials=creds)
    logger.info("Google Calendar service initialized")
    return _service
