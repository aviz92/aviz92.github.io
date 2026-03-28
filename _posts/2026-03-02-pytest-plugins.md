---
title: "pytest-plugins: Enhanced Reporting and Smart CI Utilities for Pytest"
date: 2026-03-02 10:00:00 +0200
categories: [Pytest]
tags: [python, pytest, ci, reporting, testing]
description: "pytest-plugins supercharges your test suite with structured JSON/Markdown reporting, consecutive failure detection, smart skip-on-fail, and verbose parameter IDs — all configurable via pytest.ini."
---

Running tests is easy. Understanding what happened, why it failed, and how to act on it in CI — that's the hard part. `pytest-plugins` adds four powerful features on top of standard pytest to make your testing workflow smarter and your CI pipelines more resilient.

## Installation

```bash
pip install pytest-plugins
```

---

## Four Features, One Plugin

### 1. `better-report` — Structured Test Reporting

The flagship feature. Enable it and pytest will generate three output files under `tests/results_output/`:

- `execution_results.json` — machine-readable summary of the run
- `test_results.json` — per-test outcome with parameters, errors, and metadata
- `test_report.md` — human-readable Markdown report

What makes it powerful is the CI traceability metadata you can attach:

```ini
[pytest]
addopts =
    --better-report
    --output-dir=logs
    --pr-number=123
    --commit=abc1234
    --pipeline-number=456
    --add-parameters
    --pytest-command
    --md-report
    --traceback
```

Every report will be linked to the exact PR, commit, and pipeline that produced it — invaluable when debugging flaky tests in CI.

**Key flags:**

| Flag | Description |
|------|-------------|
| `--better-report` | Enable the feature |
| `--output-dir` | Output directory (default: `root_project/results_output/`) |
| `--pr-number` | Attach PR number to the report |
| `--mr-number` | Attach MR number (GitLab) |
| `--pipeline-number` | Attach CI pipeline number |
| `--commit` | Attach commit hash |
| `--add-parameters` | Include test parameters in results |
| `--traceback` | Include full traceback in report |
| `--md-report` | Generate Markdown report |
| `--log-collected-tests` | Log all collected tests at session start |
| `--result-each-test` | Print result after each test |
| `--pytest-xfail-strict` | Treat `xpass` as failure |

---

### 2. `maxfail-streak` — Stop on Consecutive Failures

Standard `--maxfail=N` stops after N total failures. `--maxfail-streak=N` stops after N **consecutive** failures — a much smarter signal that something is fundamentally broken, not just a few isolated flaky tests.

```ini
addopts = --maxfail-streak=3
```

If 3 tests fail in a row, execution halts immediately. If a test passes between failures, the counter resets.

---

### 3. `fail2skip` — Downgrade Failures to Skips

Sometimes you have known-broken tests you don't want to fix yet, but you also don't want them blocking the CI pipeline. Mark them with `@pytest.mark.fail2skip` and enable the flag:

```python
@pytest.mark.fail2skip
def test_known_broken():
    assert broken_feature() == expected
```

```ini
addopts = --fail2skip
```

The test runs, fails internally, but is reported as **skipped** — keeping your pipeline green while tracking the issue.

---

### 4. `verbose-param-ids` — Readable Parameterized Test Names

By default, parameterized tests get IDs like `test_add[1-2-3]`. With `--verbose-param-ids`, they become `test_add[(a: 1, b: 2, expected: 3)]` — immediately readable without needing to look up the parametrize decorator.

```ini
addopts = --verbose-param-ids
```

---

## Complete `pytest.ini` Example

```ini
[pytest]
addopts =
    --better-report
    --output-dir=logs
    --pr-number=123
    --fail2skip
    --maxfail-streak=3
    --add-parameters
    --pytest-command
    --verbose-param-ids
    --md-report
    --traceback
```

---

## Links

- **PyPI**: [pypi.org/project/pytest-plugins](https://pypi.org/project/pytest-plugins)
- **GitHub**: [github.com/aviz92/pytest-plugins](https://github.com/aviz92/pytest-plugins)
- **Install**: `pip install pytest-plugins`
