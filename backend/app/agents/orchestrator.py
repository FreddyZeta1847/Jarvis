import logging

from agent_framework import Agent
from agent_framework.azure import AzureOpenAIChatClient

from app import config
from app.agents.expenses_agent import create_expenses_agent
from app.agents.calendar_agent import create_calendar_agent
from app.agents.weather_agent import create_weather_agent
from app.agents.gmail_agent import create_gmail_agent

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are Jarvis, a personal AI voice assistant. "
    "You are helpful, concise, and friendly. "
    "Keep responses short and conversational since they will be spoken aloud via text-to-speech. "
    "IMPORTANT: Never use emoji, markdown formatting (**, ##, -, *), bullet points, or numbered lists. "
    "Output only plain text, as if you were speaking naturally to someone. "
    "Respond in the same language the user speaks to you.\n\n"
    "You have access to specialist agents. "
    "When the user asks anything related to expenses, spending, costs, payments, or money tracking, "
    "delegate to the expenses tool. "
    "When the user asks anything related to calendar, events, schedule, meetings, appointments, or free time, "
    "delegate to the calendar tool. "
    "When the user asks anything related to weather, temperature, rain, forecast, climate, or outdoor conditions, "
    "delegate to the weather tool. "
    "When the user asks anything related to email, gmail, inbox, messages, sending emails, or checking mail, "
    "delegate to the gmail tool. "
    "Pass the user's full request as-is. "
    "If a specialist tool asks a clarification question, relay it naturally to the user. "
    "For all other topics, respond directly."
)

_agent = None
_thread = None  # the memory of the conversation, it cancel evry time the backend restart


def _create_client():
    if not config.AZURE_OPENAI_KEY or not config.AZURE_OPENAI_ENDPOINT or not config.AZURE_OPENAI_DEPLOYMENT:
        raise RuntimeError(
            "Azure OpenAI not configured. "
            "Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, and AZURE_OPENAI_DEPLOYMENT in .env"
        )

    return AzureOpenAIChatClient(
        api_version=config.AZURE_OPENAI_API_VERSION,
        api_key=config.AZURE_OPENAI_KEY,
        endpoint=config.AZURE_OPENAI_ENDPOINT,
        deployment_name=config.AZURE_OPENAI_DEPLOYMENT,
    )


def _create_agent():
    client = _create_client()
    logger.info("Azure OpenAI client connected (deployment=%s)", config.AZURE_OPENAI_DEPLOYMENT)

    # Create the expenses agent and wrap it as a tool for the orchestrator
    expenses_agent = create_expenses_agent(client)
    expenses_tool = expenses_agent.as_tool(
        name="expenses",
        description=(
            "Manage user expenses: add, query, update, delete expenses and get spending summaries. "
            "Use this for any request related to expenses, spending, costs, or payments."
        ),
        arg_name="request",
        arg_description="The user's expense-related request in natural language",
    )

    # Create the calendar agent and wrap it as a tool for the orchestrator
    calendar_agent = create_calendar_agent(client)
    calendar_tool = calendar_agent.as_tool(
        name="calendar",
        description=(
            "Manage Google Calendar: list, create, update, delete events and find free time slots. "
            "Use this for any request related to calendar, events, schedule, meetings, or appointments."
        ),
        arg_name="request",
        arg_description="The user's calendar-related request in natural language",
    )

    # Create the weather agent and wrap it as a tool for the orchestrator
    weather_agent = create_weather_agent(client)
    weather_tool = weather_agent.as_tool(
        name="weather",
        description=(
            "Get weather information: current conditions and multi-day forecasts for any location. "
            "Use this for any request related to weather, temperature, rain, forecast, or climate."
        ),
        arg_name="request",
        arg_description="The user's weather-related request in natural language",
    )

    # Create the gmail agent and wrap it as a tool for the orchestrator
    gmail_agent = create_gmail_agent(client)
    gmail_tool = gmail_agent.as_tool(
        name="gmail",
        description=(
            "Manage Gmail: search, read, send, and reply to emails, and list recent inbox messages. "
            "Use this for any request related to email, gmail, inbox, or messages."
        ),
        arg_name="request",
        arg_description="The user's email-related request in natural language",
    )

    logger.info("Orchestrator ready (tools: expenses, calendar, weather, gmail)")

    return Agent(
        client=client,
        name="jarvis",
        instructions=SYSTEM_PROMPT,
        tools=[expenses_tool, calendar_tool, weather_tool, gmail_tool],
    )


def get_agent():
    global _agent
    if _agent is None:
        _agent = _create_agent()
    return _agent


def get_thread():
    global _thread
    if _thread is None:
        _thread = get_agent().get_new_thread()
    return _thread


def reset_thread():
    """Start a new conversation (clears history)."""
    global _thread
    _thread = None


async def send_message(message: str) -> str:
    """Send a message to Jarvis and return the response text."""
    agent = get_agent()
    thread = get_thread()
    response = await agent.run(message, thread=thread)
    return response.text or ""
