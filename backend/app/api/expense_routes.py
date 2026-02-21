from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional
import time
import random

from app.auth.jwt import get_current_user
from app.database.cosmos import get_expenses_container

router = APIRouter()

USER_ID = "fede"


# --- Request/Response models ---

class ExpenseCreate(BaseModel):
    amount: float = Field(gt=0)
    description: str = Field(min_length=1, max_length=200)
    category: str
    date: str
    paymentMethod: str = "card"
    currency: str = "EUR"
    folderId: Optional[str] = None


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0)
    description: Optional[str] = Field(default=None, min_length=1, max_length=200)
    category: Optional[str] = None
    date: Optional[str] = None
    paymentMethod: Optional[str] = None
    currency: Optional[str] = None
    folderId: Optional[str] = None


# --- Endpoints ---

@router.get("/expenses")
async def list_expenses(
    category: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None, alias="start_date"),
    end_date: Optional[str] = Query(None, alias="end_date"),
    folder_id: Optional[str] = Query(None, alias="folder_id"),
    limit: int = Query(50, ge=1, le=200),
    user: dict = Depends(get_current_user),
):
    container = await get_expenses_container()

    conditions = [
        "c.userId = @userId",
        "(c.type = 'expense' OR NOT IS_DEFINED(c.type))",
    ]
    params = [{"name": "@userId", "value": USER_ID}]

    if category:
        conditions.append("LOWER(c.category) = LOWER(@category)")
        params.append({"name": "@category", "value": category})
    if start_date:
        conditions.append("c.date >= @startDate")
        params.append({"name": "@startDate", "value": start_date})
    if end_date:
        conditions.append("c.date <= @endDate")
        params.append({"name": "@endDate", "value": end_date})
    if folder_id:
        conditions.append("c.folderId = @folderId")
        params.append({"name": "@folderId", "value": folder_id})

    query = f"SELECT * FROM c WHERE {' AND '.join(conditions)} ORDER BY c.date DESC OFFSET 0 LIMIT @limit"
    params.append({"name": "@limit", "value": limit})

    try:
        items = []
        async for item in container.query_items(query=query, parameters=params):
            items.append(item)
        return {"expenses": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/expenses", status_code=201)
async def create_expense(
    body: ExpenseCreate,
    user: dict = Depends(get_current_user),
):
    container = await get_expenses_container()

    expense_id = f"exp_{int(time.time())}_{random.randint(1000, 9999)}"

    expense = {
        "id": expense_id,
        "userId": USER_ID,
        "type": "expense",
        "amount": body.amount,
        "currency": body.currency,
        "description": body.description,
        "category": body.category.lower(),
        "date": body.date,
        "paymentMethod": body.paymentMethod.lower(),
        "createdVia": "web",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    if body.folderId:
        expense["folderId"] = body.folderId

    await container.create_item(body=expense)
    return {"expense": expense}


@router.patch("/expenses/{expense_id}")
async def update_expense(
    expense_id: str,
    body: ExpenseUpdate,
    user: dict = Depends(get_current_user),
):
    container = await get_expenses_container()

    try:
        item = await container.read_item(item=expense_id, partition_key=USER_ID)
    except Exception:
        raise HTTPException(status_code=404, detail="Expense not found")

    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "category" in updates:
        updates["category"] = updates["category"].lower()
    if "paymentMethod" in updates:
        updates["paymentMethod"] = updates["paymentMethod"].lower()

    item.update(updates)
    await container.replace_item(item=expense_id, body=item)
    return {"expense": item}


@router.delete("/expenses/{expense_id}", status_code=204)
async def delete_expense(
    expense_id: str,
    user: dict = Depends(get_current_user),
):
    container = await get_expenses_container()

    try:
        await container.delete_item(item=expense_id, partition_key=USER_ID)
    except Exception:
        raise HTTPException(status_code=404, detail="Expense not found")
