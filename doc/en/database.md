# Database Schema

MailPort uses three tables (collections in MongoDB). They are created automatically on first request — no manual migration needed.

Field names are identical across databases; the snake_case names below are the relational form.

## `senders` — senders

Each row is an independent SMTP sending channel with its own endpoint, keys, and recipient domain allowlist.

| Field | Type | Description |
| --- | --- | --- |
| `id` | TEXT / VARCHAR(64) | Primary key, UUID |
| `pid` | TEXT, unique | Route id. A random 5–10 char alphanumeric generated on creation, used to build `/api/{pid}/send` |
| `name` | TEXT | Display name, dashboard only |
| `type` | TEXT | Provider type. Currently only `smtp`; `outlook_oauth2` is reserved |
| `enabled` | BOOLEAN | When disabled the endpoint returns 404 |
| `host` | TEXT, nullable | SMTP host. Null when `service` is set |
| `port` | INT, nullable | SMTP port, usually 465 / 587 |
| `secure` | BOOLEAN | Use SSL/TLS |
| `service` | TEXT, nullable | Built-in nodemailer service name, e.g. `QQ`, `Gmail`. Overrides host/port |
| `username` | TEXT, nullable | SMTP login account |
| `password` | TEXT, nullable | SMTP password. **AES-256-GCM encrypted**, decrypted on read |
| `from_address` | TEXT, nullable | From address; falls back to `username` |
| `from_name` | TEXT, nullable | From display name |
| `allowed_domains` | JSON / JSONB | Allowed recipient domains. **An empty array means no restriction** |
| `created_at` | BIGINT | Created, epoch ms |
| `updated_at` | BIGINT | Updated, epoch ms |

Index: unique index on `pid`.

## `sender_keys` — sender API keys

A sender may hold multiple 32-char keys, each independently enabled, disabled, or revoked.

| Field | Type | Description |
| --- | --- | --- |
| `id` | TEXT / VARCHAR(64) | Primary key, UUID |
| `sender_id` | TEXT | Owning sender `id`, cascading delete |
| `key` | TEXT | 32-char random key. **AES-256-GCM encrypted**, viewable in the dashboard |
| `label` | TEXT | Note identifying the caller |
| `enabled` | BOOLEAN | When disabled, requests with this key return 401 |
| `last_used_at` | BIGINT, nullable | Last successful call, epoch ms |
| `created_at` | BIGINT | Created, epoch ms |

Index: `sender_id`.

## `send_logs` — send logs

Every endpoint call is recorded, success or failure.

| Field | Type | Description |
| --- | --- | --- |
| `id` | TEXT / VARCHAR(64) | Primary key, UUID |
| `sender_id` | TEXT | Owning sender `id`, cascading delete |
| `key_id` | TEXT, nullable | Key `id` used for the call |
| `to_addr` | TEXT | Recipient address |
| `subject` | TEXT | Subject |
| `status` | TEXT | `success` or `failed` |
| `error` | TEXT, nullable | Error message on failure |
| `duration` | BIGINT | Elapsed milliseconds |
| `created_at` | BIGINT | Timestamp, epoch ms |

Indexes: `(sender_id, created_at DESC)` compound, `status`.

## Differences by database

| Aspect | PostgreSQL | MySQL / TiDB | MongoDB | SQLite |
| --- | --- | --- | --- | --- |
| Array column | JSONB | JSON | native array | JSON string |
| Timestamps | BIGINT | BIGINT | Long | INTEGER |
| Primary key | TEXT | VARCHAR(64) | `_id` (String) | TEXT |
| Cascade delete | FK | FK | application level | FK |
| Table prefix | none | none | none | none |

For MongoDB, deleting a sender also removes its keys and logs in the same operation, since MongoDB has no foreign keys.

## Security notes

- SMTP passwords and API keys are stored as `v1:`-prefixed AES-256-GCM ciphertext.
- `MAILPORT_SECRET` is the only decryption path and is never written to the database or logs.
- The log table never records message bodies or plaintext keys.
- The health endpoint reports only presence of configuration, never any credentials.
