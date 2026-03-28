---
title: "cast-studio: Turn asciinema Recordings into GIF and MP4"
date: 2026-03-08 10:00:00 +0200
categories: [Backend, DevTools]
tags: [python, asciinema, gif, mp4, ffmpeg, pillow, cli, terminal, demo]
description: "cast-studio converts asciinema .cast files to GIF and MP4 — and ships a demo engine that makes every terminal recording reproducible."
---

After publishing enough packages, you start noticing what you always skip. For me it was the demo GIF — every project had a README, tests, CI, but the terminal recording was either missing, outdated, or recorded once and never touched again. A flag gets renamed, an output format changes, a new command is added — and suddenly the demo is showing something the tool no longer does. Keeping demos accurate across 15+ packages stops being a minor inconvenience and becomes a real maintenance problem.

## Why I Built This

I wanted re-recording to be as simple as running a single command, with the same structure and output every time. The issue isn't the recording tool — `asciinema` is great. The issue is that the recording is a manual, ad-hoc session that nobody remembers how to reproduce. I wanted to commit the demo script alongside the code so that re-recording after a release is one command, not a half-hour of typing into a terminal hoping it looks right.

## Installation

```bash
pip install cast-studio
```
```bash
uv add cast-studio
```

> Requires `ffmpeg` installed on the system.

## Quick Start

Three commands from zero to GIF:

```bash
# 1. Scaffold the demo config into your project
cast-init --dest demo/

# 2. Record the session driven by your config
asciinema rec -c "cast-run demo/demo.cfg" assets/demo/demo.cast

# 3. Render to GIF (or MP4)
cast-render assets/demo/demo.cast assets/demo/demo --gif-only --title "my-library demo"
# → assets/demo/demo.gif
```

## Real-World Example

Here's the `demo.cfg` for `cast-studio` itself — the config that drives its own demo recording:

```bash
# ── project metadata ──────────────────────────────────────────────────────────
PROJECT="cast-studio"
SUBTITLE="Convert asciinema .cast files to GIF and MP4"
INSTALL_CMD="uv add cast-studio"
REPO_URL="github.com/aviz92/cast-studio"
PYPI_URL="pypi.org/project/cast-studio"

# ── timing (seconds) ─────────────────────────────────────────────────────────
PAUSE_INTRO=2
PAUSE_BETWEEN=2
PAUSE_OUTRO=3

# ── runs ──────────────────────────────────────────────────────────────────────
define_runs() {
  add_run \
    "STEP 1 — cast-init  │  scaffold demo scripts into your project" \
    "Creates run_demo.sh (the engine) and demo.cfg (your project config).|One command sets up the full demo recording workflow." \
    "cast-init --dest /tmp/cast-studio-demo --force"

  add_run \
    "STEP 2 — demo.cfg  │  inspect the generated config" \
    "Edit PROJECT, SUBTITLE, INSTALL_CMD, and define_runs().|Add any shell command — pytest, scripts, CLIs — using add_run." \
    "cat /tmp/cast-studio-demo/demo.cfg"

  add_run \
    "STEP 3 — cast-render  │  render a .cast file to GIF" \
    "Renders each frame as a PNG using Pillow (Catppuccin Mocha theme).|Then encodes a high-quality 256-colour GIF via ffmpeg palette pass." \
    "cast-render demo.cast assets/demo --gif-only --title \"cast-studio demo\""

  add_run \
    "STEP 4 — cast-render  │  render to MP4" \
    "H.264/x264 CRF-18 encode — ready for GitHub Releases or Twitter.|Use --hold to extend the last frame so viewers can read the outro." \
    "cast-render demo.cast assets/demo --mp4-only --hold 5.0 --title \"cast-studio demo\""
}
```

You commit `demo.cfg` alongside your code. After the next release, re-recording is:

```bash
asciinema rec -c "cast-run demo/demo.cfg" assets/demo/demo.cast
cast-render assets/demo/demo.cast assets/demo/demo --gif-only --title "my-library demo"
```

Same config. Same structure. Updated output.

## Key Features

The demo engine is the core idea. `demo.cfg` is a shell file that defines every step of your terminal session — what command to run, what title and description to display, how long to pause between steps. `cast-run` executes it to drive the `asciinema` recording. The session isn't typed manually; it's scripted and repeatable. Each `add_run` call adds one step, and multi-line descriptions use `|` as a separator.

`cast-init` scaffolds `demo.cfg` and the runner script into any project with one command — so adding a reproducible demo to an existing package takes minutes, not an afternoon.

The rendering pipeline produces two formats. GIFs use Pillow to render each frame as a PNG with a custom ANSI terminal emulator and the Catppuccin Mocha color scheme, then encode through a two-pass ffmpeg palette for sharp 256-colour output. MP4 is H.264 CRF-18 — high quality, small file, ready for GitHub Releases, Notion, or Slack. Both formats are driven by the same `.cast` file.

```bash
# GIF — default 10 fps, sharp and compact
cast-render demo.cast assets/demo --gif-only --title "my-library demo"

# MP4 — default 30 fps, hold last frame for 5 seconds
cast-render demo.cast assets/demo --mp4-only --hold 5.0 --title "my-library demo"
```

The `cast` unified entry point auto-discovers all sub-commands — `cast render`, `cast init`, `cast --help` — one entry point for everything.

> If you just need a quick one-off GIF and don't care about reproducibility, `agg` is simpler. `cast-studio` is for demos that need to stay accurate across releases.

## Goes Well With

- [`python-base-command`](/posts/python-base-command) — the CLI pattern I use in the libraries that get demoed with this tool
- [`custom-python-logger`](/posts/custom-python-logger) — colored terminal output that looks great in recordings

---

## Links

- **PyPI**: [pypi.org/project/cast-studio](https://pypi.org/project/cast-studio)
- **GitHub**: [github.com/aviz92/cast-studio](https://github.com/aviz92/cast-studio)

A demo that lives in the repo gets updated. One that lives in someone's terminal history doesn't.
