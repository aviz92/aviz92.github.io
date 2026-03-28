---
title: "python-github-plus: A Production-Ready GitHub Client with Service-Based Architecture"
date: 2026-03-05 09:00:00 +0200
categories: [Backend, Python Clients]
tags: [python, github, automation, devops, ci-cd]
description: "python-github-plus extends PyGitHub with a clean service-based architecture for branch management, PR workflows, workflow automation, file operations, and tag management — all with robust error handling."
---

The official `pygithub` package gives you raw API access — which is fine until you're writing automation scripts that need to open a PR, trigger a workflow, wait for it to finish, and then tag a release. At that point you're assembling a lot of low-level calls into something that should be a three-line script. `python-github-plus` gives you a structured, production-ready client organized around the services you actually use: branches, pull requests, workflows, files, and tags.

## Why I Built This

I was writing a CI automation script that needed to create a branch, push a commit, open a PR, trigger a workflow, wait for it to pass, and merge — all programmatically. With raw `pygithub`, each of those was a handful of API calls with no consistent error handling between them. I kept rebuilding the same service wrappers. Eventually I extracted them into a proper library with a clean namespace for each concern.

## Installation

```bash
pip install python-github-plus
```
```bash
uv add python-github-plus
```

## Setup & Configuration

```bash
export GitHub_ACCESS_TOKEN=your_github_access_token
export GitHub_URL=https://github.com  # defaults to github.com
```

```python
from python_github_plus import GitHubClient

github_client = GitHubClient(
    access_token="your_access_token",
    repo_full_name="your-org/your-repo",
)
```

Six services, one client, clean namespaces:

```python
github_client.project       # project info & members
github_client.branch        # branch lifecycle
github_client.pull_request  # PR workflows
github_client.workflow      # GitHub Actions
github_client.tag           # tag management
github_client.file          # file operations
```

## Quick Start

The full branch → PR → merge flow:

```python
# Create a feature branch
github_client.branch.create(branch_name="feature/new-feature", from_branch="main")

# Open a PR
pr = github_client.pull_request.create(
    title="Add new feature",
    from_branch="feature/new-feature",
    target="main"
)

# Review and merge
github_client.pull_request.add_comment(pr.number, "LGTM!")
github_client.pull_request.approve(pr.number)
github_client.pull_request.merge(pr.number)
```

## Real-World Example

Here's a full release automation script — trigger CI, wait for it to finish, tag the release, clean up the branch:

```python
import time
from python_github_plus import GitHubClient

client = GitHubClient(
    access_token=os.getenv("GitHub_ACCESS_TOKEN"),
    repo_full_name="your-org/your-repo",
)

# Trigger CI workflow on the release branch
workflow = client.workflow.trigger(
    workflow_name="CI",
    branch_name="release/v2.0.0",
)

time.sleep(5)  # let the run register
run = client.workflow.last_run_by_id(workflow_id=workflow.id)

# Block until CI finishes
final_status = client.workflow.wait_until_finished(
    run_id=run.id,
    check_interval=30,
    timeout=3600,
)

if final_status == "success":
    # Tag the release
    client.tag.create(
        tag_name="v2.0.0",
        from_branch="release/v2.0.0",
        message="Release version 2.0.0",
    )
    # Merge and clean up
    pr = client.pull_request.create(
        title="Release v2.0.0 → main",
        from_branch="release/v2.0.0",
        target="main",
    )
    client.pull_request.merge(pr.number)
    client.branch.delete("release/v2.0.0")
else:
    print(f"CI failed with status: {final_status}")
```

What would be 40+ lines of `pygithub` calls with scattered error handling becomes a linear, readable script.

## Key Features

Each capability lives in its own service — `branch`, `pull_request`, `workflow`, `tag`, `file`, `project` — so you import only what you need and the namespace makes every call self-documenting.

Branch management covers the full lifecycle: create from any base, list, protect, and delete. PR workflows cover create, assign, comment, approve, and merge. The workflow service is particularly useful for CI orchestration — `trigger()` fires a GitHub Actions workflow, `wait_until_finished()` blocks with a configurable poll interval and timeout, and `last_run_by_id()` gives you the run handle to track:

```python
# Protect a branch after creating it
client.branch.protect("main")

# Assign and comment on a PR
client.pull_request.assign(pr.number, "username")
client.pull_request.add_comment(pr.number, "Deploying to staging...")
```

Tag management handles release tagging cleanly — create with a message, list all tags, delete old ones. File operations let you fetch content at any ref:

```python
content = client.file.fetch_content(file_path="config/settings.yaml", ref="main")
```

Project-level operations round out the service set — get repo info, list members, add and remove collaborators.

## Goes Well With

- [`python-vault`](/posts/python-vault) — store Telegram and Notion tokens in Vault instead of a plain `.env`
- [`python-jira-plus`](/posts/python-jira-plus) — I pair these in ticket automation scripts: close the Jira ticket when the PR merges
- [`custom-python-logger`](/posts/custom-python-logger) — logging wired into every service call for audit trails in automation scripts

---

## Links

- **PyPI**: [pypi.org/project/python-github-plus](https://pypi.org/project/python-github-plus)
- **GitHub**: [github.com/aviz92/python-github-plus](https://github.com/aviz92/python-github-plus)

Everything you need to automate a GitHub workflow — without reading the API docs every time.
