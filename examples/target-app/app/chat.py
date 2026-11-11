"""Customer chat assistant for the Fernwood help centre (fictional)."""
import os
import anthropic

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

SYSTEM_PROMPT = open("prompts/chat_system.txt").read()

TOOLS = [
    {"name": "lookup_order", "description": "Find an order by its number"},
    {"name": "issue_refund", "description": "Refund an order up to 50 pounds"},
]


def answer(customer_message: str, customer_email: str) -> str:
    reply = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=600,
        system=SYSTEM_PROMPT,
        tools=TOOLS,
        messages=[{"role": "user", "content": f"{customer_email}: {customer_message}"}],
    )
    return reply.content[0].text
