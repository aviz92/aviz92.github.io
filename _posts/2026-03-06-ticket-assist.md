---
title: "ticket-assist: AI-Powered Slack Bot for Customer Support Ticket Classification"
date: 2026-03-06 11:30:00 +0200
categories: [AI, Support]
tags: [python, ai, llm, slack, automation, support, pydantic]
description: "A production-ready Slack bot that listens for mentions, classifies support tickets using structured LLM output via Pydantic, and replies with AI-generated answers — powered by Claude, Gemini, or OpenAI."
---

Support teams spend a lot of time doing the same triage: read the ticket, figure out the category, assess urgency, draft a first response. It's repetitive, it's slow, and it's where response times slip. `ticket-assist` is a production-ready Slack bot that does that triage automatically — mention it with a support message and it replies with a structured classification and a ready-to-send answer, powered by your choice of LLM.

## Why I Built This

I wanted to see how far structured LLM output could go in a real support workflow. Not a chatbot that gives vague answers — something that commits to a category, an urgency level, a confidence score, and an actual response, all in a validated Pydantic schema. Slack was the right channel because that's where support requests actually land. The result is something you can drop into an existing support workflow and start getting AI-classified tickets immediately.

## Installation

```bash
git clone https://github.com/aviz92/ticket-assist.git
cd ticket-assist
uv sync
```

## Setup & Configuration

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_BOT_USER_ID=U0XXXXXXXXX

LLM_PROVIDER=claude          # options: claude | gemini | openai
ANTHROPIC_API_KEY=your-anthropic-key
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
```

Switch providers with a single env var — no code changes:

| Provider | `LLM_PROVIDER` |
|----------|----------------|
| Anthropic Claude | `claude` |
| Google Gemini | `gemini` |
| OpenAI | `openai` |

## Quick Start

```bash
# 1. Install dependencies
uv sync

# 2. Configure environment
cp .env.example .env

# 3. Get your bot user ID
uv run python slack_bot/user_id.py

# 4. Start the Flask server
uv run python -m slack_bot.app

# 5. Expose with ngrok
ngrok http 5000
```

Set `https://<your-ngrok-url>/slack/events` as the Event Subscriptions URL in your Slack app settings, then invite the bot to a channel with `/invite @YourBotName`.

## Real-World Example

A customer messages in Slack: `@ticket-assist My order #12345 hasn't arrived yet and I needed it for an event tomorrow`.

The bot runs the classification pipeline and replies immediately:

```python
response.category    # TicketCategory.ORDER_ISSUE
response.urgency     # TicketUrgency.HIGH
response.sentiment   # "frustrated, time-sensitive"
response.confidence  # 0.94
response.ticket_complete  # True
response.answer      # "I'm sorry to hear your order hasn't arrived..."
```

The answer field contains a ready-to-send customer reply — the support agent can post it directly or edit it first. Category, urgency, and sentiment give the team everything they need to route and prioritize without reading the full message.

## Key Features

The core of the bot is a Pydantic schema that defines exactly what the LLM must return. There's no parsing, no brittle string matching — the model either returns a valid `TicketClassification` or the request retries up to three times:

```python
response = llm.completions_create(
    response_model=TicketClassification,
    temperature=0,
    max_retries=3,
    messages=[
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_input},
    ],
)
```

Using Pydantic as the response model means every field is typed and validated before the bot replies. A classification without a confidence score or a missing urgency level is caught before it reaches the user — not after.

The event handling is minimal by design. Built on Slack Bolt and Flask, the bot exposes a `/slack/events` webhook that receives `app_mention` events. When mentioned, it strips the mention tag, runs the AI pipeline, and calls `say()` with the generated answer:

```python
@app.event("app_mention")
def handle_mentions(body: dict[str, Any], say: Say) -> None:
    text = body["event"]["text"].replace(f"<@{SLACK_BOT_USER_ID}>", "").strip()
    say("thinking...")
    response = ai_function(llm=llm, user_input=text)
    say(response.answer)
```

Multi-LLM support lets you swap providers without touching the classification logic. `temperature=0` keeps responses deterministic regardless of which model is behind it.

## Goes Well With

- [`python-jira-plus`](/posts/python-jira-plus) — create a Jira ticket automatically from the classification output
- [`python-vault`](/posts/python-vault) — store Slack and LLM API tokens in Vault instead of plain env vars
- [`custom-python-logger`](/posts/custom-python-logger) — structured logging for every classification event and LLM call

---

## Links

- **GitHub**: [github.com/aviz92/ticket-assist](https://github.com/aviz92/ticket-assist)

Mention the bot. Get a classification. Route the ticket. Done.
