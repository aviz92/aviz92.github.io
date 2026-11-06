---
title: "pytest-better-report: Structured JSON and Markdown Reports With CI Traceability"
date: 2026-11-01 21:53:00 +0200
categories: [Testing, Pytest]
tags: [python, pytest, ci-cd, reporting, json, markdown, testing]
description: >-
  pytest-better-report writes a structured report of every run — a JSON entry per test,
  a JSON summary of the run with CI metadata (repo, PR/MR, pipeline, commit), and an
  optional Markdown table — plus a CLI to compare two runs.
---

pytest tells you how many tests passed and prints tracebacks for the ones that didn't. That's enough when you're watching the terminal. It's not enough when you need to feed results into a dashboard, answer "which commit broke this?" three days later, or compare a feature branch against `main` test by test. `pytest-better-report` writes every run to structured files — machine-readable JSON, linked to the exact repo, PR, pipeline and commit that produced it — and ships a CLI that diffs two runs.

## Why I Built This

This was the flagship feature of [`pytest-plugins`](/posts/pytest-plugins), and the one people actually installed the bundle for. As a standalone package it got the attention it deserved: statuses now come from pytest's final reports, so the result is correct no matter which other plugins run and in what order. Teardown errors are reported as failures instead of slipping through as passes. And it now ships a CLI that compares two runs, so "what changed between `main` and my branch?" is one command.

## Installation

```bash
pip install pytest-better-report
```
```bash
uv add pytest-better-report
```

## Quick Start

```bash
pytest --better-report --md-report --pr-number=123 --commit="$GIT_SHA"
```

The files are written to `results_output/`, or to `<output-dir>/results_output/` if you pass `--output-dir`:

| File | Content |
|---|---|
| `test_results.json` | One entry per test: name, file, class, parameters, markers, status, times, exception, user properties |
| `execution_results.json` | The run: status, start / end / duration, CI metadata, environment, optionally the pytest command |
| `test_report.md` | With `--md-report`: a table of all tests and a summary by status |

## Setup & Configuration

Static options belong in `pytest.ini`:

```ini
[pytest]
addopts =
    --better-report
    --md-report
    --output-dir=logs
    --traceback
```

CI metadata changes on every run, so pass it on the command line, where your shell expands the variables:

```bash
pytest \
  --repo-name="$CI_PROJECT_NAME" \
  --mr-number="$CI_MERGE_REQUEST_IID" \
  --pipeline-number="$CI_PIPELINE_ID" \
  --commit="$CI_COMMIT_SHA"
```

| Flag | Description |
|---|---|
| `--better-report` | Enable the report |
| `--output-dir=DIR` | Write the files to `DIR/results_output/` |
| `--md-report` | Also write `test_report.md` |
| `--traceback` | Add the crash location and traceback frames to each exception |
| `--repo-name`, `--pr-number`, `--mr-number`, `--pipeline-number`, `--commit` | CI metadata for `execution_results.json` |
| `--pytest-command` | Record the pytest command line in `execution_results.json` |
| `--pytest-xfail-strict` | Treat an unexpected pass (XPASS) as a failure of the run |
| `--result-each-test` | Log each test's result after it runs |
| `--log-collected-tests` | Log every collected test at the start (works without `--better-report` too) |

Without `--better-report`, nothing is registered and no hook runs.

## Real-World Example

A team runs its API suite on every merge request and ships `test_results.json` to Elasticsearch. Two questions come up every week: "Is this failure new on my branch, or was it already broken on `main`?" and "What exactly did the API return?"

The first question is the comparison CLI. The pipeline keeps the `main` results as an artifact and diffs the branch against them:

```bash
better_report_compare \
  -a main/results_output/test_results.json \
  -b branch/results_output/test_results.json \
  --fail-on-diff
```

It lists tests missing from either side and tests whose status changed, and exits non-zero with `--fail-on-diff` when there are differences. Add `--test-file-name` to limit the comparison to one test file.

The second question is structured failure data. Raise with a JSON object as the message, and the report records it as data rather than a string:

```python
import json

def test_create_order():
    response = call_api()
    if response.status != 200:
        raise AssertionError(json.dumps({"status": response.status, "body": response.text}))
```

In Kibana, that's now a query on the status field instead of a regex over a traceback.

## Key Features

Every test gets exactly one status in `test_results.json`, and the run gets an overall `execution_info.execution_status` in `execution_results.json`:

| Test status | Meaning | Makes the run `failed` |
|---|---|---|
| `passed` | Passed | No |
| `failed` | Failed or errored in setup, call or teardown | Yes |
| `skipped` | Skipped (marker, fixture, or a plugin that converted the outcome) | No |
| `xfailed` | Expected failure | No |
| `xpassed` | Unexpected pass | Only with `--pytest-xfail-strict` |
| `collected` | Collected but not run (e.g. the run stopped early) | No |

That run status is the report's own verdict, written into the file. The plugin never changes pytest's exit code — your CI gate behaves exactly as before.

The `collected` status matters more than it looks. When a run stops early — `--maxfail`, a streak limit, a crash — the tests that never ran still appear in the report. You can see the full scope of what was supposed to run, not just what happened to finish.

Parameters are always recorded in `test_parameters`, so a failure in a parametrized test tells you exactly which case broke. Markers and user properties are recorded too, which is how other plugins pass context into the report.

The plugin plays well with others. Because statuses are read from pytest's final reports, a plugin that converts outcomes — like [`pytest-fail2skip`](/posts/pytest-fail2skip) — is reflected correctly regardless of plugin order.

## Migrating from pytest-plugins

This was `better_report` in `pytest-plugins`. Flags, file names and the JSON schema are unchanged, with a few differences you may notice:

- A test that errors in teardown is now `failed` (it was reported as passed).
- The `failed-skipped` status no longer exists; converted failures are `skipped`, with the reason in `test_user_properties`.
- The logger is named `pytest_better_report`.
- `--add-parameters` was removed. Parameters are always recorded in `test_parameters`; in ELK / Kibana, query them as `test_parameters.<name>` instead of `<name>`. Passing the old flag now fails with "unrecognized arguments".

Both packages register the same options, so don't install them together until you're on a `pytest-plugins` release without it.

## Goes Well With

- [`pytest-reporter-html`](/posts/pytest-reporter-html) — JSON for machines, an interactive HTML report for humans
- [`pytest-max-fail-streak`](/posts/pytest-max-fail-streak) — when a streak stops the run, the tests that never ran appear as `collected`
- [`pytest-fail2skip`](/posts/pytest-fail2skip) — converted failures are recorded as `skipped`, with the reason attached
- [`pytest-inject-config`](/posts/pytest-inject-config) — run against any environment and keep the CI metadata of each run
- [`custom-python-logger`](/posts/custom-python-logger) — structured logs alongside the structured results
- [`pytest-plugins`](/posts/pytest-plugins) — the bundle this plugin was split out of

---

## Links

- **PyPI**: [pypi.org/project/pytest-better-report](https://pypi.org/project/pytest-better-report)
- **GitHub**: [github.com/aviz92/pytest-better-report](https://github.com/aviz92/pytest-better-report)

A test run is data. This plugin finally stores it like data.
