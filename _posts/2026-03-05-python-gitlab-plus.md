---
title: "python-gitlab-plus: Advanced GitLab Client for MR and Pipeline Automation"
date: 2026-03-05 09:30:00 +0200
categories: [Backend, Python Clients]
tags: [python, gitlab, automation, devops, ci-cd, pipelines]
description: "python-gitlab-plus extends the official python-gitlab package with a service-based architecture for branches, merge requests, pipelines, tags, and file operations — with built-in error handling and pipeline wait support."
---

The official `python-gitlab` package gives you raw API access to GitLab. What it doesn't give you is a clean way to express "create a branch, push a config change, open an MR, trigger a pipeline with environment variables, wait for it to finish, and merge" — without assembling a dozen low-level calls with your own error handling at each step. `python-gitlab-plus` wraps that into a service-based architecture organized around what you actually do with GitLab, whether you're on gitlab.com or a self-hosted instance.

## Why I Built This

I was writing deployment automation for a team running self-hosted GitLab. Every script needed the same things: trigger a pipeline with variables, block until it finished, open an MR, merge. With raw `python-gitlab` each of those was three or four API calls with no consistent error handling. I kept duplicating the same wrappers. I extracted them into services, gave each one a clean interface, and stopped writing GitLab plumbing.

## Installation

```bash
pip install python-gitlab-plus
```
```bash
uv add python-gitlab-plus
```

## Setup & Configuration

```bash
export GITLAB_ACCESS_TOKEN=your_gitlab_access_token
export GITLAB_URL=https://gitlab.com  # or your self-hosted instance
```

```python
from python_gitlab_plus import GitLabClient

gitlab_client = GitLabClient(
    gitlab_url="https://gitlab.com",
    access_token="your_access_token",
    project_id="your-project-id",
)
```

Six services, one client:

```python
gitlab_client.project        # project info & members
gitlab_client.branch         # branch lifecycle
gitlab_client.merge_request  # MR workflows
gitlab_client.pipeline       # CI/CD pipelines
gitlab_client.tag            # tag management
gitlab_client.file           # file operations
```

## Quick Start

The full branch → config change → MR → merge flow:

```python
# Create a feature branch
gitlab_client.branch.create(branch_name="feature/new-feature", from_branch="main")

# Push a config file to the branch
gitlab_client.file.create(
    file_path="config/feature.yaml",
    branch="feature/new-feature",
    content="enabled: true",
    commit_message="Add feature config",
)

# Open and merge the MR
mr = gitlab_client.merge_request.create(
    title="Add new feature",
    from_branch="feature/new-feature",
    target="main",
)
gitlab_client.merge_request.approve(mr.iid)
gitlab_client.merge_request.merge(mr.iid)
```

## Real-World Example

Here's a full deployment automation script — trigger a pipeline with environment-specific variables, wait for it to finish, tag the release, and clean up:

```python
import os
from python_gitlab_plus import GitLabClient

client = GitLabClient(
    gitlab_url=os.getenv("GITLAB_URL"),
    access_token=os.getenv("GITLAB_ACCESS_TOKEN"),
    project_id="your-org/your-repo",
)

# Trigger the deployment pipeline with environment variables
pipeline = client.pipeline.trigger(
    branch_name="release/v2.0.0",
    variables={"ENVIRONMENT": "production", "DEPLOY_VERSION": "2.0.0"},
)
print(f"Pipeline triggered: {pipeline.id}")

# Block until done
final_status = client.pipeline.wait_until_finished(
    pipeline.id,
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
    # Open and merge the release MR
    mr = client.merge_request.create(
        title="Release v2.0.0 → main",
        from_branch="release/v2.0.0",
        target="main",
    )
    client.merge_request.add_comment(mr.iid, "Pipeline passed. Merging.")
    client.merge_request.merge(mr.iid)
    client.branch.delete("release/v2.0.0")
else:
    print(f"Deployment failed: {final_status}")
```

Pipeline variables, blocking wait, tagging, MR, cleanup — all in one readable script.

## Key Features

Each capability lives in its own service — `branch`, `merge_request`, `pipeline`, `tag`, `file`, `project` — so the namespace makes every call self-documenting and the API surface is easy to discover.

Branch management covers the full lifecycle: create from any base, list, protect, and delete. MR workflows handle the full review cycle — create, assign, comment, approve, and merge:

```python
gitlab_client.merge_request.assign(mr.iid, "username")
gitlab_client.merge_request.add_comment(mr.iid, "LGTM!")
```

The pipeline service is the most useful for automation. `trigger()` fires a pipeline with optional environment variables, `status()` checks it, and `wait_until_finished()` blocks with a configurable poll interval and timeout — the pattern you reach for in every deployment or release script.

File operations are full CRUD — read, create, update, and delete files directly in the repository with commit messages. This is useful for config management workflows where automation needs to write files before opening an MR:

```python
# Update an existing file
gitlab_client.file.update(
    file_path="README.md",
    branch="feature/update-docs",
    content="# Updated content",
    commit_message="Update README",
)
```

Tag management and project administration round out the service set — create and delete release tags, list members, add and remove collaborators.

## Goes Well With

- [`python-vault`](/posts/python-vault) — store Telegram and Notion tokens in Vault instead of a plain `.env`
- [`python-jira-plus`](/posts/python-jira-plus) — I pair these in ticket automation scripts: close the Jira ticket when the PR merges
- [`custom-python-logger`](/posts/custom-python-logger) — logging wired into every service call for audit trails in automation scripts

---

## Links

- **PyPI**: [pypi.org/project/python-gitlab-plus](https://pypi.org/project/python-gitlab-plus)
- **GitHub**: [github.com/aviz92/python-gitlab-plus](https://github.com/aviz92/python-gitlab-plus)

Everything you need to automate a GitLab workflow — without reading the API docs every time.
