---
title: "pytest-reporter-html: Rich, Interactive HTML Reports for pytest — Zero Config"
date: 2026-03-13 21:00:00 +0200
categories: [Testing, Pytest]
tags: [python, pytest, testing, ci-cd, html, reporting, automation, devops]
description: >-
  pytest-reporter-html generates rich, interactive HTML test reports with zero-config log capture,
  named step tracking, exception rendering, and real-time filtering — open the file in any browser
  and start debugging.
---

There's a moment every QA or automation engineer knows well: a test fails in CI, the logs are a wall of text, and you spend more time finding the failure than fixing it. Not a raw log dump. Not a terminal screenshot pasted into Slack. Something you can open in a browser, filter by status, expand the failure, and immediately understand what went wrong.

## Why I Built This

I've built a lot of test infrastructure over the years — pytest plugins, CI integrations, custom reporters — and the one thing every team I've worked with has asked for eventually is a *readable* test report. The existing options were either too basic (`pytest-html`) or too heavy. Together with [Yevgeny Farber](https://github.com/YevgenyFarber), I built the reporter I actually wanted to use: fully interactive, zero code changes to get started, and structured around how test failures are actually debugged.

## Installation

```bash
pip install pytest-reporter-html
```
```bash
uv add pytest-reporter-html
```

## Quick Start

Add `--report-html` to your pytest options:

```ini
# pytest.ini
[pytest]
addopts =
    --report-html
    --output-dir=logs
```

After the run, open the report:

```
logs/test-reports/TestReport_Latest.html
```

No fixtures, no code changes, no config files to maintain. The plugin attaches to Python's root logger automatically — every `logging.*()` call your tests already make is captured and surfaced in the report without any wiring.

## Real-World Example

Here's an API test with named steps. The report turns a flat log stream into a structured story about what the test actually did:

```python
from custom_python_logger import get_logger
from pytest_reporter_html import step

logger = get_logger(__name__)

def test_user_lifecycle():
    with step("Create user"):
        logger.info("Creating a new user with role 'user'")
        response = api.post("/users", json={"role": "user"})
        assert response.status_code == 201

    with step("Update profile"):
        logger.info("Updating user's role to 'admin'")
        response = api.patch(f"/users/{user_id}", json={"role": "admin"})
        assert response.status_code == 200

    with step("Verify changes"):
        logger.info("Verifying that the role change persisted")
        response = api.get(f"/users/{user_id}")
        assert response.json()["role"] == "admin"
```

The report renders this as:

```
Test: test_user_lifecycle                                            PASSED
 ├── Step 01: Create user                               PASSED    120ms
 ├── Step 02: Update profile                            PASSED     45ms
 └── Step 03: Verify changes                            PASSED     30ms
```

When a step fails, the report auto-expands that test and highlights the failing step. The assertion message, stack trace, and every log event leading up to the failure are visible in context — no grepping through logs required.

## Key Features

Zero-config log capture was a non-negotiable design decision. Every team already has logging in their tests. By attaching to the root logger, the plugin works with `logging.info(...)`, `custom_python_logger`, `structlog`, or anything else that feeds the standard logging chain — no fixture swaps, no special calls.

Named steps are the main quality-of-life feature. The `step` context manager wraps any block of code into a collapsible, timed section in the report. Each step shows its duration and pass/fail status at a glance. Without manual steps, Setup, test body, and Teardown are created automatically for every test. `step` also works as a decorator — both sync and async:

```python
@step("Fetch user data")
def get_user(user_id: str) -> dict:
    return api.get(f"/users/{user_id}").json()

@step("Send notification")
async def notify(user_id: str) -> None:
    await notification_service.send(user_id)
```

The HTML report ships with live search, status filters (Passed / Failed), and log-level filters (TRACE → ERROR) — all client-side, no server required. The report is a single self-contained file you can share via Slack, attach to a Jira ticket, or archive in S3 without deploying anything.

JSON content is syntax-highlighted inline. HTTP requests are rendered with a generated cURL command and copy button — which matters a lot when debugging API test failures and you want to reproduce a specific request outside the test.

Per-test JSON files are written alongside the HTML, one per test. If you want to post results to a dashboard, run a flakiness analysis, or build an alert on repeated failures, the structured JSON gives you the raw data independently of the HTML rendering. The report doesn't have to be a dead end.

## Goes Well With

- [`custom-python-logger`](/posts/custom-python-logger) — the logger used in the examples; `self.logger` output flows into the report automatically
- [`pytest-plugins`](/posts/pytest-plugins) — `--maxfail-streak` and `--fail2skip` work cleanly alongside marker isolation for focused debugging runs
- [`pytest-depends-on`](/posts/pytest-depends-on) — run a specific dependency chain in isolation without triggering unrelated tests
- [`pytest-reporter-html`](/posts/pytest-reporter-html) — isolated runs produce tight, single-test HTML reports that are easy to share
- [`pytest-dynamic-parameterize`](/posts/pytest-dynamic-parameterize) — isolate one parameterized variant without running the full parameter set
- [`pytest-collect-requirements`](/posts/pytest-collect-requirements) — collect test requirements from the same dynamic sources as your parameters for fully data-driven pipelines
 
---

## Links

- **PyPI**: [pypi.org/project/pytest-reporter-html](https://pypi.org/project/pytest-reporter-html)
- **GitHub**: [github.com/YevgenyFarber/pytest-reporter-html](https://github.com/YevgenyFarber/pytest-reporter-html)

Built together with [Yevgeny Farber](https://github.com/YevgenyFarber). If your team is still debugging CI failures from terminal output, this is the upgrade.
