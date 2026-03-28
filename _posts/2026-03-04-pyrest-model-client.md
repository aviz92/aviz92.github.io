---
title: "pyrest-model-client: Type-Safe, Model-Driven REST API Client for Python"
date: 2026-03-04 10:30:00 +0200
categories: [Backend, Core Foundations]
tags: [python, rest, api, pydantic, httpx, async, testing]
description: "pyrest-model-client combines httpx and Pydantic into a model-driven REST client — define your API resources as typed Python classes, and get pagination, async support, and automatic response conversion out of the box."
---

Working with REST APIs in Python usually means writing the same boilerplate repeatedly: building headers, handling pagination, converting raw dicts into typed objects, managing timeouts and connection pools. `pyrest-model-client` wraps `httpx` and `Pydantic` into a clean, model-driven interface that handles all of that — synchronously and asynchronously.

## Installation

```bash
pip install pyrest-model-client
```
```bash
uv add pyrest-model-client
```

---

## The Core Idea: API Resources as Python Classes

Instead of passing raw strings and dicts around, you define your API resources as typed Pydantic models:

```python
from pyrest_model_client.base import BaseAPIModel

class Product(BaseAPIModel):
    name: str
    price: float
    description: str | None = None
    resource_path: str = "products"

class User(BaseAPIModel):
    name: str
    email: str
    resource_path: str = "users"
```

`resource_path` ties the model to its API endpoint. From there, the model can generate its own endpoint and full URL:

```python
product = Product(name="Widget", price=9.99)
product.get_endpoint()              # "products"
product.get_endpoint(include_id=True)  # "products/42" (if id is set)
product.get_resource_url(client)    # "https://api.example.com/products"
```

---

## Setting Up the Client

```python
from pyrest_model_client import RestApiClient, build_header

header = build_header(token="your_api_token")  # Token auth by default

client = RestApiClient(
    base_url="https://api.example.com",
    header=header,
)
```

For Bearer auth or custom content types:

```python
header = build_header(
    token="your_jwt_token",
    authorization_type="Bearer",
    content_type="application/json",
)
```

### Custom Timeout and Connection Pool

```python
import httpx

client = RestApiClient(
    base_url="https://api.example.com",
    header=header,
    timeout=httpx.Timeout(60.0, connect=10.0),
    add_trailing_slash=True,
    limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
)
```

If `timeout` is not provided, defaults are `30s` read and `10s` connect. Connection pool defaults to 5 keepalive / 10 max.

---

## Making Requests

All five standard operations:

```python
# GET list
response = client.get("products")

# GET single
response = client.get("products/42")

# POST
new_product = client.post("products", data={"name": "Widget", "price": 9.99})

# PUT
updated = client.put("products/42", data={"name": "Updated Widget", "price": 12.99})

# DELETE
client.delete("products/42")
```

By default, `.get()`, `.post()`, `.put()` return parsed JSON (`dict`). Pass `as_json=False` to get the raw `httpx.Response`.

---

## Paginated Fetching with Type Conversion

The real power is combining `get_model_fields()` with pagination to fetch all pages and convert directly to typed instances:

```python
from pyrest_model_client import get_model_fields

products = []
params = None

while res := client.get("products", params=params):
    products.extend(get_model_fields(res["results"], model=Product))

    if not res["next"]:
        break
    params = {"page": res["next"].split("/?page=")[-1]}

# products is now a list[Product] — fully typed
for p in products:
    print(f"{p.name}: ${p.price}")
```

`get_model_fields()` converts a list of raw API response dicts into validated Pydantic model instances — field types are enforced, optional fields get defaults, and you get IDE autocomplete on the result.

---

## Async Support

`AsyncRestApiClient` mirrors the sync API with full `async/await` support, designed as a context manager:

```python
import asyncio
from pyrest_model_client import AsyncRestApiClient, build_header

async def fetch_all():
    header = build_header(token="your_token")

    async with AsyncRestApiClient(base_url="https://api.example.com", header=header) as client:
        products = await client.get("products")
        new_item = await client.post("products", data={"name": "Async Widget", "price": 5.99})
        updated = await client.put("products/1", data={"name": "Updated"})
        await client.delete("products/99")

asyncio.run(fetch_all())
```

The `async with` block ensures `aclose()` is called automatically — no leaked connections.

---

## How the Internals Work

### Endpoint Normalization

`normalize_endpoint()` handles three cases consistently:

```python
def normalize_endpoint(self, endpoint: str, add_trailing_slash: bool = True) -> str:
    # Already a full URL → pass through unchanged
    if endpoint.startswith("http://") or endpoint.startswith("https://"):
        return endpoint

    # Add trailing slash if configured
    if add_trailing_slash and not endpoint.endswith("/"):
        endpoint = endpoint + "/"

    # Prepend base_url for relative paths
    if not endpoint.startswith("http"):
        endpoint = f'{self.base_url}/{endpoint.lstrip("/")}' if self.base_url else endpoint

    return endpoint
```

This means you can pass `"products"`, `"products/42"`, or a full `"https://other-api.com/resource"` and the client handles each correctly.

### Error Handling

Every response calls `raise_for_status()` before returning. HTTP 4xx and 5xx responses raise `httpx.HTTPStatusError` immediately — no silent failures, no need to check status codes manually.

### Async Reuses Sync Defaults

`AsyncRestApiClient` reuses `RestApiClient`'s static methods for timeout and limit defaults:

```python
self.client = httpx.AsyncClient(
    timeout=RestApiClient.get_default_timeout(timeout),
    limits=RestApiClient.get_default_limits(limits),
)
```

Single source of truth for configuration defaults across both clients.

---

## Real-World Example: Fetching Test Data

This is how `pyrest-model-client` is used in [`django-basic-app`](https://github.com/aviz92/django-basic-app) to fetch versioned test data from a running API:

```python
from pyrest_model_client.base import BaseAPIModel
from pyrest_model_client import RestApiClient, build_header, get_model_fields

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
```

The result is a typed `list[Employee]` — ready for test assertions, no dict key access.

---

## Links

- **PyPI**: [pypi.org/project/pyrest-model-client](https://pypi.org/project/pyrest-model-client)
- **GitHub**: [github.com/aviz92/pyrest-model-client](https://github.com/aviz92/pyrest-model-client)
- **Install**: `uv add pyrest-model-client`
