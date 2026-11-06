---
title: "pytest-fail2skip: Keep Known Failures From Blocking Your CI Gate"
date: 2026-10-31 20:44:00 +0200
categories: [Testing, Pytest]
tags: [python, pytest, ci-cd, testing, markers, flaky-tests]
description: >-
  pytest-fail2skip reports failures of marked tests as skipped — only when you opt in
  with --fail2skip, and only for the exceptions you expect — so known failures stop
  blocking the CI gate without hiding new regressions.
---

Every long-lived test suite has them: a handful of tests that fail for a reason everyone already knows about. The upstream service is flaky, the device drops the session once in a while, the bug is filed and scheduled for next sprint. Leave them red and the CI gate is blocked for something nobody can fix today. Delete them and you lose the coverage the day the bug is fixed. `pytest-fail2skip` gives those tests a third option: report the known failure as a skip, scoped to the exception you expect, and only when CI asks for it.

## Why I Built This

This started as the `fail2skip` feature of [`pytest-plugins`](/posts/pytest-plugins). It worked, but it had two problems. It was all-or-nothing — any failure of a marked test was converted, including a brand new regression that happened to land in the same test. And it lived inside a bundle, so you couldn't take it without taking everything else. I split it into its own package and rebuilt it around one rule: a conversion has to be explicit, both in the test (which exception) and in the run (which flag).

## Installation

```bash
pip install pytest-fail2skip
```
```bash
uv add pytest-fail2skip
```

## Quick Start

Mark the known-failing test with a reason and the exception you expect:

```python
import pytest

@pytest.mark.fail2skip(reason="BUG-123: flaky upstream service", raises=ConnectionError)
def test_sync_with_upstream():
    ...
```

Run it normally and you see the real result — the failure is still a failure:

```bash
pytest
```

Opt in to the conversion in CI:

```bash
pytest --fail2skip
```

## Setup & Configuration

The plugin is controlled by one flag and one marker. To enable conversion for every CI run, put the flag in `pytest.ini`:

```ini
[pytest]
addopts =
    --fail2skip
```

The marker is always registered, with or without the flag, so `--strict-markers` never complains about it.

`@pytest.mark.fail2skip(reason=None, raises=None)`

| Argument | Description |
|---|---|
| `reason` | Shown as `fail2skip: <reason>`. Can also be passed positionally. Defaults to `no reason given`. |
| `raises` | An exception type or tuple of types. When set, only these failures are converted. |

With `--fail2skip` on, this is how each outcome is reported:

| Test result | Reported as |
|---|---|
| Fails in the test body (and matches `raises`, if given) | skipped |
| Fails with an exception not in `raises` | failed |
| Passes | passed |
| Errors in setup/teardown (e.g. a broken fixture) | error — not converted |

The marker works on a function, a class, or a whole module through `pytestmark`.

## Real-World Example

A hardware test suite talks to a device that occasionally drops the session or times out. The team filed `BUG-456`, but the device firmware fix is weeks away. Meanwhile the release gate needs to stay meaningful:

```python
import pytest

@pytest.mark.fail2skip(
    reason="BUG-456: device sometimes drops the session",
    raises=(ConnectionError, TimeoutError),
)
def test_device_handshake():
    session = open_session(device)
    assert session.handshake() == "OK"
```

In CI with `--fail2skip`:

- The device drops the session → `ConnectionResetError` (a subclass of `ConnectionError`) → reported as **skipped**, with `fail2skip: BUG-456: device sometimes drops the session` in the `-rs` summary.
- Someone breaks the handshake protocol → `AssertionError` → still **failed**. The gate catches it.
- The `device` fixture can't reach the device at all → setup **error**, not converted. A broken environment is never hidden.
- Firmware gets fixed → the test passes → reported as **passed**, so you know it's time to remove the marker.

Locally, without the flag, the engineer working on `BUG-456` sees the real failure every time.

## Key Features

The direction of the default is the whole point. `fail2skip` shows the failure unless you pass `--fail2skip`. Forget the flag and you get a loud red test, not a silent green one. That makes it safe to leave the marker in the code: the only place failures get converted is the place you explicitly configured.

`raises=` is what keeps the conversion honest. Without it, a marked test is a blind spot — any failure, for any reason, turns into a skip. With it, only the failure you already understand is converted. Subclasses match, so `raises=ConnectionError` covers `ConnectionResetError` and `ConnectionRefusedError` too. Anything else still fails the run.

The reason travels with the result. It's printed in pytest's `-rs` summary and exposed as the `fail2skip_reason` user property, which ends up in JUnit XML and is available to any reporting plugin:

```python
def pytest_runtest_logreport(report):
    reason = dict(report.user_properties).get("fail2skip_reason")
    if report.skipped and reason:
        print(f"{report.nodeid} was converted: {reason}")
```

The plugin changes only pytest's own report, so it works with any reporter — including [`pytest-better-report`](/posts/pytest-better-report), which records converted tests as `skipped` with the reason in `test_user_properties`.

### fail2skip vs. `xfail`

`@pytest.mark.xfail` is close, but differs in two ways that matter for a release gate:

| | `xfail` | `fail2skip` |
|---|---|---|
| Default | Hides the failure unless you pass `--runxfail` | Shows the failure unless you pass `--fail2skip` |
| A passing test | Reported as XPASS | Reported as passed |

If neither difference matters to you, `xfail(raises=..., strict=False)` is the built-in alternative.

## Migrating from pytest-plugins

If you used `fail2skip` from `pytest-plugins`, the marker and flag names are the same. Two things changed:

- Converted tests are now reported as `skipped` instead of `xfailed`.
- In the better-report output they're recorded as `skipped` (not `failed-skipped`), with the reason in the user properties.

Both packages register the `--fail2skip` option, so don't install them together until you're on a `pytest-plugins` release without `fail2skip`.

## Goes Well With

- [`pytest-max-fail-streak`](/posts/pytest-max-fail-streak) — `fail2skip` hides the failures you expect, `max-fail-streak` stops the run on the ones you don't
- [`pytest-better-report`](/posts/pytest-better-report) — converted tests land in the JSON report as `skipped`, with the reason attached
- [`pytest-inject-config`](/posts/pytest-inject-config) — known failures are often environment-specific; pair the marker with per-environment config
- [`pytest-reporter-html`](/posts/pytest-reporter-html) — see converted tests and their reasons in an interactive HTML report
- [`pytest-plugins`](/posts/pytest-plugins) — the bundle this plugin was split out of

---

## Links

- **PyPI**: [pypi.org/project/pytest-fail2skip](https://pypi.org/project/pytest-fail2skip)
- **GitHub**: [github.com/aviz92/pytest-fail2skip](https://github.com/aviz92/pytest-fail2skip)

Name the bug, name the exception, opt in where it matters — and let everything else keep failing loudly.
