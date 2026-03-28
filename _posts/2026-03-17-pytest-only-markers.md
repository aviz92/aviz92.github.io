---
title: "pytest-only-markers: Isolate Any Test Instantly Without Touching Your CI"
date: 2026-03-17 09:00:00 +0300
categories: [Testing, Pytest]
tags: [python, pytest, testing, automation, ci-cd, markers, devtools]
description: >-
  pytest-only-markers lets you flag individual tests with ONLY_* markers and run
  only those — stripping inherited pytestmark noise and deselecting everything else.
  One decorator, one flag, full isolation.
---

There's a specific kind of frustration that comes up when debugging a flaky test in a large suite. You don't want to run all 800 tests. You don't want to fiddle with `-k` expressions. You definitely don't want to temporarily comment out `pytestmark` at the top of the file and forget to put it back. You just want to run this test, and only this test, exactly as it would run in CI — markers and all. `pytest-only-markers` solves that with one decorator and one flag.

## Why I Built This

Most pytest projects accumulate module-level `pytestmark` lists over time. CI runs `pytest -m regression` — a generic command that touches the whole suite. That's fine for most tests. But inside those modules there are always two or three tests that can only safely run under one specific marker condition. The existing options — move the file, add a `skipif`, change the module `pytestmark`, add `-k` exclusions to CI — are all bad for different reasons. I wanted the test itself to declare where it belongs, with the plugin enforcing it at collection time.

## Installation

```bash
pip install pytest-only-markers
```
```bash
uv add pytest-only-markers
```

## Setup & Configuration

```ini
[pytest]
addopts = --only-markers-prefix
markers =
    ONLY_smoke: Run only smoke tests
    ONLY_api: Run only API tests
```

Or pass the flag directly:

```bash
pytest --only-markers-prefix tests/
```

The plugin is opt-in — without `--only-markers-prefix`, all `ONLY_*` markers are inert and the suite runs normally.

## Quick Start

Decorate the test that has constraints, run with the flag:

```python
pytestmark = [pytest.mark.regression, pytest.mark.e2e]

def test_full_flow():
    ...

@pytest.mark.ONLY_smoke
def test_health_check():
    ...
```

```bash
pytest --only-markers-prefix tests/
# Only test_health_check runs. test_full_flow is deselected.
# pytestmark (regression, e2e) is stripped from test_health_check.
```

## Real-World Example

Say your CI has two pipeline commands — a full regression suite and a fast smoke suite:

```bash
pytest -m regression          # full suite
pytest -m "smoke or ONLY_smoke"  # smoke suite
```

A module has tests that participate in regression, but one test should only ever run as part of smoke:

```python
pytestmark = [pytest.mark.regression, pytest.mark.e2e]

def test_full_flow():
    ...

def test_checkout():
    ...

@pytest.mark.ONLY_smoke
def test_health_check():
    ...
```

With this setup:

| Command | `test_full_flow` | `test_checkout` | `test_health_check` |
|---|---|---|---|
| `pytest -m regression` | ✅ runs | ✅ runs | ❌ skipped |
| `pytest -m "smoke or ONLY_smoke"` | ❌ skipped | ❌ skipped | ✅ runs |
| `pytest --only-markers-prefix` | ❌ deselected | ❌ deselected | ✅ isolated, markers stripped |

`ONLY_smoke` does double duty: in CI it's a scoped inclusion tag, locally it's an isolation switch. No changes to `pytest.ini`. No `-k` hacks. No `skipif` conditions.

## Key Features

When `--only-markers-prefix` is active and any test in the collected suite carries an `ONLY_*` marker, only those tests run. Everything else is deselected — appearing in pytest's `x deselected` summary, never silently dropped. The plugin is transparent about what it's doing.

Marker isolation is the part that makes this different from `-k`. Non-`ONLY_*` markers — including the entire module `pytestmark` — are stripped from matching tests at the item level. Downstream plugins, reporters, and hooks see only the `ONLY_*` markers for that test, giving you a genuinely clean execution environment. `-k` by contrast doesn't strip inherited markers; it just filters by name.

The prefix match is case-insensitive — `ONLY_smoke` and `only_smoke` are treated identically, which matters on teams where engineers have different habits:

```python
@pytest.mark.only_smoke   # lowercase — works
def test_ping():
    assert True

@pytest.mark.ONLY_smoke   # uppercase — equivalent
def test_pong():
    assert True
```

Stack multiple `ONLY_*` markers freely — all are preserved, everything else is stripped:

```python
@pytest.mark.ONLY_api
@pytest.mark.ONLY_smoke
def test_create_user():
    assert True
# Effective markers: ONLY_api + ONLY_smoke
# pytestmark (regression, slow) stripped entirely
```

For local debugging loops, decorate the test you're working on and iterate without touching CI config:

```python
@pytest.mark.ONLY_debug
def test_payment_edge_case():
    ...
```

```bash
pytest --only-markers-prefix tests/payments/
```

Remove the decorator when you're done — or leave it. Without `--only-markers-prefix` in CI's `addopts`, the marker is inert.

## Goes Well With

- [`custom-python-logger`](/posts/custom-python-logger) — the logger used in the examples; `self.logger` output flows into the report automatically
- [`pytest-plugins`](/posts/pytest-plugins) — CI reporting layer that works alongside the requirements manifest in pipeline workflows
- [`pytest-depends-on`](/posts/pytest-depends-on) — run a specific dependency chain in isolation without triggering unrelated tests
- [`pytest-reporter-html`](/posts/pytest-reporter-html) — isolated runs produce tight, single-test HTML reports that are easy to share
- [`pytest-dynamic-parameterize`](/posts/pytest-dynamic-parameterize) — isolate one parameterized variant without running the full parameter set
- [`pytest-collect-requirements`](/posts/pytest-collect-requirements) — collect test requirements from the same dynamic sources as your parameters for fully data-driven pipelines

---

## Links

- **PyPI**: [pypi.org/project/pytest-only-markers](https://pypi.org/project/pytest-only-markers)
- **GitHub**: [github.com/aviz92/pytest-only-markers](https://github.com/aviz92/pytest-only-markers)

Decorate the test. Run the flag. Everything else stays out of the way.
