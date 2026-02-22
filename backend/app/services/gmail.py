import base64
import logging
from email.mime.text import MIMEText

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app import config

logger = logging.getLogger(__name__)

_service = None

SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
]


def get_gmail_service():
    """Return the Gmail API v1 service, creating it lazily."""
    global _service

    if _service is not None:
        return _service

    if not config.GOOGLE_CLIENT_ID or not config.GOOGLE_CLIENT_SECRET or not config.GOOGLE_REFRESH_TOKEN:
        raise RuntimeError(
            "Gmail not configured. "
            "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in .env"
        )

    creds = Credentials(
        token=None,
        refresh_token=config.GOOGLE_REFRESH_TOKEN,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=config.GOOGLE_CLIENT_ID,
        client_secret=config.GOOGLE_CLIENT_SECRET,
        scopes=SCOPES,
    )

    _service = build("gmail", "v1", credentials=creds)
    logger.info("Gmail service initialized")
    return _service


def _parse_message(msg):
    """Extract useful fields from a Gmail API message dict."""
    headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}

    body = ""
    payload = msg.get("payload", {})

    # Try to get plain text body
    if payload.get("body", {}).get("data"):
        body = base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="replace")
    elif payload.get("parts"):
        for part in payload["parts"]:
            if part.get("mimeType") == "text/plain" and part.get("body", {}).get("data"):
                body = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="replace")
                break
        # If no plain text, try nested parts (multipart/alternative inside multipart/mixed)
        if not body:
            for part in payload["parts"]:
                if part.get("parts"):
                    for sub_part in part["parts"]:
                        if sub_part.get("mimeType") == "text/plain" and sub_part.get("body", {}).get("data"):
                            body = base64.urlsafe_b64decode(sub_part["body"]["data"]).decode("utf-8", errors="replace")
                            break
                    if body:
                        break

    return {
        "id": msg.get("id"),
        "threadId": msg.get("threadId"),
        "snippet": msg.get("snippet", ""),
        "labelIds": msg.get("labelIds", []),
        "from": headers.get("from", ""),
        "to": headers.get("to", ""),
        "subject": headers.get("subject", ""),
        "date": headers.get("date", ""),
        "body": body,
    }


def _build_raw_message(to, subject, body, in_reply_to=None, references=None):
    """Build a base64url encoded MIME message for the Gmail API."""
    message = MIMEText(body)
    message["to"] = to
    message["subject"] = subject

    if in_reply_to:
        message["In-Reply-To"] = in_reply_to
    if references:
        message["References"] = references

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
    return raw
