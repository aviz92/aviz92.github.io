---
title: "How I Structure Python Projects: A Practical Guide"
date: 2026-03-07 06:00:00 +0200
categories: [Architecture, Python]
tags: [python, architecture, project-structure, best-practices, devops, cli, django, fastapi]
description: "After building 20+ open-source Python projects, here's the opinionated structure I use for every new project — from the base template to logging, CLI commands, API layers, and CI workflows."
pin: false
---

After building and maintaining 20+ Python open-source projects, I've converged on a consistent structure that I apply to every new project. This post walks through the full picture — from day zero setup to production-ready patterns.

---

## The Foundation: Start From a Template

Every project I start comes from [`dev-template-repository`](https://github.com/aviz92/dev-template-repository) — a GitHub template that wires up everything before I write a single line of business logic:

```
my-project/
├── .github/
│   ├── workflows/
│   │   └── publish_to_pypi.yml     # automated PyPI publishing
│   ├── CODEOWNERS                  # default reviewers per path
│   ├── ISSUE_TEMPLATE/             # bug reports, feature requests
│   └── pull_request_template.md    # contribution checklist
├── .vscode/
│   ├── settings.json               # format on save, lint integration
│   ├── extensions.json             # recommended extensions
│   └── launch.json                 # debug configurations
├── .cursor/                        # Cursor IDE config
├── requirements.txt
├── MANIFEST.in
├── env.template                    # .env structure, committed to git
├── Taskfile.yml                    # Go-Task for common dev commands
├── .pre-commit-config.yaml         # Black, Ruff, Pylint
├── CHANGELOG.md
├── LICENSE
└── README.md
```

**Key decisions baked in:**

- **Pre-commit hooks** (Black + Ruff + Pylint) run on every `git commit`. Code style is never a PR discussion.
- **`env.template`** is committed. `.env` is gitignored. New team members know exactly what variables to fill in.
- **Go-Task** standardizes `task lint`, `task test`, `task build` across every project.
- **`CODEOWNERS`** means the right person gets tagged on every PR automatically.

Setup takes 5 minutes:

```bash
git clone https://github.com/aviz92/my-new-project.git
cd my-new-project
uv venv && source .venv/bin/activate
uv sync
cp env.template .env
pre-commit install
```

---

## Logging: One Call, Everywhere

Every project uses [`custom-python-logger`](https://pypi.org/project/custom-python-logger) — configured once at the entry point, then imported wherever needed:

```python
# main.py or app.py
from custom_python_logger import build_logger

logger = build_logger(
    project_name='my-project',
    log_file=True,
    utc=True,
    extra={'env': 'production'}
)
```

```python
# anywhere else in the codebase
from custom_python_logger import get_logger

logger = get_logger('my-module')
logger.step("Starting phase 2...")   # custom level for pipeline steps
logger.info("Connected to DB")
logger.exception("Failed to parse response")
```

Two custom levels that I use constantly:

- **`STEP`** — marks a named phase in a pipeline. Makes logs scannable at a glance.
- **`EXCEPTION`** — dedicated level for caught exceptions, separate from `ERROR`. Easy to grep in production.

---

## CLI Tools: Django-Style Without Django

When a project needs a CLI — scripts, automation tools, data pipelines — I use [`python-base-command`](https://pypi.org/project/python-base-command).

The pattern is identical to Django management commands, but with zero Django dependency:

```
my-project/
├── cli.py              # 2-line entry point
└── commands/
    ├── __init__.py
    ├── sync.py
    ├── export.py
    └── validate.py
```

```python
# cli.py
from python_base_command import Runner
Runner(commands_dir="commands").run()
```

```python
# commands/sync.py
from python_base_command import BaseCommand, CommandError

class Command(BaseCommand):
    help = "Sync data from upstream source"
    version = "1.0.0"

    def add_arguments(self, parser):
        parser.add_argument("--env", choices=["staging", "prod"], required=True)
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, **kwargs):
        if kwargs["dry_run"]:
            self.logger.warning("Dry run — no changes written.")
            return

        self.logger.step("Connecting to upstream...")
        # logic here
        self.logger.info(f"Sync complete for env={kwargs['env']}")
```

```bash
python3 cli.py --help
python3 cli.py sync --env staging --dry-run
python3 cli.py export --format json
```

Every command gets `--version`, `--verbosity`, `--traceback` for free. `self.logger` is wired up automatically. Testing uses `call_command()` — identical to Django.

---

## REST API: Two Templates for Two Use Cases

### Django REST Framework — Data-Heavy APIs

For APIs that need versioned data, complex filtering, or admin interfaces: [`django-basic-app`](https://github.com/aviz92/django-basic-app).

Out of the box it includes:

- **`CRUDUtils`** — one static class handles all five CRUD operations with wildcard filtering, pagination, and FK lookups
- **`VersionedModel`** — every model participates in release management automatically
- **Data status workflow** — `DRAFT → FUTURE → APPROVED`, where CI always queries approved data

```python
# One mixin, full versioning
class MyModel(VersionedModel):
    name = models.CharField(max_length=255)
    # That's it. Versioned, locked, auto-discovered.
```

The CI flow:

```
create_release → architects edit data → approve_release → run tests → lock_release
```

### FastAPI — Lightweight Services

For simpler services, microservices, or prototypes: [`fast-api-template`](https://github.com/aviz92/fast-api-template).

Pre-configured with JWT authentication, SQLite (swappable), and example routes ready to extend.

```bash
git clone https://github.com/aviz92/fast-api-template.git
cd fast-api-template
uv sync
uv run uvicorn main:app --reload
# → http://localhost:8000/docs
```

---

## MCP Services: AI Tool Integration

For projects that expose tools to LLMs (Claude Desktop, etc.): [`docker-mcp-service-template`](https://github.com/aviz92/docker-mcp-service-template).

The pattern: a `FastMCP` server + service layer + Docker:

```
mcp-service/
├── server.py           # MCP tool definitions
├── mcp_services/
│   ├── weather.py      # business logic, separate from MCP layer
│   └── ping.py
├── Dockerfile
└── .env
```

```python
# server.py
@mcp.tool()
def get_weather(city: str) -> dict:
    """Fetch current weather for a given city."""
    return weather_service.fetch_weather(city)
```

```json
// Claude Desktop config
{
  "mcpServers": {
    "my-service": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "my-mcp-service"]
    }
  }
}
```

Business logic stays in service classes. MCP tool definitions stay thin. Adding a new tool means adding one service file and registering one decorator.

---

## The Full Picture

Here's how the layers stack across a typical project:

```
┌─────────────────────────────────────────┐
│         dev-template-repository          │  base structure, CI, pre-commit
├─────────────────────────────────────────┤
│         custom-python-logger             │  logging everywhere
├─────────────────────────────────────────┤
│         python-base-command              │  CLI tools and scripts
├─────────────────────────────────────────┤
│    django-basic-app / fast-api-template  │  API layer
├─────────────────────────────────────────┤
│         docker-mcp-service-template      │  LLM tool exposure (if needed)
└─────────────────────────────────────────┘
```

Every layer is optional — a simple automation script might only use the base template and the logger. A full data platform uses all of them.

---

## What This Gives You

- **Zero setup time** — clone the template and you have CI, linting, and pre-commit from minute one
- **Consistent structure** — any project looks familiar to anyone on the team
- **Opinionated defaults** — you don't decide formatting style on every PR
- **Testable by design** — `call_command()` for CLI, standard pytest for APIs
- **Production logging from day one** — no `print()` debugging that leaks into production

The templates are all open source and available on [GitHub](https://github.com/aviz92). Clone any of them, use the template button, or just steal the patterns that work for you.

---

## Related Posts

- [drf-easy-crud: Enterprise-Grade CRUD for Django REST Framework](/posts/drf-easy-crud/)
- [custom-python-logger: Colored, Contextual Logging for Python Projects](/posts/custom-python-logger/)
- [python-base-command: Django-Style CLI Commands Without Django](/posts/python-base-command/)
- [django-versioned-models: Drop-in Release Management for Django Models](/posts/django-versioned-models/)
