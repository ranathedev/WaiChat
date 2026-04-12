# Self-Hosting Guide

WaiChat deploys entirely on Cloudflare's free tier. This guide covers optional configuration for private deployments, including authentication via Cloudflare Access and live model fetching.

---

## One-Click Deploy

The easiest way to self-host WaiChat is via the Deploy to Cloudflare button in the [README](../README.md).

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ranajahanzaib/waichat)

Click the button and Cloudflare handles everything automatically - no CLI, no config files to edit, no manual steps required. Behind the scenes it forks the repo into your GitHub account, provisions a D1 database and Workers AI binding, then builds and deploys the app to `https://waichat.<your-subdomain>.workers.dev`.

---

## Manual Deploy (CLI)

If you prefer to deploy manually:

```bash
git clone https://github.com/ranajahanzaib/waichat.git
cd waichat
pnpm install
pnpm db:migrate:remote   # apply D1 schema to remote database
pnpm deploy:production   # build client and deploy worker
```

Requires a [Cloudflare account](https://dash.cloudflare.com/sign-up) and your `CLOUDFLARE_API_TOKEN` set as an environment variable.

---

## Authentication (Cloudflare Access)

By default, WaiChat is publicly accessible to anyone with the URL. To restrict access to specific users, use Cloudflare Access - free for up to 50 users.

### Setup

**1. Add your site to Cloudflare**

Your `*.workers.dev` subdomain is already on Cloudflare's network, so no additional DNS setup is needed.

**2. Enable Zero Trust**

- Go to [one.dash.cloudflare.com](https://one.dash.cloudflare.com)
- Create a free Zero Trust account if you haven't already

**3. Create an Access Application**

- Go to **Access → Applications → Add an application**
- Select **Self-hosted**
- Fill in:
  - **Application name**: WaiChat
  - **Application domain**: `waichat.<your-subdomain>.workers.dev`
- Click **Next**

**4. Create an Access Policy**

- **Policy name**: Allow users
- **Action**: Allow
- Under **Include**, add a rule:
  - **Selector**: Emails
  - **Value**: your email address (or a list of allowed emails)
- Click **Next** → **Add application**

**5. Test it**

Visit your WaiChat URL. You'll be prompted to authenticate via a one-time email PIN. After verifying, you'll have full access.

### Identity Providers

Instead of email PIN, you can connect Google, GitHub, Microsoft, or any SAML/OIDC provider:

- Go to **Settings → Authentication → Login methods**
- Add your preferred identity provider
- Select it when creating your Access policy

---

## Live Model Fetching (Optional)

By default, WaiChat uses a hardcoded list of Workers AI models. To fetch the live model list directly from Cloudflare's API (so you always see the latest available models), set these secrets:

```bash
wrangler secret put CLOUDFLARE_ACCOUNT_ID
# enter your account ID from dash.cloudflare.com

wrangler secret put CLOUDFLARE_API_TOKEN
# enter an API token with Workers AI Read permission
```

Your account ID is visible in the URL when logged into the Cloudflare dashboard: `dash.cloudflare.com/<account-id>`.

To create a scoped API token:
- Go to **My Profile → API Tokens → Create Token**
- Use the **Read Workers AI** template or create a custom token with `Workers AI: Read` permission

Once set, `/api/models` will return the full live list sorted by recency and capability.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | No | Enables live model fetching from Cloudflare API |
| `CLOUDFLARE_API_TOKEN` | No | Required alongside `CLOUDFLARE_ACCOUNT_ID` |

All other configuration (D1 binding, Workers AI binding) is handled automatically via `wrangler.toml`.

---

## Local Development

```bash
pnpm install
pnpm db:migrate:local    # apply D1 schema locally
pnpm dev:worker          # start Worker on localhost:8787
pnpm dev:client          # start Vite dev server on localhost:5173
```

Add your credentials to `.env.local` for local development:

```bash
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here  # optional, for live models
```

Never commit `.env.local` - it's already in `.gitignore`.
