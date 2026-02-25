import json
import os
import time
import logging

logger = logging.getLogger(__name__)

_CACHE_DIR = os.environ.get("CACHE_DIR", "/tmp/jarvis_cache")
_EMAIL_CACHE_FILE = os.path.join(_CACHE_DIR, "emails.json")
_EXPENSE_CACHE_FILE = os.path.join(_CACHE_DIR, "expenses.json")


def _ensure_cache_dir():
    os.makedirs(_CACHE_DIR, exist_ok=True)


def _read_cache(path: str) -> list[dict] | None:
    try:
        with open(path, "r") as f:
            data = json.load(f)
        return data.get("data")
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def _write_cache(path: str, items: list[dict]):
    _ensure_cache_dir()
    with open(path, "w") as f:
        json.dump({"data": items, "timestamp": time.time()}, f)


def _clear_cache(path: str):
    try:
        os.remove(path)
    except FileNotFoundError:
        pass


# --- Email cache ---

def get_emails_cache() -> list[dict] | None:
    return _read_cache(_EMAIL_CACHE_FILE)


def set_emails_cache(emails: list[dict]) -> None:
    _write_cache(_EMAIL_CACHE_FILE, emails)


def clear_emails_cache() -> None:
    _clear_cache(_EMAIL_CACHE_FILE)


# --- Expense cache ---

def get_expenses_cache() -> list[dict] | None:
    return _read_cache(_EXPENSE_CACHE_FILE)


def set_expenses_cache(expenses: list[dict]) -> None:
    _write_cache(_EXPENSE_CACHE_FILE, expenses)


def clear_expenses_cache() -> None:
    _clear_cache(_EXPENSE_CACHE_FILE)
