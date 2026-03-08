---
title: "django-versioned-models: Drop-in Release Management for Django"
date: 2026-03-04 09:00:00 +0200
categories: [Python, Django]
tags: [python, django, open-source, versioning, database, orm, pypi, ci-cd]
pin: false
---

## The Problem

Most Django projects treat data as a single global state. But in any serious deployment — firmware, embedded systems, config-driven products, or any system with multiple versions in the field — data is version-dependent.

When you have `v1.0.0` locked in production, `v1.1.0` being tested by QA, and `v1.2.0` being built by User, each version needs to see **its own data state**. The standard Django ORM doesn't model this. You end up with workarounds: feature flags, parallel tables, or manual filtering logic scattered everywhere.

`django-versioned-models` solves this at the model layer — cleanly, with minimal changes to your existing code.

---

## What It Actually Does

Every model that inherits from `VersionedModel` automatically gets two fields:

- `release` — which version this row belongs to
- `status` — data readiness: `DRAFT`, `FUTURE`, or `APPROVED`

```python
from django_versioned_models.mixins import VersionedModel

class MyModel(VersionedModel):
    name = models.CharField(max_length=255)

    class Meta:
        unique_together = [('release', 'name')]  # unique per release, not globally
```

That's the entire integration surface. No registration, no decorators, no config beyond that.

---

## The Data Status Workflow

```
DRAFT <-> FUTURE -> APPROVED  (one-way to approved, CI only)
```

| Status | Who sets it | Meaning |
|--------|-------------|---------|
| `DRAFT` | User | Being actively worked on |
| `FUTURE` | User | Planned, not yet ready |
| `APPROVED` | CI only | Stable — what tests run against |

The key insight: **CI always queries `approved` rows only**. User can edit `DRAFT` data in production without breaking any test run.

```python
MyModel.objects.approved(release)     # CI — stable rows only
MyModel.objects.for_release(release)  # everyone — all statuses
```

---

## The Release Lifecycle

```bash
# 1. Create the first release
python manage.py create_release --release-version v1.0.0

# 2. Add data via Admin or API (status=DRAFT by default)

# 3. CI approves stable rows
python manage.py approve_release --release-version v1.0.0

# 4. Lock and ship — locked releases are immutable
python manage.py lock_release --release-version v1.0.0

# 5. Next version — branch from the locked release
python manage.py create_release --release-version v1.1.0 --based-on v1.0.0

# 6. Bug found after deployment? Patch — never modify a locked release
python manage.py create_release --release-version v1.0.1 --based-on v1.0.0
```

---

## Lock Enforcement

Locked releases are immutable at the model level — not just at the API level. Any attempt to `save()` or `delete()` a row in a locked release raises a `ValidationError`, regardless of where it comes from: Admin, API, shell, or management command.

```python
# This raises ValidationError if the release is locked
my_instance.save()
my_instance.delete()
```

---

## Auto-Discovery + Topological Sort

Every model that inherits from `VersionedModel` is discovered automatically on `create_release`. No manual registration. When branching a release, models are duplicated in the correct FK dependency order — resolved automatically via topological sort.

---

## Full Command Reference

| Command | Description |
|---------|-------------|
| `create_release --release-version v1.0.0` | Standalone release |
| `create_release --release-version v1.1.0 --based-on v1.0.0` | Branch from locked release |
| `approve_release --release-version v1.1.0` | Approve all DRAFT rows (CI) |
| `lock_release --release-version v1.1.0` | Make release immutable |
| `unlock_release --release-version v1.1.0` | Unlock (before deployment only) |
| `deprecate_release --release-version v1.0.0` | Soft-delete (data preserved) |
| `deprecate_release --release-version v1.0.0 --undo` | Restore deprecated release |

---

## Install

```bash
pip install django-versioned-models
```

Add to `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
    ...
    'django_versioned_models',
]
```

Run migrations:

```bash
python manage.py migrate
```

- 📦 [PyPI](https://pypi.org/project/django-versioned-models/)
- 🐙 [GitHub](https://github.com/aviz92/django-versioned-models)
