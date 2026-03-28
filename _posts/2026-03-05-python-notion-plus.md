---
title: "python-notion-plus: An Intuitive Notion API Client with Auto-Pagination"
date: 2026-03-05 10:30:00 +0200
categories: [Backend, Python Clients]
tags: [python, notion, api, automation, productivity]
description: "python-notion-plus wraps the Notion API with automatic pagination, database querying, and intuitive page formatting — making it easy to read and process Notion databases programmatically."
---

The raw Notion API is powerful but verbose. Pagination is manual, property formatting is deeply nested and inconsistent, and reading a database of a few hundred pages requires more boilerplate than it should. If you've ever tried to sync a Notion database to an external system or use Notion as a lightweight config store, you know how much plumbing stands between you and the actual data. `python-notion-plus` collapses that into two method calls.

## Why I Built This

I wanted to use a Notion database as a source of truth for a content pipeline — pages in, structured data out. The raw API cursor pagination and the nested property format (a text field isn't a string, it's an array of rich text objects with nested plain text) made something simple feel unnecessarily complex. I built a thin wrapper that handles pagination automatically and normalizes properties into flat Python dicts, so I could stop thinking about the API and start working with the data.

## Installation

```bash
pip install python-notion-plus
```
```bash
uv add python-notion-plus
```

## Setup & Configuration

```bash
export NOTION_TOKEN=your_notion_api_token
```

```python
from python_notion_plus import NotionClient

notion_client = NotionClient(database_id="your_database_id")
```

## Quick Start

Fetch all pages from a Notion database and read their properties in a flat, usable format:

```python
import json
from python_notion_plus import NotionClient

notion_client = NotionClient(database_id="your_database_id")

pages = notion_client.get_database_content()

for page in pages:
    properties = notion_client.format_notion_page(page)
    print(json.dumps(properties, indent=4))
```

`get_database_content()` handles all pagination automatically — no cursor management, no loop logic, even for databases with thousands of pages. `format_notion_page()` normalizes Notion's nested property structure into a flat dictionary, so you get clean Python data instead of deeply nested API response objects.

## Real-World Example

Here's a content pipeline that reads a Notion database of blog drafts, filters for approved entries, and pushes them to an external CMS:

```python
import json
from python_notion_plus import NotionClient

notion_client = NotionClient(database_id="your_blog_database_id")

# Fetch the full database — pagination handled automatically
pages = notion_client.get_database_content()

approved = []
for page in pages:
    props = notion_client.format_notion_page(page)

    # props is a flat dict — no nested API objects to unwrap
    if props.get("Status") == "Approved" and props.get("Publish Date"):
        approved.append({
            "title": props["Title"],
            "slug": props["Slug"],
            "publish_date": props["Publish Date"],
            "tags": props["Tags"],
        })

print(f"Found {len(approved)} approved posts ready to publish.")
print(json.dumps(approved, indent=4))
```

Without `python-notion-plus`, the same loop would require manual cursor tracking and unwrapping each property type individually — rich text arrays, select objects, date structs — before you could read a single value.

## Key Features

Auto-pagination is the core feature. The Notion API returns results in pages of up to 100 items with a cursor you have to track and re-send. `get_database_content()` handles all of that internally and returns the complete result set as a flat list — one call, all pages, no loop in your code.

`format_notion_page()` handles Notion's property type inconsistency. A title is an array of rich text objects. A select is a nested object with a `name` key. A date is an object with `start` and `end`. The formatter normalizes all of these into plain Python values so the rest of your code never has to know what type a Notion property is under the hood.

Together these two methods cover the most common pattern: read a database, work with the data. Database queries and filters let you narrow results programmatically before fetching, which keeps large databases fast.

## Goes Well With

- [python-vault](/posts/python-vault) — I use Vault to store the GitHub access token securely in automation scripts
- [`python-jira-plus`](/posts/python-jira-plus) — I pair these in ticket automation scripts: close the Jira ticket when the PR merges
- [`python-github-plus`](/posts/python-github-plus) — close Jira tickets automatically when a GitHub PR merges
- [`python-gitlab-plus`](/posts/python-gitlab-plus) — same integration pattern for GitLab pipelines and MRs
- [`custom-python-logger`](/posts/custom-python-logger) — structured logging for every Jira API call in automation scripts

---

## Links

- **PyPI**: [pypi.org/project/python-notion-plus](https://pypi.org/project/python-notion-plus)
- **GitHub**: [github.com/aviz92/python-notion-plus](https://github.com/aviz92/python-notion-plus)

Your Notion database is already structured data — this makes it feel like it.
