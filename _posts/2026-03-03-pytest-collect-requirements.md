---
title: "pytest-collect-requirements: Automated Requirements Traceability from Your Test Suite"
date: 2026-03-03 13:00:00 +0200
categories: [Testing, Pytest]
tags: [python, pytest, requirements, traceability, infrastructure, testing]
description: "Annotate tests with infrastructure or product requirements, then collect them into a structured JSON file — without running the tests. pytest-collect-requirements brings requirements traceability directly into your test suite."
---

In regulated industries, infrastructure automation, and large-scale CI systems, knowing *what* a test requires before running it is as important as knowing whether it passed. `pytest-collect-requirements` lets you annotate tests with arbitrary requirement metadata and extract that metadata into a structured JSON file — independently of test execution.

## Installation

```bash
pip install pytest-collect-requirements
```
```bash
uv add pytest-collect-requirements
```

---

## The Problem

When tests have infrastructure dependencies — specific cloud instances, regions, resources, or feature flags — that information is often buried in test code or external spreadsheets. There's no standard way to:

- Know what a test needs before provisioning infrastructure
- Generate a requirements manifest for compliance or planning
- Collect requirements without executing potentially expensive tests

---

## Annotating Tests with Requirements

Use `@pytest.mark.requirements()` with any keyword arguments that describe what the test needs:

```python
import pytest

@pytest.mark.requirements(cloud_instance="c5.large", region="eu-west-1")
def test_heavy_computation():
    assert compute() == expected_result
```

The marker accepts **any** keyword arguments — you define the schema that makes sense for your project:

```python
@pytest.mark.requirements(
    cloud_instance="c5.large",
    region="eu-west-1",
    storage="100GB",
    network="high-speed",
    gpu=False
)
def test_with_custom_requirements():
    assert True
```

---

## Collecting Requirements Without Running Tests

Run with `--collect-requirements` to extract all requirements into a JSON file without executing any tests:

```bash
pytest --collect-requirements
```

Output is saved to `logs/test_requirements.json` by default. Change the path with `--save-to`:

```bash
pytest --collect-requirements --save-to=reports/requirements.json
```

If you want to both collect requirements **and** run the tests:

```bash
pytest --collect-requirements --execute-tests
```

---

## Reusable Requirement Decorators

For consistency across a large test suite, wrap the marker in a helper function:

```python
import pytest
from _pytest.fixtures import FixtureRequest

def aws_requirements(cloud_instance: str, region: str) -> pytest.MarkDecorator:
    return pytest.mark.requirements(
        cloud_instance=cloud_instance,
        region=region,
    )

@aws_requirements(cloud_instance="c5.large", region="eu-west-1")
def test_high_memory_workload(request: FixtureRequest):
    assert request.config._selected_requirements[request.node.nodeid]['region'] == "eu-west-1"
```

---

## Practical Use Cases

**Infrastructure pre-provisioning**: Before a CI run, collect requirements and provision exactly the cloud resources needed — no more, no less.

**Compliance reporting**: Generate a requirements manifest that maps each test to its declared dependencies, satisfying audit requirements.

**Test planning**: Understand the resource footprint of a test suite before scheduling it — especially useful for expensive integration or load tests.

**Multi-environment routing**: Use the collected JSON to route tests to the appropriate execution environment based on their declared requirements.

---

## Summary

| Flag | Description |
|------|-------------|
| `--collect-requirements` | Collect requirements without running tests |
| `--save-to` | Output file path (default: `logs/test_requirements.json`) |
| `--execute-tests` | Run tests after collecting requirements |

---

## Links

- **PyPI**: [pypi.org/project/pytest-collect-requirements](https://pypi.org/project/pytest-collect-requirements)
- **GitHub**: [github.com/aviz92/pytest-collect-requirements](https://github.com/aviz92/pytest-collect-requirements)

Feedback, issues, and PRs are welcome.
