---
title: "Deep Dive: How CRUDUtils Works Under the Hood"
date: 2026-03-04 08:00:00 +0200
categories: [Backend, Django]
tags: [python, django, drf, crud, filtering, architecture, deep-dive]
description: "A look inside CRUDUtils and FilterUtils — the static utility classes that power drf-easy-crud. How wildcard filtering, FK lookups, pagination, and error handling are implemented."
---

I've written about [drf-easy-crud](/posts/drf-easy-crud/) from a usage perspective. This post goes deeper — into how `CRUDUtils` and `FilterUtils` are actually implemented, what design decisions drove them, and why the internals look the way they do.

---

## The Core Design Decision: Static Methods

The first thing you'll notice is that `CRUDUtils` has no `__init__`. Every method is `@staticmethod`:

```python
class CRUDUtils:
    @staticmethod
    def get(request, model_class, serializer_class, ...) -> Response:
        ...

    @staticmethod
    def post(request, serializer_class, ...) -> Response:
        ...
```

This is intentional. CRUD utilities don't hold state — they're pure transformations from request + model → response. Making them static means:

- No instantiation overhead
- No hidden state between requests
- Clear, explicit dependency injection (everything passed as arguments)
- Easy to call from any context, including tests

---

## The GET Pipeline

`CRUDUtils.get()` handles two distinct cases in one method — single instance retrieval and list retrieval:

```python
@staticmethod
def get(request, model_class, serializer_class,
        queryset_hook=None, ordering_field="pk",
        pagination_class=None, **kwargs) -> Response:

    # Case 1: single instance
    if pk := kwargs.get("pk"):
        if not (instance := CRUDUtils._get_instance_by_pk(model_class, pk)):
            return Response(status=HTTP_404_NOT_FOUND)
        serializer = serializer_class(instance, context={"request": request})
        return Response(serializer.data)

    # Case 2: list with filtering + pagination
    queryset = CRUDUtils._build_queryset(model_class, queryset_hook)
    queryset = CRUDUtils._apply_filtering(queryset, request)
    queryset = queryset.order_by(ordering_field)
    return CRUDUtils.apply_pagination(queryset, request, serializer_class, pagination_class)
```

The pipeline for list requests is three steps:

1. **Build** — start from `model.objects.all()` or a custom `queryset_hook`
2. **Filter** — apply `FilterUtils` if query params are present
3. **Paginate** — apply `StandardResultsSetPagination` or a custom class

Each step is isolated into its own private method, making the logic easy to follow and override individually.

---

## The Queryset Hook Pattern

```python
@staticmethod
def _build_queryset(model_class, queryset_hook=None):
    return queryset_hook() if queryset_hook else model_class.objects.all()
```

`queryset_hook` is a callable — typically a lambda — that returns a pre-filtered queryset. It runs **before** request-level filtering is applied:

```python
# Only active records, then apply request filters on top
CRUDUtils.get(
    request=request,
    model_class=Product,
    serializer_class=ProductSerializer,
    queryset_hook=lambda: Product.objects.filter(is_active=True),
)
```

This keeps authorization and business-level filtering separate from user-driven query param filtering.

---

## POST: Validation First, Then Save

```python
@staticmethod
def post(request, serializer_class, **kwargs) -> Response:
    serializer = serializer_class(data=request.data, context={"request": request})
    if serializer.is_valid():
        try:
            serializer.save(**kwargs)
            logger.info(f"Created {model_name} with id={instance_id}")
            return Response(serializer.data, status=HTTP_201_CREATED)
        except (IntegrityError, DjangoValidationError) as e:
            logger.error(f"Database error: {str(e)}")
            return Response({"error": "Database constraint violation", "detail": str(e)}, status=HTTP_400_BAD_REQUEST)
    return Response(serializer.errors, status=HTTP_400_BAD_REQUEST)
```

Two error layers:

1. **Serializer validation** — field types, required fields, custom `validate_*` methods
2. **Database exceptions** — `IntegrityError` (unique constraints, FK violations) and `DjangoValidationError` (model-level `clean()`)

Both return `400` with a structured error body. The distinction matters — serializer errors are field-level, DB errors are constraint-level.

---

## PUT vs PATCH: One Internal Method

Both `put()` and `patch()` delegate to `_update_instance()`, differing only in the `partial` flag:

```python
@staticmethod
def put(request, model_class, serializer_class, **kwargs) -> Response:
    pk = kwargs.pop("pk", None)
    return CRUDUtils._update_instance(..., partial=False, **kwargs)

@staticmethod
def patch(request, model_class, serializer_class, **kwargs) -> Response:
    pk = kwargs.pop("pk", None)
    return CRUDUtils._update_instance(..., partial=True, **kwargs)
```

`partial=True` passes through to DRF's serializer — fields become optional, only provided fields are validated and updated. This is standard DRF behavior, but surfaced cleanly here.

---

## FilterUtils: The Interesting Part

`FilterUtils.apply_wildcard_filtering()` is where most of the complexity lives. It iterates over all query params and dispatches each to the right filter type:

```python
for param_name, param_value in query_params.items():
    if param_name in RESERVED_PARAMS or not param_value:
        continue

    if RELATED_LOOKUP in param_name:   # "__" in param name → FK lookup
        target_field = FilterUtils._get_lookup_target_field(model, param_name)
    else:                               # direct field
        target_field = model._meta.get_field(param_name)

    filtered_queryset = FilterUtils._apply_wildcard_to_field(
        queryset, param_name, param_value, target_field, models
    )
```

### Text Field Wildcards

The wildcard logic converts URL query params into Django ORM lookups:

```python
def _apply_text_wildcard_filter(queryset, param_name, param_value):
    if "*" not in param_value:
        return queryset.filter(**{f"{param_name}__iexact": param_value})

    if has_middle_wildcard(param_value):         # t*t → iregex
        return queryset.filter(**{f"{param_name}__iregex": wildcard_to_regex(param_value)})

    if param_value.startswith("*") and param_value.endswith("*"):  # *test* → icontains
        return queryset.filter(**{f"{param_name}__icontains": param_value.strip("*")})

    if param_value.startswith("*"):              # *test → iendswith
        return queryset.filter(**{f"{param_name}__iendswith": param_value.lstrip("*")})

    if param_value.endswith("*"):                # test* → istartswith
        return queryset.filter(**{f"{param_name}__istartswith": param_value.rstrip("*")})
```

The middle wildcard case (`t*t`) falls back to regex because Django doesn't have a native "middle wildcard" lookup. `_wildcard_to_regex()` converts `*` → `.*` after escaping the rest of the string.

### Numeric Comparison Operators

```python
OPERATOR_MAPPING = {
    ">=": "__gte",
    "<=": "__lte",
    ">":  "__gt",
    "<":  "__lt",
}

def _apply_number_filter(queryset, param_name, param_value, field):
    for operator, suffix in OPERATOR_MAPPING.items():
        if param_value.startswith(operator):
            value_str = param_value[len(operator):].strip()
            value = int(value_str) if isinstance(field, INTEGER_FIELDS) else float(value_str)
            return queryset.filter(**{f"{param_name}{suffix}": value})

    # No operator → exact match
    value = int(param_value) if isinstance(field, INTEGER_FIELDS) else float(param_value)
    return queryset.filter(**{param_name: value})
```

The field type (`INTEGER_FIELDS` vs float) determines how the string value is cast — avoiding Django type mismatch errors.

### FK Traversal

For `?category__name=electronics*`, `_get_lookup_target_field()` walks the relation chain:

```python
def _get_lookup_target_field(model, lookup_path):
    parts = lookup_path.split("__")   # ["category", "name"]
    current_model = model

    for part in parts[:-1]:           # traverse FK chain
        field = current_model._meta.get_field(part)
        current_model = field.related_model   # jump to related model

    return current_model._meta.get_field(parts[-1])  # return target field
```

This resolves the **type** of the final field — so `?category__priority=>=5` correctly applies numeric filtering even though the lookup path crosses a FK boundary.

---

## Pagination

```python
class StandardResultsSetPagination(PageNumberPagination):
    page_size = DEFAULT_PAGE_SIZE          # 20
    page_size_query_param = PAGE_SIZE_QUERY_PARAM
    max_page_size = DEFAULT_MAX_PAGE_SIZE  # 100
```

Standard DRF pagination, but wired in automatically. The `apply_pagination()` method handles the edge case where the paginator returns `None` (when the full queryset fits on one page):

```python
if (page := paginator.paginate_queryset(queryset, request)) is not None:
    serializer = serializer_class(page, many=True)
    return paginator.get_paginated_response(serializer.data)

# Fallback: no pagination needed
serializer = serializer_class(queryset, many=True)
return Response(serializer.data)
```

---

## What the Code Doesn't Do

A few deliberate omissions worth noting:

- **No caching** — queryset caching is left to the caller via `queryset_hook`
- **No permissions** — authentication and authorization belong in the ViewSet, not in utility methods
- **No bulk operations** — `django-basic-app` adds bulk create/update/delete on top

These were left out to keep `CRUDUtils` focused on a single concern: translating HTTP requests into queryset operations.

---

## Links

- **PyPI**: [pypi.org/project/drf-easy-crud](https://pypi.org/project/drf-easy-crud)
- **GitHub**: [github.com/aviz92/drf-easy-crud](https://github.com/aviz92/drf-easy-crud)
- **Install**: `uv add drf-easy-crud`
