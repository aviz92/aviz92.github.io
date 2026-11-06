---
title: "pytest-max-fail-streak: Stop the Run When the Environment Is Down"
date: 2026-10-31 23:42:00 +0200
categories: [Testing, Pytest]
tags: [python, pytest, ci-cd, testing, fail-fast, devtools]
description: >-
  pytest-max-fail-streak stops the run after N consecutive failing tests, setup errors
  included — so a broken environment fails fast with a clear signal instead of failing
  every remaining test one by one.
---

You know the pattern. The device under test is unreachable, or the staging API is returning 502s, and the suite starts failing. Test one fails. Test two fails. Two hundred tests later, the pipeline finally finishes — forty minutes of compute spent proving the same thing two hundred times, and a report so red that the actual cause is buried. `pytest-max-fail-streak` stops the run after N failures in a row, because a streak like that almost always means the environment is down, not that the code is.

## Why I Built This

pytest's built-in `--maxfail=N` counts failures in total. That's the wrong signal for integration and hardware suites: ten scattered failures across a 500-test run is a normal bad day, while five failures in a row is an outage. I first built this as `max_fail_streak` inside [`pytest-plugins`](/posts/pytest-plugins), but that version had two flaws — it skipped the remaining tests instead of stopping, and it ignored setup errors, which is exactly how an unreachable device usually shows up. The standalone package fixes both.

## Installation

```bash
pip install pytest-max-fail-streak
```
```bash
uv add pytest-max-fail-streak
```

## Quick Start

```bash
pytest --maxfail-streak=5
```

After 5 failing tests in a row, the run stops with exit code `1` and a summary line that says why:

```text
!!!!!!!!!! stopping after 5 consecutive failures (--maxfail-streak=5) !!!!!!!!!!
```

## Setup & Configuration

To apply it to every CI run, add it to `pytest.ini`:

```ini
[pytest]
addopts =
    --maxfail-streak=5
```

`N` must be a positive integer; any other value is a usage error (exit code 4). Without the flag, nothing is registered and no hook runs.

Each test is judged once, after its teardown:

| Test result | Effect on the streak |
|---|---|
| Failed in setup, call or teardown (failure or error) | +1 |
| Passed | Reset to 0 |
| Skipped or xfailed | Unchanged |

When the streak reaches `N`, the run stops after the current test.

## Real-World Example

A nightly hardware suite runs 300 tests against a lab device. Each test opens a session through a `device` fixture with a 60-second connection timeout.

One night the device loses power. Without a streak limit, every remaining test spends a minute timing out in setup, and the pipeline reports 280 errors five hours later. With `--maxfail-streak=5`:

1. The `device` fixture fails to connect — setup error, streak 1.
2. Four more tests error the same way — streak 5.
3. The run stops. Exit code 1, one clear summary line, five minutes in.

Compare that to a normal flaky night, where a few tests fail but passing tests land between them. Every pass resets the streak to zero, so the run continues and you get the full picture.

## Key Features

Consecutive, not total, is the core idea. It doesn't replace `--maxfail`, it complements it:

| | `--maxfail=N` | `--maxfail-streak=N` |
|---|---|---|
| Counts | Failures in total | Failures in a row |
| Typical signal | "Too much is broken" | "The environment is down" |
| A passing test in between | Doesn't matter | Resets the count |

Use both together and whichever is reached first stops the run.

Setup and teardown errors count. That's deliberate: when infrastructure is down, tests rarely get as far as their body — the fixture that opens the connection is what fails. A streak counter that only looked at test bodies would never fire in the exact situation it exists for.

The stop is a real stop. The run ends the same way `--maxfail` ends it — the remaining tests are not run, and they're not reported as skipped either. Your report shows what actually ran, plus a clear reason the run ended early.

Counting is fair. Skipped and xfailed tests are neutral: they don't extend a streak and they don't reset it. And each test counts once, even if it fails in both the call and teardown phases.

One note for parallel runs: with `pytest-xdist`, results arrive interleaved from several workers, so "consecutive" follows the order they arrive in, not the order of the test files.

## Migrating from pytest-plugins

The flag name is the same — `--maxfail-streak=N`. Two behaviors changed:

- The run now stops instead of skipping the remaining tests.
- Setup and teardown errors now count; skipped tests no longer reset the streak.

Both packages register the `--maxfail-streak` option, so don't install them together until you're on a `pytest-plugins` release without it.

## Goes Well With

- [`pytest-fail2skip`](/posts/pytest-fail2skip) — converts the failures you expect, so they don't feed a streak
- [`pytest-better-report`](/posts/pytest-better-report) — tests that were collected but never ran show up as `collected` in the report
- [`pytest-inject-config`](/posts/pytest-inject-config) — point the suite at an environment with one flag; stop fast if that environment is down
- [`pytest-depends-on`](/posts/pytest-depends-on) — skip dependents when a prerequisite fails, for finer-grained control than a streak
- [`pytest-plugins`](/posts/pytest-plugins) — the bundle this plugin was split out of

---

## Links

- **PyPI**: [pypi.org/project/pytest-max-fail-streak](https://pypi.org/project/pytest-max-fail-streak)
- **GitHub**: [github.com/aviz92/pytest-max-fail-streak](https://github.com/aviz92/pytest-max-fail-streak)

Five failures in a row is an answer. There's no need to ask the same question two hundred more times.
