---
title: "python-vault: Lightweight HashiCorp Vault Client for AppRole Authentication"
date: 2026-03-04 11:00:00 +0200
categories: [Backend, Python Clients]
tags: [python, vault, hashicorp, secrets, security, devops, ci-cd]
description: "python-vault wraps hvac with a minimal, production-ready interface for AppRole authentication and KV v2 secret retrieval — configured via environment variables or constructor arguments."
---

Hardcoded secrets in `.env` files work for local development but don't belong in production. And storing application secrets as CI pipeline variables just moves the problem — now your database passwords live in your CI provider instead of your codebase, and you're still one leaked variable away from a breach. `python-vault` is a thin, focused wrapper around `hvac` that makes HashiCorp Vault's AppRole authentication and KV v2 secret retrieval straightforward in any Python project or pipeline — one init, one call, always authenticated.

## Why I Built This

Every time I integrated Vault into a new project I wrote the same 30 lines: resolve credentials from env vars, create the `hvac` client, authenticate with AppRole, handle the auth failure case, then wrap `read_secret_version` into something usable. It was the same code, every time. I packaged it once so I could stop writing it.

## Installation

```bash
pip install python-vault
```
```bash
uv add python-vault
```

## Setup & Configuration

The client reads from environment variables by default — no constructor arguments needed in most setups:

```bash
export VAULT_ADDR=https://vault.mycompany.com
export VAULT_ROLE_ID=your-role-id
export VAULT_SECRET_ID=your-secret-id
export VAULT_MOUNT=kv
```

```python
from python_vault import VaultClient

vault = VaultClient()  # reads from env vars
secret = vault.read_secret("services/my-app/db")
```

Or pass everything explicitly — useful for testing or multi-Vault setups:

```python
vault = VaultClient(
    vault_addr="https://vault.mycompany.com",
    vault_role_id="your-role-id",
    vault_secret_id="your-secret-id",
    vault_mount="kv",
)
```

Constructor arguments take precedence over environment variables.

## Quick Start

```python
import json
from python_vault import VaultClient

vault = VaultClient()
secret_data = vault.read_secret("services/my-app/db")
print(json.dumps(secret_data, indent=4))
```

`VaultClient()` authenticates at construction time. If AppRole auth fails, the constructor raises immediately — there's no lazy auth, no silent failures. A `VaultClient` instance is always authenticated.

## Real-World Example

A common pattern — fetch DB and API credentials at deploy time instead of storing them as CI pipeline secrets:

```python
import os
from python_vault import VaultClient

def get_db_config() -> dict:
    vault = VaultClient()
    secret = vault.read_secret("ci/production/database")
    return secret["data"]["data"]  # KV v2 nests data under data.data

def get_api_tokens() -> dict:
    vault = VaultClient()
    secret = vault.read_secret("ci/production/api-tokens")
    return secret["data"]["data"]

db = get_db_config()
tokens = get_api_tokens()

# db["host"], db["port"], db["password"]
# tokens["github_token"], tokens["jira_token"]
```

In CI, set `VAULT_ADDR`, `VAULT_ROLE_ID`, and `VAULT_SECRET_ID` as pipeline secrets — the actual application secrets stay in Vault. A breach of your CI configuration no longer exposes your database passwords or API keys, only the AppRole credentials needed to fetch them.

## Key Features

AppRole is the right auth method for machine-to-machine use. It uses two credentials: `role_id` identifies the application (safe to commit to config), and `secret_id` proves its identity (must stay secret). Together they authenticate against Vault and return a scoped token with exactly the permissions defined for that role — nothing more. This is why AppRole is the standard for CI pipelines and backend services.

The implementation is intentionally minimal — under 30 lines. Three things happen at init:

1. Credentials resolve from constructor args, falling back to env vars
2. An `hvac.Client` is created pointing at the Vault address
3. AppRole authentication runs immediately — failure raises with a clear exception

`read_secret()` targets the KV v2 engine and always passes `raise_on_deleted_version=True` — no silent reads of stale or removed secret versions. If the path doesn't exist or the version was deleted, you get an exception rather than `None` data.

## Goes Well With

- [`python-jira-plus`](/posts/python-jira-plus) — I pair these in ticket automation scripts: close the Jira ticket when the PR merges
- [`python-github-plus`](/posts/python-github-plus) — pull GitHub tokens from Vault in automation scripts instead of env vars
- [`python-gitlab-plus`](/posts/python-gitlab-plus) — same pattern for GitLab access tokens in pipeline scripts
- [`python-notion-plus`](/posts/python-notion-plus) — store Notion API keys in Vault instead of CI secrets
- [`python-base-command`](/posts/python-base-command) — wrap Vault-backed scripts as proper CLI commands with built-in logging
- [`custom-python-logger`](/posts/custom-python-logger) — log auth events and secret access for audit trails

---

## Links

- **PyPI**: [pypi.org/project/python-vault](https://pypi.org/project/python-vault)
- **GitHub**: [github.com/aviz92/python-vault](https://github.com/aviz92/python-vault)

Secrets belong in Vault. This makes putting them there painless.
