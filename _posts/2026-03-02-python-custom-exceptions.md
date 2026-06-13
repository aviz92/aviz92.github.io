---
title: "python-custom-exceptions: Structured, Semantic Exceptions for Python"
date: 2026-03-02 09:00:00 +0200
categories: [Backend, Core Foundations]
tags: [python, exceptions, error-handling, debugging, devops]
description: "python-custom-exceptions replaces vague bare exceptions with structured, self-describing classes that carry diagnostic context and serialize to JSON — making production failures actually debuggable."
---

It's 3am. Something failed in production. You open the logs and find:

```
ValueError: something went wrong
```

No context. No subject. No idea which part of the system raised it or what state it was in. You start adding print statements and re-deploying.

This is the problem `python-custom-exceptions` solves.

## Why I Built This

The standard Python exception hierarchy is fine for stdlib errors, but in application code you end up with one of two patterns: either you raise bare built-ins (`ValueError`, `RuntimeError`) with a string message that loses all structure once it hits logs, or you define a dozen one-off exception classes per project — each one slightly different, none of them consistent.

I wanted a third option: a small set of semantic, reusable exception classes that carry structured context and produce readable, parseable output everywhere they surface. Built once, used across every project.

## Installation

```bash
pip install python-custom-exceptions
```
```bash
uv add python-custom-exceptions
```

## The Foundation: BaseCustomException + DiagnosticInfo

Every exception in the library inherits from `BaseCustomException`. The key idea is that every exception carries two things: a message and a `diagnostic_info` dict — context that travels with the exception and appears in the output automatically.

```python
from python_custom_exceptions import BaseCustomException, DiagnosticInfo

class DeploymentDiagnostic(DiagnosticInfo):
    service: str
    environment: str
    replica_count: int

raise BaseCustomException(
    message_with_marking_dynamic_variables="Deployment health check failed",
    diagnostic_info=DeploymentDiagnostic(
        service="api",
        environment="production",
        replica_count=0
    )
)
```

When this exception is caught and logged, `str(exc)` produces structured JSON:

```json
{
    "exception_type": "BaseCustomException",
    "message": "Deployment health check failed",
    "diagnostic_info": {
        "service": "api",
        "environment": "production",
        "replica_count": 0
    }
}
```

Every exception is self-describing. No more guessing what state the system was in.

## Ready-to-Use Exceptions

The library ships with semantic classes that cover the cases that come up repeatedly in infrastructure and backend code. You stop asking "what should I call this exception?" and start picking the right one.

**Existence checks** — for anything that should or shouldn't exist:

```python
from python_custom_exceptions import IsNotExistException, IsExistAfterOperationException

raise IsNotExistException(subject="Config file", diagnostic_info={"path": "/etc/app/config.yml"})
raise IsExistAfterOperationException(subject="Lock file", operation="cleanup")
```

**Connections** — with a default message that tells you exactly what to check:

```python
from python_custom_exceptions import ConnectionException

raise ConnectionException(host="redis://cache:6379")
# "Connection failed: Unable to establish a connection to the remote host ["redis://cache:6379"].
#  Please check your credentials, network status, and host availability."
```

**Operations** — for things that failed, weren't operational, or unexpectedly succeeded:

```python
from python_custom_exceptions import OperationException, NotOperationalException

raise OperationException(operation="database migration")
raise NotOperationalException(subject="Message queue")
```

**Timeouts, unsupported cases, wrong usage** — each with a clear, consistent message format:

```python
from python_custom_exceptions import TimedExecutionException, UnsupportedExceptions, WrongUsageException

raise TimedExecutionException(operation="pod readiness check", timeout=120)
raise UnsupportedExceptions(unsupported_subject="Windows platform")
raise WrongUsageException(message="call connect() before query()")
```

## The Difference in Practice

Before:
```python
raise ValueError(f"connection to {host} failed")
# → logs: ValueError: connection to redis://cache:6379 failed
```

After:
```python
raise ConnectionException(host=host, diagnostic_info={"attempt": 3, "timeout": 30})
# → logs: {"exception_type": "ConnectionException", "message": "...", "diagnostic_info": {...}}
```

The second version is greppable, parseable by log aggregators, and tells you everything you need to know — without adding a single extra line of context code.

---

## Links

- **PyPI**: [pypi.org/project/python-custom-exceptions](https://pypi.org/project/python-custom-exceptions)
- **GitHub**: [github.com/aviz92/python-custom-exceptions](https://github.com/aviz92/python-custom-exceptions)

If you've ever stared at a bare `RuntimeError` in a production log at 3am, this is the package that makes sure it never happens again.
