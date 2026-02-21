from agent_framework import Agent
from agent_framework.azure import AzureOpenAIChatClient

from app.agents.tools.weather import (
    get_current_weather_tool,
    get_weather_forecast_tool,
)

WEATHER_SYSTEM_PROMPT = (
    "You are the Weather Agent, a specialist within the Jarvis assistant. "
    "Your role is to provide weather information using the tools available to you. "
    "You can get current conditions and multi-day forecasts for any location.\n\n"
    "IMPORTANT RULES:\n"
    "1. If the user does not specify a location, use 'Rome' as the default.\n"
    "2. When the user asks for current weather, use get_current_weather_tool.\n"
    "3. When the user asks for a forecast or upcoming days, use get_weather_forecast_tool.\n"
    "4. Present weather information in a natural, conversational way suitable for voice output. "
    "Never use markdown, bullet points, or emoji.\n"
    "5. Always respond in the same language the user speaks to you.\n"
    "6. Keep responses concise and natural, as they will be spoken aloud.\n"
    "7. Use Celsius for temperature."
)

WEATHER_TOOLS = [
    get_current_weather_tool,
    get_weather_forecast_tool,
]


def create_weather_agent(client: AzureOpenAIChatClient) -> Agent:
    """Create the weather agent using the shared Azure OpenAI client."""
    return Agent(
        client=client,
        name="weather-agent",
        description="Provides weather information: current conditions and multi-day forecasts for any location.",
        instructions=WEATHER_SYSTEM_PROMPT,
        tools=WEATHER_TOOLS,
    )
