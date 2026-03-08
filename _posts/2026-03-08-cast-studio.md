---
title: "cast-studio: Turn asciinema Recordings into GIF and MP4"
date: 2026-03-08 10:00:00 +0200
categories: [DevTools, Open Source]
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

```bash
asciinema rec -c "cast-run demo/demo.cfg" assets/demo/demo.cast
cast-render assets/demo/demo.cast assets/demo/demo --gif-only
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
