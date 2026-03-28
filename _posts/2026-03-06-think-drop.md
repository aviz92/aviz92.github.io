---
title: "think-drop: A Personal AI Note-Taking Bot for Telegram and Notion"
date: 2026-03-06 11:00:00 +0200
categories: [AI, Productivity]
tags: [python, ai, llm, telegram, notion, automation, productivity]
description: "Send a voice note or text to Telegram, and think-drop automatically classifies it, generates a summary, and writes it to your Notion workspace — powered by Gemini, OpenAI, or Claude."
---

The best ideas arrive at inconvenient moments. The worst ones end up in a long WhatsApp message to yourself that you never read again. `think-drop` is a personal Telegram bot that captures your raw thoughts, classifies them by category, generates a clean summary, and saves everything to your Notion workspace — powered by whichever LLM you prefer. Send a message, close your phone, move on.

## Why I Built This

I kept losing thoughts. Not because I wasn't writing them down — I was, in five different places. A notes app, a Telegram draft, a napkin, a sticky note on the monitor. None of it was searchable later and none of it was organized. I wanted one place where everything landed automatically, with the AI doing the classification and summarization I never got around to doing manually. Notion was already where I worked. Telegram was already on my phone. I just needed something to connect them.

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

## Setup & Configuration

Create a `.env` file with your credentials:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

NOTION_TOKEN=your_notion_internal_integration_secret
NOTION_DB_ID=your_notion_database_id

LLM_PROVIDER=gemini          # options: gemini | openai | claude
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

Only the API key for your chosen provider is required. Switch providers by changing `LLM_PROVIDER` — no code changes:

| Provider | `LLM_PROVIDER` |
|----------|----------------|
| Google Gemini | `gemini` |
| OpenAI | `openai` |
| Anthropic Claude | `claude` |

Create a Notion database with these properties and connect your integration:

| Property | Type |
|----------|------|
| Title | title |
| Summary | text |
| Raw | text |
| Category | select |
| Source | select |
| Date | date |

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

Open Telegram, find your bot, send `/start`.

## Real-World Example

Send "remind me to buy a birthday gift for Sarah next week" and here's what happens end-to-end:

```
INFO  [a3f2c1b8] Message received | user_id=123456 username=avi | chars=51
INFO  [a3f2c1b8] LLM classification started | provider=gemini
DEBUG [a3f2c1b8] LLM response received | response_chars=98
INFO  [a3f2c1b8] LLM classification done | title='Gift for Sarah' category=Shopping
INFO  [a3f2c1b8] Notion write started | title='Gift for Sarah' category=Shopping
INFO  [a3f2c1b8] Note saved to Notion | url=https://notion.so/abc123...
INFO  [a3f2c1b8] Confirmation sent to user
```

Your Notion database gets a new row: title `Gift for Sarah`, category `Shopping`, raw text preserved, summary generated, date stamped. Every incoming message gets a unique 8-character session ID so the full pipeline is traceable in logs from receive to confirmation.

## Key Features

The pipeline is fully automatic — there's nothing to configure per-note. Send a message, the AI classifies it into one of eight categories (Work, Home, Ideas, Shopping, Meetings, Reading, Decisions, Personal), generates a title and summary, and writes it to Notion with full metadata. The raw text is preserved alongside the summary so nothing is lost.

Multi-LLM support means you're not locked to one provider. `LLM_PROVIDER=gemini` today, `LLM_PROVIDER=claude` tomorrow — the pipeline is identical. Useful when you want to compare output quality or when a provider has an outage.

Session-scoped log tracing gives every incoming message a unique 8-character ID shared across all log lines for that request. When something goes wrong — a failed Notion write, a malformed LLM response — you can grep for the session ID and see the exact sequence of events, with no log lines from other concurrent messages mixed in.

Async processing keeps the bot responsive under load. Each message is processed asynchronously so a slow LLM response on one note doesn't block others.

## Goes Well With

- [`python-notion-plus`](/posts/python-notion-plus) — the Notion client layer under the hood
- [`python-vault`](/posts/python-vault) — store Telegram and Notion tokens in Vault instead of a plain `.env`
- [`custom-python-logger`](/posts/custom-python-logger) — the logger powering session-scoped tracing

---

## Links

- **GitHub**: [github.com/aviz92/think-drop](https://github.com/aviz92/think-drop)

One Telegram message. One Notion row. Zero friction.
