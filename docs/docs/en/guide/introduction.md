# Introduction

MailPort turns email sending into an HTTP API. Every sender gets its own endpoint and its own API keys, all managed from a web dashboard, with the data stored in a database of your choice.

## What it does

- **Dashboard** — a password-protected admin UI for creating and managing SMTP, HTTP API, Gmail and Outlook OAuth senders.
- **One endpoint per sender** — `POST /api/{pid}/send`, where `pid` is a random 5–10 character id generated on creation.
- **Multiple keys per sender** — generate 32-character API keys on the settings page and view, enable, disable or revoke them at any time.
- **Recipient domain allowlists** — configured per sender in the dashboard and stored in the database.
- **Multi-database** — PostgreSQL, MongoDB, MySQL/TiDB or SQLite, selected automatically from your environment variables.
- **Send logs** — every request is recorded with status, error and duration.
- **Encrypted credentials** — SMTP passwords, OAuth secrets and API keys are encrypted at rest with AES-256-GCM.
- **Embedded captcha images** — send endpoints can embed captcha images in the email body.

## Quick start

```bash
# Install dependencies
npm install

# Copy the environment template and fill it in
cp .env.example .env

# Start the dev server
npm run dev
```

Open `http://localhost:3000/login` and sign in with `ADMIN_PASSWORD`.

Minimal working configuration (SQLite):

```ini
ADMIN_PASSWORD=your-admin-password
MAILPORT_SECRET=at-least-32-random-characters
SQLITE_PATH=./data
```

## Calling the API

```bash
curl -X POST https://your-app.vercel.app/api/a1b2c3/send \
  -H "Authorization: Bearer <32-char-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"to": "someone@example.com", "subject": "Hi", "text": "Hello from MailPort"}'
```

## Next steps

- [Deployment](./deploy) — deploy to Vercel or your own server.
- [Database Setup](./db-guide) — fetch connection details from Supabase, Neon, MongoDB Atlas and friends, then split them into environment variables.
- [Dashboard Walkthrough](./use) — sign in, create senders, generate keys.
- [API Reference](../reference/api) — send endpoint and error codes.
