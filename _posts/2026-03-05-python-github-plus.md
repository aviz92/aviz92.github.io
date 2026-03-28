---
title: "python-github-plus: A Production-Ready GitHub Client with Service-Based Architecture"
date: 2026-03-05 09:00:00 +0200
categories: [Backend, Python Clients]
tags: [python, github, automation, devops, ci-cd]
description: "python-github-plus extends PyGitHub with a clean service-based architecture for branch management, PR workflows, workflow automation, file operations, and tag management — all with robust error handling."
---

The official `pygithub` package gives you raw API access. `python-github-plus` gives you a structured, production-ready client organized around the services you actually use: branches, pull requests, workflows, files, and tags.

## Installation

```bash
pip install python-github-plus
```

## Configuration

```bash
export GitHub_ACCESS_TOKEN=your_github_access_token
export GitHub_URL=https://github.com  # defaults to github.com
```

---

## Service-Based Architecture

Instead of one monolithic client, everything is organized into focused services:

```python
from python_github_plus import GitHubClient

github_client = GitHubClient(
    access_token="your_access_token",
    repo_full_name="your-org/your-repo",
)

# Clean, namespaced access to each service
github_client.project       # project info & members
github_client.branch        # branch lifecycle
github_client.pull_request  # PR workflows
github_client.workflow      # GitHub Actions
github_client.tag           # tag management
github_client.file          # file operations
```

---

## Branch Management

```python
# Create from any base branch
branch = github_client.branch.create(
    branch_name="feature/new-feature",
    from_branch="main"
)

# List all branches
for branch in github_client.branch.list():
    print(branch.name)

# Protect main
github_client.branch.protect("main")

# Clean up after merge
github_client.branch.delete("feature/old-feature")
```

---

## Pull Request Workflows

The full PR lifecycle in a few lines:

```python
# Open the PR
pr = github_client.pull_request.create(
    title="Add new feature",
    from_branch="feature/new-feature",
    target="main"
)

# Assign, comment, approve, merge
github_client.pull_request.assign(pr.number, "username")
github_client.pull_request.add_comment(pr.number, "LGTM!")
github_client.pull_request.approve(pr.number)
github_client.pull_request.merge(pr.number)
```

---

## Workflow Automation

Trigger GitHub Actions workflows and wait for results — essential for CI orchestration:

```python
import time

# Trigger
workflow = github_client.workflow.trigger(
    workflow_name="CI",
    branch_name="main",
)

time.sleep(5)  # let the run register
run = github_client.workflow.last_run_by_id(workflow_id=workflow.id)

# Poll status
print(github_client.workflow.status(run_id=run.id))

# Or block until done
final_status = github_client.workflow.wait_until_finished(
    run_id=run.id,
    check_interval=30,
    timeout=3600
)
print(f"Completed: {final_status}")
```

---

## File Operations

```python
content = github_client.file.fetch_content(
    file_path="README.md",
    ref="main"
)
```

---

## Tag Management

```python
# Release tagging
tag = github_client.tag.create(
    tag_name="v1.0.0",
    from_branch="main",
    message="Release version 1.0.0"
)

for tag in github_client.tag.list():
    print(tag.name)

github_client.tag.delete("v0.9.0")
```

---

## Project & Member Management

```python
info = github_client.project.get_info()
print(f"{info.name}: {info.description}")

for member in github_client.project.list_members():
    print(member.username)

github_client.project.add_member("newuser", 30)
github_client.project.remove_member("olduser")
```

---

## Links

- **PyPI**: [pypi.org/project/python-github-plus](https://pypi.org/project/python-github-plus)
- **GitHub**: [github.com/aviz92/python-github-plus](https://github.com/aviz92/python-github-plus)
- **Install**: `pip install python-github-plus`
