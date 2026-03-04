---
title: "python-notion-plus: An Intuitive Notion API Client with Auto-Pagination"
date: 2026-03-04 10:30:00 +0200
categories: [Backend, Productivity]
tags: [python, notion, api, automation, productivity]
description: "python-notion-plus wraps the Notion API with automatic pagination, database querying, and intuitive page formatting — making it easy to read and process Notion databases programmatically."
---

The raw Notion API is powerful but verbose. Pagination is manual, property formatting is inconsistent, and simple database reads require more boilerplate than they should. `python-notion-plus` wraps all of that into a clean, developer-friendly client.

## Installation

```bash
pip install python-notion-plus
```

## Configuration

```bash
export NOTION_TOKEN=your_notion_api_token
```

---

## Reading a Database

Fetch all pages from a Notion database and format their properties in one call:

```python
import json
from python_notion_plus import NotionClient

notion_client = NotionClient(database_id='your_database_id')

# Fetches all pages with automatic pagination
pages = notion_client.get_database_content()

for page in pages:
    properties = notion_client.format_notion_page(page)
    print(json.dumps(properties, indent=4))
```

`get_database_content()` handles pagination automatically — no cursor management needed, even for large databases.

`format_notion_page()` normalizes Notion's nested property structure into a flat, usable dictionary — so you get clean data instead of deeply nested API response objects.

---

## Key Features

**Simplified API calls** — common operations don't require understanding the full Notion API schema.

**Automatic pagination** — databases with hundreds or thousands of pages are fetched completely without manual cursor handling.

**Database queries** — query and filter Notion databases programmatically.

**Intuitive formatting** — `format_notion_page()` converts Notion's complex property types (text, select, date, relation, etc.) into clean Python dictionaries.

---

## Use Cases

- Sync Notion databases to external systems
- Generate reports from Notion data
- Use Notion as a lightweight CMS or config store
- Build dashboards that pull from Notion databases
- Automate content pipelines driven by Notion pages

---

## Links

- **PyPI**: [pypi.org/project/python-notion-plus](https://pypi.org/project/python-notion-plus)
- **GitHub**: [github.com/aviz92/python-notion-plus](https://github.com/aviz92/python-notion-plus)
- **Install**: `pip install python-notion-plus`
