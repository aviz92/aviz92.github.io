---
title: "drf-easy-crud: Enterprise-Grade CRUD for Django REST Framework"
date: 2026-03-04 10:00:00 +0200
categories: [Backend, Django]
tags: [python, django, drf, rest-api, crud, filtering, pagination]
description: "Stop writing the same GET/POST/PUT/PATCH/DELETE boilerplate in every ViewSet. drf-easy-crud gives you enterprise-grade CRUD with advanced filtering, pagination, and ForeignKey lookups out of the box."
---

Every Django REST Framework project starts the same way: you create a model, a serializer, and then you write the same CRUD boilerplate — again. `drf-easy-crud` eliminates that repetition with a single utility class that handles all standard operations, plus production-ready filtering and pagination built in.

## The Problem

A typical DRF ViewSet involves writing the same patterns over and over:

- Manual queryset filtering logic
- Copy-pasted pagination setup
- Repetitive error handling across every endpoint
- No consistent pattern across your team

The result is inconsistent code, duplicated logic, and hours wasted on infrastructure instead of features.

## The Solution: `CRUDUtils`

`drf-easy-crud` provides a single static utility class — `CRUDUtils` — that covers all five CRUD operations with a consistent, type-safe interface.

### Installation

```bash
uv add drf-easy-crud
```

### A Complete ViewSet in Minutes

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

That's a full, production-ready API endpoint — with filtering, pagination, error handling, and type hints — in under 40 lines.

---

## Advanced Features

### Queryset Hooks

Need to restrict results before applying request filters? Use `queryset_hook`:

```python
def list(self, request: Request) -> Response:
    return CRUDUtils.get(
        request=request,
        model_class=MyModel,
        serializer_class=MyModelSerializer,
        queryset_hook=lambda: MyModel.objects.filter(is_active=True),
    )
```

### Custom Pagination

The default is 20 items per page (max 100), but you can plug in your own pagination class:

```python
class CustomPagination(PageNumberPagination):
    page_size = 50
    max_page_size = 200

def list(self, request: Request) -> Response:
    return CRUDUtils.get(
        request=request,
        model_class=MyModel,
        serializer_class=MyModelSerializer,
        pagination_class=CustomPagination,
    )
```

### Custom Ordering

```python
CRUDUtils.get(
    request=request,
    model_class=MyModel,
    serializer_class=MyModelSerializer,
    ordering_field="-created_at",  # Newest first
)
```

---

## Powerful Filtering Out of the Box

One of the standout features is the built-in `FilterUtils` — no need to configure `django-filter` or write custom filter backends.

### Text Field Wildcards

Pass filters directly as query params with intuitive wildcard patterns:

| Pattern | Description | Example |
|---------|-------------|---------|
| `field=value*` | Starts with | `?name=test*` |
| `field=*value` | Ends with | `?name=*test` |
| `field=*value*` | Contains | `?name=*test*` |
| `field=value` | Exact match (case-insensitive) | `?name=test` |

### Numeric Comparison Operators

| Pattern | Description | Example |
|---------|-------------|---------|
| `field=>=value` | Greater than or equal | `?age=>=25` |
| `field=<=value` | Less than or equal | `?age=<=100` |
| `field=>value` | Greater than | `?age=>25` |
| `field=<value` | Less than | `?age=<25` |

### ForeignKey Lookups

Filter across related models using Django's double-underscore syntax — no extra configuration needed:

```bash
# Products in a category whose name starts with "electronics"
GET /api/products/?category__name=electronics*

# Orders from a customer whose company name contains "acme"
GET /api/orders/?customer__company__name=*acme*

# Related model numeric filter
GET /api/products/?category__priority=>=5
```

### Combining Filters

```bash
GET /api/mymodel/?name=test*&age=>=18&status=active
```

---

## Standardized Pagination Response

Every list endpoint returns a consistent, predictable structure:

```json
{
  "count": 150,
  "next": "http://example.com/api/mymodel/?page=2",
  "previous": null,
  "results": [...]
}
```

Control pagination via query params: `?page=2&page_size=50`

---

## Why It Matters at Scale

In large projects with many models and endpoints, the benefits compound quickly:

- **Consistency** — every endpoint behaves identically
- **Less code to maintain** — CRUD logic lives in one place
- **Faster onboarding** — new team members understand any endpoint instantly
- **Built-in reliability** — error handling and logging are handled for you

---

## Links

- **PyPI**: [pypi.org/project/drf-easy-crud](https://pypi.org/project/drf-easy-crud)
- **GitHub**: [github.com/aviz92/drf-easy-crud](https://github.com/aviz92/drf-easy-crud)
- **Install**: `uv add drf-easy-crud`
