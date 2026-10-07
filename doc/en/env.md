# Environment Variables

MailPort is configured entirely through environment variables. On Vercel, go to **Settings → Environment Variables**; for local development, copy `.env.example` to `.env`.

## Required

| Variable | Description |
| --- | --- |
| `ADMIN_PASSWORD` | Dashboard login password. Use a long random string. |
| `MAILPORT_SECRET` | Master secret. Encrypts SMTP and API keys and signs admin sessions. **At least 32 characters.** Keep it safe; rotating it invalidates all encrypted credentials. |

Without these, login returns 503 and writes fail.

## Database (configure one group)

MailPort auto-detects the driver in this fixed order: **PostgreSQL → MongoDB → MySQL → SQLite**. Configure exactly one group.

### PostgreSQL

Works with [Supabase](https://supabase.com), [Neon](https://neon.tech), [Tembo](https://tembo.io), or self-hosted.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PG_DB` | yes | | Database name |
| `PG_USER` | yes | | Username |
| `PG_PASSWORD` | yes | | Password |
| `PG_HOST` | | `127.0.0.1` | Host |
| `PG_PORT` | | `5432` | Port |
| `PG_SSL` | | `false` | Force SSL |

Aliases also accepted: `POSTGRES_DATABASE`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_SSL`.

### MongoDB

Works with [MongoDB Atlas](https://www.mongodb.com) or self-hosted MongoDB.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `MONGO_DB` | yes | | Database name |
| `MONGO_USER` | | | Username (usually required by self-hosted) |
| `MONGO_PASSWORD` | | | Password |
| `MONGO_HOST` | | `127.0.0.1` | Host. For clusters, use a JSON array like `["h1","h2"]` |
| `MONGO_PORT` | | `27017` | Port. JSON array for clusters |
| `MONGO_REPLICASET` | | | Replica set name. Required with multiple hosts |
| `MONGO_AUTHSOURCE` | | `admin` (when user set) | Auth source |
| `MONGO_OPT_SSL` | | `false` | Atlas requires `true` |

A full `MONGODB_URI` connection string is also accepted and takes precedence over the variables above.

### MySQL / TiDB

Works with self-hosted MySQL, [PlanetScale](https://planetscale.com), [FreeDB](https://freedb.tech). TiDB is wire-compatible — use the MySQL variables.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `MYSQL_DB` | yes | | Database name |
| `MYSQL_USER` | yes | | Username |
| `MYSQL_PASSWORD` | yes | | Password |
| `MYSQL_HOST` | | `127.0.0.1` | Host |
| `MYSQL_PORT` | | `3306` | Port |
| `MYSQL_SSL` | | `false` | Force SSL |

TiDB aliases also accepted: `TIDB_DB`, `TIDB_USER`, `TIDB_PASSWORD`, `TIDB_HOST`, `TIDB_PORT`, `TIDB_SSL`.

### SQLite

Local development and VPS only. **Not usable on Vercel Serverless** (read-only filesystem).

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `SQLITE_PATH` | yes | `./data` | Directory holding the database file |
| `SQLITE_DB` | | `mailport.db` | Database file name |

## Optional

| Variable | Default | Description |
| --- | --- | --- |
| `SITE_LOCALE` | `en` | Default UI locale. Values: `en`, `zh-cn` |
| `SESSION_TTL` | `604800` (7 days) | Admin session lifetime, in seconds |
| `TZ` | `UTC` | Timezone, affects log timestamp rendering |

## UI language

Set `SITE_LOCALE` to choose the dashboard's default language:

| Value | Language |
| --- | --- |
| `en` | English (default) |
| `zh-cn` | Simplified Chinese |

An invalid or missing value falls back to English.

Users can also switch language from the dropdown in the top-right corner of the dashboard. The choice is stored in a cookie that overrides the environment default for one year. To add another language, see the notes in `src/i18n/`.

## Detection order

```
PG_DB / POSTGRES_DATABASE  →  PostgreSQL
MONGO_DB / MONGODB_URI     →  MongoDB
MYSQL_DB / TIDB_DB         →  MySQL
SQLITE_PATH / SQLITE_DB    →  SQLite
```

If none is set, `/api/health` reports `status: "degraded"` and all writes return 503.

## Rotating `MAILPORT_SECRET`

Changing it makes previously encrypted SMTP passwords and API keys undecryptable. To rotate:

1. Change `MAILPORT_SECRET`.
2. Re-enter each sender's SMTP password in the dashboard.
3. Delete old API keys and generate new ones; update callers.

## Post-deploy check

`GET /api/health`:

```json
{
  "status": "ok",
  "driver": "postgres",
  "adminConfigured": true,
  "secretConfigured": true
}
```

`driver: null` or `status: "degraded"` means no database was detected.
