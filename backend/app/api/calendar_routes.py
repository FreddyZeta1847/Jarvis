import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.auth.jwt import get_current_user
from app.services.google_calendar import get_calendar_service

logger = logging.getLogger(__name__)

router = APIRouter()

DEFAULT_TIMEZONE = "Europe/Rome"


def _run_sync(func):
    return asyncio.to_thread(func)


# --- Request/Response models ---

class EventCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    start: str = Field(description="Start time in ISO format YYYY-MM-DDTHH:MM:SS")
    end: Optional[str] = Field(default=None, description="End time, defaults to 1h after start")
    description: Optional[str] = None
    location: Optional[str] = None
    color: Optional[str] = None
    timezone: str = DEFAULT_TIMEZONE


class EventUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    start: Optional[str] = None
    end: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    color: Optional[str] = None
    timezone: str = DEFAULT_TIMEZONE


COLOR_MAP = {
    "lavender": "1", "sage": "2", "grape": "3", "flamingo": "4",
    "banana": "5", "tangerine": "6", "peacock": "7", "graphite": "8",
    "blueberry": "9", "basil": "10", "tomato": "11",
}


# --- Endpoints ---

@router.get("/calendar/events")
async def list_events(
    start_date: str = Query(description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(default=None, description="End date YYYY-MM-DD, defaults to start_date"),
    q: Optional[str] = Query(default=None, description="Text search in event names"),
    limit: int = Query(default=20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    service = get_calendar_service()

    if end_date is None:
        end_date = start_date

    tz = ZoneInfo(DEFAULT_TIMEZONE)
    time_min = datetime(int(start_date[:4]), int(start_date[5:7]), int(start_date[8:10]), 0, 0, 0, tzinfo=tz).isoformat()
    time_max = datetime(int(end_date[:4]), int(end_date[5:7]), int(end_date[8:10]), 23, 59, 59, tzinfo=tz).isoformat()

    kwargs = {
        "calendarId": "primary",
        "timeMin": time_min,
        "timeMax": time_max,
        "timeZone": DEFAULT_TIMEZONE,
        "maxResults": limit,
        "singleEvents": True,
        "orderBy": "startTime",
    }
    if q:
        kwargs["q"] = q

    try:
        result = await _run_sync(service.events().list(**kwargs).execute)
    except Exception as e:
        logger.error("Calendar list_events failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e))

    return {"events": result.get("items", [])}


@router.get("/calendar/events/{event_id}")
async def get_event(
    event_id: str,
    user: dict = Depends(get_current_user),
):
    service = get_calendar_service()

    try:
        event = await _run_sync(
            service.events().get(calendarId="primary", eventId=event_id).execute
        )
    except Exception as e:
        logger.error("Calendar get_event failed: %s", e)
        raise HTTPException(status_code=404, detail="Event not found")

    return {"event": event}


@router.post("/calendar/events", status_code=201)
async def create_event(
    body: EventCreate,
    user: dict = Depends(get_current_user),
):
    service = get_calendar_service()

    end_time = body.end
    if end_time is None:
        start_dt = datetime.fromisoformat(body.start)
        end_time = (start_dt + timedelta(hours=1)).isoformat()

    event_body = {
        "summary": body.name,
        "start": {"dateTime": body.start, "timeZone": body.timezone},
        "end": {"dateTime": end_time, "timeZone": body.timezone},
    }

    if body.description:
        event_body["description"] = body.description
    if body.location:
        event_body["location"] = body.location
    if body.color and body.color.lower() in COLOR_MAP:
        event_body["colorId"] = COLOR_MAP[body.color.lower()]

    try:
        event = await _run_sync(
            service.events().insert(calendarId="primary", body=event_body).execute
        )
    except Exception as e:
        logger.error("Calendar create_event failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e))

    return {"event": event}


@router.patch("/calendar/events/{event_id}")
async def update_event(
    event_id: str,
    body: EventUpdate,
    user: dict = Depends(get_current_user),
):
    service = get_calendar_service()

    try:
        event = await _run_sync(
            service.events().get(calendarId="primary", eventId=event_id).execute
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Event not found")

    if body.name is not None:
        event["summary"] = body.name
    if body.start is not None:
        event["start"] = {"dateTime": body.start, "timeZone": body.timezone}
    if body.end is not None:
        event["end"] = {"dateTime": body.end, "timeZone": body.timezone}
    if body.description is not None:
        event["description"] = body.description
    if body.location is not None:
        event["location"] = body.location
    if body.color is not None and body.color.lower() in COLOR_MAP:
        event["colorId"] = COLOR_MAP[body.color.lower()]

    try:
        updated = await _run_sync(
            service.events().update(calendarId="primary", eventId=event_id, body=event).execute
        )
    except Exception as e:
        logger.error("Calendar update_event failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e))

    return {"event": updated}


@router.delete("/calendar/events/{event_id}", status_code=204)
async def delete_event(
    event_id: str,
    user: dict = Depends(get_current_user),
):
    service = get_calendar_service()

    try:
        await _run_sync(
            service.events().delete(calendarId="primary", eventId=event_id).execute
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Event not found")
