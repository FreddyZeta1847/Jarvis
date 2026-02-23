import hashlib
import json
import logging
import time

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

# In-memory cache: { cache_key: { "classifications": {...}, "timestamp": float } }
_cache = {}
CACHE_TTL = 300  # 5 minutes


def _make_cache_key(emails: list[dict]) -> str:
    """Build a cache key from sorted email IDs."""
    ids = sorted(e.get("id", "") for e in emails)
    return hashlib.md5("|".join(ids).encode()).hexdigest()


async def classify_emails(emails: list[dict]) -> list[dict]:
    """Classify emails into categories using Azure OpenAI (with cache)."""
    if not emails:
        return emails

    # Check cache
    cache_key = _make_cache_key(emails)
    cached = _cache.get(cache_key)
    if cached and (time.time() - cached["timestamp"]) < CACHE_TTL:
        logger.info("classify_emails: cache hit (%d emails)", len(emails))
        id_to_category = cached["classifications"]
        for email in emails:
            email["category"] = id_to_category.get(email.get("id"), "other")
        return emails

    logger.info("classify_emails: cache miss, classifying %d emails", len(emails))

    lines = []
    for i, email in enumerate(emails, 1):
        sender = email.get("from", "")
        subject = email.get("subject", "")
        snippet = email.get("snippet", "")[:120]
        lines.append(f"{i}. From: {sender} | Subject: {subject} | Snippet: {snippet}")

    user_message = "\n".join(lines)

    try:
        client = AsyncAzureOpenAI(
            azure_endpoint=AZURE_OPENAI_ENDPOINT,
            api_key=AZURE_OPENAI_KEY,
            api_version=AZURE_OPENAI_API_VERSION,
        )

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
        classifications = json.loads(raw)

        # Map by email ID for cache storage
        id_to_category = {}
        for i, email in enumerate(emails, 1):
            cat = classifications.get(str(i), "other")
            email["category"] = cat
            id_to_category[email.get("id")] = cat

        # Store in cache
        _cache[cache_key] = {"classifications": id_to_category, "timestamp": time.time()}
        logger.info("classify_emails: cached %d classifications", len(emails))

    except Exception as e:
        logger.error("Email classification failed: %s", e, exc_info=True)
        for email in emails:
            email["category"] = "other"

    return emails
