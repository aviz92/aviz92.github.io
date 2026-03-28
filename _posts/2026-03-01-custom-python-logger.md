---
title: "custom-python-logger: Colored, Contextual Logging for Python Projects"
date: 2026-03-01 07:00:00 +0200
categories: [Backend, Core Foundations]
tags: [python, logging, debugging, devops, utilities]
description: "custom-python-logger adds colored output, custom log levels (STEP, EXCEPTION), contextual fields, UTC support, and pretty-printing helpers — all behind a single build_logger() call."
---

Python's built-in `logging` module is powerful but verbose to configure. Every project ends up with the same boilerplate — handlers, formatters, levels — and still produces gray, context-free output that makes debugging across environments a chore. I wanted logging that works immediately, looks good in the terminal, and carries metadata through every line without repeating myself.

## Why I Built This

I got tired of copy-pasting the same logging setup across every new project. `logging.basicConfig` gives you almost nothing out of the box — no color, no structured context, no clean way to mark pipeline stages. I wanted a single `build_logger()` call that produces production-ready output and stays consistent whether I'm running locally, in CI, or in a container. So I built it once and packaged it.

## Installation

```bash
pip install custom-python-logger
```
```bash
uv add custom-python-logger
```

## Quick Start

```python
import logging
from custom_python_logger import build_logger, CustomLoggerAdapter

logger: CustomLoggerAdapter = build_logger(
    project_name='My Project',
    log_level=logging.DEBUG,
    log_file=True,
)

logger.debug("This is a debug message.")
logger.info("This is an info message.")
logger.step("This is a step message.")       # custom level
logger.warning("This is a warning message.")

try:
    _ = 1 / 0
except ZeroDivisionError:
    logger.exception("This is an exception message.")

logger.critical("This is a critical message.")
```

## Real-World Example

Imagine a data pipeline that fetches records from an API, transforms them, and pushes to a database. With `custom-python-logger`, each stage is clearly marked and every log line automatically carries the environment and run ID — no manual threading of context:

```python
import logging
from custom_python_logger import build_logger, json_pretty_format

logger = build_logger(
    project_name='DataPipeline',
    log_level=logging.INFO,
    log_file=True,
    utc=True,
    extra={'env': 'production', 'run_id': 'abc-123'}
)

logger.step("Fetching records from API...")
records = fetch_records()
logger.info(f"Fetched {len(records)} records.")
logger.info(json_pretty_format(records[0]))  # log a sample

logger.step("Transforming records...")
transformed = transform(records)

logger.step("Writing to database...")
write_to_db(transformed)

logger.info("Pipeline complete.")
```

Every line in the output will automatically include `env=production run_id=abc-123`. When something breaks at 3am, you know exactly which run failed and in which environment — without digging through extra tooling.

## Key Features

The library adds two purpose-built log levels on top of Python's standard set. `STEP` marks logical stages in a multi-step process — think "Connecting to DB" or "Starting phase 2" — making it easy to trace pipelines at a glance. `EXCEPTION` sits as a dedicated level for exception tracking, separate from `ERROR`, so you can filter exception-only logs without noise.

Colored terminal output comes via `colorlog` integration. Each level gets its own color so you can scan a wall of logs and immediately spot what matters, without reading every line.

Contextual fields let you bind metadata — user, environment, request ID — to a logger instance at creation time. Every line that logger emits carries those fields automatically. No wrapper functions, no repeated arguments.

File logging requires just `log_file=True`. The log directory is created automatically if it doesn't exist, and output goes to both console and file in one call.

UTC timestamps are a single flag away (`utc=True`), which keeps logs consistent across services running in different time zones.

Pretty-print helpers for JSON and YAML make structured data human-readable in logs without any extra dependencies:

```python
from custom_python_logger import build_logger, json_pretty_format, yaml_pretty_format

logger = build_logger(project_name='MyApp')
logger.info(json_pretty_format({'status': 'ok', 'count': 42}))
logger.info(yaml_pretty_format({'status': 'ok', 'count': 42}))
```

And if you need to reuse a logger already configured elsewhere, `get_logger` retrieves it by name — no re-configuration needed:

```python
from custom_python_logger import get_logger

logger = get_logger('some-name')
logger.step("Reusing existing logger.")
```


#### Why Not Just Use `logging.basicConfig`?

| Feature | `logging.basicConfig` | `custom-python-logger` |
|---------|-----------------------|------------------------|
| Colored output | ❌ | ✅ |
| Custom levels (STEP, EXCEPTION) | ❌ | ✅ |
| File + console in one call | manual | ✅ |
| Contextual extra fields | manual | ✅ |
| UTC support | manual | ✅ |
| Pretty-print helpers | ❌ | ✅ |

---

## Links

- **PyPI**: [pypi.org/project/custom-python-logger](https://pypi.org/project/custom-python-logger)
- **GitHub**: [github.com/aviz92/custom-python-logger](https://github.com/aviz92/custom-python-logger)

If you've been copy-pasting logging setup across projects, this is the last time you'll need to.
