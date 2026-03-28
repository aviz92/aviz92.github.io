---
title: "python-base-command: Django-Style CLI Commands Without Django"
date: 2026-03-01 07:30:00 +0200
categories: [Backend, Core Foundations]
tags: [python, cli, automation, django, commands, utilities]
description: "python-base-command brings Django's BaseCommand pattern — handle(), add_arguments(), CommandError, call_command(), auto-discovery — to any Python project, with zero Django dependency."
---

If you've written Django management commands, you know how clean the pattern is: a `Command` class, `handle()` for logic, `add_arguments()` for the CLI interface, `CommandError` for clean error handling. `python-base-command` brings that exact pattern to standalone Python projects — no Django required.

## Installation

```bash
pip install python-base-command
```
```bash
uv add python-base-command
```

---

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

---

## Built-in Logging

Every command gets `self.logger` — a `CustomLoggerAdapter` from `custom-python-logger` — for free:

```python
self.logger.debug("...")
self.logger.info("...")
self.logger.step("...")        # custom level for process steps
self.logger.warning("...")
self.logger.error("...")
self.logger.exception("...")   # logs with full traceback
```

No setup needed. No `logging.getLogger()` boilerplate.

---

## Built-in Flags

Every command automatically gets these flags:

| Flag | Description |
|------|-------------|
| `--version` | Print version and exit |
| `-v` / `--verbosity` | 0=minimal, 1=normal, 2=verbose, 3=very verbose |
| `--traceback` | Re-raise `CommandError` with full traceback |

---

## Manual Registry

Register multiple commands in a single file using `@registry.register()`:

```python
# my_commands.py
from python_base_command import BaseCommand, CommandRegistry

registry = CommandRegistry()

@registry.register("greet")
class GreetCommand(BaseCommand):
    help = "Greet a user"

    def add_arguments(self, parser):
        parser.add_argument("name", type=str)

    def handle(self, **kwargs):
        self.logger.info(f"Hello, {kwargs['name']}!")


@registry.register("export")
class ExportCommand(BaseCommand):
    help = "Export data"

    def add_arguments(self, parser):
        parser.add_argument("--format", choices=["csv", "json"], default="csv")
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, **kwargs):
        if kwargs["dry_run"]:
            self.logger.warning("Dry run — no files written.")
            return
        self.logger.info(f"Exported as {kwargs['format']}.")


if __name__ == "__main__":
    registry.run()
```

```bash
python3 my_commands.py greet Alice
python3 my_commands.py export --format json --dry-run
```

Registry files dropped into the `commands/` folder are auto-discovered alongside classic `Command` files.

---

## Testing with `call_command`

Invoke commands programmatically — identical to Django's `call_command`:

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

`CommandError` propagates normally via `call_command` but is caught and logged cleanly when invoked from the CLI.

---

## `LabelCommand`

For commands that accept one or more string labels — files, identifiers, etc.:

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

```bash
python3 cli.py process report.csv notes.txt
```

---

## Comparison with Django

| Feature | Django `BaseCommand` | `python-base-command` |
|---------|---------------------|-----------------------|
| `handle()` / `add_arguments()` | ✅ | ✅ |
| `CommandError` with `returncode` | ✅ | ✅ |
| `LabelCommand` | ✅ | ✅ |
| `call_command()` | ✅ | ✅ |
| `output_transaction` | ✅ | ✅ |
| Auto-discovery from folder | ✅ | ✅ |
| `self.logger` (custom-python-logger) | ❌ | ✅ |
| Manual registry | ❌ | ✅ |
| Django dependency | required | ❌ none |

---

## Links

- **PyPI**: [pypi.org/project/python-base-command](https://pypi.org/project/python-base-command)
- **GitHub**: [github.com/aviz92/python-base-command](https://github.com/aviz92/python-base-command)

Feedback, issues, and PRs are welcome.
