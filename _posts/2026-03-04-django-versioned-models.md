---
title: "django-versioned-models: Drop-in Release Management for Django"
date: 2026-03-08
categories: [Backend, Django]
tags: [django, python, versioning, ci, open-source]
---

Every time I needed to manage versioned configuration data in Django — feature flags, test
datasets, infrastructure definitions — I ended up reinventing the same pattern. Lock a
dataset, branch it, let users edit safely while CI stays stable, approve for testing,
ship.

`django-versioned-models` packages that pattern into a single mixin. Inherit from
`VersionedModel`, run a migration, and your models get full release management, a
three-stage data-status workflow, and CI-ready management commands — automatically.

---

## Installation

```bash
pip install django-versioned-models
```
```bash
uv add django-versioned-models
```

```python
# settings.py
INSTALLED_APPS = [
    ...
    'django_versioned_models',
]
```

```bash
python manage.py migrate
```

---

## Quick Start

```python
from django_versioned_models.mixins import VersionedModel

class Product(VersionedModel):
    name = models.CharField(max_length=255)

    class Meta:
        unique_together = [('release', 'name')]  # unique per release, not globally
```

```bash
python manage.py makemigrations && python manage.py migrate

python manage.py create_release --release-version v1.0.0
# → add data via Admin or API
python manage.py lock_release --release-version v1.0.0
```

---

## The Core: Three Fields, One Workflow

Every model that inherits from `VersionedModel` gets three fields added automatically:

- `release` — FK to a `Release` record. Every row belongs to exactly one release.
- `status` — the data-readiness stage: `DRAFT`, `FUTURE`, or `APPROVED`.
- `active` — soft-delete flag (covered below).

The `release` and `status` fields together are the heart of the system.

---

## The Three-Status Workflow

```
DRAFT  <-->  FUTURE  -->  APPROVED
```

| Status | Audience | Meaning |
|---|---|---|
| `DRAFT` | users | Being worked on. Not visible to CI. |
| `FUTURE` | users | Planned but parked — not for the current cycle. |
| `APPROVED` | CI only | Stable. This is what tests run against. |

The transition rules enforce the intended workflow:

- `DRAFT → FUTURE` via `mark_future()` — user parks the row for a later cycle
- `FUTURE → DRAFT` via `mark_draft()` — user pulls it back for rework
- `DRAFT or FUTURE → APPROVED` via `approve()` — one-way, CI only

`APPROVED` is a terminal state. There is no transition back. If a row needs to change after
approval, the correct action is to create a new release (or a patch release) and update the
row there.

### Why Three Statuses?

Two statuses (`DRAFT` / `APPROVED`) are enough for a single sprint, but they break down as
soon as users are working across multiple future cycles at the same time. `FUTURE` gives
them a holding area for rows that are correct and intentional but shouldn't be approved yet
— without mixing them up with rows that are still actively being worked on (`DRAFT`).

### Status Transitions in Code

```python
row.mark_future()  # DRAFT → FUTURE
row.mark_draft()   # FUTURE → DRAFT
row.approve()      # DRAFT or FUTURE → APPROVED (one-way, CI only)
```

### Querying by Status

```python
from django_versioned_models.models import Release

release = Release.objects.get(version='v1.1.0')

Product.objects.approved(release)                        # CI — APPROVED rows only
Product.objects.for_release(release)                     # all rows for users
Product.objects.filter(release=release, status='future') # just the parked rows
```

---

## The Release Lifecycle

Releases are the outer container. Every row belongs to a release. Releases move through
their own lifecycle independently of individual rows:

```bash
# 1. Branch from the last locked release
python manage.py create_release --release-version v1.1.0 --based-on v1.0.0

# 2. users edit data in DRAFT. Park anything not ready in FUTURE.

# 3. CI approves all DRAFT rows (FUTURE rows are intentionally left alone)
python manage.py approve_release --release-version v1.1.0

# 4. Run tests against approved data only
pytest --release-version v1.1.0

# 5. Lock and ship
python manage.py lock_release --release-version v1.1.0

# 6. Bug found after deployment? Always patch — never touch a locked release
python manage.py create_release --release-version v1.1.1 --based-on v1.1.0
```

The separation between `FUTURE` rows and `approve_release` is deliberate: bulk approval
only touches `DRAFT` rows. `FUTURE` rows are not accidentally approved when CI runs
`approve_release` — users have to explicitly `mark_draft()` them first.

---

## Lock Enforcement

Locked releases are immutable at the model level. Any `save()` or `delete()` call on a row
in a locked release raises `ValidationError` — from the Admin, the API, or the shell.

```python
# Both raise ValidationError if release is locked
product.save()
product.delete()
```

This is enforced in `VersionedModel.save()` and `VersionedModel.delete()` — there is no
way to bypass it in application code. If a row needs to change after locking, the answer
is always a new patch release branched from the locked one.

---

## The `active` Field — Soft Deletion That Respects the Status Workflow

On top of the three-status system, each row also carries an `active` flag. This is a
soft-delete mechanism, but it is integrated with the status workflow rather than being
independent from it.

The key rule: **deactivating a row that was `APPROVED` resets its status back to `DRAFT`.**

```
deactivate()  →  active=False,  status → DRAFT  (if it was APPROVED)
reactivate()  →  active=True,   status stays DRAFT
```

**CI only runs against rows where `status=APPROVED` AND `active=True`.**

```python
product.deactivate()
# Before: active=True,  status="approved"
# After:  active=False, status="draft"   ← CI can no longer see it

product.reactivate()
# After:  active=True,  status="draft"   ← visible to users, not yet to CI
# Must go through approve() again before CI sees it
```

You cannot change the status of an inactive row — all transition methods (`mark_future`,
`mark_draft`, `approve`) raise `ValidationError` if `active=False`. You must `reactivate()`
first.

When a new release is branched from a locked one, inactive rows are carried over too. This
preserves the historical record and lets users choose to `reactivate()` a soft-deleted
row in the new release if the need arises.

---

## Auto-Discovery and Topological Copy

When `create_release --based-on` runs, it discovers all models that inherit from
`VersionedModel` automatically — no manual registration. FK dependencies between those
models are resolved via topological sort, so models are copied in the correct order.
No ordering required on the developer's part.

---

## Management Commands Reference

| Command | Description |
|---|---|
| `create_release --release-version v1.0.0` | Bootstrap a standalone release |
| `create_release --release-version v1.1.0 --based-on v1.0.0` | Branch from a locked release |
| `approve_release --release-version v1.1.0` | Approve all DRAFT rows (FUTURE left untouched) |
| `lock_release --release-version v1.1.0` | Lock a release — immutable from this point |
| `unlock_release --release-version v1.1.0` | Unlock (only valid before deployment) |
| `deprecate_release --release-version v1.0.0` | Soft-hide old release (data preserved) |
| `deprecate_release --release-version v1.0.0 --undo` | Restore a deprecated release |

## Goes Well With

- [`custom-python-logger`](/posts/custom-python-logger) — logging I wire up alongside the client for request tracing
- [`drf-easy-crud`](/posts/drf-easy-crud) — the DRF API layer on the server side that `pyrest-model-client` talks to in my projects
- [`django-versioned-models`](/posts/django-versioned-models) — versioned model queries I consume through this client

---

## Links

- **PyPI**: [django-versioned-models](https://pypi.org/project/django-versioned-models)
- **GitHub**: [aviz92/django-versioned-models](https://github.com/aviz92/django-versioned-models)

Feedback, issues, and PRs are welcome.
