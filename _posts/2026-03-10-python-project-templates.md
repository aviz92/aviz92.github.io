---
title: "My Python Project Templates: Clone and Build, Not Configure from Scratch"
date: 2026-03-10 09:00:00 +0200
categories: [Architecture, Python]
tags: [python, templates, fastapi, django, mcp, architecture, devops, best-practices]
description: "A growing collection of production-ready Python project starters — each one encodes the opinionated decisions for a specific domain so you start building, not configuring."
---

Every project starts with the same questions. Where do the environment variables go? How is the CI wired up? Where does the logging config live? What's the folder structure?

## The Foundation: dev-template-repository

Everything starts from [`dev-template-repository`](https://github.com/aviz92/dev-template-repository) — my main base template. It's not a starter for a specific type of project; it's the skeleton every project starts from, regardless of what it does. Pre-commit hooks, CI workflows, IDE config, `env.template`, Go-Task commands, CODEOWNERS — all wired up before a single line of business logic is written.

I covered it in detail in [How I Structure Python Projects](/posts/how-i-structure-python-projects/). Read that first if you haven't.

The specialized templates below all build on top of this foundation. They inherit the base structure and add the domain-specific decisions on top.

## The Philosophy

A template isn't documentation. It's a frozen set of opinions you don't have to revisit. When I clone a template, I'm not asking "how should I structure this?" — that question was answered when the template was built. I'm asking "what am I building?"

Each template here is production-ready on day one: pre-commit hooks, structured logging via `custom-python-logger`, environment variable configuration, and a working example you can run immediately.

## A Few Examples

### FastAPI Template

The FastAPI starter comes with authentication wired up out of the box — register, login, JWT token issuance, and a protected route. Most FastAPI projects need this eventually and it's always the same boilerplate.

Clone it, delete the example routes, and start on your actual endpoints.

→ [github.com/aviz92/fast-api-template](https://github.com/aviz92/fast-api-template)

---

### Django Basic App

Built on top of `drf-easy-crud` and `django-versioned-models` — the same packages I covered in earlier posts. You get enterprise-grade CRUD with advanced filtering, pagination, bulk operations, and versioned data models without wiring any of it up yourself.

The interesting part: most Django projects end up needing all of these within the first few weeks. Starting with them already in place means you're building features on a solid foundation from day one, not retrofitting infrastructure later.

→ [github.com/aviz92/django-basic-app](https://github.com/aviz92/django-basic-app)

---

### Docker MCP Service Template

The most recent addition. As AI coding agents have become part of daily development, the ability to expose custom tools to them via the [Model Context Protocol](https://modelcontextprotocol.io) has become genuinely useful. This template gives you a Dockerized MCP server with a service layer pattern — add a class to `mcp_services/`, register a tool in `server.py`, and your logic is immediately available to Claude Desktop or any MCP-compatible client.

```python
@mcp.tool()
async def get_deployment_status(service_name: str) -> str:
    return await DeploymentService.get_status(service_name)
```

That's all you add. The rest — server lifecycle, Docker build, Claude Desktop config — is already handled.

→ [github.com/aviz92/docker-mcp-service-template](https://github.com/aviz92/docker-mcp-service-template)

---

---

### A Note on ai-agents-marketplace

[`ai-agents-marketplace`](https://github.com/aviz92/ai-agents-marketplace) deserves a mention here even though it's not a project template in the traditional sense. It's a CLI that distributes reusable AI-agent context — skills, plugins, and rules — into any project, rendering each artifact into the native format every supported coding agent expects.

The reason it belongs in this section: if you're building a project and want AI coding agents to have proper context about your codebase, you'd run `agents-marketplace` after cloning your template. It's the last step of the setup flow.

One important usage note: **fork the repo before running it in a project you plan to maintain long-term.** The marketplace ships with a curated set of skills and rules, and new ones get added over time. If you fork it, you can pull upstream changes to get new features while keeping any customizations you've made to the rules for your specific project. Running directly from the original repo works fine for a quick setup, but a fork gives you the ability to sync selectively as the marketplace evolves.

→ [github.com/aviz92/ai-agents-marketplace](https://github.com/aviz92/ai-agents-marketplace)

---

## The Full Collection

The templates above are examples from a growing set. There are also starters for Telegram bots, Slack bots, and more being added over time. Rather than maintain an exhaustive list here that goes stale, the current full collection lives on GitHub:

→ [github.com/aviz92](https://github.com/aviz92?tab=repositories&q=template)

Each repo is a GitHub template — hit **Use this template** and you have a new repository with the full starter, ready to clone.
