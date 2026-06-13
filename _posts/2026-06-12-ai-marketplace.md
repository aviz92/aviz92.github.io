---
title: "ai-marketplace: Author AI Agent Context Once, Render It for Every Coding Agent"
date: 2026-06-12 00:00:00 +0200
categories: [AI, DevTools]
tags: [ai, cli, automation, python, devtools]
description: "agents-marketplace is an interactive CLI that distributes reusable AI-agent context — skills, plugins, and rules — into any project, rendering each artifact into the native format every supported AI coding agent expects. Author once, render many."
---

Every AI coding agent wants its context in a different place and a different shape. Cursor reads `.cursor/rules/*.mdc` with `globs` and `alwaysApply` frontmatter. Copilot wants `.github/instructions/*.instructions.md` with an `applyTo` field. Claude Code, Codex, and Gemini each expect their own rules directory and their own top-level instructions file. The moment you work across more than one agent — or a team does — you end up hand-maintaining the same guidance in five incompatible formats, and they drift apart immediately.

`ai-marketplace` solves that with a single principle: **author once, render many.** It ships an interactive CLI (`agents-marketplace`) that distributes three kinds of reusable agent context — **skills** 🧠, **plugins** 🔌, and **rules** 📏 — into any project, rendering each artifact into the native format every supported agent actually reads.

---

## The core idea

There are two distribution problems, and the tool treats them differently:

- **Skills and plugins are universal.** You author them once and install them into shared open-standard directories (`.claude/skills/`, `.agents/skills/`) that many agents already read natively. No per-agent rendering needed.
- **Rules are agent-specific.** Each agent has its own rules format, frontmatter, and location. So one authored rule is rendered into up to **five native formats** at install time — Cursor MDC, Copilot instructions, and Markdown-plus-frontmatter for Claude, Codex, and Gemini.

That split is the whole design. The universal artifacts ride on conventions that already exist; the fragmented ones get a render pipeline so you never write the same rule five times.

## Quick start

### 1. Fork the repo

Start by forking [`ai-marketplace`](https://github.com/aviz92/ai-marketplace) on GitHub. This gives you your own catalog — you can add your own skills and rules, customize existing ones, and still pull upstream when new artifacts are added. Running directly from the original repo works for a quick try, but a fork is the right setup for anything you plan to maintain.

### 2. Add your own skills and rules

The catalog lives in `skills/`, `rules/`, and `plugins/` at the repo root. Drop in a directory with a `metadata.yaml` and a `skill.md` (or `rule.md`) and it shows up in the picker automatically. The authoring format is covered in detail [below](#authoring-your-own-artifacts).

### 3. Run the CLI

From the root of any project you want to set up:

```bash
uvx --from git+https://github.com/<your-fork>/ai-marketplace agents-marketplace
```

The TUI walks you through the rest:

1. Pick artifacts from the catalog (it shows installed status and available updates).
2. Review which AI tools were detected in your project and on your system.
3. Pick install targets — pre-checked based on that detection.
4. Confirm, and files are rendered and written into your project.
5. Optionally save your selection to `agents-marketplace.yaml` for team sync.

## What actually gets written

This is the part that makes the "render many" claim concrete. A universal skill lands once per skill target; a single rule fans out across every agent format you selected:

| Target dir              | Format                              | Written file           | Agents covered                          |
| ----------------------- | ----------------------------------- | ---------------------- | --------------------------------------- |
| `.claude/skills/`       | Universal skill                     | `<id>/SKILL.md`        | Claude Code, GitHub Copilot             |
| `.agents/skills/`       | Universal skill                     | `<id>/SKILL.md`        | Cursor, Copilot, Codex, Gemini, Windsurf, Cline, and more |
| `.cursor/rules/`        | Cursor MDC (`globs`, `alwaysApply`) | `<id>.mdc`             | Cursor                                  |
| `.github/instructions/` | Copilot instructions (`applyTo`)    | `<id>.instructions.md` | GitHub Copilot                          |
| `.claude/rules/`        | Markdown + frontmatter              | `<id>.md`              | Claude Code                             |
| `.codex/rules/`         | Markdown + frontmatter              | `<id>.md`              | Codex CLI                               |
| `.gemini/rules/`        | Markdown + frontmatter              | `<id>.md`              | Gemini CLI                              |

Agents that read a single top-level instructions file — rather than auto-discovering a rules directory — get a **reference injected idempotently**, so it's never duplicated on re-run: Claude rules append a note to `.claude/CLAUDE.md` or `AGENTS.md`, Codex appends to `AGENTS.md`, and Gemini appends to `GEMINI.md` (each created if missing). Cursor and Copilot auto-discover their directories, so they need no reference file.

## Team sync

This is where the tool earns its keep on a team. Commit an `agents-marketplace.yaml` to your project root — think of it like VS Code's `.vscode/extensions.json` — and every teammate gets the same agent setup after cloning, with no install step:

```bash
uvx --from git+https://github.com/aviz92/ai-marketplace agents-marketplace sync
```

The manifest is small and readable:

```yaml
# agents-marketplace.yaml
skills:
  - python-code-review
  - pre-push-checklist
rules: all                # 'all' installs every rule in the catalog
plugins: []
targets:                  # optional — defaults to detected agents
  skills: [claude, agents]
  rules: [cursor, claude]
```

A few details that matter in practice:

- `skills` / `plugins` / `rules` accept a list of artifact ids, or the string `all`.
- `targets` is optional — when omitted, sync installs to the agents it detects, falling back to `.agents/skills` plus all rule formats when nothing is detected.
- Unknown ids are reported and skipped; sync still installs the rest but **exits non-zero so CI can catch drift.** That last bit is what turns the manifest into a real guardrail rather than a suggestion.

The easiest way to produce the file is to run the interactive TUI once and answer **yes** to "Save installed state to `agents-marketplace.yaml`?" at the end. The saved manifest is a snapshot of everything currently installed — all targets, not just your latest selection — so re-saving never silently drops previously installed artifacts.

## Authoring your own artifacts

The authoring format is deliberately boring, which is the point. A skill is a directory with two files:

```yaml
# skills/<skill-id>/metadata.yaml
name: Human Readable Name
description: One-line description shown in the picker
tags: [optional, tags]
author: your-name
version: 1.0.0
```

```markdown
<!-- skills/<skill-id>/skill.md -->
# What this skill does
Platform-agnostic markdown instructions...
```

It installs as `<target>/<skill-id>/SKILL.md` in every selected skill target. A skill can also bundle extra files — say `assets/template.md` — next to its `skill.md`; they're copied as-is with relative paths preserved, so links like `[template.md](assets/template.md)` keep working after install. **Plugins are identical**, just under `plugins/<plugin-id>/` with the body in `plugin.md`.

Rules add two metadata keys that the per-agent renderers consume:

```yaml
# rules/<rule-id>/metadata.yaml
name: Human Readable Name
description: One-line description
tags: [optional]
author: your-name
version: 1.0.0
globs: ["src/**/*.py"]   # Cursor `globs` / Copilot `applyTo`
alwaysApply: true        # Cursor: rule is always active
```

That one authored rule produces the `.mdc`, `.instructions.md`, and three `.md` variants automatically.

## Versioning that drives the update prompt

There's no separate update database — versioning is baked into the rendered output. Bump `version` in `metadata.yaml` on **any** change, and because every rendered file embeds `version:` in its frontmatter, the CLI compares that field on the next run to decide whether to show `↻ Update` or `✓ Installed`. Simple, self-contained, and impossible to forget to wire up.

---

## Why I built it

I maintain a growing set of reusable agent context — code-review skills, a pre-push checklist, Python and infrastructure rules — and I want the same guidance applied whether I'm in Claude Code on one machine or Cursor on another, and whether a teammate just cloned the repo or has been on it for months. Hand-syncing five formats doesn't scale, and copy-paste drift quietly erodes the value of having written the rules at all.

`ai-marketplace` makes the authored artifact the single source of truth and pushes the per-agent fragmentation down into a render step where it belongs. Author once, render many — and let a committed manifest plus a non-zero CI exit keep the whole team honest.

The project is [on GitHub](https://github.com/aviz92/ai-marketplace) under an MIT license. `uvx --from git+https://github.com/aviz92/ai-marketplace agents-marketplace` is the fastest way to try it.
