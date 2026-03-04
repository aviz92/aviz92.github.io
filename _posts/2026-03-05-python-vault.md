---
title: "python-vault: Lightweight HashiCorp Vault Client for AppRole Authentication"
date: 2026-03-04 11:00:00 +0200
categories: [Backend, Security]
tags: [python, vault, hashicorp, secrets, security, devops, ci-cd]
description: "python-vault wraps hvac with a minimal, production-ready interface for AppRole authentication and KV v2 secret retrieval — configured via environment variables or constructor arguments."
---

Hardcoded secrets in `.env` files work for local development but don't belong in production. `python-vault` is a thin, focused wrapper around `hvac` that makes HashiCorp Vault's AppRole authentication and KV v2 secret engine straightforward to use in any Python project or CI pipeline.

## Installation

```bash
pip install python-vault
```

---

## Why AppRole?

HashiCorp Vault supports many authentication methods. **AppRole** is the standard choice for machine-to-machine authentication — CI pipelines, backend services, automation scripts. It uses two credentials:

- **`role_id`** — identifies the application (like a username, can be committed to config)
- **`secret_id`** — proves the application's identity (like a password, must stay secret)

Together they authenticate against Vault and return a token with exactly the permissions defined for that role — nothing more.

---

## Configuration

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
    vault_mount="kv"
)
```

Constructor arguments take precedence over environment variables.

---

## Reading Secrets

```python
import json
from python_vault import VaultClient

vault = VaultClient()
secret_data = vault.read_secret("services/my-app/db")
print(json.dumps(secret_data, indent=4))
```

`read_secret()` targets the **KV v2 engine** and always raises on deleted secret versions — no silent reads of stale or removed secrets.

---

## How It Works

The implementation is intentionally minimal — under 30 lines:

```python
class VaultClient:
    def __init__(self, vault_addr=None, vault_role_id=None,
                 vault_secret_id=None, vault_mount=None):
        # env vars as fallback for every argument
        self.vault_addr = vault_addr or os.getenv("VAULT_ADDR")
        self.vault_role_id = vault_role_id or os.getenv("VAULT_ROLE_ID")
        self.vault_secret_id = vault_secret_id or os.getenv("VAULT_SECRET_ID")
        self.vault_mount = vault_mount or os.getenv("VAULT_MOUNT")

        self.client = hvac.Client(url=self.vault_addr)
        self._authenticate()

    def _authenticate(self):
        self.client.auth.approle.login(
            role_id=self.vault_role_id,
            secret_id=self.vault_secret_id
        )
        if not self.client.is_authenticated():
            raise Exception("Vault AppRole authentication failed")

    def read_secret(self, path: str) -> dict:
        return self.client.secrets.kv.v2.read_secret_version(
            path=path,
            mount_point=self.vault_mount,
            raise_on_deleted_version=True
        )
```

Three things happen at init time:

1. Credentials are resolved (constructor args → env vars)
2. An `hvac.Client` is created pointing at the Vault address
3. AppRole authentication runs immediately — if it fails, construction fails with a clear exception

This means a `VaultClient` instance is always authenticated. There's no lazy auth, no silent failures.

---

## CI Pipeline Example

A common pattern — fetch DB credentials at deploy time instead of storing them in CI secrets:

```python
import os
from python_vault import VaultClient

def get_db_config() -> dict:
    vault = VaultClient()
    secret = vault.read_secret("ci/production/database")
    return secret["data"]["data"]  # KV v2 nests data under data.data

db = get_db_config()
# db["host"], db["port"], db["password"] ...
```

In CI, set `VAULT_ADDR`, `VAULT_ROLE_ID`, and `VAULT_SECRET_ID` as pipeline secrets — the actual application secrets stay in Vault, not in your CI configuration.

---

## Links

- **PyPI**: [pypi.org/project/python-vault](https://pypi.org/project/python-vault)
- **GitHub**: [github.com/aviz92/python-vault](https://github.com/aviz92/python-vault)
- **Install**: `pip install python-vault`
