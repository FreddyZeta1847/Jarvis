from agent_framework import Agent
from agent_framework.azure import AzureOpenAIChatClient

from app.agents.plugins.expenses import (
    query_expenses,
    get_expense_summary,
    add_expense,
    update_expense,
    delete_expense,
)

EXPENSES_SYSTEM_PROMPT = (
    "You are the Expenses Agent, a specialist within the Jarvis assistant. "
    "Your role is to manage the user's personal expenses using the database tools available to you. "
    "You can add, query, update, and delete expenses, and provide spending summaries.\n\n"
    "IMPORTANT RULES:\n"
    "1. When the user wants to add an expense, you MUST have at minimum: the amount, a description, and a category. "
    "If any of these are missing, ask the user for the missing information before calling add_expense.\n"
    "2. Valid categories include: food, transport, entertainment, bills, shopping, health, travel, education, subscriptions, and other.\n"
    "3. If the user doesn't specify a date, default to today.\n"
    "4. If the user doesn't specify a currency, default to EUR.\n"
    "5. If the user doesn't specify a payment method, default to card.\n"
    "6. When querying expenses, present the results in a natural, conversational way suitable for voice output. "
    "Never use markdown, bullet points, or emoji.\n"
    "7. When the user asks about spending summaries, use get_expense_summary.\n"
    "8. For updates or deletions, first query to find the expense, then confirm with the user before proceeding.\n"
    "9. Always respond in the same language the user speaks to you.\n"
    "10. Keep responses concise and natural, as they will be spoken aloud."
)

EXPENSE_TOOLS = [
    query_expenses,
    get_expense_summary,
    add_expense,
    update_expense,
    delete_expense,
]


def create_expenses_agent(client: AzureOpenAIChatClient) -> Agent:
    """Create the expenses agent using the shared Azure OpenAI client."""
    return Agent(
        client=client,
        name="expenses-agent",
        description="Manages personal expenses: add, query, update, delete expenses and provide spending summaries.",
        instructions=EXPENSES_SYSTEM_PROMPT,
        tools=EXPENSE_TOOLS,
    )
