# /// script
# requires-python = ">=3.12"
# dependencies = ["custom-python-logger==4.2.0", "pyyaml==6.0.3"]
#
# [tool.uv]
# exclude-newer = "2026-11-02T00:00:00Z"
# ///
"""Refresh _data/pypi_stats.json with download counts, latest releases and owned packages.

Downloads (last month) come from pypistats.org; the latest version and its release
date come from the PyPI JSON API; the packages owned by the PyPI user in _config.yml
(``pypi.username``, the same list pypi.org/user/<name>/ shows) come from PyPI's XML-RPC API.

Runs in its own read-only CI job before every site build (see
.github/workflows/pages-deploy.yml). Dependencies are pinned in the adjacent
``fetch_pypi_stats.py.lock``; run locally with
``uv run --locked --script tools/fetch_pypi_stats.py``. A failed lookup never breaks the
build: the package keeps its previous values from the existing data file.
"""

import json
import time
import urllib.error
import urllib.request
import xmlrpc.client
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import yaml
from custom_python_logger import get_logger

logger = get_logger(__name__)

REPO_ROOT = Path(__file__).resolve().parent.parent
CONFIG_FILE = REPO_ROOT / "_config.yml"
PROJECTS_DIR = REPO_ROOT / "_data" / "projects"
STATS_FILE = REPO_ROOT / "_data" / "pypi_stats.json"
DOWNLOADS_URL = "https://pypistats.org/api/packages/{name}/recent"
RELEASE_URL = "https://pypi.org/pypi/{name}/json"
XMLRPC_URL = "https://pypi.org/pypi"
OWNER_ROLE = "Owner"
REQUEST_TIMEOUT_SECONDS = 15
REQUEST_PAUSE_SECONDS = 1.0  # pypistats is a free, rate-limited community service — stay polite

Release = dict[str, str]  # {"version": "4.2.0", "released": "2026-11-01", "released_at": "<ISO 8601>"}


def get_pypi_package_names(projects_dir: Path = PROJECTS_DIR) -> list[str]:
    """Return names of PyPI projects whose repo I own (forks marked fork_of are skipped)."""
    names: list[str] = []
    for data_file in sorted(projects_dir.glob("*.yml")):
        projects: list[dict[str, Any]] = yaml.safe_load(data_file.read_text()) or []
        names.extend(p["name"] for p in projects if p.get("pypi") and not p.get("fork_of"))
    return names


def get_pypi_username(config_file: Path = CONFIG_FILE) -> str | None:
    """Return ``pypi.username`` from the Jekyll config, or None if it is not set."""
    config: dict[str, Any] = yaml.safe_load(config_file.read_text()) or {}
    return (config.get("pypi") or {}).get("username")


class _TimeoutTransport(xmlrpc.client.SafeTransport):
    """HTTPS transport with the same request timeout as the JSON calls."""

    def make_connection(self, host: Any) -> Any:
        connection = super().make_connection(host)
        connection.timeout = REQUEST_TIMEOUT_SECONDS
        return connection


def fetch_owned_packages(username: str) -> list[str] | None:
    """Return the packages ``username`` owns on PyPI, or None if the lookup fails."""
    try:
        proxy = xmlrpc.client.ServerProxy(XMLRPC_URL, transport=_TimeoutTransport())
        roles: list[tuple[str, str]] = proxy.user_packages(username)
    except (xmlrpc.client.Error, OSError) as exc:
        logger.warning(f"Could not fetch PyPI packages for {username}: {exc}")
        return None
    return sorted(name for role, name in roles if role == OWNER_ROLE)


def load_previous_stats(stats_file: Path = STATS_FILE) -> dict[str, Any]:
    """Return the last run's data file contents, or an empty dict."""
    if not stats_file.exists():
        return {}
    return json.loads(stats_file.read_text())


def fetch_json(url: str) -> dict[str, Any] | None:
    """GET ``url`` as JSON, or None if the request fails."""
    try:
        with urllib.request.urlopen(url, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            return json.load(response)
    except (urllib.error.URLError, ValueError, TimeoutError) as exc:
        logger.warning(f"Request failed for {url}: {exc}")
        return None


def fetch_last_month_downloads(name: str) -> int | None:
    """Return last-month downloads for ``name``, or None if unavailable."""
    data = fetch_json(DOWNLOADS_URL.format(name=name.lower()))
    try:
        return int(data["data"]["last_month"]) if data else None
    except (KeyError, TypeError, ValueError):
        return None


def fetch_latest_release(name: str) -> Release | None:
    """Return the latest version of ``name`` and the date it was uploaded, or None."""
    data = fetch_json(RELEASE_URL.format(name=name.lower()))
    if not data or not data.get("urls"):
        return None
    uploaded = data["urls"][0].get("upload_time_iso_8601", "")
    return {"version": data["info"]["version"], "released": uploaded[:10], "released_at": uploaded}


def collect(names: list[str], previous: dict[str, Any]) -> tuple[dict[str, int], dict[str, Release]]:
    """Fetch downloads and releases per package, falling back to previous values on failure."""
    old_counts: dict[str, int] = previous.get("packages", {})
    old_releases: dict[str, Release] = previous.get("releases", {})
    counts: dict[str, int] = {}
    releases: dict[str, Release] = {}
    for name in names:
        count = fetch_last_month_downloads(name)
        if count is None:
            count = old_counts.get(name)
        if count is not None:
            counts[name] = count

        release = fetch_latest_release(name) or old_releases.get(name)
        if release:
            releases[name] = release
        time.sleep(REQUEST_PAUSE_SECONDS)
    return counts, releases


def write_stats(
    counts: dict[str, int],
    releases: dict[str, Release],
    pypi_user: dict[str, Any],
    stats_file: Path = STATS_FILE,
) -> None:
    """Write totals, per-package counts, latest releases and owned packages (site.data.pypi_stats)."""
    payload = {
        "updated": datetime.now(UTC).strftime("%Y-%m-%d"),
        "last_month_total": sum(counts.values()),
        "packages": dict(sorted(counts.items())),
        "releases": dict(sorted(releases.items())),
        "pypi_user": pypi_user,
    }
    stats_file.write_text(json.dumps(payload, indent=2) + "\n")
    logger.info(
        f"Wrote {len(counts)} download counts, {len(releases)} releases, "
        f"{pypi_user.get('count', 0)} owned packages"
    )


def collect_pypi_user(previous: dict[str, Any]) -> dict[str, Any]:
    """Owned-package list for the configured PyPI user, falling back to the previous one."""
    username = get_pypi_username()
    owned = fetch_owned_packages(username) if username else None
    if owned is None:
        return previous.get("pypi_user", {})
    return {"username": username, "count": len(owned), "packages": owned}


def main() -> None:
    previous = load_previous_stats()
    names = get_pypi_package_names()
    counts, releases = collect(names, previous)
    pypi_user = collect_pypi_user(previous)
    if not counts and not releases and not pypi_user:
        logger.warning("Nothing fetched — keeping the existing data file")
        return
    write_stats(counts, releases, pypi_user)


if __name__ == "__main__":
    main()
