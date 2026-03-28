---
title: "pytest-depends-on: Explicit Test Dependency Management for Pytest"
date: 2026-03-03 11:00:00 +0200
categories: [Pytest]
tags: [python, pytest, dependencies, testing, automation]
description: "Declare explicit dependencies between tests and automatically skip dependent tests when their prerequisites fail. pytest-depends-on brings proper dependency management to your pytest suite."
---

In integration and end-to-end testing, tests often depend on each other. If `test_login` fails, running `test_dashboard` is pointless — and its failure is misleading. `pytest-depends-on` solves this by letting you declare dependencies explicitly and skip dependent tests automatically when prerequisites don't pass.

## Installation

```bash
pip install pytest-depends-on
```

---

## The Problem

Without dependency management, a single upstream failure cascades into a wall of failures across your suite — even though the root cause is a single broken test. This makes CI reports noisy and root-cause analysis painful.

`pytest-depends-on` gives you a clean way to express: "don't run this test unless that one passed."

---

## Usage

### Basic Dependency

`test_child` runs only if `test_parent` passes. If `test_parent` fails or is skipped, `test_child` is automatically skipped.

```python
import pytest

def test_parent():
    assert True

@pytest.mark.depends_on(tests=["test_parent"])
def test_child():
    assert True
```

### Enable the Plugin

The plugin is **opt-in**. Pass `--depends-on` to activate dependency tracking and skip behaviour. Without it, all `depends_on` markers are ignored and every test runs normally.

Add the flags to your `pytest.ini`:

```ini
[pytest]
addopts =
    --depends-on          # enable dependency tracking and skip behaviour
    --depends-on-reorder  # reorder tests so parents always run first

markers =
    depends_on: mark test as dependent on another test
```

Or pass them directly on the command line:

```bash
pytest --depends-on --depends-on-reorder
```

---

## Automatic Test Reordering

One practical problem with test dependencies is ordering: if `test_child` is collected before `test_parent`, it will always skip — even when the parent would have passed.

Pass `--depends-on-reorder` to fix this automatically. The plugin performs a topological sort of the collected test suite at collection time, guaranteeing parents always run before their dependents — regardless of file order or definition order within a file.

```
Before reorder:  test_child_a → test_child_b → test_parent
After reorder:   test_parent  → test_child_a → test_child_b
```

Circular dependencies are detected, logged as a warning, and handled gracefully (the run continues).

---

## Advanced Options

### Custom Status Dependency

By default, the dependent test expects the parent to have **passed**. You can change this — for example, to run a recovery test only when the initial test fails:

```python
from pytest_depends_on.consts.status import Status

@pytest.mark.depends_on(tests=["test_provision_resource"], status=Status.FAILED)
def test_cleanup_on_failure():
    # Only runs if provisioning failed
    cleanup_partial_resources()
```

Supported statuses: `PASSED`, `FAILED`, `SKIPPED`, `XFAILED`, `XPASSED`

### Soft Dependency (`allowed_not_run`)

If the parent test hasn't run yet (e.g., due to test ordering or collection filters), the dependent test will skip by default. Set `allowed_not_run=True` to allow it to proceed anyway:

```python
@pytest.mark.depends_on(tests=["test_setup"], allowed_not_run=True)
def test_feature():
    # Runs even if test_setup hasn't executed
    pass
```

---

## Automatic Status Tracking

The plugin automatically tracks test outcomes (`passed`, `failed`, `skipped`, `xfailed`, `xpassed`) during the `call` phase — no manual tracking needed. Dependencies are resolved dynamically at runtime.

> Use `--depends-on-reorder` to guarantee parents always run first so status tracking works correctly regardless of collection order.

---

## Real-World Example

A typical integration test flow:

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

If `test_create_user` fails, the remaining three tests are automatically skipped — keeping your report clean and the failure clearly localized.

---

## Links

- **PyPI**: [pypi.org/project/pytest-depends-on](https://pypi.org/project/pytest-depends-on)
- **GitHub**: [github.com/aviz92/pytest-depends-on](https://github.com/aviz92/pytest-depends-on)
