from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional, List
import time
import random

from app.auth.jwt import get_current_user
from app.database.cosmos import get_expenses_container
from app.database.blob import upload_image, delete_image

router = APIRouter()

USER_ID = "fede"


# --- Request models ---

class AssignExpenses(BaseModel):
    expenseIds: List[str]


# --- Helpers ---

def _extract_blob_filename(image_url: str) -> Optional[str]:
    """Extract blob filename from a full blob URL."""
    if not image_url:
        return None
    # URL format: https://<account>.blob.core.windows.net/folder-images/<filename>
    parts = image_url.rstrip("/").split("/")
    return parts[-1] if parts else None


# --- Endpoints ---

@router.get("/folders")
async def list_folders(
    user: dict = Depends(get_current_user),
):
    container = await get_expenses_container()

    # Get all folders
    folder_query = "SELECT * FROM c WHERE c.userId = @userId AND c.type = 'folder' ORDER BY c.createdAt DESC"
    folder_params = [{"name": "@userId", "value": USER_ID}]

    try:
        folders = []
        async for item in container.query_items(query=folder_query, parameters=folder_params):
            folders.append(item)

        # Get expense counts and totals per folder (client-side aggregation)
        if folders:
            stats_query = (
                "SELECT c.folderId, c.amount FROM c "
                "WHERE c.userId = @userId AND IS_DEFINED(c.folderId) AND c.folderId != null "
                "AND (c.type = 'expense' OR NOT IS_DEFINED(c.type))"
            )
            stats_params = [{"name": "@userId", "value": USER_ID}]

            stats_map = {}
            async for item in container.query_items(query=stats_query, parameters=stats_params):
                fid = item["folderId"]
                if fid not in stats_map:
                    stats_map[fid] = {"expenseCount": 0, "total": 0}
                stats_map[fid]["expenseCount"] += 1
                stats_map[fid]["total"] += item.get("amount", 0)

            for folder in folders:
                stats = stats_map.get(folder["id"], {"expenseCount": 0, "total": 0})
                folder["expenseCount"] = stats["expenseCount"]
                folder["total"] = stats["total"]

        return {"folders": folders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/folders/{folder_id}")
async def get_folder(
    folder_id: str,
    user: dict = Depends(get_current_user),
):
    container = await get_expenses_container()

    try:
        item = await container.read_item(item=folder_id, partition_key=USER_ID)
        if item.get("type") != "folder":
            raise HTTPException(status_code=404, detail="Folder not found")
        return {"folder": item}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Folder not found")


@router.post("/folders", status_code=201)
async def create_folder(
    name: str = Form(...),
    description: str = Form(""),
    image: Optional[UploadFile] = File(None),
    user: dict = Depends(get_current_user),
):
    container = await get_expenses_container()

    folder_id = f"fld_{int(time.time())}_{random.randint(1000, 9999)}"

    image_url = ""
    if image and image.filename:
        file_bytes = await image.read()
        ext = image.filename.rsplit(".", 1)[-1] if "." in image.filename else "jpg"
        blob_filename = f"{folder_id}.{ext}"
        content_type = image.content_type or "image/jpeg"
        image_url = upload_image(file_bytes, blob_filename, content_type)

    folder = {
        "id": folder_id,
        "userId": USER_ID,
        "type": "folder",
        "name": name,
        "description": description,
        "imageUrl": image_url,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    await container.create_item(body=folder)
    return {"folder": folder}


@router.put("/folders/{folder_id}")
async def update_folder(
    folder_id: str,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    user: dict = Depends(get_current_user),
):
    container = await get_expenses_container()

    try:
        item = await container.read_item(item=folder_id, partition_key=USER_ID)
        if item.get("type") != "folder":
            raise HTTPException(status_code=404, detail="Folder not found")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Folder not found")

    if name is not None:
        item["name"] = name
    if description is not None:
        item["description"] = description

    if image and image.filename:
        # Delete old image if exists
        old_filename = _extract_blob_filename(item.get("imageUrl", ""))
        if old_filename:
            delete_image(old_filename)

        file_bytes = await image.read()
        ext = image.filename.rsplit(".", 1)[-1] if "." in image.filename else "jpg"
        blob_filename = f"{folder_id}.{ext}"
        content_type = image.content_type or "image/jpeg"
        item["imageUrl"] = upload_image(file_bytes, blob_filename, content_type)

    await container.replace_item(item=folder_id, body=item)
    return {"folder": item}


@router.delete("/folders/{folder_id}", status_code=204)
async def delete_folder(
    folder_id: str,
    user: dict = Depends(get_current_user),
):
    container = await get_expenses_container()

    try:
        item = await container.read_item(item=folder_id, partition_key=USER_ID)
        if item.get("type") != "folder":
            raise HTTPException(status_code=404, detail="Folder not found")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Delete blob image if exists
    old_filename = _extract_blob_filename(item.get("imageUrl", ""))
    if old_filename:
        delete_image(old_filename)

    # Unassign all expenses from this folder
    unassign_query = (
        "SELECT * FROM c WHERE c.userId = @userId AND c.folderId = @folderId "
        "AND (c.type = 'expense' OR NOT IS_DEFINED(c.type))"
    )
    unassign_params = [
        {"name": "@userId", "value": USER_ID},
        {"name": "@folderId", "value": folder_id},
    ]
    async for expense in container.query_items(query=unassign_query, parameters=unassign_params):
        expense.pop("folderId", None)
        await container.replace_item(item=expense["id"], body=expense)

    # Delete the folder document
    await container.delete_item(item=folder_id, partition_key=USER_ID)


@router.post("/folders/{folder_id}/expenses")
async def assign_expenses_to_folder(
    folder_id: str,
    body: AssignExpenses,
    user: dict = Depends(get_current_user),
):
    container = await get_expenses_container()

    # Verify folder exists
    try:
        folder = await container.read_item(item=folder_id, partition_key=USER_ID)
        if folder.get("type") != "folder":
            raise HTTPException(status_code=404, detail="Folder not found")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Folder not found")

    updated = []
    for expense_id in body.expenseIds:
        try:
            expense = await container.read_item(item=expense_id, partition_key=USER_ID)
            expense["folderId"] = folder_id
            await container.replace_item(item=expense_id, body=expense)
            updated.append(expense_id)
        except Exception:
            pass  # Skip expenses that don't exist

    return {"assignedCount": len(updated), "expenseIds": updated}


@router.delete("/folders/{folder_id}/expenses/{expense_id}")
async def remove_expense_from_folder(
    folder_id: str,
    expense_id: str,
    user: dict = Depends(get_current_user),
):
    container = await get_expenses_container()

    try:
        expense = await container.read_item(item=expense_id, partition_key=USER_ID)
    except Exception:
        raise HTTPException(status_code=404, detail="Expense not found")

    if expense.get("folderId") != folder_id:
        raise HTTPException(status_code=400, detail="Expense is not in this folder")

    expense.pop("folderId", None)
    await container.replace_item(item=expense_id, body=expense)
    return {"expense": expense}
