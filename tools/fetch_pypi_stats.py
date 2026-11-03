# /// script
# requires-python = ">=3.12"
# dependencies = ["custom-python-logger==4.2.0", "pyyaml==6.0.3"]
#
# [tool.uv]
# exclude-newer = "2026-11-02T00:00:00Z"
# ///
"""Refresh _data/pypi_stats.json with download counts and latest releases.

Downloads (last month) come from pypistats.org; the latest version and its release
date come from the PyPI JSON API.

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
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import yaml
from custom_python_logger import get_logger

logger = get_logger(__name__)

REPO_ROOT = Path(__file__).resolve().parent.parent
PROJECTS_DIR = REPO_ROOT / "_data" / "projects"
STATS_FILE = REPO_ROOT / "_data" / "pypi_stats.json"
DOWNLOADS_URL = "https://pypistats.org/api/packages/{name}/recent"
RELEASE_URL = "https://pypi.org/pypi/{name}/json"
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


def write_stats(counts: dict[str, int], releases: dict[str, Release], stats_file: Path = STATS_FILE) -> None:
    """Write totals, per-package counts and latest releases for Jekyll (site.data.pypi_stats)."""
    payload = {
        "updated": datetime.now(UTC).strftime("%Y-%m-%d"),
        "last_month_total": sum(counts.values()),
        "packages": dict(sorted(counts.items())),
        "releases": dict(sorted(releases.items())),
    }
    stats_file.write_text(json.dumps(payload, indent=2) + "\n")
    logger.info(f"Wrote {len(counts)} download counts and {len(releases)} releases")


def main() -> None:
    names = get_pypi_package_names()
    counts, releases = collect(names, load_previous_stats())
    if not counts and not releases:
        logger.warning("Nothing fetched — keeping the existing data file")
        return
    write_stats(counts, releases)


if __name__ == "__main__":
    main()
