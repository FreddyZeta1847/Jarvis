import asyncio
import logging
from datetime import datetime, timedelta
from typing import Annotated
from zoneinfo import ZoneInfo

from agent_framework import tool

from app.services.google_calendar import get_calendar_service

logger = logging.getLogger(__name__)

DEFAULT_TIMEZONE = "Europe/Rome"

# Google Calendar's named color IDs
COLOR_MAP = {
    "lavender": "1",
    "sage": "2",
    "grape": "3",
    "flamingo": "4",
    "banana": "5",
    "tangerine": "6",
    "peacock": "7",
    "graphite": "8",
    "blueberry": "9",
    "basil": "10",
    "tomato": "11",
}


def _run_sync(func, *args, **kwargs):
    """Run a synchronous Google API call in a thread."""
    return asyncio.to_thread(func, *args, **kwargs)


@tool(approval_mode="never_require")
async def list_events(
    start_date: Annotated[str, "Start date in YYYY-MM-DD format"],
    end_date: Annotated[str | None, "End date in YYYY-MM-DD format, defaults to same as start_date"] = None,
    search_query: Annotated[str | None, "Optional text to search for in event names"] = None,
    max_results: Annotated[int, "Maximum number of events to return"] = 20,
) -> str:
    """List calendar events within a date range, optionally filtered by text search."""
    try:
        service = get_calendar_service()
    except Exception as e:
        logger.error("Failed to get calendar service: %s", e)
        return f"Error connecting to Google Calendar: {e}"

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
        "maxResults": max_results,
        "singleEvents": True,
        "orderBy": "startTime",
    }
    if search_query:
        kwargs["q"] = search_query

    try:
        result = await _run_sync(service.events().list(**kwargs).execute)
    except Exception as e:
        logger.error("Google Calendar list_events failed: %s", e)
        return f"Error querying calendar: {e}"

    events = result.get("items", [])
    if not events:
        return "No events found for that period."

    lines = [f"Found {len(events)} event{'s' if len(events) != 1 else ''}:"]
    for event in events:
        summary = event.get("summary", "No title")
        start = event.get("start", {})
        end = event.get("end", {})
        start_str = start.get("dateTime", start.get("date", ""))
        end_str = end.get("dateTime", end.get("date", ""))
        location = event.get("location", "")
        event_id = event.get("id", "")

        line = f"- {summary}: {start_str} to {end_str}"
        if location:
            line += f" at {location}"
        line += f" (id: {event_id})"
        lines.append(line)

    return "\n".join(lines)


@tool(approval_mode="never_require")
async def get_event(
    event_id: Annotated[str, "The Google Calendar event ID"],
) -> str:
    """Fetch details for a single calendar event by its ID."""
    service = get_calendar_service()

    try:
        event = await _run_sync(
            service.events().get(calendarId="primary", eventId=event_id).execute
        )
    except Exception as e:
        logger.error("Google Calendar get_event failed: %s", e)
        return f"Event with id {event_id} not found."

    summary = event.get("summary", "No title")
    start = event.get("start", {})
    end = event.get("end", {})
    start_str = start.get("dateTime", start.get("date", ""))
    end_str = end.get("dateTime", end.get("date", ""))
    description = event.get("description", "")
    location = event.get("location", "")
    status = event.get("status", "")

    lines = [
        f"Event: {summary}",
        f"Start: {start_str}",
        f"End: {end_str}",
    ]
    if description:
        lines.append(f"Description: {description}")
    if location:
        lines.append(f"Location: {location}")
    lines.append(f"Status: {status}")
    lines.append(f"ID: {event.get('id', '')}")

    return "\n".join(lines)


@tool(approval_mode="never_require")
async def create_event(
    name: Annotated[str, "Event name/title"],
    start_time: Annotated[str, "Start time in ISO format YYYY-MM-DDTHH:MM:SS"],
    end_time: Annotated[str | None, "End time in ISO format YYYY-MM-DDTHH:MM:SS, defaults to 1 hour after start"] = None,
    description: Annotated[str | None, "Event description"] = None,
    location: Annotated[str | None, "Event location"] = None,
    color: Annotated[str | None, "Color name: lavender, sage, grape, flamingo, banana, tangerine, peacock, graphite, blueberry, basil, tomato"] = None,
    timezone: Annotated[str, "Timezone for the event"] = DEFAULT_TIMEZONE,
) -> str:
    """Create a new Google Calendar event."""
    service = get_calendar_service()

    if end_time is None:
        start_dt = datetime.fromisoformat(start_time)
        end_dt = start_dt + timedelta(hours=1)
        end_time = end_dt.isoformat()

    body = {
        "summary": name,
        "start": {"dateTime": start_time, "timeZone": timezone},
        "end": {"dateTime": end_time, "timeZone": timezone},
    }

    if description:
        body["description"] = description
    if location:
        body["location"] = location
    if color and color.lower() in COLOR_MAP:
        body["colorId"] = COLOR_MAP[color.lower()]

    try:
        event = await _run_sync(
            service.events().insert(calendarId="primary", body=body).execute
        )
    except Exception as e:
        logger.error("Google Calendar create_event failed: %s", e)
        return f"Error creating event: {e}"

    return (
        f"Event created: {name} from {start_time} to {end_time}"
        f" (id: {event.get('id', '')})"
    )


@tool(approval_mode="never_require")
async def update_event(
    event_id: Annotated[str, "The Google Calendar event ID to update"],
    name: Annotated[str | None, "New event name"] = None,
    start_time: Annotated[str | None, "New start time in ISO format YYYY-MM-DDTHH:MM:SS"] = None,
    end_time: Annotated[str | None, "New end time in ISO format YYYY-MM-DDTHH:MM:SS"] = None,
    description: Annotated[str | None, "New description"] = None,
    location: Annotated[str | None, "New location"] = None,
    color: Annotated[str | None, "New color name"] = None,
    timezone: Annotated[str, "Timezone for the event"] = DEFAULT_TIMEZONE,
) -> str:
    """Update an existing Google Calendar event. Only provided fields will be changed."""
    service = get_calendar_service()

    try:
        event = await _run_sync(
            service.events().get(calendarId="primary", eventId=event_id).execute
        )
    except Exception as e:
        logger.error("Google Calendar update_event fetch failed: %s", e)
        return f"Event with id {event_id} not found."

    updates = []
    if name is not None:
        event["summary"] = name
        updates.append(f"name to {name}")
    if start_time is not None:
        event["start"] = {"dateTime": start_time, "timeZone": timezone}
        updates.append(f"start to {start_time}")
    if end_time is not None:
        event["end"] = {"dateTime": end_time, "timeZone": timezone}
        updates.append(f"end to {end_time}")
    if description is not None:
        event["description"] = description
        updates.append(f"description to {description}")
    if location is not None:
        event["location"] = location
        updates.append(f"location to {location}")
    if color is not None and color.lower() in COLOR_MAP:
        event["colorId"] = COLOR_MAP[color.lower()]
        updates.append(f"color to {color}")

    if not updates:
        return "No fields to update were provided."

    try:
        await _run_sync(
            service.events().update(calendarId="primary", eventId=event_id, body=event).execute
        )
    except Exception as e:
        logger.error("Google Calendar update_event failed: %s", e)
        return f"Error updating event: {e}"

    return f"Event {event_id} updated: {', '.join(updates)}."


@tool(approval_mode="never_require")
async def delete_event(
    event_id: Annotated[str, "The Google Calendar event ID to delete"],
) -> str:
    """Delete a Google Calendar event."""
    service = get_calendar_service()

    try:
        await _run_sync(
            service.events().delete(calendarId="primary", eventId=event_id).execute
        )
    except Exception as e:
        logger.error("Google Calendar delete_event failed: %s", e)
        return f"Event with id {event_id} not found."

    return f"Event {event_id} has been deleted."


@tool(approval_mode="never_require")
async def find_free_time(
    date: Annotated[str, "Date to check in YYYY-MM-DD format"],
    work_hours_start: Annotated[str, "Start of day to consider, HH:MM format"] = "08:00",
    work_hours_end: Annotated[str, "End of day to consider, HH:MM format"] = "20:00",
) -> str:
    """Find free time slots for a given date by checking busy periods."""
    service = get_calendar_service()

    tz = ZoneInfo(DEFAULT_TIMEZONE)
    dt_min = datetime.fromisoformat(f"{date}T{work_hours_start}:00").replace(tzinfo=tz)
    dt_max = datetime.fromisoformat(f"{date}T{work_hours_end}:00").replace(tzinfo=tz)

    body = {
        "timeMin": dt_min.isoformat(),
        "timeMax": dt_max.isoformat(),
        "timeZone": DEFAULT_TIMEZONE,
        "items": [{"id": "primary"}],
    }

    try:
        result = await _run_sync(
            service.freebusy().query(body=body).execute
        )
    except Exception as e:
        logger.error("Google Calendar find_free_time failed: %s", e)
        return f"Error checking free time: {e}"

    busy_slots = result.get("calendars", {}).get("primary", {}).get("busy", [])

    if not busy_slots:
        return f"You are completely free on {date} between {work_hours_start} and {work_hours_end}."

    lines = [f"Busy times on {date}:"]
    for slot in busy_slots:
        start = slot.get("start", "")
        end = slot.get("end", "")
        start_time = start[11:16] if len(start) > 16 else start
        end_time = end[11:16] if len(end) > 16 else end
        lines.append(f"- Busy from {start_time} to {end_time}")

    # Calculate free slots
    free_lines = ["\nFree times:"]
    day_start = datetime.fromisoformat(f"{date}T{work_hours_start}:00")
    day_end = datetime.fromisoformat(f"{date}T{work_hours_end}:00")

    current = day_start
    for slot in busy_slots:
        busy_start_str = slot.get("start", "")
        busy_end_str = slot.get("end", "")
        busy_start = datetime.fromisoformat(busy_start_str.replace("Z", "+00:00").replace("+00:00", "").replace("+01:00", "").replace("+02:00", "")[:19])
        busy_end = datetime.fromisoformat(busy_end_str.replace("Z", "+00:00").replace("+00:00", "").replace("+01:00", "").replace("+02:00", "")[:19])

        if current < busy_start:
            free_lines.append(f"- Free from {current.strftime('%H:%M')} to {busy_start.strftime('%H:%M')}")
        current = max(current, busy_end)

    if current < day_end:
        free_lines.append(f"- Free from {current.strftime('%H:%M')} to {day_end.strftime('%H:%M')}")

    return "\n".join(lines + free_lines)
