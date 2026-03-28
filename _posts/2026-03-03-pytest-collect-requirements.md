---
title: "pytest-collect-requirements: Automated Requirements Traceability from Your Test Suite"
date: 2026-03-03 13:00:00 +0200
categories: [Testing, Pytest]
tags: [python, pytest, requirements, traceability, infrastructure, testing]
description: "Annotate tests with infrastructure or product requirements, then collect them into a structured JSON file — without running the tests. pytest-collect-requirements brings requirements traceability directly into your test suite."
---

In regulated industries, infrastructure automation, and large-scale CI systems, knowing *what* a test requires before running it is as important as knowing whether it passed. When tests have dependencies on cloud instances, regions, storage, or feature flags, that information is usually buried in code comments or a spreadsheet nobody updates. `pytest-collect-requirements` lets you annotate tests with arbitrary requirement metadata and extract it into a structured JSON file — completely independently of test execution.

## Why I Built This

I was working on a test suite that ran against AWS infrastructure that had to be provisioned before each run. The infra team needed to know what resources to spin up, but the only way to find out was to read through hundreds of test files. We also had compliance requirements that needed a formal mapping of tests to their declared dependencies. I built this plugin to make that metadata a first-class citizen in the test suite — something you can query, export, and act on without ever running a single test.

## Installation

```bash
pip install pytest-collect-requirements
```
```bash
uv add pytest-collect-requirements
```

## Quick Start

Annotate tests with `@pytest.mark.requirements()` using any keyword arguments that describe what the test needs:

```python
import pytest

@pytest.mark.requirements(cloud_instance="c5.large", region="eu-west-1")
def test_heavy_computation():
    assert compute() == expected_result
```

Then collect all requirements without running any tests:

```bash
pytest --collect-requirements
```

That produces `logs/test_requirements.json` — a structured manifest of every annotated test and its declared dependencies.

## Real-World Example

Here's how this fits into a CI pre-provisioning workflow. Before the main test run, a pipeline step collects requirements and hands them to the infra provisioning script:

```python
# tests/marks/aws.py
import pytest

def aws_requirements(cloud_instance: str, region: str) -> pytest.MarkDecorator:
    return pytest.mark.requirements(
        cloud_instance=cloud_instance,
        region=region,
    )
```

```python
# tests/test_workloads.py
from tests.marks.aws import aws_requirements

@aws_requirements(cloud_instance="c5.large", region="eu-west-1")
def test_high_memory_workload():
    assert run_workload() == expected

@aws_requirements(cloud_instance="p3.2xlarge", region="us-east-1")
def test_gpu_training():
    assert train_model() == expected
```

Pipeline step 1 — collect requirements and provision:
```bash
pytest --collect-requirements --save-to=infra/requirements.json
python infra/provision.py --requirements infra/requirements.json
```

Pipeline step 2 — run the tests against the provisioned environment:
```bash
pytest --collect-requirements --execute-tests
```

The infra provisioning script reads the JSON and brings up exactly the instances the test suite needs — no over-provisioning, no surprises at runtime.

## Key Features

The marker accepts any keyword arguments, so the schema is entirely yours to define. Cloud instance type and region, storage size, network requirements, GPU flags, feature flags, environment tiers — whatever metadata makes sense for your project. There's no enforced structure, which means it works equally well for infrastructure requirements, product requirements, or compliance annotations.

Collecting requirements is completely decoupled from running tests. `--collect-requirements` alone performs only collection — no test code executes. This matters when tests are expensive, destructive, or depend on infrastructure that hasn't been provisioned yet. Add `--execute-tests` when you want both in one command.

The output path is configurable with `--save-to`, making it easy to fit into existing artifact pipelines:

```bash
pytest --collect-requirements --save-to=reports/requirements.json
```

For large test suites, wrapping the marker in a helper function keeps requirements consistent and refactorable across hundreds of test files — one change to the helper updates every test that uses it.

| Flag | Description |
|------|-------------|
| `--collect-requirements` | Collect requirements without running tests |
| `--save-to` | Output file path (default: `logs/test_requirements.json`) |
| `--execute-tests` | Run tests after collecting requirements |

## Goes Well With

- [`custom-python-logger`](/posts/custom-python-logger) — log dependency resolution and test outcomes in a structured way for better CI reporting and debugging
- [`pytest-plugins`](/posts/pytest-plugins) — CI reporting layer that works alongside the requirements manifest in pipeline workflows

---

## Links

- **PyPI**: [pypi.org/project/pytest-collect-requirements](https://pypi.org/project/pytest-collect-requirements)
- **GitHub**: [github.com/aviz92/pytest-collect-requirements](https://github.com/aviz92/pytest-collect-requirements)

Your tests already know what they need — this plugin just gives that knowledge somewhere to live.
