![Cover](./docs/docs/public/mailport-logo.png)

# MailPort

Turn email sending into an HTTP API. Each sender gets its own endpoint and API keys — managed from a web dashboard, stored in a database of your choice.

Docs: [English](https://mailport.lab.j3.ink/en/) / [简体中文](https://mailport.lab.j3.ink/)

## What it does

- **Dashboard** — password-protected admin UI to create and manage SMTP / HTTP API / Gmail and Outlook OAuth senders.
- **One endpoint per sender** — `POST /api/{pid}/send`, where `pid` is a random 5–10 char id generated on creation.
- **Multiple keys per sender** — generate 32-char API keys in the settings page; view, enable, disable, or revoke them any time.
- **Per-sender recipient domain allowlists** — configured per sender in the dashboard, stored in the database.
- **Multi-database** — PostgreSQL, MongoDB, MySQL/TiDB, or SQLite. Picked automatically from your environment variables.
- **Send logs** — every request is recorded with status, error, and duration.
- **Encrypted credentials** — SMTP passwords, OAuth secrets, and API keys are encrypted at rest (AES-256-GCM).

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
| Environment variables | [en/env.md](./docs/docs/en/env.md) | [zh-cn/env.md](./docs/docs/zh-cn/env.md) |
| Database schema | [en/database.md](./docs/docs/en/database.md) | [zh-cn/database.md](./docs/docs/zh-cn/database.md) |
| API reference | [en/api.md](./docs/docs/en/api.md) | [zh-cn/api.md](./docs/docs/zh-cn/api.md) |
| HTTP API senders | [en/http-sender.md](./docs/docs/en/http-sender.md) | [zh-cn/http-sender.md](./docs/docs/zh-cn/http-sender.md) |
| Outlook / Gmail OAuth | [en/oauth.md](./docs/docs/en/oauth.md) | [zh-cn/oauth.md](./docs/docs/zh-cn/oauth.md) |
| Deployment | [en/deploy.md](./docs/docs/en/deploy.md) | [zh-cn/deploy.md](./docs/docs/zh-cn/deploy.md) |

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- nodemailer for SMTP (including XOAUTH2 for Outlook / Gmail)
- Storage adapter layer modeled after Waline's multi-database approach

## Roadmap

- Additional database adapters

## Star History

<a href="https://www.star-history.com/?repos=wool-hmq%2Fmailport&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=wool-hmq/mailport&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=wool-hmq/mailport&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=wool-hmq/mailport&type=date&legend=top-left" />
 </picture>
</a>

## License

MIT
