# MailPort

Turn SMTP into an HTTP API. Each sender gets its own endpoint and API keys — managed from a web dashboard, stored in a database of your choice.

Docs: [English](./en) / [简体中文](./zh-cn)

## What it does

- **Dashboard** — password-protected admin UI to create and manage SMTP senders.
- **One endpoint per sender** — `POST /api/{pid}/send`, where `pid` is a random 5–10 char id generated on creation.
- **Multiple keys per sender** — generate 32-char API keys in the settings page; view, enable, disable, or revoke them any time.
- **Per-sender recipient domain allowlists** — configured per sender in the dashboard, stored in the database.
- **Multi-database** — PostgreSQL, MongoDB, MySQL/TiDB, or SQLite. Picked automatically from your environment variables.
- **Send logs** — every request is recorded with status, error, and duration.
- **Encrypted credentials** — SMTP passwords and API keys are encrypted at rest (AES-256-GCM).

## Quick start

```bash
npm install
cp .env.example .env   # fill in ADMIN_PASSWORD, MAILPORT_SECRET, and one database group
npm run dev
```

Open `http://localhost:3000/login`.

Minimal `.env` for local development (SQLite):

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

## Documentation

| Topic | English | 简体中文 |
| --- | --- | --- |
| Environment variables | [en/env.md](./en/env.md) | [zh-cn/env.md](./zh-cn/env.md) |
| Database schema | [en/database.md](./en/database.md) | [zh-cn/database.md](./zh-cn/database.md) |
| API reference | [en/api.md](./en/api.md) | [zh-cn/api.md](./zh-cn/api.md) |
| Deployment | [en/deploy.md](./en/deploy.md) | [zh-cn/deploy.md](./zh-cn/deploy.md) |

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- nodemailer for SMTP
- Storage adapter layer modeled after Waline's multi-database approach

## Roadmap

- Outlook OAuth2 provider (schema and UI are already reserved as `outlook_oauth2`)
- Additional database adapters

## License

MIT
