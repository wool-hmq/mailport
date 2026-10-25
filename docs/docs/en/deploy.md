# Deployment

MailPort is a standard Next.js app. Deploying to Vercel takes three steps.

## 1. Vercel (recommended)

### Import the repository

On [vercel.com](https://vercel.com), choose **Add New → Project** and import your MailPort repository. It is auto-detected as Next.js; no build settings need changing.

### Create a database

Pick any service offering free PostgreSQL:

- [Neon](https://neon.tech) — 512MB free, serverless-friendly, recommended
- [Supabase](https://supabase.com) — 500MB free
- [Tembo](https://tembo.io) — 10GB free

Collect the connection details (host, port, database name, user, password).

### Add environment variables

Under **Settings → Environment Variables**:

| Variable | Value |
| --- | --- |
| `ADMIN_PASSWORD` | Your dashboard password |
| `MAILPORT_SECRET` | At least 32 random characters |
| `PG_DB` | Database name |
| `PG_USER` | Username |
| `PG_PASSWORD` | Password |
| `PG_HOST` | Database host |
| `PG_PORT` | Port (usually 5432) |
| `PG_SSL` | `true` (usually required by cloud databases) |

Redeploy for the variables to take effect.

### Verify

- Open `https://<your-app>.vercel.app/api/health` — expect `status: "ok"`, `driver: "postgres"`.
- Open `https://<your-app>.vercel.app/login` and sign in with `ADMIN_PASSWORD`.
- Create a sender, generate a key, and run the curl snippet shown on the keys tab.

> Tables are created automatically on the first request — no migration scripts to run.

## 2. Local development

```bash
# Install dependencies
npm install

# Prepare a local database directory (SQLite)
mkdir -p data

# Configure environment
cp .env.example .env
# Edit .env — at minimum:
#   ADMIN_PASSWORD
#   MAILPORT_SECRET (>= 32 chars)
#   SQLITE_PATH=./data

# Start the dev server
npm run dev
```

Open `http://localhost:3000/login`.

## 3. VPS / self-hosted

```bash
# Build and run
npm run build
npm run start

# Or keep it alive with PM2
pm2 start "npm run start" --name mailport
```

SQLite works on a VPS (the filesystem is writable) — point `SQLITE_PATH` at a persistent directory. Put Nginx in front of port 3000.

## Choosing a database

| Scenario | Recommended |
| --- | --- |
| Vercel | PostgreSQL (Neon / Supabase) |
| Access from China | MongoDB Atlas or self-hosted MySQL |
| Local development | SQLite, zero config |
| VPS | Anything; SQLite is simplest |

**Do not use SQLite on Vercel** — serverless functions have a read-only filesystem and writes are lost.

## Reverse proxy notes

When behind Nginx, raise the request body size for larger HTML emails:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    client_max_body_size 10m;
}
```

## Upgrading

```bash
git pull
npm install
npm run build
# restart the process
```

Schema changes are handled by `init()` on startup (`CREATE TABLE IF NOT EXISTS`). Breaking changes ship with a dedicated migration script in the release notes.

## Troubleshooting

**"ADMIN_PASSWORD is not configured" on the login page**
The variable is not set. Check the Vercel project settings and redeploy.

**`/api/health` returns `degraded`**
No database group was detected. Verify the variable names (e.g. `PG_DB`, not `PG_DATABASE`) and that the values are non-empty.

**503 "MAILPORT_SECRET is not configured"**
`MAILPORT_SECRET` is missing or shorter than 32 characters.

**403 "domain is not allowed"**
The sender has a recipient domain allowlist and the recipient's domain is not in it. Add it in the sender's settings, or clear the allowlist (empty means no restriction).

**SMTP fails or times out**
Port 25 is often blocked by cloud providers — use 465 (SSL) or 587 (TLS). Some providers (QQ, 163, Gmail) require an app-specific authorization code rather than the login password.
