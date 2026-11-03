# /// script
# requires-python = ">=3.12"
# dependencies = ["custom-python-logger", "pyyaml"]
# ///
"""Refresh _data/pypi_stats.json with last-month download counts from pypistats.org.

Runs before every site build (see .github/workflows/pages-deploy.yml) and can be run
locally with ``uv run tools/fetch_pypi_stats.py``. A failed lookup never breaks the
build: the package keeps its previous count from the existing data file.
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
API_URL = "https://pypistats.org/api/packages/{name}/recent"
REQUEST_TIMEOUT_SECONDS = 15
REQUEST_PAUSE_SECONDS = 0.5  # pypistats is a free community service — stay polite


def get_pypi_package_names(projects_dir: Path = PROJECTS_DIR) -> list[str]:
    """Return names of PyPI projects whose repo I own (forks marked fork_of are skipped)."""
    names: list[str] = []
    for data_file in sorted(projects_dir.glob("*.yml")):
        projects: list[dict[str, Any]] = yaml.safe_load(data_file.read_text()) or []
        names.extend(p["name"] for p in projects if p.get("pypi") and not p.get("fork_of"))
    return names


def load_previous_counts(stats_file: Path = STATS_FILE) -> dict[str, int]:
    """Return per-package counts from the last run, or an empty dict."""
    if not stats_file.exists():
        return {}
    return json.loads(stats_file.read_text()).get("packages", {})


def fetch_last_month_downloads(name: str) -> int | None:
    """Return last-month downloads for ``name``, or None if the lookup fails."""
    url = API_URL.format(name=name.lower())
    try:
        with urllib.request.urlopen(url, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            return int(json.load(response)["data"]["last_month"])
    except (urllib.error.URLError, KeyError, ValueError, TimeoutError) as exc:
        logger.warning(f"Could not fetch downloads for {name}: {exc}")
        return None


def collect_counts(names: list[str], previous: dict[str, int]) -> dict[str, int]:
    """Fetch every package, falling back to its previous count on failure."""
    counts: dict[str, int] = {}
    for name in names:
        fetched = fetch_last_month_downloads(name)
        if fetched is not None:
            counts[name] = fetched
        elif name in previous:
            counts[name] = previous[name]
        time.sleep(REQUEST_PAUSE_SECONDS)
    return counts


def write_stats(counts: dict[str, int], stats_file: Path = STATS_FILE) -> None:
    """Write totals and per-package counts for Jekyll to read as site.data.pypi_stats."""
    payload = {
        "updated": datetime.now(UTC).strftime("%Y-%m-%d"),
        "last_month_total": sum(counts.values()),
        "packages": dict(sorted(counts.items())),
    }
    stats_file.write_text(json.dumps(payload, indent=2) + "\n")
    logger.info(f"Wrote {len(counts)} packages, {payload['last_month_total']} downloads last month")


def main() -> None:
    names = get_pypi_package_names()
    previous = load_previous_counts()
    counts = collect_counts(names, previous)
    if not counts:
        logger.warning("No download counts available — keeping the existing data file")
        return
    write_stats(counts)


if __name__ == "__main__":
    main()
