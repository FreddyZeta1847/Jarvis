import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.auth.jwt import get_current_user
from app.services.gmail import get_gmail_service, _parse_message, _build_raw_message

logger = logging.getLogger(__name__)

router = APIRouter()


def _run_sync(func):
    return asyncio.to_thread(func)


# --- Request models ---

class EmailSend(BaseModel):
    to: str = Field(min_length=1)
    subject: str = Field(min_length=1)
    body: str = Field(min_length=1)


class EmailReply(BaseModel):
    body: str = Field(min_length=1)


# --- Endpoints ---

@router.get("/emails")
async def list_emails(
    q: Optional[str] = Query(default=None, description="Gmail search query string"),
    max_results: int = Query(default=20, ge=1, le=100),
    label: str = Query(default="INBOX", description="Label to filter by"),
    user: dict = Depends(get_current_user),
):
    service = get_gmail_service()

    try:
        result = await _run_sync(
            service.users().messages().list(
                userId="me",
                q=q or "",
                maxResults=max_results,
                labelIds=[label],
            ).execute
        )
    except Exception as e:
        logger.error("Gmail list_emails failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e))

    messages = result.get("messages", [])

    # Fetch metadata for each message
    emails = []
    for msg_ref in messages:
        try:
            msg = await _run_sync(
                service.users().messages().get(
                    userId="me",
                    id=msg_ref["id"],
                    format="metadata",
                    metadataHeaders=["From", "To", "Subject", "Date"],
                ).execute
            )
            headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
            emails.append({
                "id": msg.get("id"),
                "threadId": msg.get("threadId"),
                "snippet": msg.get("snippet", ""),
                "labelIds": msg.get("labelIds", []),
                "from": headers.get("from", ""),
                "to": headers.get("to", ""),
                "subject": headers.get("subject", ""),
                "date": headers.get("date", ""),
            })
        except Exception as e:
            logger.warning("Failed to fetch email %s: %s", msg_ref["id"], e)

    return {"emails": emails}


@router.get("/emails/{email_id}")
async def get_email(
    email_id: str,
    user: dict = Depends(get_current_user),
):
    service = get_gmail_service()

    try:
        msg = await _run_sync(
            service.users().messages().get(
                userId="me",
                id=email_id,
                format="full",
            ).execute
        )
    except Exception as e:
        logger.error("Gmail get_email failed: %s", e)
        raise HTTPException(status_code=404, detail="Email not found")

    return {"email": _parse_message(msg)}


@router.post("/emails", status_code=201)
async def send_email(
    body: EmailSend,
    user: dict = Depends(get_current_user),
):
    service = get_gmail_service()

    raw = _build_raw_message(to=body.to, subject=body.subject, body=body.body)

    try:
        sent = await _run_sync(
            service.users().messages().send(
                userId="me",
                body={"raw": raw},
            ).execute
        )
    except Exception as e:
        logger.error("Gmail send_email failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e))

    return {"message": {"id": sent.get("id"), "threadId": sent.get("threadId")}}


@router.post("/emails/{email_id}/reply", status_code=201)
async def reply_to_email(
    email_id: str,
    body: EmailReply,
    user: dict = Depends(get_current_user),
):
    service = get_gmail_service()

    # Fetch original email to get headers for threading
    try:
        original = await _run_sync(
            service.users().messages().get(
                userId="me",
                id=email_id,
                format="metadata",
                metadataHeaders=["From", "Subject", "Message-ID", "References"],
            ).execute
        )
    except Exception as e:
        logger.error("Gmail reply fetch original failed: %s", e)
        raise HTTPException(status_code=404, detail="Original email not found")

    headers = {h["name"].lower(): h["value"] for h in original.get("payload", {}).get("headers", [])}

    reply_to = headers.get("from", "")
    subject = headers.get("subject", "")
    if not subject.lower().startswith("re:"):
        subject = f"Re: {subject}"

    message_id = headers.get("message-id", "")
    references = headers.get("references", "")
    if message_id:
        references = f"{references} {message_id}".strip()

    raw = _build_raw_message(
        to=reply_to,
        subject=subject,
        body=body.body,
        in_reply_to=message_id,
        references=references,
    )

    try:
        sent = await _run_sync(
            service.users().messages().send(
                userId="me",
                body={"raw": raw, "threadId": original.get("threadId")},
            ).execute
        )
    except Exception as e:
        logger.error("Gmail reply_to_email failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e))

    return {"message": {"id": sent.get("id"), "threadId": sent.get("threadId")}}
