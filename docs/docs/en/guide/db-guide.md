# Database Setup

MailPort supports four databases: **PostgreSQL, MongoDB, MySQL / TiDB and SQLite**. The app detects the configured driver in a fixed order — **PostgreSQL → MongoDB → MySQL → SQLite** — so configure exactly one group. The full variable list is in [Environment Variables](../reference/env.html).

This guide answers two questions:

1. **Where to get the connection details** (host, port, database name, username, password).
2. **How to split a connection string into the environment variables MailPort expects**, with a copy-ready example in every section.

> [!IMPORTANT]
> MailPort **does not read `DATABASE_URL`**. Every provider hands out a connection string; you must split it into individual variables using the mapping table in each section.

## 1. PostgreSQL

Works with [Supabase](https://supabase.com), [Neon](https://neon.tech), [Tembo](https://tembo.io) and self-hosted PostgreSQL.

### 1.1 Variable mapping

| Variable | Which part of the connection string | Example |
| --- | --- | --- |
| `PG_HOST` | Hostname after `//`, before `:` | `db.example.com` |
| `PG_PORT` | Port after the hostname | `5432` |
| `PG_USER` | Username after `//` | `myuser` |
| `PG_PASSWORD` | Password after the username | `secret` |
| `PG_DB` | Database name after the last `/` | `mailport` |
| `PG_SSL` | `sslmode=require` in the string → `true` | `true` |

Worked example, connection string:

```
postgresql://myuser:secret@db.example.com:5432/mailport?sslmode=require
```

Environment variables:

```ini
PG_HOST=db.example.com
PG_PORT=5432
PG_USER=myuser
PG_PASSWORD=secret
PG_DB=mailport
PG_SSL=true
```

Aliases: `POSTGRES_DATABASE`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT` and `POSTGRES_SSL` mean the same thing, with `PG_*` taking precedence.

> [!TIP]
> Passwords containing `@`, `:` or `/` are percent-encoded in the connection string (`%40`, `%3A`, …). Put the **raw password** in `PG_PASSWORD` — no percent encoding.

### 1.2 Supabase

**Getting the connection details**: sign in to the [Supabase](https://supabase.com) dashboard → pick your project → **Connect** at the top → **Connection string** → copy the **URI**. The dashboard offers three modes:

| Mode | Connection string shape | Port | When to use |
| --- | --- | --- | --- |
| Session pooler | `postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres` | 5432 | **Recommended** for long-running services |
| Transaction pooler | Same as above with port `6543` | 6543 | Serverless with many short transactions |
| Direct connection | `postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres` | 5432 | Direct access, IPv6-only host |

**Splitting example (Session pooler)**:

```ini
PG_HOST=aws-0-ap-northeast-1.pooler.supabase.com
PG_PORT=5432
PG_USER=postgres.abcdefghijkl
PG_PASSWORD=your-database-password
PG_DB=postgres
PG_SSL=true
```

Things to watch:

- The pooled username **carries the project ref** (`postgres.<project-ref>`), while the direct connection uses plain `postgres`. A wrong username shows up as `password authentication failed for user "postgres"`.
- The direct host `db.<ref>.supabase.co` resolves to IPv6 only. On hosts without IPv6 it never connects — use the pooler host instead.
- Reset the password under **Database → Settings → Reset password**, then update `PG_PASSWORD` on Vercel as well.
- Supabase expects SSL, so keep `PG_SSL=true`.

### 1.3 Neon

**Getting the connection details**: sign in to the [Neon](https://neon.tech) console → select the project → **Dashboard** → **Connection details** (or **Connect** in the top-right corner), then copy the **Pooled connection** or **Direct connection** URI.

```
postgresql://neondb_owner:PASSWORD@ep-xxx-pooler.us-east-2.aws.neon.tech:5432/neondb?sslmode=require
```

**Splitting example**:

```ini
PG_HOST=ep-xxx-pooler.us-east-2.aws.neon.tech
PG_PORT=5432
PG_USER=neondb_owner
PG_PASSWORD=your-password
PG_DB=neondb
PG_SSL=true
```

Things to watch:

- The pooled hostname contains `-pooler`, the direct hostname does not. Never mix them up.
- Neon enforces TLS, so `PG_SSL` must be `true`.
- The default database is `neondb` and the default role is `neondb_owner`. If you created your own role under **Roles**, use that name.
- Use the pooled endpoint for serverless deployments; the direct endpoint has a much lower concurrency ceiling.

### 1.4 Tembo

**Getting the connection details**: sign in to the [Tembo](https://tembo.io) console → open your instance → **Connection details**, then copy the PostgreSQL connection string:

```
postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

**Splitting example**:

```ini
PG_HOST=your-instance-host
PG_PORT=5432
PG_USER=your-user
PG_PASSWORD=your-password
PG_DB=your-database
PG_SSL=true
```

Tembo speaks standard PostgreSQL, so the mapping is identical to the sections above. Tembo's connection documentation currently requires an access code; when in doubt, trust the **Connection details** panel in the console.

### 1.5 Self-hosted PostgreSQL

**Getting the connection details**:

- Local install: run `psql "postgresql://user:pass@localhost:5432/mailport" -c '\conninfo'` and take the host, port, user and database from the output.
- Remote server: read the host address, port, username, password and database name from the server's database panel (aaPanel, DataEase, and similar).
- On the server itself use `127.0.0.1`; in a container setup use the service name (for example `postgres`).

**Splitting example**:

```ini
PG_HOST=127.0.0.1
PG_PORT=5432
PG_USER=mailport
PG_PASSWORD=your-password
PG_DB=mailport
PG_SSL=false
```

Self-hosted servers usually run without SSL, so `PG_SSL=false`; set it to `true` when `ssl = on` is enabled in `postgresql.conf`.

## 2. MongoDB

Works with [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and self-hosted MongoDB.

### 2.1 Variable mapping

| Variable | Description | Default |
| --- | --- | --- |
| `MONGO_DB` | Database name, **required** | |
| `MONGO_USER` | Username | |
| `MONGO_PASSWORD` | Password | |
| `MONGO_HOST` | Hostname. Multiple hosts use a comma-separated list or a JSON array such as `["h1","h2"]` | `127.0.0.1` |
| `MONGO_PORT` | Port. Arrays work the same way | `27017` |
| `MONGO_AUTHSOURCE` | Authentication database | `admin` when a username is set |
| `MONGO_REPLICASET` | Replica set name, **required with multiple hosts** | |
| `MONGO_OPT_SSL` | Enable TLS | `false` |

You can also provide a full connection string:

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | Full connection string. When set, every variable above is ignored (except `MONGO_DB`) |

### 2.2 Self-hosted MongoDB

**Getting the connection details**:

```bash
# Local
mongosh "mongodb://user:pass@127.0.0.1:27017/mailport?authSource=admin"
```

On a remote server, read the host, port, username and password from the server panel. MongoDB ships without authentication enabled, so start it with `--auth` and create a user.

**Splitting example**:

```ini
MONGO_HOST=127.0.0.1
MONGO_PORT=27017
MONGO_USER=mailport
MONGO_PASSWORD=your-password
MONGO_DB=mailport
MONGO_AUTHSOURCE=admin
MONGO_OPT_SSL=false
```

### 2.3 MongoDB Atlas (step by step)

MongoDB Atlas is MongoDB's managed service. The free M0 shared cluster provides roughly 500 MB of storage — plenty for MailPort's sender configuration, API keys and send logs. The walkthrough below assumes a Vercel deployment.

#### Step 1: Register and create a cluster

1. Open the [MongoDB Atlas registration page](https://www.mongodb.com/cloud/atlas/register) and sign up with an email address, a Google account or GitHub.
2. On first login, create an **Organization** and a **Project** (the project name is up to you, `mailport` works).
3. On the project home page click **Create a deployment**, pick the free **M0** cluster on the **Shared** tab and click **Create**.
4. Choose a region close to your backend to lower connection latency. Vercel defaults to the US east coast, so `AWS / N. Virginia (us-east-1)` is a good fit; `AWS / Oregon (us-west-2)` is the safe pick when you are unsure.

#### Step 2: Create a database user

1. In the sidebar open **Security → Database Access** (some interface versions put it under **Project Settings → Database Access**).
2. Click **Add New Database User**:
   - Set **Authentication Method** to `Password`.
   - In **Password Authentication** enter a username, or click **Auto Generate** for a strong password without special characters.
   - Under **Database User Privileges** click **Add Built In Role**, set **Select Role** to `Atlas Admin`, then click **Add User**.
3. Click **Finish and Close**.

![Create a database user](https://twikoo.js.org/assets/mongodb-1.kzmwAvw2.png)

> [!IMPORTANT]
> An auto-generated password is shown only once — copy it into your password manager immediately. A forgotten password can only be reset from the Database Access page.

#### Step 3: Configure the IP access list

1. In the sidebar open **Security → Network Access** (some interface versions put it under **Project Settings → Network Access**).
2. Click **Add IP Address**:
   - **On Vercel / Netlify / Lambda**: the egress IP changes, so put `0.0.0.0/0` in **Access List Entry** to allow connections from anywhere.
   - **On your own VPS**: enter the server's fixed public IP, for example `203.0.113.10/32`.
3. Click **Confirm**.

![Configure the IP access list](https://twikoo.js.org/assets/mongodb-2.wGC2d7_O.png)

> [!WARNING]
> `0.0.0.0/0` lets the whole internet attempt connections; the security of your data then rests entirely on the database user's password. Use a strong password and rotate it as soon as you suspect exposure.

#### Step 4: Copy the connection string

1. In the sidebar open **Database → Clusters** and click **Connect** next to your cluster.
2. Choose **Drivers**, pick **Node.js**, and copy the connection string.
3. Replace `<username>:<password>` with the credentials from step 2.

![Copy the connection string](https://twikoo.js.org/assets/mongodb-3.BlCbBw8p.png)

The SRV connection string looks like this:

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
```

Passwords containing `@`, `:`, `/`, `?`, `#` or `%` must be URL-encoded (`@` becomes `%40`), otherwise the driver fails to parse the URI.

#### Step 5: Fill in the environment variables

Add the variables under **Settings → Environment Variables** in your Vercel project. Pick one of the two approaches — do not mix them.

**Approach A: full connection string (recommended)**

```ini
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority&authSource=admin&ssl=true
MONGO_DB=mailport
```

- Once `MONGODB_URI` is set, `MONGO_HOST`, `MONGO_PORT`, `MONGO_USER`, `MONGO_PASSWORD`, `MONGO_REPLICASET`, `MONGO_AUTHSOURCE` and `MONGO_OPT_SSL` are all ignored.
- The database name comes from `MONGO_DB` (or `MONGODB_DB`); it does not have to appear in the connection string.
- `authSource=admin` authenticates the Atlas Admin user against the `admin` database, which is the Atlas default.

**Approach B: split into individual variables**

In the **Connect** dialog, turn off the **SRV Connection String** toggle and copy the standard connection string:

```
mongodb://<username>:<password>@<cluster>-shard-00-00.<xxxx>.mongodb.net:27017/?ssl=true&replicaSet=atlas-<xxxx>-shard-0&authSource=admin
```

Split it piece by piece:

```ini
MONGO_HOST=ac-xxxx.sh-xx.region.aws.future.mongodb.net
MONGO_PORT=27017
MONGO_USER=your-username
MONGO_PASSWORD=your-password
MONGO_DB=mailport
MONGO_AUTHSOURCE=admin
MONGO_REPLICASET=atlas-xxxx-shard-0
MONGO_OPT_SSL=true
```

> [!TIP]
> `MONGO_HOST` and `MONGO_PORT` accept multiple hosts, comma-separated or as a JSON array such as `["h1","h2"]` and `["27017","27017"]`. With more than one host, `MONGO_REPLICASET` is required.

#### Step 6: Redeploy and verify

1. After saving the variables, click **Redeploy** in your Vercel project — new environment variables only take effect after a redeploy.
2. Request `https://<your-app>.vercel.app/api/health` and confirm the driver is detected as MongoDB:

```json
{
  "status": "ok",
  "driver": "mongodb",
  "adminConfigured": true,
  "secretConfigured": true,
  "timestamp": 1730000000000
}
```

3. Open `https://<your-app>.vercel.app/login`, sign in with `ADMIN_PASSWORD`, create a sender, generate an API key and send a test mail.

> MailPort creates its tables and collections on first write — there is no migration script to run.

#### MongoDB troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `bad auth : Authentication failed` | Wrong username or password; special characters not URL-encoded | Copy the password again and encode special characters as described above |
| `Server selection timed out after 8000 ms` | The egress IP is not on the access list | Add `0.0.0.0/0` or your current public IP under Network Access |
| `Authentication failed` even though the access list allows you | The user belongs to another project | Confirm the Database Access user belongs to the current project |
| Health check says `status: "ok"` but saving fails | The `MONGO_DB` database does not exist or is not writable | Create the database in Atlas Data Explorer, or point `MONGO_DB` at an existing one |
| Nothing can be written after the first deploy | You forgot to redeploy, so the new variables never applied | Trigger a redeploy in Vercel |

## 3. MySQL / TiDB

Works with self-hosted MySQL, [PlanetScale](https://planetscale.com), [FreeDB](https://freedb.tech) and [TiDB Cloud](https://tidbcloud.com). TiDB speaks the MySQL protocol, so the `MYSQL_*` variables apply unchanged.

### 3.1 Variable mapping

| Variable | Which part of the connection string | Example |
| --- | --- | --- |
| `MYSQL_HOST` | Hostname after `//` | `gateway01.xxx.prod.aws.tidbcloud.com` |
| `MYSQL_PORT` | Port after the hostname | `4000` |
| `MYSQL_USER` | Username | `root` |
| `MYSQL_PASSWORD` | Password | `secret` |
| `MYSQL_DB` | Database name | `mailport` |
| `MYSQL_SSL` | Whether the connection uses TLS | `true` |

Worked example:

```
mysql://root:secret@gateway01.xxx.prod.aws.tidbcloud.com:4000/mailport?ssl=true
```

```ini
MYSQL_HOST=gateway01.xxx.prod.aws.tidbcloud.com
MYSQL_PORT=4000
MYSQL_USER=root
MYSQL_PASSWORD=secret
MYSQL_DB=mailport
MYSQL_SSL=true
```

Aliases: `TIDB_DB`, `TIDB_USER`, `TIDB_PASSWORD`, `TIDB_HOST`, `TIDB_PORT` and `TIDB_SSL`, with `MYSQL_*` taking precedence.

### 3.2 TiDB Cloud

**Getting the connection details**: sign in to TiDB Cloud → **Clusters** → click the cluster name → **Connect**, then click **Generate Password** in the dialog (the password is shown only once). The same panel shows host, port, username and password.

```ini
MYSQL_HOST=gateway01.xxx.prod.aws.tidbcloud.com
MYSQL_PORT=4000
MYSQL_USER=root
MYSQL_PASSWORD=generated-password
MYSQL_DB=mailport
MYSQL_SSL=true
```

TiDB Cloud enforces TLS, so `MYSQL_SSL` must be `true`. Create the database first with `CREATE DATABASE` in the **SQL Editor** or from a client.

### 3.3 PlanetScale / FreeDB

**Getting the connection details**: copy the connection string from the console's **Connect** panel and confirm the branch issues username/password credentials (MailPort's MySQL driver authenticates with a standard username and password). Once you have the string, split it using the rules in 3.1.

```ini
MYSQL_HOST=hostname-from-the-connection-string
MYSQL_PORT=3306
MYSQL_USER=username-from-the-console
MYSQL_PASSWORD=password-from-the-console
MYSQL_DB=database-from-the-connection-string
MYSQL_SSL=true
```

### 3.4 Self-hosted MySQL

**Getting the connection details**: run `mysql -u root -p -e "SELECT @@hostname, @@port, CURRENT_USER();"`, or read the host, port, username, password and database name from the server panel.

```ini
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-password
MYSQL_DB=mailport
MYSQL_SSL=false
```

## 4. SQLite

SQLite is a local file database: no connection string, just a writable directory.

| Variable | Description | Default |
| --- | --- | --- |
| `SQLITE_PATH` | Directory holding the database file | `./data` |
| `SQLITE_DB` | Database file name | `mailport.db` |

**Local development**:

```ini
SQLITE_PATH=./data
```

**VPS deployment**: point `SQLITE_PATH` at a persistent directory such as `/var/lib/mailport`, so data survives container rebuilds and directory cleanups.

```ini
SQLITE_PATH=/var/lib/mailport
SQLITE_DB=mailport.db
```

> [!WARNING]
> **The Vercel Serverless filesystem is read-only, so SQLite cannot persist data** — it is lost when the instance is recycled. Use PostgreSQL, MongoDB or MySQL for Vercel deployments.

## 5. Verify the configuration

After saving the variables and redeploying, request `GET /api/health`:

```json
{
  "status": "ok",
  "driver": "postgres",
  "adminConfigured": true,
  "secretConfigured": true,
  "timestamp": 1730000000000
}
```

`driver` shows the active driver: `postgres`, `mongodb`, `mysql` or `sqlite`.

## 6. General troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `status: "degraded"`, `driver: null` | No database variables at all | Configure any one group; detection order is PostgreSQL → MongoDB → MySQL → SQLite, and the first match wins |
| Writes return 503 `No database configured...` | Same as above, or a typo in the variable name | Check `PG_DB` / `MONGO_DB` / `MYSQL_DB` / `SQLITE_PATH` for spelling and non-empty values |
| `PostgreSQL config incomplete: PG_DB/PG_USER ... are required` | Database name or username missing | Fill in `PG_DB` and `PG_USER` |
| `MongoDB config incomplete: MONGO_DB is required` | Database name missing | Fill in `MONGO_DB` |
| `MySQL config incomplete: MYSQL_DB/MYSQL_USER ... are required` | Database name or username missing | Fill in `MYSQL_DB` and `MYSQL_USER` |
| `MongoDB: multiple MONGO_HOST values require MONGO_REPLICASET to be set` | Multiple hosts without a replica set name | Add `MONGO_REPLICASET` |
| `password authentication failed` | Wrong username or password; Supabase pooled users need the project ref | Verify the username in the provider console and update the variables after a password reset |
| `Server selection timed out after 8000 ms` | Network unreachable or IP not allowed | Check the Atlas Network Access list; for self-hosted, check the firewall and `pg_hba.conf` / the MongoDB bind address |
| `MAILPORT_SECRET is not configured or shorter than 32 characters` | Master secret missing or too short | Set `MAILPORT_SECRET` to at least 32 characters |
| Variables do not take effect | Vercel needs a redeploy | Trigger a redeploy in the project page |

> [!TIP]
> Database passwords, SMTP passwords, OAuth secrets and API keys are encrypted with AES-256-GCM inside MailPort, but the connection password still lives as plain text in the hosting platform's environment variables. Use the platform's environment variable feature — never commit credentials to the repository.
