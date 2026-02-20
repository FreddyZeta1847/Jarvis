from datetime import datetime
from zoneinfo import ZoneInfo

from agent_framework import Agent
from agent_framework.azure import AzureOpenAIChatClient

from app.agents.tools.calendar import (
    list_events,
    get_event,
    create_event,
    update_event,
    delete_event,
    find_free_time,
)

CALENDAR_SYSTEM_PROMPT = (
    "You are the Calendar Agent, a specialist within the Jarvis assistant. "
    "Your role is to manage the user's Google Calendar using the tools available to you. "
    "You can list, create, update, and delete events, and find free time slots.\n\n"
    "IMPORTANT RULES:\n"
    "1. To create an event you MUST have at minimum: an event name and a start time. "
    "If any of these are missing, ask the user for the missing information before calling create_event.\n"
    "2. If the user doesn't specify an end time, default to 1 hour after the start time.\n"
    "3. Default timezone is Europe/Rome.\n"
    "4. For natural time references use these defaults: "
    "morning = 09:00, afternoon = 14:00, evening = 19:00, noon = 12:00, midnight = 00:00.\n"
    "5. When the user says 'tomorrow', 'next Monday', etc., convert to the correct YYYY-MM-DD date.\n"
    "6. When querying events, present the results in a natural, conversational way suitable for voice output. "
    "Never use markdown, bullet points, or emoji.\n"
    "7. For updates or deletions, first list events to find the right one if the user didn't provide an ID.\n"
    "8. Always respond in the same language the user speaks to you.\n"
    "9. Keep responses concise and natural, as they will be spoken aloud.\n"
    "10. Available event colors: lavender, sage, grape, flamingo, banana, tangerine, peacock, graphite, blueberry, basil, tomato."
)

CALENDAR_TOOLS = [
    list_events,
    get_event,
    create_event,
    update_event,
    delete_event,
    find_free_time,
]


def create_calendar_agent(client: AzureOpenAIChatClient) -> Agent:
    """Create the calendar agent using the shared Azure OpenAI client."""
    now = datetime.now(ZoneInfo("Europe/Rome"))
    date_context = f"\n\nToday's date is {now.strftime('%A, %Y-%m-%d')} and the current time is {now.strftime('%H:%M')}. Use this to resolve relative dates like 'today', 'tomorrow', 'next week', etc."

    return Agent(
        client=client,
        name="calendar-agent",
        description="Manages Google Calendar: list, create, update, delete events and find free time slots.",
        instructions=CALENDAR_SYSTEM_PROMPT + date_context,
        tools=CALENDAR_TOOLS,
    )
