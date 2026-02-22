import asyncio
import logging
from typing import Annotated

from agent_framework import tool

from app.services.gmail import get_gmail_service, _parse_message, _build_raw_message

logger = logging.getLogger(__name__)


def _run_sync(func, *args, **kwargs):
    """Run a synchronous Google API call in a thread."""
    return asyncio.to_thread(func, *args, **kwargs)


@tool(approval_mode="never_require")
async def search_emails(
    query: Annotated[str, "Gmail search query (e.g. 'from:someone@example.com', 'subject:meeting', 'is:unread')"],
    max_results: Annotated[int, "Maximum number of emails to return"] = 10,
) -> str:
    """Search emails using Gmail query syntax."""
    try:
        service = get_gmail_service()
    except Exception as e:
        logger.error("Failed to get Gmail service: %s", e)
        return f"Error connecting to Gmail: {e}"

    try:
        result = await _run_sync(
            service.users().messages().list(userId="me", q=query, maxResults=max_results).execute
        )
    except Exception as e:
        logger.error("Gmail search_emails failed: %s", e)
        return f"Error searching emails: {e}"

    messages = result.get("messages", [])
    if not messages:
        return "No emails found matching that search."

    lines = [f"Found {len(messages)} email{'s' if len(messages) != 1 else ''}:"]
    for msg_ref in messages:
        try:
            msg = await _run_sync(
                service.users().messages().get(userId="me", id=msg_ref["id"], format="full").execute
            )
            parsed = _parse_message(msg)
            line = f"- From: {parsed['from']}, Subject: {parsed['subject']}, Date: {parsed['date']} (id: {parsed['id']})"
            lines.append(line)
        except Exception as e:
            logger.error("Gmail fetch message %s failed: %s", msg_ref["id"], e)
            lines.append(f"- Could not fetch email {msg_ref['id']}")

    return "\n".join(lines)


@tool(approval_mode="never_require")
async def read_email(
    email_id: Annotated[str, "The Gmail message ID"],
) -> str:
    """Read the full content of an email by its ID."""
    try:
        service = get_gmail_service()
    except Exception as e:
        logger.error("Failed to get Gmail service: %s", e)
        return f"Error connecting to Gmail: {e}"

    try:
        msg = await _run_sync(
            service.users().messages().get(userId="me", id=email_id, format="full").execute
        )
    except Exception as e:
        logger.error("Gmail read_email failed: %s", e)
        return f"Email with id {email_id} not found."

    parsed = _parse_message(msg)

    lines = [
        f"From: {parsed['from']}",
        f"To: {parsed['to']}",
        f"Subject: {parsed['subject']}",
        f"Date: {parsed['date']}",
        f"Body: {parsed['body'][:3000] if parsed['body'] else parsed['snippet']}",
        f"ID: {parsed['id']}",
        f"Thread ID: {parsed['threadId']}",
    ]

    return "\n".join(lines)


@tool(approval_mode="never_require")
async def send_email(
    to: Annotated[str, "Recipient email address"],
    subject: Annotated[str, "Email subject line"],
    body: Annotated[str, "Email body text"],
) -> str:
    """Send a new email."""
    try:
        service = get_gmail_service()
    except Exception as e:
        logger.error("Failed to get Gmail service: %s", e)
        return f"Error connecting to Gmail: {e}"

    raw = _build_raw_message(to, subject, body)

    try:
        sent = await _run_sync(
            service.users().messages().send(userId="me", body={"raw": raw}).execute
        )
    except Exception as e:
        logger.error("Gmail send_email failed: %s", e)
        return f"Error sending email: {e}"

    return f"Email sent to {to} with subject '{subject}' (id: {sent.get('id', '')})"


@tool(approval_mode="never_require")
async def reply_to_email(
    email_id: Annotated[str, "The Gmail message ID to reply to"],
    body: Annotated[str, "Reply body text"],
) -> str:
    """Reply to an existing email, preserving the thread."""
    try:
        service = get_gmail_service()
    except Exception as e:
        logger.error("Failed to get Gmail service: %s", e)
        return f"Error connecting to Gmail: {e}"

    # Fetch the original message to get headers
    try:
        original = await _run_sync(
            service.users().messages().get(userId="me", id=email_id, format="full").execute
        )
    except Exception as e:
        logger.error("Gmail reply_to_email fetch failed: %s", e)
        return f"Original email with id {email_id} not found."

    parsed = _parse_message(original)
    reply_to = parsed["from"]
    subject = parsed["subject"]
    if not subject.lower().startswith("re:"):
        subject = f"Re: {subject}"

    # Get Message-ID for threading headers
    headers = {h["name"].lower(): h["value"] for h in original.get("payload", {}).get("headers", [])}
    message_id = headers.get("message-id", "")
    references = headers.get("references", "")
    if message_id:
        references = f"{references} {message_id}".strip() if references else message_id

    raw = _build_raw_message(reply_to, subject, body, in_reply_to=message_id, references=references)

    try:
        sent = await _run_sync(
            service.users().messages().send(
                userId="me",
                body={"raw": raw, "threadId": original.get("threadId", "")},
            ).execute
        )
    except Exception as e:
        logger.error("Gmail reply_to_email send failed: %s", e)
        return f"Error sending reply: {e}"

    return f"Reply sent to {reply_to} in thread '{parsed['subject']}' (id: {sent.get('id', '')})"


@tool(approval_mode="never_require")
async def list_recent_emails(
    max_results: Annotated[int, "Maximum number of emails to return"] = 10,
) -> str:
    """List recent emails from the inbox."""
    try:
        service = get_gmail_service()
    except Exception as e:
        logger.error("Failed to get Gmail service: %s", e)
        return f"Error connecting to Gmail: {e}"

    try:
        result = await _run_sync(
            service.users().messages().list(userId="me", q="in:inbox", maxResults=max_results).execute
        )
    except Exception as e:
        logger.error("Gmail list_recent_emails failed: %s", e)
        return f"Error listing emails: {e}"

    messages = result.get("messages", [])
    if not messages:
        return "Your inbox is empty."

    lines = [f"You have {len(messages)} recent email{'s' if len(messages) != 1 else ''} in your inbox:"]
    for msg_ref in messages:
        try:
            msg = await _run_sync(
                service.users().messages().get(userId="me", id=msg_ref["id"], format="full").execute
            )
            parsed = _parse_message(msg)
            unread = "UNREAD" in msg.get("labelIds", [])
            status = " [unread]" if unread else ""
            line = f"- From: {parsed['from']}, Subject: {parsed['subject']}, Date: {parsed['date']}{status} (id: {parsed['id']})"
            lines.append(line)
        except Exception as e:
            logger.error("Gmail fetch message %s failed: %s", msg_ref["id"], e)
            lines.append(f"- Could not fetch email {msg_ref['id']}")

    return "\n".join(lines)


GMAIL_TOOLS = [
    search_emails,
    read_email,
    send_email,
    reply_to_email,
    list_recent_emails,
]
