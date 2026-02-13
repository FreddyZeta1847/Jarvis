from agent_framework import Agent
from agent_framework.azure import AzureOpenAIChatClient

from app import config

SYSTEM_PROMPT = (
    "You are Jarvis, a personal AI voice assistant. "
    "You are helpful, concise, and friendly. "
    "Keep responses short and conversational since they will be spoken aloud via text-to-speech. "
    "IMPORTANT: Never use emoji, markdown formatting (**, ##, -, *), bullet points, or numbered lists. "
    "Output only plain text, as if you were speaking naturally to someone. "
    "Respond in the same language the user speaks to you."
)

_agent = None
_thread = None


def _create_agent():
    if not config.AZURE_OPENAI_KEY or not config.AZURE_OPENAI_ENDPOINT or not config.AZURE_OPENAI_DEPLOYMENT:
        raise RuntimeError(
            "Azure OpenAI not configured. "
            "Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, and AZURE_OPENAI_DEPLOYMENT in .env"
        )

    client = AzureOpenAIChatClient(
        api_version=config.AZURE_OPENAI_API_VERSION,
        api_key=config.AZURE_OPENAI_KEY,
        endpoint=config.AZURE_OPENAI_ENDPOINT,
        deployment_name=config.AZURE_OPENAI_DEPLOYMENT,
    )

    return Agent(
        client=client,
        instructions=SYSTEM_PROMPT,
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
