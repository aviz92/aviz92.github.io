---
title: "python-jira-plus: Extended JIRA Client with Pagination, Retries, and Field Validation"
date: 2026-03-05 10:00:00 +0200
categories: [Backend, Python Clients]
tags: [python, jira, automation, project-management, api]
description: "python-jira-plus extends the official jira package with automatic retries, built-in pagination, field validation against JIRA metadata, and cleaner interfaces for issue creation, search, and updates."
---

Working with the JIRA API at scale reveals its rough edges quickly: large queries require manual pagination, transient network errors need retry logic, and custom field validation is entirely on you. Write enough automation scripts against JIRA and you end up with the same three wrappers in every project. `python-jira-plus` handles all of that — giving you a cleaner interface for the operations you run most often, without the boilerplate.

## Why I Built This

I was building a CI pipeline that created JIRA tickets automatically, updated sprint fields, and queried issue status to gate deployments. The official `jira` package is functional but raw — pagination is manual, there's no retry logic, and field validation only fails at the API call, not before it. I extracted my wrappers into a proper package so the next project could start with a working client instead of rebuilding the same plumbing.

## Installation

```bash
pip install python-jira-plus
```
```bash
uv add python-jira-plus
```

## Setup & Configuration

```bash
export JIRA_USER_NAME=your_jira_username
export JIRA_TOKEN=your_jira_api_token
export JIRA_BASE_URL=your-instance.atlassian.net
```

```python
from python_jira_plus.jira_plus import JiraPlus

jira_client = JiraPlus()
```

## Quick Start

Create an issue, search with JQL, update fields — the three operations every automation script needs:

```python
# Create
issue = jira_client.create_issue(
    project_key="PROJ",
    summary="Implement new feature",
    issue_type="Task",
)
print(f"Created: {issue.key}")

# Search
issues = jira_client.get_objects_by_query(
    query="project = PROJ AND status = 'In Progress' ORDER BY created DESC",
    specific_fields=["summary", "status", "assignee"],
    json_result=False,
)

# Update
jira_client.update_issue(
    issue_key="PROJ-123",
    fields_to_update={"summary": "Updated summary"},
)
```

## Real-World Example

Here's how `python-jira-plus` fits into a CI pipeline that creates a ticket when a deployment starts, updates it through the process, and closes it on success:

```python
from python_jira_plus.jira_plus import JiraPlus

jira = JiraPlus()

# Deployment starts — create a tracking ticket
issue = jira.create_issue(
    project_key="OPS",
    summary=f"Deploy service-api v2.0.0 to production",
    description="Automated deployment initiated by CI pipeline.",
    issue_type="Task",
    custom_fields={
        "priority": "High",
        "customfield_10003": {"name": "Sprint 12"},
    },
)
print(f"Tracking ticket: {issue.key}")

# Mid-deployment — update with pipeline status
jira.update_issue(
    issue_key=issue.key,
    fields_to_update={
        "description": "Pipeline running. ETA: 10 minutes.",
        "customfield_10003": {"name": "Sprint 12"},
    },
)

# Deployment done — query to confirm status and close
result = jira.get_issue_by_key(key=issue.key, json_result=False)
print(f"Ticket status: {result.fields.status.name}")
```

Retries happen transparently if the JIRA API rate-limits mid-pipeline. Pagination is automatic if any query returns more than one page. Field values are validated against JIRA metadata before the request goes out — bad field values surface as clear errors locally, not as cryptic API rejections.

## Key Features

Auto-pagination is the feature that matters most for data-heavy workflows. The official client returns paginated results you have to loop through manually. `get_objects_by_query` handles that internally — pass a JQL query, get back all matching issues, no pagination code in your script:

```python
issues = jira_client.get_objects_by_query(
    query="project = PROJ AND status = 'In Progress' ORDER BY created DESC",
    max_results=50,
    specific_fields=["summary", "status", "assignee"],
    json_result=False,
)

for issue in issues:
    print(f"{issue.key}: {issue.fields.summary} — {issue.fields.status.name}")
```

Automatic retries via the `retrying` package handle transient network errors and rate limit responses without any code on your side. Automation scripts that run against JIRA in CI are inherently brittle without this — a single 429 shouldn't fail a deployment.

Field validation checks values against JIRA's metadata before sending the request. Custom fields, allowed values, sprint references — validated locally first, so errors surface early with a clear message rather than after a failed API round-trip.

Custom fields are passed as a flat dict to `create_issue` and `update_issue`, keeping the call site clean regardless of how many fields you're setting:

```python
issue = jira_client.create_issue(
    project_key="PROJ",
    summary="Implement new feature",
    description="This feature will improve performance",
    issue_type="Task",
    custom_fields={
        "priority": "Critical",
        "customfield_10003": {"name": "Sprint 1"},
    },
)
```

## Goes Well With

- [`python-vault`](/posts/python-vault) — store Telegram and Notion tokens in Vault instead of a plain `.env`
- [`python-github-plus`](/posts/python-github-plus) — close Jira tickets automatically when a GitHub PR merges
- [`python-gitlab-plus`](/posts/python-gitlab-plus) — same integration pattern for GitLab pipelines and MRs
- [`custom-python-logger`](/posts/custom-python-logger) — structured logging for every Jira API call in automation scripts

---

## Links

- **PyPI**: [pypi.org/project/python-jira-plus](https://pypi.org/project/python-jira-plus)
- **GitHub**: [github.com/aviz92/python-jira-plus](https://github.com/aviz92/python-jira-plus)

JIRA automation that doesn't break on the third page of results or the first rate limit.
