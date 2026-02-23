import json
import logging

from openai import AsyncAzureOpenAI

from app.config import (
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_KEY,
    AZURE_OPENAI_DEPLOYMENT,
    AZURE_OPENAI_API_VERSION,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an email classifier. Classify each email into exactly one category:

- "people": From a real person (personal email, work colleague, friend). Not automated.
- "tldr": Specifically the TLDR newsletter (from tldr.tech / TLDR). Only this newsletter goes here.
- "other": Everything else — receipts, notifications, other newsletters, marketing, shipping updates, security alerts, service emails.

Respond with a JSON object mapping the email number to its category.
Example: {"1": "people", "2": "tldr", "3": "other"}"""


async def classify_emails(emails: list[dict]) -> list[dict]:
    """Classify emails into categories using Azure OpenAI."""
    if not emails:
        logger.info("classify_emails: no emails to classify")
        return emails

    logger.info("classify_emails: classifying %d emails", len(emails))
    logger.info("classify_emails: endpoint=%s, deployment=%s, api_version=%s",
                AZURE_OPENAI_ENDPOINT[:30] + "..." if AZURE_OPENAI_ENDPOINT else "EMPTY",
                AZURE_OPENAI_DEPLOYMENT or "EMPTY",
                AZURE_OPENAI_API_VERSION or "EMPTY")

    lines = []
    for i, email in enumerate(emails, 1):
        sender = email.get("from", "")
        subject = email.get("subject", "")
        snippet = email.get("snippet", "")[:120]
        lines.append(f"{i}. From: {sender} | Subject: {subject} | Snippet: {snippet}")

    user_message = "\n".join(lines)
    logger.info("classify_emails: prompt built, %d chars", len(user_message))

    try:
        client = AsyncAzureOpenAI(
            azure_endpoint=AZURE_OPENAI_ENDPOINT,
            api_key=AZURE_OPENAI_KEY,
            api_version=AZURE_OPENAI_API_VERSION,
        )

        logger.info("classify_emails: calling Azure OpenAI...")
        response = await client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            response_format={"type": "json_object"},
            max_tokens=256,
            temperature=0,
        )

        raw = response.choices[0].message.content
        logger.info("classify_emails: raw response = %s", raw)
        classifications = json.loads(raw)
        logger.info("classify_emails: parsed classifications = %s", classifications)

        for i, email in enumerate(emails, 1):
            email["category"] = classifications.get(str(i), "other")

        logger.info("classify_emails: done, categories assigned")

    except Exception as e:
        logger.error("Email classification failed: %s", e, exc_info=True)
        for email in emails:
            email["category"] = "other"

    return emails
