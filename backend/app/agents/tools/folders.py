import time
import random
from datetime import datetime, timezone
from typing import Annotated

from agent_framework import tool

from app.database.cosmos import get_expenses_container

USER_ID = "fede"


@tool(approval_mode="never_require")
async def create_folder(
    name: Annotated[str, "Name of the folder"],
    description: Annotated[str | None, "Optional description for the folder"] = None,
) -> str:
    """Create a new folder to group related expenses together (e.g., a trip, event, or project)."""
    container = await get_expenses_container()

    folder_id = f"fld_{int(time.time())}_{random.randint(1000, 9999)}"

    folder = {
        "id": folder_id,
        "userId": USER_ID,
        "type": "folder",
        "name": name,
        "description": description or "",
        "imageUrl": None,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    await container.create_item(body=folder)

    desc_part = f" ({description})" if description else ""
    return f"Folder '{name}'{desc_part} created successfully (id: {folder_id})."


@tool(approval_mode="never_require")
async def list_folders() -> str:
    """List all expense folders with their name, expense count, and total spending."""
    container = await get_expenses_container()

    # Fetch all folders
    folder_query = (
        "SELECT * FROM c WHERE c.userId = @userId AND c.type = 'folder' "
        "ORDER BY c.createdAt DESC"
    )
    folder_params = [{"name": "@userId", "value": USER_ID}]

    folders = []
    async for item in container.query_items(query=folder_query, parameters=folder_params):
        folders.append(item)

    if not folders:
        return "You don't have any folders yet. You can create one to group related expenses together."

    # Fetch all expenses that have a folderId
    expense_query = (
        "SELECT c.folderId, c.amount, c.currency FROM c "
        "WHERE c.userId = @userId "
        "AND (c.type = 'expense' OR NOT IS_DEFINED(c.type)) "
        "AND IS_DEFINED(c.folderId)"
    )
    expense_params = [{"name": "@userId", "value": USER_ID}]

    # Build a map: folderId -> {count, total}
    folder_stats: dict[str, dict] = {}
    async for exp in container.query_items(query=expense_query, parameters=expense_params):
        fid = exp.get("folderId")
        if fid:
            if fid not in folder_stats:
                folder_stats[fid] = {"count": 0, "total": 0.0}
            folder_stats[fid]["count"] += 1
            folder_stats[fid]["total"] += exp.get("amount", 0)

    lines = [f"You have {len(folders)} folder{'s' if len(folders) != 1 else ''}:"]
    for folder in folders:
        fid = folder["id"]
        stats = folder_stats.get(fid, {"count": 0, "total": 0.0})
        desc = folder.get("description")
        desc_part = f" - {desc}" if desc else ""
        lines.append(
            f"- {folder['name']}{desc_part}: "
            f"{stats['count']} expense{'s' if stats['count'] != 1 else ''}, "
            f"{stats['total']:.2f} EUR total (id: {fid})"
        )

    return "\n".join(lines)


@tool(approval_mode="never_require")
async def add_expense_to_folder(
    expense_id: Annotated[str, "The ID of the expense to assign"],
    folder_id: Annotated[str, "The ID of the folder to assign the expense to"],
) -> str:
    """Assign an existing expense to a folder by setting its folderId."""
    container = await get_expenses_container()

    # Verify the folder exists
    try:
        folder = await container.read_item(item=folder_id, partition_key=USER_ID)
        if folder.get("type") != "folder":
            return f"Item {folder_id} is not a folder."
    except Exception:
        return f"Folder with id {folder_id} not found."

    # Read the expense
    try:
        expense = await container.read_item(item=expense_id, partition_key=USER_ID)
    except Exception:
        return f"Expense with id {expense_id} not found."

    # Assign to folder
    expense["folderId"] = folder_id
    await container.replace_item(item=expense_id, body=expense)

    return (
        f"Expense '{expense.get('description', expense_id)}' "
        f"has been added to folder '{folder['name']}'."
    )


@tool(approval_mode="never_require")
async def query_folder_expenses(
    folder_id: Annotated[str, "The ID of the folder to query expenses from"],
    category: Annotated[str | None, "Filter by category"] = None,
    start_date: Annotated[str | None, "Start date in YYYY-MM-DD format"] = None,
    end_date: Annotated[str | None, "End date in YYYY-MM-DD format"] = None,
) -> str:
    """Query expenses within a specific folder, with optional filters for category and date range."""
    container = await get_expenses_container()

    # Verify the folder exists
    try:
        folder = await container.read_item(item=folder_id, partition_key=USER_ID)
        if folder.get("type") != "folder":
            return f"Item {folder_id} is not a folder."
    except Exception:
        return f"Folder with id {folder_id} not found."

    conditions = [
        "c.userId = @userId",
        "(c.type = 'expense' OR NOT IS_DEFINED(c.type))",
        "c.folderId = @folderId",
    ]
    params = [
        {"name": "@userId", "value": USER_ID},
        {"name": "@folderId", "value": folder_id},
    ]

    if category:
        conditions.append("LOWER(c.category) = LOWER(@category)")
        params.append({"name": "@category", "value": category})
    if start_date:
        conditions.append("c.date >= @startDate")
        params.append({"name": "@startDate", "value": start_date})
    if end_date:
        conditions.append("c.date <= @endDate")
        params.append({"name": "@endDate", "value": end_date})

    query = f"SELECT * FROM c WHERE {' AND '.join(conditions)} ORDER BY c.date DESC"

    items = []
    async for item in container.query_items(query=query, parameters=params):
        items.append(item)

    folder_name = folder.get("name", folder_id)

    if not items:
        return f"No expenses found in folder '{folder_name}' with the given filters."

    total = sum(item.get("amount", 0) for item in items)
    currency = items[0].get("currency", "EUR")

    lines = [
        f"Folder '{folder_name}' has {len(items)} expense{'s' if len(items) != 1 else ''} "
        f"totaling {total:.2f} {currency}:"
    ]
    for item in items:
        amount = item.get("amount", 0)
        cur = item.get("currency", "EUR")
        desc = item.get("description", "No description")
        cat = item.get("category", "uncategorized")
        date = item.get("date", "unknown date")
        lines.append(f"- {date}: {amount} {cur} for {desc} (category: {cat}, id: {item.get('id', '')})")

    return "\n".join(lines)
