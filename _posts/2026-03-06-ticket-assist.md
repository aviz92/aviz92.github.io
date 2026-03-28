---
title: "ticket-assist: AI-Powered Slack Bot for Customer Support Ticket Classification"
date: 2026-03-06 11:30:00 +0200
categories: [AI, Support]
tags: [python, ai, llm, slack, automation, support, pydantic]
description: "A production-ready Slack bot that listens for mentions, classifies support tickets using structured LLM output via Pydantic, and replies with AI-generated answers — powered by Claude, Gemini, or OpenAI."
---

`ticket-assist` is a production-ready Slack bot that brings AI-powered ticket classification directly into your support workflow. Mention the bot with a support request, and it responds with a structured classification — category, urgency, sentiment, confidence, and a ready-to-send answer — powered by your choice of LLM.

## Architecture

Built on **Slack Bolt** + **Flask**, the bot exposes a `/slack/events` webhook endpoint that receives Slack's `app_mention` events. Incoming messages are processed through a structured LLM pipeline using Pydantic models for type-safe, validated responses.

---

## Installation

```bash
git clone https://github.com/aviz92/ticket-assist.git
cd ticket-assist
uv sync
```

---

## Configuration

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_BOT_USER_ID=U0XXXXXXXXX

LLM_PROVIDER=claude          # options: claude | gemini | openai
ANTHROPIC_API_KEY=your-anthropic-key
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
```

---

## Structured Ticket Classification

The core of the bot is a Pydantic schema that defines exactly what the LLM must return:

```python
from slack_bot.functions import TicketClassification, SYSTEM_PROMPT

response = llm.completions_create(
    response_model=TicketClassification,
    temperature=0,
    max_retries=3,
    messages=[
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": "My order #12345 hasn't arrived yet"},
    ],
)

print(response.category)         # TicketCategory.ORDER_ISSUE
print(response.urgency)          # TicketUrgency.HIGH
print(response.sentiment)        # customer emotional state
print(response.confidence)       # model confidence score
print(response.ticket_complete)  # True / False
print(response.answer)           # ready-to-send customer reply
```

Using Pydantic as the response model means the LLM output is always validated and structured — no parsing, no brittle string matching.

---

## Event Handling

When a user mentions the bot in any channel, `handle_mentions` strips the mention tag, runs the AI pipeline, and replies:

```python
@app.event("app_mention")
def handle_mentions(body: dict[str, Any], say: Say) -> None:
    text = body["event"]["text"]
    mention = f"<@{SLACK_BOT_USER_ID}>"
    text = text.replace(mention, "").strip()

    say("thinking...")
    response = ai_function(llm=llm, user_input=text)
    say(response.answer)
```

---

## Quick Start

```bash
# 1. Install dependencies
uv sync

# 2. Install SSL certificates (macOS)
/Applications/Python\ 3.13/Install\ Certificates.command

# 3. Configure environment
cp .env.example .env

# 4. Get your bot user ID
uv run python slack_bot/user_id.py

# 5. Start the Flask server
uv run python -m slack_bot.app

# 6. In a new terminal, expose with ngrok
ngrok http 5000
```

Then set `https://<your-ngrok-url>/slack/events` as the Event Subscriptions URL in your Slack app settings, and invite the bot to a channel with `/invite @YourBotName`.

---

## Multi-LLM Support

Switch providers with a single env var — no code changes:

| Provider | `LLM_PROVIDER` |
|----------|----------------|
| Anthropic Claude | `claude` |
| Google Gemini | `gemini` |
| OpenAI | `openai` |

---

## Links

- **GitHub**: [github.com/aviz92/ticket-assist](https://github.com/aviz92/ticket-assist)
- **Install**: `git clone https://github.com/aviz92/ticket-assist.git && uv sync`
