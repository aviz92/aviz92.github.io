---
title: "drf-easy-crud: Enterprise-Grade CRUD for Django REST Framework"
date: 2026-03-04 10:00:00 +0200
categories: [Backend, Django]
tags: [python, django, drf, rest-api, crud, filtering, pagination]
description: "Stop writing the same GET/POST/PUT/PATCH/DELETE boilerplate in every ViewSet. drf-easy-crud gives you enterprise-grade CRUD with advanced filtering, pagination, and ForeignKey lookups out of the box."
---

Every Django REST Framework project starts the same way: model, serializer, ViewSet — and then you write the same CRUD boilerplate again. Manual queryset filtering, copy-pasted pagination setup, repetitive error handling across every endpoint, no consistent pattern across the team. The result is duplicated logic and hours spent on infrastructure instead of features. `drf-easy-crud` eliminates that repetition with a single utility class that handles all standard operations, plus production-ready filtering and pagination built in.

## Why I Built This

After building my fourth DRF API I noticed I was copying the same ViewSet skeleton every time. The filtering logic, the pagination config, the error handling — all identical, all written from scratch again. On a team, every developer ends up with their own slightly different version of the same pattern. I wanted one place where all of that lived, with a consistent interface any team member could understand immediately.

## Installation

```bash
pip install drf-easy-crud
```
```bash
uv add drf-easy-crud
```

## Quick Start

A complete, production-ready ViewSet with filtering, pagination, and error handling in under 40 lines:

```python
from drf_easy_crud import CRUDUtils
from rest_framework import viewsets
from rest_framework.request import Request
from rest_framework.response import Response

from myapp.models import MyModel
from myapp.serializers import MyModelSerializer


class MyModelViewSet(viewsets.ViewSet):

    def list(self, request: Request) -> Response:
        return CRUDUtils.get(
            request=request,
            model_class=MyModel,
            serializer_class=MyModelSerializer,
        )

    def create(self, request: Request) -> Response:
        return CRUDUtils.post(
            request=request,
            serializer_class=MyModelSerializer,
        )

    def update(self, request: Request, pk: int) -> Response:
        return CRUDUtils.put(
            request=request,
            model_class=MyModel,
            serializer_class=MyModelSerializer,
            pk=pk,
        )

    def partial_update(self, request: Request, pk: int) -> Response:
        return CRUDUtils.patch(
            request=request,
            model_class=MyModel,
            serializer_class=MyModelSerializer,
            pk=pk,
        )

    def destroy(self, request: Request, pk: int) -> Response:
        return CRUDUtils.delete(
            model_class=MyModel,
            pk=pk,
        )
```

## Real-World Example

Here's a product catalog API with active-only results, custom pagination, newest-first ordering, and cross-model filtering — the kind of thing that takes hours to wire up manually:

```python
class ProductViewSet(viewsets.ViewSet):

    def list(self, request: Request) -> Response:
        return CRUDUtils.get(
            request=request,
            model_class=Product,
            serializer_class=ProductSerializer,
            queryset_hook=lambda: Product.objects.filter(is_active=True),
            pagination_class=CustomPagination,
            ordering_field="-created_at",
        )
```

Then filter via query params with no extra backend configuration:

```bash
# Products in a category whose name starts with "electronics"
GET /api/products/?category__name=electronics*

# Active products priced under 100
GET /api/products/?price=<100&is_active=true

# Orders from a customer whose company name contains "acme"
GET /api/orders/?customer__company__name=*acme*&total=>=500
```

Every list response comes back in the same predictable structure:

```json
{
  "count": 150,
  "next": "http://example.com/api/products/?page=2",
  "previous": null,
  "results": [...]
}
```

## Key Features

`CRUDUtils` is a static class — no instantiation, no subclassing required. Every method (`get`, `post`, `put`, `patch`, `delete`) has a consistent, type-safe signature so any team member can read any ViewSet without surprises.

The built-in `FilterUtils` handles filtering directly from query params with no `django-filter` configuration needed. Text fields support four wildcard patterns: `value*` (starts with), `*value` (ends with), `*value*` (contains), and `value` for case-insensitive exact match. Numeric fields support `>=`, `<=`, `>`, and `<` as inline operators in the query string — `?age=>=25` just works.

ForeignKey lookups use Django's double-underscore syntax directly in query params, with no extra setup:

| Pattern | Description | Example |
|---------|-------------|---------|
| `field=value*` | Starts with | `?name=test*` |
| `field=*value*` | Contains | `?name=*test*` |
| `field=>=value` | Greater than or equal | `?age=>=25` |
| `field=<value` | Less than | `?price=<100` |
| `relation__field=value` | ForeignKey lookup | `?category__name=electronics*` |

The `queryset_hook` parameter lets you restrict the base queryset before filters are applied — useful for multi-tenant APIs, soft-delete patterns, or any case where only a subset of records should be exposed:

```python
queryset_hook=lambda: MyModel.objects.filter(tenant=request.user.tenant)
```

Pagination defaults to 20 items per page (max 100) and is pluggable with any `PageNumberPagination` subclass. Ordering takes a single field string — prefix with `-` for descending.

## Goes Well With

- [`custom-python-logger`](/posts/custom-python-logger) — error handling and logging built into `CRUDUtils` uses this under the hood
- [`pyrest-model-client`](/posts/pyrest-model-client) — REST client I use to test these endpoints from other services

---

## Links

- **PyPI**: [pypi.org/project/drf-easy-crud](https://pypi.org/project/drf-easy-crud)
- **GitHub**: [github.com/aviz92/drf-easy-crud](https://github.com/aviz92/drf-easy-crud)

One class, five methods, every CRUD endpoint you'll ever need.
