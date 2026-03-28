---
title: "pytest-depends-on: Explicit Test Dependency Management for Pytest"
date: 2026-03-03 11:00:00 +0200
categories: [Testing, Pytest]
tags: [python, pytest, dependencies, testing, automation]
description: "Declare explicit dependencies between tests and automatically skip dependent tests when their prerequisites fail. pytest-depends-on brings proper dependency management to your pytest suite."
---

In integration and end-to-end testing, tests often depend on each other. If `test_login` fails, running `test_dashboard` is pointless — and its failure is misleading. Without explicit dependency management, a single upstream failure cascades into a wall of failures across your suite, making CI reports noisy and root-cause analysis painful. `pytest-depends-on` lets you declare dependencies explicitly and skip dependent tests automatically when their prerequisites don't pass.

## Why I Built This

I was working on an end-to-end API test suite where each test built on the state created by the previous one — create user, fetch user, update user, delete user. When the create call broke, I'd get four failures in the report instead of one. Debugging meant figuring out which failures were real and which were just cascading noise. I wanted the test runner to be smart enough to stop when it already knows a test can't possibly succeed.

## Installation

```bash
pip install pytest-depends-on
```
```bash
uv add pytest-depends-on
```

## Quick Start

Declare a dependency with `@pytest.mark.depends_on`, then enable the plugin via `pytest.ini`:

```python
import pytest

def test_parent():
    assert True

@pytest.mark.depends_on(tests=["test_parent"])
def test_child():
    assert True
```

```ini
[pytest]
addopts =
    --depends-on
    --depends-on-reorder

markers =
    depends_on: mark test as dependent on another test
```

`test_child` runs only if `test_parent` passes. If it fails or is skipped, `test_child` is automatically skipped. The plugin is opt-in — without `--depends-on`, all markers are ignored and every test runs normally.

## Real-World Example

A typical CRUD API test flow — each operation depends on the previous one succeeding:

```python
def test_create_user():
    response = api.post("/users", data={"name": "Alice"})
    assert response.status_code == 201

@pytest.mark.depends_on(tests=["test_create_user"])
def test_get_user():
    response = api.get("/users/alice")
    assert response.status_code == 200

@pytest.mark.depends_on(tests=["test_get_user"])
def test_update_user():
    response = api.patch("/users/alice", data={"name": "Alice Updated"})
    assert response.status_code == 200

@pytest.mark.depends_on(tests=["test_update_user"])
def test_delete_user():
    response = api.delete("/users/alice")
    assert response.status_code == 204
```

If `test_create_user` fails, the remaining three tests are automatically skipped — one failure in the report, clear localization, no noise.

## Key Features

`--depends-on-reorder` solves the collection order problem automatically. If `test_child` is collected before `test_parent`, it will always skip even when the parent would have passed. The flag triggers a topological sort of the entire test suite at collection time, guaranteeing parents always run before their dependents regardless of file order or definition order within a file:

```
Before reorder:  test_child_a → test_child_b → test_parent
After reorder:   test_parent  → test_child_a → test_child_b
```

Circular dependencies are detected, logged as a warning, and handled gracefully — the run continues.

Custom status dependencies let you express more nuanced relationships. The default expects the parent to have passed, but you can flip it — for example, to run a cleanup test only when provisioning fails:

```python
from pytest_depends_on.consts.status import Status

@pytest.mark.depends_on(tests=["test_provision_resource"], status=Status.FAILED)
def test_cleanup_on_failure():
    cleanup_partial_resources()
```

All five pytest statuses are supported: `PASSED`, `FAILED`, `SKIPPED`, `XFAILED`, `XPASSED`.

Soft dependencies via `allowed_not_run=True` let a dependent test proceed even if its parent hasn't run yet — useful when you're running a filtered subset of the suite and don't want non-relevant dependencies causing skips:

```python
@pytest.mark.depends_on(tests=["test_setup"], allowed_not_run=True)
def test_feature():
    pass
```

Status tracking is automatic. The plugin hooks into the `call` phase and records every test outcome — no manual tracking, no shared state to manage.

## Goes Well With

- [`custom-python-logger`](/posts/custom-python-logger) — log dependency resolution and test outcomes in a structured way for better CI reporting and debugging
- [`pytest-plugins`](/posts/pytest-plugins) — CI reporting layer that works alongside the requirements manifest in pipeline workflows
- [`pytest-collect-requirements`](/posts/pytest-collect-requirements) — collect test requirements from the same dynamic sources as your parameters for fully data-driven pipelines
- [`pytest-dynamic-parameterize`](/posts/pytest-dynamic-parameterize) — express dependencies between tests that are parameterized from dynamic sources, ensuring proper execution order and skip logic

---

## Links

- **PyPI**: [pypi.org/project/pytest-depends-on](https://pypi.org/project/pytest-depends-on)
- **GitHub**: [github.com/aviz92/pytest-depends-on](https://github.com/aviz92/pytest-depends-on)

One real failure. Not ten misleading ones.
