---
title: "python-gitlab-plus: Advanced GitLab Client for MR and Pipeline Automation"
date: 2026-03-04 09:30:00 +0200
categories: [Backend, DevOps]
tags: [python, gitlab, automation, devops, ci-cd, pipelines]
description: "python-gitlab-plus extends the official python-gitlab package with a service-based architecture for branches, merge requests, pipelines, tags, and file operations — with built-in error handling and pipeline wait support."
---

`python-gitlab-plus` wraps the official `python-gitlab` package in a clean, service-based architecture that makes GitLab automation straightforward — whether you're managing merge requests, triggering pipelines, or handling file operations across Cloud and self-hosted instances.

## Installation

```bash
pip install python-gitlab-plus
```

## Configuration

```bash
export GITLAB_ACCESS_TOKEN=your_gitlab_access_token
export GITLAB_URL=https://gitlab.com  # or your self-hosted instance
```

---

## Service-Based Architecture

```python
from python_gitlab_plus import GitLabClient

gitlab_client = GitLabClient(
    gitlab_url="https://gitlab.com",
    access_token="your_access_token",
    project_id="your-project-id"
)

# Each domain has its own service
gitlab_client.project        # project info & members
gitlab_client.branch         # branch lifecycle
gitlab_client.merge_request  # MR workflows
gitlab_client.pipeline       # CI/CD pipelines
gitlab_client.tag            # tag management
gitlab_client.file           # file operations
```

---

## Branch Management

```python
# Create from any base
branch = gitlab_client.branch.create(
    branch_name="feature/new-feature",
    from_branch="main"
)

for branch in gitlab_client.branch.list():
    print(branch.name)

gitlab_client.branch.protect("main")
gitlab_client.branch.delete("feature/old-feature")
```

---

## Merge Request Workflows

Full MR lifecycle management:

```python
# Open MR
mr = gitlab_client.merge_request.create(
    title="Add new feature",
    from_branch="feature/new-feature",
    target="main"
)
print(f"Created MR: !{mr.iid}")

# Assign, comment, approve, merge
gitlab_client.merge_request.assign(mr.iid, "username")
gitlab_client.merge_request.add_comment(mr.iid, "LGTM!")
gitlab_client.merge_request.approve(mr.iid)
gitlab_client.merge_request.merge(mr.iid)
```

---

## Pipeline Operations

Trigger pipelines with variables and block until completion — ideal for deployment automation:

```python
# Trigger with environment variables
pipeline = gitlab_client.pipeline.trigger(
    branch_name="main",
    variables={"ENVIRONMENT": "production"}
)
print(f"Pipeline triggered: {pipeline.id}")

# Check status
status = gitlab_client.pipeline.status(pipeline.id)
print(f"Status: {status}")

# Block until done (with timeout)
final_status = gitlab_client.pipeline.wait_until_finished(
    pipeline.id,
    check_interval=30,
    timeout=3600
)
print(f"Completed: {final_status}")
```

---

## File Operations

Full CRUD for repository files — useful for config management and automated commits:

```python
# Read
content = gitlab_client.file.fetch_content(file_path="README.md", ref="main")

# Create
gitlab_client.file.create(
    file_path="config/feature.yaml",
    branch="feature/new-feature",
    content="enabled: true",
    commit_message="Add feature config"
)

# Update
gitlab_client.file.update(
    file_path="README.md",
    branch="feature/update-docs",
    content="# Updated content",
    commit_message="Update README"
)

# Delete
gitlab_client.file.delete(
    file_path="deprecated.py",
    branch="feature/cleanup",
    commit_message="Remove deprecated file"
)
```

---

## Tag Management

```python
tag = gitlab_client.tag.create(
    tag_name="v1.0.0",
    from_branch="main",
    message="Release version 1.0.0"
)

for tag in gitlab_client.tag.list():
    print(tag.name)

gitlab_client.tag.delete("v0.9.0")
```

---

## Project & Member Management

```python
info = gitlab_client.project.get_info()
print(f"{info.name}: {info.description}")

for member in gitlab_client.project.list_members():
    print(member.username)

gitlab_client.project.add_member("newuser", 30)  # 30 = Developer
gitlab_client.project.remove_member("olduser")
```

---

## Links

- **PyPI**: [pypi.org/project/python-gitlab-plus](https://pypi.org/project/python-gitlab-plus)
- **GitHub**: [github.com/aviz92/python-gitlab-plus](https://github.com/aviz92/python-gitlab-plus)
- **Install**: `pip install python-gitlab-plus`
