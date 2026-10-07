# API Reference

## Send endpoint

```
POST /api/{pid}/send
```

`pid` is the random 5–10 char route id generated when the sender is created. Every sender has its own endpoint, its own keys, and its own recipient domain allowlist.

### Authentication

Carry a 32-char API key for that sender in any of these places:

```http
Authorization: Bearer <api-key>
```

or

```http
x-api-key: <api-key>
```

or the query parameter `?key=<api-key>` (not recommended — it may end up in access logs).

### Request body

| Field | Required | Description |
| --- | --- | --- |
| `to` | yes | Recipient address |
| `subject` | yes | Subject |
| `text` | one of the two | Plain-text body |
| `html` | one of the two | HTML body |

At least one of `text` / `html` is required.

### Example

```bash
curl -X POST https://your-app.vercel.app/api/a1b2c3/send \
  -H "Authorization: Bearer AbCdEfGh1234567890AbCdEfGh1234567890" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "someone@example.com",
    "subject": "Hello",
    "text": "Sent via MailPort."
  }'
```

### Success response

```json
{
  "success": true,
  "messageId": "<uuid@example.com>"
}
```

### Errors

| Status | Meaning |
| --- | --- |
| 400 | Missing required fields, invalid recipient address |
| 401 | No key provided, or the key is invalid / disabled |
| 403 | The recipient domain is not in this sender's allowlist |
| 404 | `pid` does not exist or the sender is disabled |
| 500 | SMTP delivery failed; `details` carries the underlying error |
| 503 | Database or master secret not configured |

All errors follow `{ "error": "...", "details"?: "..." }`.

## Admin API

Every `/api/admin/**` route requires the signed cookie issued by login; otherwise it returns 401.

### Sessions

```
POST /api/admin/login     body: { "password": "..." }     → { "success": true }  (sets cookie)
POST /api/admin/logout                                      → { "success": true }  (clears cookie)
```

### Senders

```
GET    /api/admin/senders                    → { rows: Sender[], total: number }
POST   /api/admin/senders                    → { sender: Sender, keys: SenderKey[] }
GET    /api/admin/senders/{id}               → { sender: Sender, keys: SenderKey[] }
PUT    /api/admin/senders/{id}               → { sender: Sender }
DELETE /api/admin/senders/{id}               → { success: true }
```

Creating a sender also generates its first 32-char key. Deleting a sender cascades to its keys and logs.

`Sender`:

```json
{
  "id": "uuid",
  "pid": "a1b2c3",
  "name": "My blog mailer",
  "type": "smtp",
  "enabled": true,
  "host": "smtp.example.com",
  "port": 465,
  "secure": true,
  "service": null,
  "username": "user@example.com",
  "fromAddress": "noreply@example.com",
  "fromName": "My Blog",
  "allowedDomains": ["example.com"],
  "httpUrl": null,
  "httpMethod": null,
  "httpHeaders": null,
  "httpBody": null,
  "oauthClientId": null,
  "oauthAuthorizedAt": null,
  "createdAt": 1735000000000,
  "updatedAt": 1735000000000
}
```

`type` values:

| Value | Description | Required fields |
| --- | --- | --- |
| `smtp` | Plain SMTP with account/password | `host` or `service`, `username`, `password` |
| `http` | Forward to a custom HTTP API | `httpUrl` |
| `outlook_oauth2` | Outlook via OAuth2, sent over SMTP | `username`, `oauthClientId`, `oauthClientSecret` |
| `gmail_oauth2` | Gmail via OAuth2, sent over SMTP | `username`, `oauthClientId`, `oauthClientSecret` |

For the `smtp` type, `service` is a built-in nodemailer service name (e.g. `QQ`, `Gmail`, `Outlook`) that lets you skip `host` / `port`.
See [all supported providers here](https://github.com/nodemailer/nodemailer/blob/master/src/well-known/services.json).

> The `password` / `oauthClientSecret` fields in responses are decrypted plaintext, meant for dashboard display only — never log them externally.
> `oauthRefreshToken` is written by the OAuth callback and cannot be set through this API.

### Keys

```
GET    /api/admin/senders/{id}/keys                          → { keys: SenderKey[] }
POST   /api/admin/senders/{id}/keys  body: { "label"?: "..." } → { key: SenderKey }
PATCH  /api/admin/senders/{id}/keys/{keyId} body: { "label"?, "enabled"? } → { key: SenderKey }
DELETE /api/admin/senders/{id}/keys/{keyId}                  → { success: true }
```

`SenderKey`:

```json
{
  "id": "uuid",
  "senderId": "uuid",
  "key": "32-char-plain-key",
  "label": "production",
  "enabled": true,
  "lastUsedAt": 1735000000000,
  "createdAt": 1735000000000
}
```

### Logs and stats

```
GET /api/admin/senders/{id}/logs?limit=50   → { rows: SendLog[], total: number }
GET /api/admin/stats                        → { senders, logs: { total, success, failed } }
```

### Test send

```
POST /api/admin/senders/{id}/test  body: { "to": "..." }  → { success: true, messageId }
```

Sends a test email through the sender's own SMTP configuration, subject to its domain allowlist.

## Health check

```
GET /api/health → { status, driver, adminConfigured, secretConfigured, timestamp }
```

No auth required; useful as a post-deploy smoke test.
