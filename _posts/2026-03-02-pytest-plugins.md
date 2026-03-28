---
title: "pytest-plugins: Enhanced Reporting and Smart CI Utilities for Pytest"
date: 2026-03-02 10:00:00 +0200
categories: [Testing, Pytest]
tags: [python, pytest, ci, reporting, testing]
description: "pytest-plugins supercharges your test suite with structured JSON/Markdown reporting, consecutive failure detection, smart skip-on-fail, and verbose parameter IDs — all configurable via pytest.ini."
---

Running tests is easy. Understanding what happened, why it failed, and how to act on it in CI — that's the hard part. Standard pytest gives you a pass/fail count and a traceback. What it doesn't give you is structured output you can feed to dashboards, traceability back to the exact commit and pipeline that triggered the run, or smart failure strategies that distinguish a flaky test from a systemic breakdown. `pytest-plugins` adds all of that in one package.

## Why I Built This

Every project I worked on eventually had the same set of problems: CI reports you couldn't search through, parametrized test IDs that told you nothing, and pipelines that kept running after ten consecutive failures because nobody set `--maxfail`. I kept adding the same patches across different repos. Eventually I consolidated them into a single plugin, made everything configurable from `pytest.ini`, and stopped repeating myself.

## Installation

```bash
pip install pytest-plugins
```
```bash
uv add pytest-plugins
```

## Quick Start

Add your desired flags to `pytest.ini` and they apply to every run:

```ini
[pytest]
addopts =
    --better-report
    --maxfail-streak=3
    --fail2skip
    --verbose-param-ids
    --md-report
```

That's the full setup. No fixtures, no conftest changes, no imports.

## Real-World Example

Here's how this looks in a CI pipeline for an API test suite. The pipeline runs on every PR, attaches metadata to the report, and stops fast if something fundamental breaks:

```ini
[pytest]
addopts =
    --better-report
    --output-dir=logs/results_output
    --pr-number=${PR_NUMBER}
    --commit=${GIT_COMMIT}
    --pipeline-number=${CI_PIPELINE_ID}
    --add-parameters
    --verbose-param-ids
    --maxfail-streak=5
    --fail2skip
    --md-report
    --traceback
```

After the run, `logs/results_output/test_results.json` contains every test outcome with its parameters and error details — linked to the exact PR and commit. The Markdown report goes straight into the pipeline artifact, readable in any CI UI without parsing JSON. If 5 tests fail consecutively, execution stops immediately instead of grinding through 200 more tests against a broken environment.

## Key Features

`better-report` is the flagship feature. Enable it and pytest generates three files under your output directory: `execution_results.json` with a machine-readable run summary, `test_results.json` with per-test outcomes including parameters and full tracebacks, and `test_report.md` for human review. Every report can carry CI metadata — PR number, MR number, commit hash, pipeline ID — so you can always trace a result back to exactly what produced it.

`maxfail-streak` is a smarter alternative to `--maxfail`. Standard `--maxfail=N` stops after N total failures regardless of how they're distributed. `--maxfail-streak=N` stops only after N *consecutive* failures — which is the real signal that something is fundamentally broken rather than just flaky. A passing test between failures resets the counter.

`fail2skip` handles the class of tests that are known-broken but not worth fixing right now. Decorate the test with `@pytest.mark.fail2skip`, enable the flag, and a failing test is reported as skipped instead of failed — keeping the pipeline green while the issue stays tracked:

```python
@pytest.mark.fail2skip
def test_known_broken():
    assert broken_feature() == expected
```

`verbose-param-ids` fixes the readability problem with parameterized tests. Instead of `test_add[1-2-3]`, you get `test_add[(a: 1, b: 2, expected: 3)]` — immediately understandable without looking up the decorator. Especially valuable in failure reports where you need to know at a glance which case failed.

## Setup & Configuration

All features are controlled through `pytest.ini` flags. Here's a full reference configuration:

```ini
[pytest]
addopts =
    --better-report
    --output-dir=logs
    --pr-number=123
    --commit=abc1234
    --pipeline-number=456
    --fail2skip
    --maxfail-streak=3
    --add-parameters
    --pytest-command
    --verbose-param-ids
    --md-report
    --traceback
    --log-collected-tests
    --result-each-test
    --pytest-xfail-strict
```

| Flag | Description |
|------|-------------|
| `--better-report` | Enable structured reporting |
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

## The Stack Behind the Examples

- [`custom-python-logger`](/posts/custom-python-logger) — the logger powering `self.logger` in every command

---

## Links

- **PyPI**: [pypi.org/project/pytest-plugins](https://pypi.org/project/pytest-plugins)
- **GitHub**: [github.com/aviz92/pytest-plugins](https://github.com/aviz92/pytest-plugins)

Four lines in `pytest.ini` and your CI pipeline finally tells you something useful.
