---
title: "cast-studio: Turn asciinema Recordings into GIF and MP4"
date: 2026-03-08 10:00:00 +0200
categories: [DevTools]
tags: [python, asciinema, gif, mp4, ffmpeg, pillow, cli, terminal, demo]
description: "cast-studio converts asciinema .cast files to GIF and MP4 — and ships a demo engine that makes every terminal recording reproducible."
---

After publishing enough packages, you start noticing what you always skip. For me it was the demo GIF — every project had a README, tests, CI, but the terminal recording in the README was either missing, outdated, or recorded once and never touched again.

A GIF is the fastest way to show what a CLI does. But when you maintain 15+ packages and each one changes between releases, keeping those demos accurate stops being a minor inconvenience and becomes a real maintenance problem. A flag gets renamed, an output format changes, a new command is added — and suddenly the demo is showing something the tool no longer does.

I wanted re-recording to be as simple as running a single command, with the same structure and output every time. `cast-studio` is how I solved that.

---

## What It Does

`cast-studio` takes an asciinema `.cast` file and converts it to a high-quality GIF and/or MP4. But the more important part is what it does *before* the recording: it ships a demo engine that lets you define your terminal session in a config file, so every recording is driven by the same script, every time.

The config (`demo.cfg`) is a shell file you commit to your repo. It declares what to run, in what order, with what title and description for each step. When you want to re-record — after a new release, a new feature, a renamed command — you run one command and get the same demo, updated.

### .cfg structure:
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

  add_run \
    "STEP 5 — cast  │  unified runner" \
    "The cast command auto-discovers all sub-commands.|cast render / cast init / cast --help — one entry point for everything." \
    "cast --help"
}
```

### Recording and Rendering commands:
```bash
# Record
asciinema rec -c "bash cast-run demo/demo.cfg" assets/demo/demo.cast
```

```bash
# Render to GIF and MP4
cast-render assets/demo/demo.cast assets/demo/demo --gif-only --title "my-library demo"  # -> `assets/demo/demo.gif`
cast-render assets/demo/demo.cast assets/demo/demo --mp4-only --title "my-library demo"  # -> `assets/demo/demo.mp4`
```

The GIF uses the **Catppuccin Mocha** color scheme, rendered with Pillow through a custom ANSI terminal emulator. Two-pass ffmpeg palette encoding keeps it sharp. The MP4 is H.264 CRF-18, ready to embed in GitHub Releases, Notion, or Slack.

---

## When to Use It

If you maintain Python packages and want a terminal demo that looks professional, lives in the repo, and can be re-recorded in under a minute — `cast-studio` is for that.

If you just need a quick one-off GIF and don't care about reproducibility, `agg` is simpler.

---

## Full Documentation

All configuration options, CLI flags, and examples are in the README on PyPI:

[pypi.org/project/cast-studio](https://pypi.org/project/cast-studio)
