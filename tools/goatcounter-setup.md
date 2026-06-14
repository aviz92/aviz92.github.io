# GoatCounter Analytics Setup

## Step 1 — Create a free account

1. Go to https://www.goatcounter.com
2. Click **Sign up**
3. Choose a code — e.g. `aviz92` (this becomes your dashboard URL)
4. Complete signup

## Step 2 — Set your code in `_config.yml`

Find this block (around line 32):

```yaml
goatcounter:
  code: ""
```

Replace with your code:

```yaml
goatcounter:
  code: "aviz92"
```

## Step 3 — Push to GitHub

```bash
git add _config.yml
git commit -m "Enable GoatCounter analytics"
git push
```

GitHub Pages builds with `JEKYLL_ENV=production` automatically — the script activates on deploy. It is silenced locally (`jekyll serve` runs in `development`).

## Step 4 — View your stats

Visit `https://aviz92.goatcounter.com` (or whatever code you chose).

You'll see: page views, referrers, browsers, countries — no cookies, no GDPR banner required.
