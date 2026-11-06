---
title: "pytest-inject-config: One Test Suite, Any Environment, a Single Flag"
date: 2026-10-31 23:18:00 +0200
categories: [Testing, Pytest]
tags: [python, pytest, configuration, yaml, json, testing, ci-cd]
description: >-
  pytest-inject-config loads a JSON or YAML file given by --config-path and injects it
  into every test class as self.config — so the same suite runs against local, staging
  or production by switching one flag, and a bad config fails the run at startup.
---

The same tests usually need to run in more than one place. Locally against a dev box, in CI against staging, before a release against the real thing. The tests don't change — only the hosts, ports, credentials paths and feature switches do. Most suites solve this with a pile of environment variables, a `conftest.py` that reads them, and a fixture that every test class has to remember to request. `pytest-inject-config` replaces that with one flag: point `--config-path` at a file, and every test class gets its contents as `self.config`.

## Why I Built This

`pytest-plugins` had a feature called `add_config_parameters` that was supposed to do exactly this. It never worked. When I split `pytest-plugins` into focused packages, this was the one I rebuilt from scratch rather than moved: proper JSON and YAML loading, a clear error for every way a config file can be wrong, and a fresh copy per test class so tests can't leak state into each other through a shared dict.

## Installation

```bash
pip install pytest-inject-config
```
```bash
uv add pytest-inject-config
```

## Quick Start

Create a config file per environment — JSON:

```json
{
    "host": "10.0.0.1",
    "port": 8080
}
```

or YAML:

```yaml
host: 10.0.0.1
port: 8080
```

Read it from your test classes through `self.config`:

```python
class TestDevice:
    def test_connect(self):
        assert connect(self.config["host"], self.config["port"])
```

Run with the file for the environment you want:

```bash
pytest --config-path=config/staging.json
```

## Setup & Configuration

There's exactly one option: `--config-path`. The file extension decides the format, case-insensitively — `.json`, `.yaml` or `.yml`. A relative path is resolved from the directory pytest runs in.

To give local runs a default, put it in `pytest.ini`:

```ini
[pytest]
addopts =
    --config-path=config/local.json
```

Without `--config-path`, nothing is registered and no fixture runs. The plugin has zero footprint until you use it.

## Real-World Example

A suite of device tests runs against three environments. The repo keeps one file per environment:

```text
config/
├── local.yaml
├── staging.yaml
└── production.yaml
```

```yaml
# config/staging.yaml
host: staging-device.internal
port: 8080
timeout_seconds: 30
features:
  firmware_update: true
```

The tests don't know or care which environment they're in:

```python
import pytest


class TestFirmware:
    def test_update_available(self):
        if not self.config["features"]["firmware_update"]:
            pytest.skip("firmware updates disabled in this environment")
        device = connect(self.config["host"], self.config["port"])
        assert device.check_update(timeout=self.config["timeout_seconds"])
```

The CI pipeline picks the environment with one variable:

```bash
pytest --config-path="config/${TARGET_ENV}.yaml"
```

If someone commits a typo in `production.yaml`, the run doesn't start 200 tests and fail them one by one with `KeyError`. It stops at startup with a usage error that names the file and the problem.

## Key Features

Failing fast is the feature I care about most. Every way a config file can be wrong is caught before a single test runs, with a `UsageError` and exit code 4:

| Situation | Result |
|---|---|
| Missing file, a directory, non-UTF-8 or invalid content | `UsageError` at startup |
| Unsupported or missing extension | `UsageError` at startup, even if the content would parse |
| Empty file, or a top-level `null` | `UsageError` at startup |
| Top level is not a mapping (a list, a number, a string) | `UsageError` at startup |
| YAML with several documents (`---`) or Python tags (`!!python/...`) | `UsageError` at startup |

Each test class gets its own copy of the config. A test that mutates `self.config` — overriding a timeout for one scenario, say — can't change what the next class sees. The file itself is still read only once, at startup, not once per class.

YAML is loaded with `safe_load`, so a config file can never construct Python objects or run code. That matters the moment config files come from somewhere other than your own repo.

The format is chosen strictly by extension, and only known extensions are accepted. That sounds pedantic, but it's what keeps the behavior stable: if more formats are added later, an existing file will never suddenly be parsed differently.

The injection is scoped to test classes. Module-level test functions are untouched, so you can adopt the plugin gradually in a suite that mixes both styles.

## Migrating from pytest-plugins

The old `add_config_parameters` feature never worked, so there's no behavior to preserve — install this package and use `--config-path`. Both packages register the `--config-path` option, so don't install them together until you're on a `pytest-plugins` release without it.

## Goes Well With

- [`pytest-dynamic-parameterize`](/posts/pytest-dynamic-parameterize) — drive parameters from the same per-environment data
- [`pytest-better-report`](/posts/pytest-better-report) — record which pipeline and commit ran against which environment
- [`pytest-max-fail-streak`](/posts/pytest-max-fail-streak) — when the configured environment is down, stop after N failures instead of running everything
- [`pytest-fail2skip`](/posts/pytest-fail2skip) — handle known failures that only happen in one environment
- [`pytest-plugins`](/posts/pytest-plugins) — the bundle this plugin was split out of

---

## Links

- **PyPI**: [pypi.org/project/pytest-inject-config](https://pypi.org/project/pytest-inject-config)
- **GitHub**: [github.com/aviz92/pytest-inject-config](https://github.com/aviz92/pytest-inject-config)

Write the tests once, keep the environments in files, and let one flag decide where they run.
