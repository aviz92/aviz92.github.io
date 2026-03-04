---
title: "python-jira-plus: Extended JIRA Client with Pagination, Retries, and Field Validation"
date: 2026-03-05 10:00:00 +0200
categories: [Backend, DevOps]
tags: [python, jira, automation, project-management, api]
description: "python-jira-plus extends the official jira package with automatic retries, built-in pagination, field validation against JIRA metadata, and cleaner interfaces for issue creation, search, and updates."
---

Working with the JIRA API at scale reveals its rough edges quickly: large queries require manual pagination, transient errors need retry logic, and custom field validation is entirely on you. `python-jira-plus` handles all of that — giving you a cleaner interface for the operations you run most often.

## Installation

```bash
pip install python-jira-plus
```

## Configuration

```bash
export JIRA_USER_NAME=your_jira_username
export JIRA_TOKEN=your_jira_api_token
export JIRA_BASE_URL=your-instance.atlassian.net
```

---

## What It Adds Over the Official Package

| Feature | Official `jira` | `python-jira-plus` |
|---------|-----------------|-------------------|
| Automatic retries | ❌ | ✅ |
| Built-in pagination | ❌ manual | ✅ automatic |
| Field validation against metadata | ❌ | ✅ |
| Allowed values validation | ❌ | ✅ |
| Comprehensive logging | ❌ | ✅ |

---

## Creating Issues

Create issues with custom fields cleanly — field values are validated against JIRA metadata before the request is sent:

```python
from python_jira_plus.jira_plus import JiraPlus

jira_client = JiraPlus()

issue = jira_client.create_issue(
    project_key="PROJ",
    summary="Implement new feature",
    description="This feature will improve performance",
    issue_type="Task",
    custom_fields={
        "priority": "Critical",
        "customfield_10003": {"name": "Sprint 1"}
    }
)
print(f"Created: {issue.key}")
```

---

## Searching with Auto-Pagination

Large JQL queries return all results automatically — no manual page handling:

```python
issues = jira_client.get_objects_by_query(
    query="project = PROJ AND status = 'In Progress' ORDER BY created DESC",
    max_results=50,
    specific_fields=["summary", "status", "assignee"],
    json_result=False
)

for issue in issues:
    print(f"{issue.key}: {issue.fields.summary} — {issue.fields.status.name}")
```

---

## Updating Issues

Fetch by key and update any fields — including custom fields and sprints:

```python
issue = jira_client.get_issue_by_key(key="PROJ-123", json_result=False)

jira_client.update_issue(
    issue_key=issue.key,
    fields_to_update={
        "summary": "Updated summary",
        "description": "Updated description",
        "customfield_10003": {"name": "Sprint 2"},
    }
)
```

---

## Automatic Retries

Transient network errors and rate limits are retried automatically using the `retrying` package — your automation scripts stay resilient without extra boilerplate.

---

## Links

- **PyPI**: [pypi.org/project/python-jira-plus](https://pypi.org/project/python-jira-plus)
- **GitHub**: [github.com/aviz92/python-jira-plus](https://github.com/aviz92/python-jira-plus)
- **Install**: `pip install python-jira-plus`
