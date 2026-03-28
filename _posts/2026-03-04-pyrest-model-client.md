---
title: "pyrest-model-client: Type-Safe, Model-Driven REST API Client for Python"
date: 2026-03-04 10:30:00 +0200
categories: [Backend, Core Foundations]
tags: [python, rest, api, pydantic, httpx, async, testing]
description: "pyrest-model-client combines httpx and Pydantic into a model-driven REST client — define your API resources as typed Python classes, and get pagination, async support, and automatic response conversion out of the box."
---

Working with REST APIs in Python usually means writing the same boilerplate repeatedly: building headers, handling pagination, converting raw dicts into typed objects, managing timeouts and connection pools. You end up with utility functions scattered across the codebase, each doing roughly the same thing with slightly different assumptions. `pyrest-model-client` wraps `httpx` and `Pydantic` into a clean, model-driven interface — synchronously and asynchronously — so that boilerplate disappears into a single consistent layer.

## Why I Built This

I kept writing the same REST client wrapper in every project that needed to talk to an external API. The pagination loop, the header builder, the dict-to-model conversion — it was always there, always slightly different, always untested. I wanted one library where API resources are proper Python classes with types and IDE autocomplete, and where fetching a paginated list of them is a three-line loop, not a function I write from scratch every time.

## Installation

```bash
pip install pyrest-model-client
```
```bash
uv add pyrest-model-client
```

## Quick Start

Define your API resources as typed Pydantic models, set up the client, and start making requests:

```python
from pyrest_model_client.base import BaseAPIModel
from pyrest_model_client import RestApiClient, build_header

class Product(BaseAPIModel):
    name: str
    price: float
    description: str | None = None
    resource_path: str = "products"

header = build_header(token="your_api_token")
client = RestApiClient(base_url="https://api.example.com", header=header)

# GET list
response = client.get("products")

# POST
new_product = client.post("products", data={"name": "Widget", "price": 9.99})

# PUT
updated = client.put("products/42", data={"name": "Updated Widget", "price": 12.99})

# DELETE
client.delete("products/42")
```

## Real-World Example

Here's how `pyrest-model-client` is used to fetch versioned, paginated data from a running API and convert it directly into typed model instances — ready for assertions, no dict key access:

```python
from pyrest_model_client.base import BaseAPIModel
from pyrest_model_client import RestApiClient, build_header, get_model_fields
import os

class Employee(BaseAPIModel):
    name: str
    department: str | None = None
    resource_path: str = "employee"

client = RestApiClient(
    base_url="http://localhost:8000",
    header=build_header(token=os.getenv("API_TOKEN")),
)

employees = []
params = {"version": "v1.1.0", "status": "approved"}

while res := client.get("employee", params=params):
    employees.extend(get_model_fields(res["results"], model=Employee))
    if not res["next"]:
        break
    params["page"] = res["next"].split("/?page=")[-1]

# employees is now list[Employee] — fully typed, IDE-autocomplete-ready
```

The same pattern works against any paginated REST API. Swap the model, swap the endpoint, the loop stays identical.

## Key Features

`BaseAPIModel` is a Pydantic model extended with API awareness. Set `resource_path` on the class and the model knows its own endpoint — it can generate `"products"`, `"products/42"`, or a full `"https://api.example.com/products"` depending on what you need. This keeps endpoint logic tied to the resource definition, not scattered across call sites.

`get_model_fields()` converts a list of raw API response dicts into validated Pydantic instances. Field types are enforced, optional fields get defaults, and you get full IDE autocomplete on the result — which matters a lot when you're writing tests against API responses.

The client handles endpoint normalization transparently: pass `"products"`, `"products/42"`, or a full URL — it does the right thing in each case. Every response calls `raise_for_status()` before returning, so 4xx and 5xx errors surface immediately as `httpx.HTTPStatusError` without silent failures.

Authentication and transport are fully configurable. `build_header` handles Token and Bearer auth out of the box. For custom timeouts and connection pools:

```python
import httpx

client = RestApiClient(
    base_url="https://api.example.com",
    header=header,
    timeout=httpx.Timeout(60.0, connect=10.0),
    limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
    add_trailing_slash=True,
)
```

Defaults are 30s read / 10s connect and 5 keepalive / 10 max connections if not specified.

`AsyncRestApiClient` mirrors the sync API with full `async/await` support, designed as a context manager so connections are always cleaned up:

```python
import asyncio
from pyrest_model_client import AsyncRestApiClient, build_header

async def fetch_all():
    async with AsyncRestApiClient(base_url="https://api.example.com", header=build_header(token="your_token")) as client:
        products = await client.get("products")
        new_item = await client.post("products", data={"name": "Async Widget", "price": 5.99})
        await client.delete("products/99")

asyncio.run(fetch_all())
```

Both clients share the same timeout and limit defaults — one source of truth, no divergence.

## Goes Well With

- [`custom-python-logger`](/posts/custom-python-logger) — logging I wire up alongside the client for request tracing
- [`drf-easy-crud`](/posts/drf-easy-crud) — the DRF API layer on the server side that `pyrest-model-client` talks to in my projects
- [`django-versioned-models`](/posts/django-versioned-models) — versioned model queries I consume through this client

---

## Links

- **PyPI**: [pypi.org/project/pyrest-model-client](https://pypi.org/project/pyrest-model-client)
- **GitHub**: [github.com/aviz92/pyrest-model-client](https://github.com/aviz92/pyrest-model-client)

Define the resource once. Get types, pagination, and async for free.
