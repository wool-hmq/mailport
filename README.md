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
| Introduction | [en/guide/introduction.md](./docs/docs/en/guide/introduction.md) | [zh-cn/guide/introduction.md](./docs/docs/zh-cn/guide/introduction.md) |
| Deployment | [en/guide/deploy.md](./docs/docs/en/guide/deploy.md) | [zh-cn/guide/deploy.md](./docs/docs/zh-cn/guide/deploy.md) |
| Database setup | [en/guide/db-guide.md](./docs/docs/en/guide/db-guide.md) | [zh-cn/guide/db-guide.md](./docs/docs/zh-cn/guide/db-guide.md) |
| Dashboard walkthrough | [en/guide/use.md](./docs/docs/en/guide/use.md) | [zh-cn/guide/use.md](./docs/docs/zh-cn/guide/use.md) |
| Environment variables | [en/reference/env.md](./docs/docs/en/reference/env.md) | [zh-cn/reference/env.md](./docs/docs/zh-cn/reference/env.md) |
| Database schema | [en/reference/database.md](./docs/docs/en/reference/database.md) | [zh-cn/reference/database.md](./docs/docs/zh-cn/reference/database.md) |
| API reference | [en/reference/api.md](./docs/docs/en/reference/api.md) | [zh-cn/reference/api.md](./docs/docs/zh-cn/reference/api.md) |
| HTTP API senders | [en/guide/http-sender.md](./docs/docs/en/guide/http-sender.md) | [zh-cn/guide/http-sender.md](./docs/docs/zh-cn/guide/http-sender.md) |
| Outlook / Gmail OAuth | [en/guide/oauth.md](./docs/docs/en/guide/oauth.md) | [zh-cn/guide/oauth.md](./docs/docs/zh-cn/guide/oauth.md) |

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
