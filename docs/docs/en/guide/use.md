# Dashboard Walkthrough

## 1. Open the site and verify the deployment

1. Open the Vercel project overview, find your deployed MailPort project and click **Visit**. You should land on the dashboard login page.

![Dashboard walkthrough 01](https://pic1.imgdb.cn/i/034lzkuQx87YpVW5qSWAzm.jpg)

![Dashboard walkthrough 02](https://pic1.imgdb.cn/i/034lzqqby4JISJy3FR6ouy.jpg)

2. Request `https://xxxx.vercel.app/api/health` for a health check and use the output to spot anything missing.

① Everything is configured — the database driver is detected and the required variables are present:

```json
{
  "status": "ok",
  "driver": "postgres",
  "adminConfigured": true,
  "secretConfigured": true,
  "timestamp": 1730000000000
}
```

`driver` is the active driver: `postgres`, `mongodb`, `mysql` or `sqlite`. `adminConfigured` and `secretConfigured` both being `true` means the admin password and the master secret are set (`MAILPORT_SECRET` needs at least 32 characters).

② No database configured — `status` is `degraded` and `driver` is `null`:

```json
{
  "status": "degraded",
  "driver": null,
  "adminConfigured": true,
  "secretConfigured": true,
  "timestamp": 1730000000000
}
```

Saving anything in the dashboard returns 503:

```json
{
  "error": "No database configured. Configure one of PG_*, MONGO_*, MYSQL_*, SQLITE_* in environment variables."
}
```

Configure any one group of database variables — see [Database Setup](./db-guide).

③ Other common errors:

| Error | Cause | Fix |
| --- | --- | --- |
| `{"error":"ADMIN_PASSWORD is not configured on the server."}` (503) | `ADMIN_PASSWORD` is not set | Add the variable on the hosting platform and redeploy |
| `{"error":"Invalid password."}` (401) | The password does not match `ADMIN_PASSWORD` | Check the environment variable value |
| `{"error":"MAILPORT_SECRET is not configured or shorter than 32 characters."}` (503) | Master secret missing or too short | Set `MAILPORT_SECRET` to at least 32 characters |
| `PostgreSQL config incomplete: PG_DB/PG_USER (or POSTGRES_*) are required.` | Database name or user missing | Fill in `PG_DB` and `PG_USER` |
| `MongoDB config incomplete: MONGO_DB is required.` | Database name missing | Fill in `MONGO_DB` |
| `password authentication failed` / `bad auth : Authentication failed` | Wrong username or password | Verify the credentials in the provider console, then update the environment variables |
| `Server selection timed out after 8000 ms` | Network unreachable or IP not allowed | Check the Atlas Network Access list; for self-hosted, check the firewall and allowlist |

The full troubleshooting table lives in [Database Setup](./db-guide#general-troubleshooting).

## 2. Sign in

Use the `ADMIN_PASSWORD` you configured as the password. See [Environment Variables → Required](../reference/env.html#required).

Click **Sign in**. With the correct password you land in the admin panel.

![Dashboard walkthrough 03](https://pic1.imgdb.cn/i/034m0QJLVk45W3JboxMD7E.jpg)

## 3. Manage senders

1. Click **New sender**.
2. Fill in the form and click **Create**.

> [!Note]
> OAuth sender setup: [Outlook / Gmail OAuth senders](./oauth)
> HTTP API sender setup: [HTTP API senders](./http-sender)

3. You are redirected to that sender's settings (keys) page.

![Dashboard walkthrough 04](https://pic1.imgdb.cn/i/034m0YvyLuWsC77p3Fqbil.jpg)

4. On the keys page you can create new keys, or disable and delete existing ones.

> [!IMPORTANT]
> Never leak your keys. Anyone holding a key plus your endpoint URL can send bulk mail through your sender, including spam.
> Hard-coding keys in source code counts as leaking them.
> The project author accepts no liability for abuse caused by leaked keys or endpoints.

5. On the settings page you can review the sender configuration, the allowed recipient domains, and run a send test. You can also edit the configuration there.

6. On the logs page you can review call history. Failures record the error reason as well.

![Dashboard walkthrough 05](https://pic1.imgdb.cn/i/034m0sTGCDdbtsKgticzTx.jpg)
