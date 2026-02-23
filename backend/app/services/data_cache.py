import time

_email_cache: dict | None = None
_expense_cache: dict | None = None


# --- Email cache ---

def get_emails_cache() -> list[dict] | None:
    if _email_cache is None:
        return None
    return _email_cache["data"]


def set_emails_cache(emails: list[dict]) -> None:
    global _email_cache
    _email_cache = {"data": emails, "timestamp": time.time()}


def clear_emails_cache() -> None:
    global _email_cache
    _email_cache = None


# --- Expense cache ---

def get_expenses_cache() -> list[dict] | None:
    if _expense_cache is None:
        return None
    return _expense_cache["data"]


def set_expenses_cache(expenses: list[dict]) -> None:
    global _expense_cache
    _expense_cache = {"data": expenses, "timestamp": time.time()}


def clear_expenses_cache() -> None:
    global _expense_cache
    _expense_cache = None
