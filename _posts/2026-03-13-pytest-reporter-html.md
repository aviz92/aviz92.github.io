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

There's a moment every QA or automation engineer knows well: a test fails in CI, the logs are a wall of text, and you spend more time finding the failure than fixing it.

I've built a lot of test infrastructure over the years — pytest plugins, CI integrations, custom reporters — and the one thing every team I've worked with has asked for eventually is a *readable* test report. Not a raw log dump. Not a terminal screenshot pasted into a Slack message. Something you can open in a browser, filter by status, expand the failure, and immediately understand what went wrong.

That's what led me and [Yevgeny Farber](https://github.com/YevgenyFarber) to build `pytest-reporter-html` together. It's a pytest plugin that generates a fully interactive HTML report from your existing test suite — with zero code changes required to get started.

---

## What It Does

`pytest-reporter-html` hooks into pytest and produces an HTML report that renders every test run as a structured, navigable page. The key design principle: **you shouldn't have to change your tests to benefit from the report**.

The plugin attaches to Python's root logger automatically, so every `logging.*()` call your tests already make is captured and surfaced in the report — no wiring, no extra fixtures.

Beyond raw logs, the report gives you:

- **Named Steps** — wrap any block of code in a `step` context manager or decorator to create collapsible, timed sections in the report. Each step shows its duration and pass/fail status at a glance.
- **Automatic Phase Steps** — even without manual steps, Setup, test body, and Teardown are created automatically for every test.
- **Real-Time Filtering** — the HTML report ships with a live search bar, status filters (Passed / Failed), and log-level filters (TRACE → ERROR), all working client-side with no server required.
- **Exception Rendering** — full tracebacks are captured and rendered as collapsible blocks; failed tests auto-expand so the failure is the first thing you see.
- **JSON + HTTP Visualisation** — embedded JSON is syntax-highlighted, and HTTP requests are rendered with a generated cURL command and copy button. Extremely useful when debugging API test failures.
- **Per-Test JSON Files** — alongside the HTML, one structured JSON file is written per test, so other tools in your pipeline can consume the results independently.
- **Async Support** — `step` works as both `async with` and an `async def` decorator, so async test suites are fully supported.

---

## Installation

```bash
pip install pytest-reporter-html
```
```bash
uv add pytest-reporter-html
```

---

## Getting Started

Enable the plugin by adding `--report-html` to your pytest options:

```ini
# pytest.ini
[pytest]
addopts =
    --report-html
    --output-dir=logs
```

Or pass it directly:

```bash
pytest --report-html
```

After the run, open the report:

```
logs/test-reports/TestReport_Latest.html
```

That's it. No fixtures, no code changes, no config files to maintain.

---

## Using Named Steps

The real power of the plugin shows up when you add steps. A `step` turns a flat log stream into a structured story about what your test actually did.

### Context Manager

```python
from custom_python_logger import get_logger
from pytest_reporter_html import step

logger = get_logger(__name__)

def test_user_lifecycle():
    with step("Create user"):
        logger.info("Creating a new user with role 'user'")

    with step("Update profile"):
        logger.info("Updating user profile to set role to 'admin'")

    with step("Verify changes"):
        logger.info("Verifying that the user's role has been updated to 'admin'")
```

The report renders this as:

```
Test: test_user_lifecycle                                            PASSED
 ├── Step 01: Create user                               PASSED    120ms
 ├── Step 02: Update profile                            PASSED     45ms
 └── Step 03: Verify changes                            PASSED     30ms
```

### As a Decorator

`step` also works as a function decorator — both sync and async:

```python
@step("Fetch user data")
def get_user(user_id: str) -> dict:
    logger.info(f"Fetching user {user_id}")
    return {"id": user_id, "active": True}

@step("Send notification")
async def notify(user_id: str) -> None:
    logger.info(f"Sending notification to user {user_id}")
```

---

## Failure Output

When a test fails, the report auto-expands that test and highlights the failing step. The failure message, stack trace, and every log event leading up to the failure are all visible in context:

```python
def test_order_checkout():
    with step("Create order"):
        logger.info("Creating order with 3 items")

    with step("Checkout"):
        logger.info("Submitting checkout request")
        assert False, "Checkout failed — payment declined"
```

The `Checkout` step is marked FAILED, and the assertion message appears immediately below it — no grepping through logs required.

---

## Why We Built It This Way

A few design choices are worth calling out explicitly.

**Zero-config log capture** was non-negotiable. Every team already has logging in their tests. A reporter that requires you to swap out your logger or add special fixtures creates friction at exactly the wrong moment. By attaching to the root logger, the plugin works with `logging.info(...)`, `custom_python_logger`, `structlog`, or anything else that feeds the standard logging chain.

**Per-test JSON files** are there because the HTML report shouldn't be a dead end. If you want to post results to a dashboard, run a flakiness analysis, or build an alert on repeated failures, the structured JSON files give you the raw data to do that — independently of the HTML rendering.

**Client-side filtering** means the report is a single self-contained file you can share via Slack, attach to a Jira ticket, or archive in S3 without deploying a server. Anyone with a browser can open it and filter to the failure they care about.

---

## When to Use It

If your team runs pytest in CI and you regularly find yourself scrolling through terminal output or raw log files to debug failures — this plugin is for you.

It's particularly useful for:

- Integration and E2E test suites where tests have multiple phases (setup, calls, teardowns)
- API testing pipelines where request/response visibility matters
- Shared QA environments where non-engineers need to read test results
- Any project where `pytest-html` or raw `--tb=short` output has stopped being enough

---

## Full Documentation

All configuration options, CLI flags, and examples are in the README on PyPI:

- **PyPI**: [pypi.org/project/pytest-reporter-html](https://pypi.org/project/pytest-reporter-html)
- **GitHub**: [github.com/YevgenyFarber/pytest-reporter-html](https://github.com/YevgenyFarber/pytest-reporter-html)

Feedback, issues, and PRs are welcome.

---

Built together with [Yevgeny Farber](https://github.com/YevgenyFarber). Feedback, issues, and PRs are welcome.
