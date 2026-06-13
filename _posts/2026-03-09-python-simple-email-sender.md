---
title: "python-simple-email-sender: Send Emails from Python Without the Boilerplate"
date: 2026-03-09 09:00:00 +0200
categories: [Backend, Core Foundations]
tags: [python, email, smtp, automation, devops, notifications]
description: "python-simple-email-sender wraps Python's SMTP stack into a single send_email() call — credentials from env vars, optional attachments, zero boilerplate."
---

Sending an email from Python shouldn't require knowing the difference between `MIMEMultipart`, `MIMEText`, and `MIMEApplication`. But it does — unless you've done it before, every time feels like archaeology through the stdlib docs.

I needed email notifications in several automation scripts: pipeline failures, scheduled report delivery, monitoring alerts. The code was always the same fifteen lines. So I packaged it.

## Why I Built This

The Python `smtplib` + `email.mime` stack works fine but it's verbose for something conceptually simple. You want to send an email — you shouldn't need to construct a MIME tree to do it. `python-simple-email-sender` reduces it to one call with sensible defaults.

## Installation

```bash
pip install python-simple-email-sender
```
```bash
uv add python-simple-email-sender
```

## Setup

Credentials come from environment variables — no hardcoded passwords:

```bash
export EMAIL_ADDRESS="your.email@gmail.com"
export EMAIL_PASSWORD="your-app-password"
```

For Gmail, use an App Password rather than your account password if you have 2FA enabled. Generate one at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).

## Usage

```python
from python_simple_email_sender import EmailSender

sender = EmailSender()

sender.send_email(
    to_email=["team@company.com"],
    subject="Nightly pipeline complete",
    message="All 1,204 tests passed. Report attached.",
    attachment_file="reports/nightly.pdf"
)
```

That's the whole interface. `to_email` accepts a string or a list. `attachment_file` is optional. Credentials are picked up from the environment automatically.

For a non-Gmail SMTP server, pass `server_name` and `server_port`:

```python
sender = EmailSender(server_name="smtp.company.com", server_port=587)
```

## Real-World Use Case

In CI pipelines and scheduled automation scripts, email is often the simplest reliable notification channel — no Slack bot to configure, no webhook endpoint to maintain. Here's how I use it for a nightly report script:

```python
from python_simple_email_sender import EmailSender

def send_nightly_report(report_path: str, recipients: list[str]) -> None:
    sender = EmailSender()
    sender.send_email(
        to_email=recipients,
        subject="[Nightly] Infrastructure Health Report",
        message="Automated report attached. Contact the infra team for questions.",
        attachment_file=report_path,
    )
```

One function, one import, works anywhere Python runs.

---

## Links

- **PyPI**: [pypi.org/project/python-simple-email-sender](https://pypi.org/project/python-simple-email-sender)
- **GitHub**: [github.com/aviz92/python-simple-email-sender](https://github.com/aviz92/python-simple-email-sender)

If you've typed `MIMEMultipart()` more than twice in your life, you don't need to type it again.
