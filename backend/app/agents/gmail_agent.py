from datetime import datetime
from zoneinfo import ZoneInfo

from agent_framework import Agent
from agent_framework.azure import AzureOpenAIChatClient

from app.agents.tools.gmail import GMAIL_TOOLS

GMAIL_SYSTEM_PROMPT = (
    "You are the Email Agent, a specialist within the Jarvis assistant. "
    "Your role is to manage the user's Gmail using the tools available to you. "
    "You can search emails, read full messages, send new emails, reply to emails, and list recent inbox messages.\n\n"
    "IMPORTANT RULES:\n"
    "1. To send an email you MUST have all three: recipient (to), subject, and body. "
    "If any of these are missing, ask the user for the missing information before calling send_email.\n"
    "2. To reply to an email you MUST have: the email ID and the reply body. "
    "If the user wants to reply but hasn't specified which email, search or list emails first to find the right one.\n"
    "3. When listing or searching emails, present results in a natural, conversational way suitable for voice output. "
    "Never use markdown, bullet points, or emoji.\n"
    "4. When reading an email, summarize the content concisely unless the user asks for the full text.\n"
    "5. Always respond in the same language the user speaks to you.\n"
    "6. Keep responses concise and natural, as they will be spoken aloud.\n"
    "7. For Gmail search queries, you can use standard Gmail search operators like "
    "'from:', 'to:', 'subject:', 'is:unread', 'has:attachment', 'newer_than:', 'older_than:', etc."
)


def create_gmail_agent(client: AzureOpenAIChatClient) -> Agent:
    """Create the Gmail agent using the shared Azure OpenAI client."""
    now = datetime.now(ZoneInfo("Europe/Rome"))
    date_context = f"\n\nToday's date is {now.strftime('%A, %Y-%m-%d')} and the current time is {now.strftime('%H:%M')}. Use this to resolve relative time references."

    return Agent(
        client=client,
        name="gmail-agent",
        description="Manages Gmail: search, read, send, reply to emails and list recent inbox messages.",
        instructions=GMAIL_SYSTEM_PROMPT + date_context,
        tools=GMAIL_TOOLS,
    )
