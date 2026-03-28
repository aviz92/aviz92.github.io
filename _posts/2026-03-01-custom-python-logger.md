---
title: "custom-python-logger: Colored, Contextual Logging for Python Projects"
date: 2026-03-01 07:00:00 +0200
categories: [Core Foundations]
tags: [python, logging, debugging, devops, utilities]
description: "custom-python-logger adds colored output, custom log levels (STEP, EXCEPTION), contextual fields, UTC support, and pretty-printing helpers — all behind a single build_logger() call."
---

Python's built-in `logging` module is powerful but verbose to configure. `custom-python-logger` wraps it with sensible defaults, colored terminal output, custom log levels, and contextual fields — so you get production-ready logging in one line.

## Installation

```bash
pip install custom-python-logger
```

---

## Basic Usage

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

---

## Custom Log Levels

Beyond the standard Python levels, `custom-python-logger` adds two purpose-built levels:

- **`STEP`** — marks a logical process step (e.g., "Starting phase 2", "Connecting to DB"). Great for tracing multi-stage pipelines.
- **`EXCEPTION`** — dedicated level for exception tracking, distinct from `ERROR`, making it easy to filter exception-only logs.

---

## Key Features

### Log to File

```python
logger = build_logger(project_name='MyApp', log_file=True)
```

Logs to both console and file. The log directory is created automatically if it doesn't exist.

### UTC Timestamps

```python
logger = build_logger(project_name='MyApp', log_file=True, utc=True)
```

Useful for services running across time zones — all timestamps align.

### Contextual Fields

Add extra metadata to every log line — user, environment, request ID, etc.:

```python
logger = build_logger(
    project_name='MyApp',
    log_file=True,
    utc=True,
    extra={'user': 'alice', 'env': 'production'}
)
```

Every line emitted by this logger will include `user=alice env=production` — no need to repeat it in every message.

### Pretty-Print JSON and YAML

```python
from custom_python_logger import build_logger, json_pretty_format, yaml_pretty_format

logger = build_logger(project_name='MyApp')

logger.info(json_pretty_format({'status': 'ok', 'count': 42}))
logger.info(yaml_pretty_format({'status': 'ok', 'count': 42}))
```

Ideal for logging API responses, config snapshots, or structured data during debugging.

### Reuse an Existing Logger

```python
from custom_python_logger import get_logger

logger = get_logger('some-name')
logger.debug("Reusing existing logger.")
logger.step("Step message via get_logger.")
```

---

## Why Not Just Use `logging.basicConfig`?

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
- **Install**: `pip install custom-python-logger`
