import time
import random
from datetime import datetime, timezone
from typing import Annotated

from agent_framework import tool

from app.database.cosmos import get_expenses_container

USER_ID = "fede"


@tool(approval_mode="never_require")
async def query_expenses(
    start_date: Annotated[str | None, "Start date in YYYY-MM-DD format"] = None,
    end_date: Annotated[str | None, "End date in YYYY-MM-DD format"] = None,
    category: Annotated[str | None, "Filter by category (e.g. food, transport, entertainment)"] = None,
    payment_method: Annotated[str | None, "Filter by payment method (e.g. cash, card, transfer)"] = None,
    max_results: Annotated[int, "Maximum number of results to return"] = 20,
) -> str:
    """Query and list expenses with optional filters for date range, category, and payment method."""
    container = await get_expenses_container()

    conditions = ["c.userId = @userId"]
    params = [{"name": "@userId", "value": USER_ID}]

    if start_date:
        conditions.append("c.date >= @startDate")
        params.append({"name": "@startDate", "value": start_date})
    if end_date:
        conditions.append("c.date <= @endDate")
        params.append({"name": "@endDate", "value": end_date})
    if category:
        conditions.append("LOWER(c.category) = LOWER(@category)")
        params.append({"name": "@category", "value": category})
    if payment_method:
        conditions.append("LOWER(c.paymentMethod) = LOWER(@paymentMethod)")
        params.append({"name": "@paymentMethod", "value": payment_method})

    query = f"SELECT * FROM c WHERE {' AND '.join(conditions)} ORDER BY c.date DESC OFFSET 0 LIMIT @limit"
    params.append({"name": "@limit", "value": max_results})

    items = []
    async for item in container.query_items(query=query, parameters=params):
        items.append(item)

    if not items:
        return "No expenses found matching the filters."

    lines = [f"Found {len(items)} expense{'s' if len(items) != 1 else ''}:"]
    for item in items:
        amount = item.get("amount", 0)
        currency = item.get("currency", "EUR")
        desc = item.get("description", "No description")
        cat = item.get("category", "uncategorized")
        date = item.get("date", "unknown date")
        expense_id = item.get("id", "")
        lines.append(f"- {date}: {amount} {currency} for {desc} (category: {cat}, id: {expense_id})")

    return "\n".join(lines)


@tool(approval_mode="never_require")
async def get_expense_summary(
    start_date: Annotated[str | None, "Start date in YYYY-MM-DD format"] = None,
    end_date: Annotated[str | None, "End date in YYYY-MM-DD format"] = None,
    group_by: Annotated[str, "Group results by 'category' or 'month'"] = "category",
) -> str:
    """Get a summary of expenses with totals grouped by category or month."""
    container = await get_expenses_container()

    conditions = ["c.userId = @userId"]
    params = [{"name": "@userId", "value": USER_ID}]

    if start_date:
        conditions.append("c.date >= @startDate")
        params.append({"name": "@startDate", "value": start_date})
    if end_date:
        conditions.append("c.date <= @endDate")
        params.append({"name": "@endDate", "value": end_date})

    query = f"SELECT c.amount, c.currency, c.category, c.date FROM c WHERE {' AND '.join(conditions)}"

    items = []
    async for item in container.query_items(query=query, parameters=params):
        items.append(item)

    if not items:
        return "No expenses found for the given period."

    total = sum(item.get("amount", 0) for item in items)
    currency = items[0].get("currency", "EUR")

    groups: dict[str, float] = {}
    for item in items:
        if group_by == "month":
            date_str = item.get("date", "")
            key = date_str[:7] if len(date_str) >= 7 else "unknown"
        else:
            key = item.get("category", "uncategorized")
        groups[key] = groups.get(key, 0) + item.get("amount", 0)

    lines = [f"Total: {total:.2f} {currency} across {len(items)} expenses."]
    lines.append(f"Breakdown by {group_by}:")
    for key in sorted(groups, key=lambda k: groups[k], reverse=True):
        lines.append(f"- {key}: {groups[key]:.2f} {currency}")

    return "\n".join(lines)


@tool(approval_mode="never_require")
async def add_expense(
    amount: Annotated[float, "The expense amount"],
    description: Annotated[str, "Brief description of the expense"],
    category: Annotated[str, "Expense category (e.g. food, transport, entertainment, bills, shopping, health)"],
    date_str: Annotated[str | None, "Date in YYYY-MM-DD format, defaults to today"] = None,
    payment_method: Annotated[str, "Payment method (cash, card, transfer)"] = "card",
    currency: Annotated[str, "Currency code"] = "EUR",
) -> str:
    """Add a new expense record to the database."""
    container = await get_expenses_container()

    if date_str is None:
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    expense_id = f"exp_{int(time.time())}_{random.randint(1000, 9999)}"

    expense = {
        "id": expense_id,
        "userId": USER_ID,
        "amount": amount,
        "currency": currency,
        "description": description,
        "category": category.lower(),
        "date": date_str,
        "paymentMethod": payment_method.lower(),
        "createdVia": "voice",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    await container.create_item(body=expense)

    return f"Expense added: {amount} {currency} for {description} on {date_str} (category: {category}, id: {expense_id})."


@tool(approval_mode="never_require")
async def update_expense(
    expense_id: Annotated[str, "The ID of the expense to update"],
    amount: Annotated[float | None, "New amount"] = None,
    description: Annotated[str | None, "New description"] = None,
    category: Annotated[str | None, "New category"] = None,
    date_str: Annotated[str | None, "New date in YYYY-MM-DD format"] = None,
    payment_method: Annotated[str | None, "New payment method"] = None,
    currency: Annotated[str | None, "New currency code"] = None,
) -> str:
    """Update an existing expense. Only provided fields will be changed."""
    container = await get_expenses_container()

    try:
        item = await container.read_item(item=expense_id, partition_key=USER_ID)
    except Exception:
        return f"Expense with id {expense_id} not found."

    updates = []
    if amount is not None:
        item["amount"] = amount
        updates.append(f"amount to {amount}")
    if description is not None:
        item["description"] = description
        updates.append(f"description to {description}")
    if category is not None:
        item["category"] = category.lower()
        updates.append(f"category to {category}")
    if date_str is not None:
        item["date"] = date_str
        updates.append(f"date to {date_str}")
    if payment_method is not None:
        item["paymentMethod"] = payment_method.lower()
        updates.append(f"payment method to {payment_method}")
    if currency is not None:
        item["currency"] = currency
        updates.append(f"currency to {currency}")

    if not updates:
        return "No fields to update were provided."

    await container.replace_item(item=expense_id, body=item)

    return f"Expense {expense_id} updated: {', '.join(updates)}."


@tool(approval_mode="never_require")
async def delete_expense(
    expense_id: Annotated[str, "The ID of the expense to delete"],
) -> str:
    """Delete an expense record from the database."""
    container = await get_expenses_container()

    try:
        await container.delete_item(item=expense_id, partition_key=USER_ID)
    except Exception:
        return f"Expense with id {expense_id} not found."

    return f"Expense {expense_id} has been deleted."
