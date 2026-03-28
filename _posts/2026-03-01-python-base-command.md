---
title: "python-base-command: Django-Style CLI Commands Without Django"
date: 2026-03-01 07:30:00 +0200
categories: [Backend, Core Foundations]
tags: [python, cli, automation, django, commands, utilities]
description: "python-base-command brings Django's BaseCommand pattern — handle(), add_arguments(), CommandError, call_command(), auto-discovery — to any Python project, with zero Django dependency."
---

If you've written Django management commands, you know how clean the pattern is: a `Command` class, `handle()` for logic, `add_arguments()` for the CLI interface, `CommandError` for clean error handling. The problem is that pattern lives inside Django — and most of my automation scripts, data pipelines, and internal tools aren't Django projects. I kept reinventing the same CLI structure from scratch, every time.

## Why I Built This

I had a collection of standalone Python tools — data sync scripts, report generators, migration helpers — each with its own ad-hoc argument parsing and inconsistent error handling. I wanted the same discipline Django's management commands enforce, but without pulling in the entire framework as a dependency. So I extracted the pattern, added a logger, and made auto-discovery work out of the box.

## Installation

```bash
pip install python-base-command
```
```bash
uv add python-base-command
```

## Quick Start

Create `cli.py` — your entry point (2 lines):

```python
# cli.py
from python_base_command import Runner

Runner(commands_dir="commands").run()
```

Add commands to a `commands/` folder:

```
myapp/
├── cli.py
└── commands/
    ├── __init__.py
    └── greet.py
```

```python
# commands/greet.py
from python_base_command import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Greet a user by name"
    version = "1.0.0"

    def add_arguments(self, parser):
        parser.add_argument("name", type=str, help="Name to greet")
        parser.add_argument("--shout", action="store_true", help="Print in uppercase")

    def handle(self, **kwargs):
        name = kwargs["name"].strip()
        if not name:
            raise CommandError("Name cannot be empty.")

        msg = f"Hello, {name}!"
        if kwargs["shout"]:
            msg = msg.upper()

        self.logger.info(msg)
```

Run it:

```bash
python3 cli.py --help              # lists all available commands
python3 cli.py greet Alice
python3 cli.py greet Alice --shout
python3 cli.py greet --version
```

## Real-World Example

Here's a typical internal tooling setup — a data export command that lives alongside other ops scripts:

```python
# commands/export_reports.py
from python_base_command import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Export weekly reports to CSV or JSON"
    version = "2.1.0"

    def add_arguments(self, parser):
        parser.add_argument("--format", choices=["csv", "json"], default="csv")
        parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
        parser.add_argument("--week", type=int, required=True, help="ISO week number")

    def handle(self, **kwargs):
        week = kwargs["week"]
        fmt = kwargs["format"]

        self.logger.step(f"Fetching data for week {week}...")
        records = fetch_weekly_data(week)

        if not records:
            raise CommandError(f"No data found for week {week}.")

        if kwargs["dry_run"]:
            self.logger.warning(f"Dry run — {len(records)} records would be exported as {fmt}.")
            return

        self.logger.step(f"Writing {len(records)} records as {fmt}...")
        write_export(records, fmt)
        self.logger.info("Export complete.")
```

```bash
python3 cli.py export_reports --week 12 --format json --dry-run
python3 cli.py export_reports --week 12 --format json
```

`self.logger` is already wired up — colored output, `STEP` level, everything — with no setup code inside the command.

## Key Features

Every `BaseCommand` subclass gets `self.logger` for free — a `CustomLoggerAdapter` from `custom-python-logger` with colored output, the `STEP` log level for marking pipeline stages, and `EXCEPTION` for clean traceback logging. No `logging.getLogger()` boilerplate anywhere in your commands.

Every command also automatically receives three built-in flags: `--version` prints and exits, `-v` / `--verbosity` controls output detail (0–3), and `--traceback` re-raises `CommandError` with a full traceback instead of swallowing it — useful when debugging in CI.

Auto-discovery means you drop a file with a `Command` class into your `commands/` folder and it's immediately available from the CLI. No registration, no imports in a central file. For cases where you want multiple commands in a single file, the `@registry.register()` decorator handles that:

```python
from python_base_command import BaseCommand, CommandRegistry

registry = CommandRegistry()

@registry.register("greet")
class GreetCommand(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("name", type=str)

    def handle(self, **kwargs):
        self.logger.info(f"Hello, {kwargs['name']}!")

if __name__ == "__main__":
    registry.run()
```

`LabelCommand` is available for commands that process one or more string labels — file paths, identifiers, slugs. Override `handle_label()` and the framework calls it once per argument:

```python
from python_base_command import LabelCommand, CommandError

class Command(LabelCommand):
    label = "filepath"
    help = "Process one or more files"

    def handle_label(self, label, **kwargs):
        if not label.endswith((".txt", ".csv")):
            raise CommandError(f"Unsupported file type: {label}")
        self.logger.info(f"Processed: {label}")
```

Testing works exactly like Django's `call_command` — invoke commands programmatically and assert on their behavior or the exceptions they raise:

```python
from python_base_command import call_command, CommandError
import pytest

from commands.greet import Command as GreetCommand

def test_greet():
    result = call_command(GreetCommand, name="Alice")
    assert result is None

def test_greet_empty_name():
    with pytest.raises(CommandError, match="cannot be empty"):
        call_command(GreetCommand, name="")
```

`CommandError` propagates cleanly in tests but is caught and printed without a traceback when invoked from the CLI — unless you pass `--traceback`.

## The Stack Behind the Examples

- [`custom-python-logger`](/posts/custom-python-logger) — the logger powering `self.logger` in every command

---

## Links

- **PyPI**: [pypi.org/project/python-base-command](https://pypi.org/project/python-base-command)
- **GitHub**: [github.com/aviz92/python-base-command](https://github.com/aviz92/python-base-command)

If you've been gluing together `argparse`, `logging.basicConfig`, and a try/except in every script, this gives you the same structure Django trained you to love — without the framework.
