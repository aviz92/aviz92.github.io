---
title: "pytest-dynamic-parameterize: Runtime Test Parameterization for Complex Data-Driven Scenarios"
date: 2026-03-02 12:00:00 +0200
categories: [Testing, Pytest]
tags: [python, pytest, parameterize, data-driven, testing]
description: "Generate test parameters at runtime from functions, config files, databases, or APIs. pytest-dynamic-parameterize replaces static @pytest.mark.parametrize with fully dynamic, function-driven parameterization."
---

`@pytest.mark.parametrize` is great for simple cases — but hardcoding test data in decorators doesn't scale. When your parameters come from a config file, a database query, or an external API, you need something more flexible. `pytest-dynamic-parameterize` lets you point a test at a function and have that function generate parameters at runtime, from any source, with any logic you need.

## Why I Built This

I was maintaining a test suite for an API-heavy service where test cases lived in a shared database — updated by the QA team, not developers. Every time someone added a case, a dev had to copy it into a decorator. It was fragile, always out of sync, and required a code change for what should have been a data change. I wanted the test to call a function and pull parameters from wherever they actually live. Static `parametrize` can't do that. This plugin adds the one missing piece.

## Installation

```bash
pip install pytest-dynamic-parameterize
```
```bash
uv add pytest-dynamic-parameterize
```

## Quick Start

Define a function that returns parameters, then reference it by name in your test:

```python
# tests/parameterize_functions/my_params.py
def my_params(config, some_param=None) -> list[tuple]:
    if some_param == "special":
        return [(10, 20, 30)]
    return [
        (1, 2, 3),
        (4, 5, 9),
    ]
```

```python
# tests/test_math.py
import pytest
from tests.parameterize_functions.my_params import my_params

@pytest.mark.parametrize_func("my_params")
def test_add(a, b, expected):
    assert a + b == expected
```

The plugin calls `my_params` at collection time and generates test cases dynamically. No hardcoded data in the test file.

## Real-World Example

Here's a realistic API testing scenario where test cases live in a JSON file maintained by the QA team — completely decoupled from the test code:

```python
# tests/parameterize_functions/api_cases.py
import json

def user_creation_cases(config) -> list[tuple]:
    env = config.getoption("--env", default="staging")
    with open(f"tests/data/user_cases_{env}.json") as f:
        cases = json.load(f)
    return [(c["payload"], c["expected_status"], c["expected_error"]) for c in cases]
```

```python
# tests/test_users.py
import pytest

@pytest.mark.parametrize_func("api_cases.user_creation_cases")
def test_create_user(payload, expected_status, expected_error):
    response = client.post("/users", json=payload)
    assert response.status_code == expected_status
    if expected_error:
        assert response.json()["error"] == expected_error
```

The QA team edits `user_cases_staging.json`. No test file changes, no decorator updates. Run with `--env production` and it picks up the production dataset automatically.

## Key Features

The core marker is `@pytest.mark.parametrize_func("function_name")`. The function receives `config` — pytest's config object — so it can read CLI options, environment variables, or any runtime context at collection time. That's what makes it genuinely dynamic rather than just deferred.

You can pass keyword arguments directly through the marker, making the same parameter function reusable across tests with different inputs:

```python
@pytest.mark.parametrize_func("my_params", some_param="special")
def test_add_special(a, b, expected):
    assert a + b == expected
```

For fully-qualified references, skip the import and use the module path directly:

```python
@pytest.mark.parametrize_func("parameterize_functions.my_params")
def test_add(a, b, expected):
    assert a + b == expected
```

Stacking multiple markers on a single test generates a cross-product of parameter sets — useful for testing combinations of inputs from independent sources:

```python
@pytest.mark.parametrize_func("my_params", some_param="special")
@pytest.mark.parametrize_func("my_params")
def test_add_multi(a1, b1, expected1, a2, b2, expected2):
    assert a1 + b1 == expected1
    assert a2 + b2 == expected2
```

When a parameter function conditionally produces no data — an external system is unavailable, a feature flag is off — return `NOT_SET_PARAMETERS` and the test is skipped cleanly instead of failing at collection:

```python
from pytest_dynamic_parameterize import NOT_SET_PARAMETERS

def my_params(config):
    if not data_available():
        return NOT_SET_PARAMETERS
    return fetch_data_from_api()
```

## Goes Well With

- [`custom-python-logger`](/posts/custom-python-logger) — log dependency resolution and test outcomes in a structured way for better CI reporting and debugging
- [`pytest-plugins`](/posts/pytest-plugins) — CI reporting layer that works alongside the requirements manifest in pipeline workflows
- [`pytest-collect-requirements`](/posts/pytest-collect-requirements) — collect test requirements from the same dynamic sources as your parameters for fully data-driven pipelines
- [`pytest-depends-on`](/posts/pytest-depends-on) — express dependencies between tests that are parameterized from dynamic sources, ensuring proper execution order and skip logic

---

## Links

- **PyPI**: [pypi.org/project/pytest-dynamic-parameterize](https://pypi.org/project/pytest-dynamic-parameterize)
- **GitHub**: [github.com/aviz92/pytest-dynamic-parameterize](https://github.com/aviz92/pytest-dynamic-parameterize)

If your test data lives anywhere other than a Python file, your parameterization should too.
