---
title: "think-drop: A Personal AI Note-Taking Bot for Telegram and Notion"
date: 2026-03-06 11:00:00 +0200
categories: [AI, Productivity]
tags: [python, ai, llm, telegram, notion, automation, productivity]
description: "Send a voice note or text to Telegram, and think-drop automatically classifies it, generates a summary, and writes it to your Notion workspace — powered by Gemini, OpenAI, or Claude."
---

The best ideas arrive at inconvenient moments. `think-drop` is a personal Telegram bot that captures your raw thoughts, classifies them by category, generates a clean summary, and saves everything to your Notion workspace — powered by whichever LLM you prefer.

## How It Works

1. Send any text message to your personal Telegram bot
2. AI classifies the note into a category (Work, Home, Ideas, Shopping, Meetings, Reading, Decisions, Personal)
3. AI generates a concise title and summary
4. The note is written to your Notion database with full metadata

That's it. Your thought is captured, organized, and searchable — without you doing anything beyond sending a message.

---

## Installation

```bash
git clone https://github.com/aviz92/think-drop.git
cd think-drop
uv sync
```

Or with Docker:

```bash
docker-compose up --build -d
```

---

## Configuration

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

NOTION_TOKEN=your_notion_internal_integration_secret
NOTION_DB_ID=your_notion_database_id

LLM_PROVIDER=gemini          # options: gemini | openai | claude
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

Only the API key for your chosen provider is required.

---

## Multi-LLM Support

Switch between providers by changing a single env var:

| Provider | `LLM_PROVIDER` | Where to get the key |
|----------|----------------|----------------------|
| Google Gemini | `gemini` | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| OpenAI | `openai` | [platform.openai.com](https://platform.openai.com/api-keys) |
| Anthropic Claude | `claude` | [console.anthropic.com](https://console.anthropic.com/) |

No code changes needed — just swap the env var and restart.

---

## Notion Database Schema

Create a Notion database with these properties:

| Property | Type |
|----------|------|
| Title | title |
| Summary | text |
| Raw | text |
| Category | select |
| Source | select |
| Date | date |

Then connect your integration and paste the database ID into `.env`.

---

## Session-Scoped Log Tracing

Every incoming message gets a unique 8-character session ID. All log lines share that ID — making it trivial to trace a full request through the pipeline:

```
INFO  [a3f2c1b8] Message received | user_id=123456 username=avi | chars=47
INFO  [a3f2c1b8] LLM classification started | provider=gemini
DEBUG [a3f2c1b8] LLM response received | response_chars=112
INFO  [a3f2c1b8] LLM classification done | title='Buy milk' category=Shopping
INFO  [a3f2c1b8] Notion write started | title='Buy milk' category=Shopping
INFO  [a3f2c1b8] Note saved to Notion | url=https://notion.so/abc123...
INFO  [a3f2c1b8] Confirmation sent to user
```

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/aviz92/think-drop.git
cd think-drop
uv sync

# 2. Configure
cp .env.example .env  # fill in your credentials

# 3. Run
uv run python think_drop/main.py
```

Then open Telegram, find your bot, and send `/start`.

---

## Links

- **GitHub**: [github.com/aviz92/think-drop](https://github.com/aviz92/think-drop)

Feedback, issues, and PRs are welcome.
