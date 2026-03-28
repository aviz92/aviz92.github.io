---
title: "pytest-only-markers: Isolate Any Test Instantly Without Touching Your CI"
date: 2026-03-17 09:00:00 +0300
categories: [Pytest]
tags: [python, pytest, testing, automation, ci-cd, markers, devtools]
description: >-
  pytest-only-markers lets you flag individual tests with ONLY_* markers and run
  only those — stripping inherited pytestmark noise and deselecting everything else.
  One decorator, one flag, full isolation.
---

There's a specific kind of frustration that comes up when debugging a flaky test in a large suite.

You don't want to run all 800 tests. You don't want to fiddle with `-k` expressions. You definitely don't want to temporarily comment out `pytestmark` at the top of the file and forget to put it back. You just want to say: **run this test, and only this test, exactly as it would run in CI** — markers and all.

That's the problem `pytest-only-markers` solves. But there's a deeper problem it also addresses — one that comes up constantly in production test suites with multiple CI pipelines.

---

## The Real Problem: Module-Level Markers vs. Individual Test Constraints

Most pytest projects accumulate module-level `pytestmark` lists over time:

```python
pytestmark = [pytest.mark.regression, pytest.mark.e2e, pytest.mark.slow]
```

CI runs something like `pytest -m regression` — a generic command that touches the whole suite. That's fine for most tests.

But inside that module, there are two or three tests that **can only safely run under one specific marker condition** — say, only as part of `smoke`, or only when a specific service is available. They're not wrong to live in that module, but they can't participate in every marker combination the generic CI command triggers.

The old options are all bad:

- **Move the tests to a different file** — awkward, breaks cohesion
- **Add a `skipif` condition** — verbose, and it's runtime logic masquerading as a collection concern
- **Change the module `pytestmark`** — affects every test in the file
- **Add `-k` exclusions to the CI command** — fragile, grows over time, and `-k` doesn't strip inherited markers anyway

`pytest-only-markers` gives you a fourth option: **the test declares where it belongs, and the plugin enforces it**.

---

## A Concrete CI Pattern: `X or ONLY_X`

Say your CI has two pipeline commands:

```bash
# Full regression suite
pytest -m regression

# Smoke suite — fast, critical-path only
pytest -m smoke
```

Your module looks like this:

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

`test_health_check` has a constraint: it should **only run as part of smoke**, never pulled in by `regression` or `e2e` through the inherited `pytestmark`.

You update the smoke pipeline command to:

```bash
pytest -m "smoke or ONLY_smoke"
```

Now the logic is explicit and enforced at the marker level:

| Command | `test_full_flow` | `test_checkout` | `test_health_check` |
|---|---|---|---|
| `pytest -m regression` | ✅ runs | ✅ runs | ❌ skipped — no `regression` |
| `pytest -m "smoke or ONLY_smoke"` | ❌ skipped | ❌ skipped | ✅ runs |
| `pytest --only-markers-prefix` | ❌ deselected | ❌ deselected | ✅ isolated, markers stripped |

The `ONLY_smoke` marker does double duty:

- **In CI** — acts as a scoped inclusion tag: the test participates in `smoke or ONLY_smoke` runs and nothing else
- **Locally** — combine with `--only-markers-prefix` to run it in full isolation, stripped of all inherited `pytestmark` noise

No changes to `pytest.ini`. No `-k` hacks. No `skipif` conditions. The test itself declares where it belongs.

---

## Installation

```bash
uv add pytest-only-markers
# or
pip install pytest-only-markers
```

Enable it via `pytest.ini`:

```ini
[pytest]
addopts = --only-markers-prefix
markers =
    ONLY_smoke: Run only smoke tests
    ONLY_api: Run only API tests
```

Or pass the flag directly on the CLI:

```bash
pytest --only-markers-prefix tests/
```

---

## More Usage Patterns

### Multiple `ONLY_*` markers on one test

Stack them freely — all `ONLY_*` markers are preserved, everything else is stripped:

```python
pytestmark = [pytest.mark.regression, pytest.mark.slow]

@pytest.mark.ONLY_api
@pytest.mark.ONLY_smoke
def test_create_user():
    assert True
# Effective markers: ONLY_api + ONLY_smoke
# pytestmark (regression, slow) is stripped entirely
```

### Case-insensitive prefix

Both `ONLY_smoke` and `only_smoke` are treated identically:

```python
@pytest.mark.only_smoke   # lowercase
def test_ping():
    assert True

@pytest.mark.ONLY_smoke   # uppercase — equivalent
def test_pong():
    assert True
```

Useful when different engineers have different habits — the plugin doesn't care.

### Combine isolation with a local debugging loop

Decorate the test you're working on, run in full isolation, iterate:

```python
@pytest.mark.ONLY_debug
def test_payment_edge_case():
    ...
```

```bash
pytest --only-markers-prefix tests/payments/
```

Remove the decorator when you're done — or leave it committed. Without `--only-markers-prefix` in CI's `addopts`, the marker is inert.

---

## Why Not Just Use `-k`?

`-k` is a substring match against test names. It's powerful for ad-hoc filtering but has two hard limits here:

1. It **doesn't strip inherited markers** from matched tests — the module-level `pytestmark` still applies.
2. It requires you to know the test name upfront, and it matches across the whole suite by name, not by intent.

`pytest-only-markers` is intent-driven. You decorate the test that has constraints, and the plugin enforces isolation — including cleaning up the marker environment for that test so downstream plugins, reporters, and hooks see only what's actually relevant.

---

## Features at a Glance

- **Selective collection** — only tests with an `ONLY_*` marker are collected; all others are deselected
- **Case-insensitive prefix** — `ONLY_*` and `only_*` are equivalent
- **Marker isolation** — non-`ONLY_*` markers, including module `pytestmark`, are stripped from matching items
- **Transparent deselection** — skipped tests appear in pytest's `x deselected` summary, never silently dropped
- **Instance-level patch** — `iter_markers` is patched per item, not globally, so downstream plugins see a clean marker set
- **Opt-in via flag** — `--only-markers-prefix` is required to activate; without it the plugin is a no-op

---

## Links

- **GitHub**: [github.com/aviz92/pytest-only-markers](https://github.com/aviz92/pytest-only-markers)
- **PyPI**: [pypi.org/project/pytest-only-markers](https://pypi.org/project/pytest-only-markers)

Feedback, issues, and PRs are welcome.
