---
title: "pytest-dynamic-parameterize: Runtime Test Parameterization for Complex Data-Driven Scenarios"
date: 2026-03-02 12:00:00 +0200
categories: [Pytest]
tags: [python, pytest, parameterize, data-driven, testing]
description: "Generate test parameters at runtime from functions, config files, databases, or APIs. pytest-dynamic-parameterize replaces static @pytest.mark.parametrize with fully dynamic, function-driven parameterization."
---

`@pytest.mark.parametrize` is great for simple cases — but hardcoding test data in decorators doesn't scale. When your parameters come from a config file, a database query, or an external API, you need something more flexible. `pytest-dynamic-parameterize` lets you point a test at a function and have that function generate parameters at runtime.

## Installation

```bash
pip install pytest-dynamic-parameterize
```

---

## The Problem with Static Parametrize

Standard parametrize requires data to be known at import time:

```python
# Data is hardcoded — can't come from a DB, API, or config file
@pytest.mark.parametrize("a,b,expected", [
    (1, 2, 3),
    (4, 5, 9),
])
def test_add(a, b, expected):
    assert a + b == expected
```

This works for simple cases, but breaks down when:
- Test data lives in an external system
- Parameters depend on environment or configuration
- You want to centralize data logic across many test files

---

## The Solution: `parametrize_func`

Define a function that returns parameters, then reference it by name in your test:

**Step 1: Define the parameter function**

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

**Step 2: Reference it in your test**

```python
import pytest
from tests.parameterize_functions.my_params import my_params

@pytest.mark.parametrize_func("my_params")
def test_add(a, b, expected):
    assert a + b == expected
```

That's it. The plugin calls `my_params` at collection time and generates the test cases dynamically.

---

## Advanced Usage

### Pass Arguments to the Parameter Function

```python
@pytest.mark.parametrize_func("my_params", some_param="special")
def test_add_special(a, b, expected):
    assert a + b == expected
```

### Use a Fully-Qualified Function Path

No import needed — reference the function by its module path:

```python
@pytest.mark.parametrize_func("parameterize_functions.my_params")
def test_add(a, b, expected):
    assert a + b == expected
```

### Stack Multiple `parametrize_func` Markers

Combine multiple parameter functions for complex cross-product scenarios:

```python
@pytest.mark.parametrize_func("my_params", some_param="special")
@pytest.mark.parametrize_func("my_params")
def test_add_multi(a1, b1, expected1, a2, b2, expected2):
    assert a1 + b1 == expected1
    assert a2 + b2 == expected2
```

### Handle Empty Parameter Sets

Return `NOT_SET_PARAMETERS` from your function to indicate no tests should be generated — the test will be skipped cleanly:

```python
from pytest_dynamic_parameterize import NOT_SET_PARAMETERS

def my_params(config):
    if not data_available():
        return NOT_SET_PARAMETERS
    return fetch_data_from_api()
```

---

## Real-World Use Cases

**Load parameters from a config file:**
```python
import json

def my_params(config):
    with open("tests/data/test_cases.json") as f:
        return [tuple(case.values()) for case in json.load(f)]
```

**Fetch parameters from a database:**
```python
def my_params(config):
    return db.query("SELECT input, expected FROM test_cases WHERE active = true")
```

**Environment-aware parameters:**
```python
def my_params(config):
    env = config.getoption("--env", default="staging")
    return ENVIRONMENTS[env]["test_cases"]
```

---

## Links

- **PyPI**: [pypi.org/project/pytest-dynamic-parameterize](https://pypi.org/project/pytest-dynamic-parameterize)
- **GitHub**: [github.com/aviz92/pytest-dynamic-parameterize](https://github.com/aviz92/pytest-dynamic-parameterize)
- **Install**: `pip install pytest-dynamic-parameterize`
