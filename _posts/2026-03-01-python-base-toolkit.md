---
title: "python-base-toolkit: The Utility Foundation I Drop Into Every Python Project"
date: 2026-03-01 08:00:00 +0200
categories: [Backend, Core Foundations]
tags: [python, utilities, toolkit, decorators, pydantic, enums, file-utils, devops]
description: "python-base-toolkit is a production-ready collection of base structures, decorators, file utilities, and execution helpers — the common foundation I stopped copying across projects and packaged once."
---

Every project I start needs the same things before it can do anything useful. A base enum that knows how to serialize itself. A file utility that reads JSON without me remembering the right `open()` flags. A decorator that logs how long a function took. A way to close five resources cleanly when something goes wrong.

None of these are hard to write. They're just annoying to write for the fifteenth time.

## Why I Built This

After maintaining 20+ Python repositories, I had a `utils.py` in each one that was 80% identical. Every time I fixed a bug in one of them — a serialization edge case, a missing `encoding="utf-8"` — I had a choice: go fix it everywhere, or live with the inconsistency. Neither is acceptable.

So I extracted everything into `python-base-toolkit`. One package, one place to maintain it, consistent behavior across every project that imports it.

## Installation

```bash
pip install python-base-toolkit
```
```bash
uv add python-base-toolkit
```

## What's Inside

**Base structures** — `BaseEnum` and `BasePydanticModel` add the methods that vanilla `Enum` and Pydantic's `BaseModel` are missing: `.to_list()`, `.has_value()`, `.to_dict()`, `.to_json()`, `.field_names()`. The kind of thing you write once, then copy into every project forever.

**Decorators** — `@timer` wraps any function and logs its execution time. `@report_func_telemetry` logs structured JSON with function name, arguments, and start/end timestamps. One decorator, full visibility into production pipelines.

**InstanceManager** — when you open three connections and something crashes, you want all three to close in the right order. `InstanceManager` tracks them and tears everything down cleanly in a `with` block, whether the code succeeds or not.

**FileUtils** — organized file operations that cover what you actually need: reading and writing JSON/YAML/CSV, compressing and extracting archives, computing checksums, listing files recursively. All in one place, all with proper error handling.

**timed_execution** — a polling helper that calls a function repeatedly until it returns true, with a timeout and a `tqdm` progress bar. The pattern you need every time you're waiting for a deployment to be ready or a queue to drain.

**to_json_serializable** — `json.dumps` fails on Pydantic models, enums, datetimes, Decimals, and sets. This handles all of them, once.

## Real-World Example

Here's a data pipeline that uses several pieces of the toolkit together:

```python
from python_base_toolkit.base_structures.base_enum import BaseEnum
from python_base_toolkit.decorators.timer import timer
from python_base_toolkit.instances.instance_manager import InstanceManager
from python_base_toolkit.utils.execute import timed_execution_bool

class PipelineStatus(BaseEnum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"

@timer
def run_pipeline(pipeline_id: str) -> None:
    with InstanceManager() as manager:
        db = manager.add(DatabaseConnection())
        cache = manager.add(RedisClient())

        # Wait up to 2 minutes for upstream data
        is_ready = timed_execution_bool(
            func=lambda: cache.get(f"upstream:{pipeline_id}"),
            timeout=120,
            interval=5,
            pb_description="Waiting for upstream data"
        )

        if not is_ready:
            raise TimeoutError("Upstream data not available")

        db.write(fetch_and_transform(pipeline_id))
```

Execution time is logged automatically. Both resources close cleanly on exit. The polling shows a live progress bar. The enum value serializes to a plain string wherever it's needed. None of this required any boilerplate.

---

## Links

- **PyPI**: [pypi.org/project/python-base-toolkit](https://pypi.org/project/python-base-toolkit)
- **GitHub**: [github.com/aviz92/python-base-toolkit](https://github.com/aviz92/python-base-toolkit)

If you've been copying the same `utils.py` from project to project, this is the last time you'll need to.
