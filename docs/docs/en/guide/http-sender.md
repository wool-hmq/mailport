# HTTP API sender

Besides plain SMTP, MailPort supports an "HTTP API" sender type: it forwards the mail request
verbatim to an HTTP endpoint you provide — your own service or a third-party sending platform's webhook.

---

## How it works

You call MailPort's sending endpoint:

```
POST /api/{pid}/send
```

MailPort takes the mail content and, based on your configuration, issues an HTTP request to **your API URL**:

- Method: `POST` by default, configurable
- Headers: `Content-Type: application/json` by default, plus any custom headers you add
- Body: a JSON document carrying the mail content by default, fully customizable

Your service performs the actual delivery and answers; MailPort passes the result back to the caller.

```
your app  →  POST /api/{pid}/send  →  MailPort  →  POST your API URL  →  your service sends
```

---

## Dashboard configuration

When creating a sender, pick **HTTP API** as the delivery method and fill in:

| Field | Required | Description |
| --- | --- | --- |
| Request URL | Yes | Your endpoint, must start with `http://` or `https://` |
| HTTP method | No | `POST` by default; `POST` / `PUT` / `PATCH` / `GET` / `DELETE` |
| Custom headers | No | A JSON object, see below |
| Custom body | No | A template for the mail content, see below |

### Custom headers

Leave empty to send only the default `Content-Type: application/json`. To add headers, provide a
standard JSON object (**line breaks allowed**):

```json
{
  "Authorization": "Bearer your-token-here",
  "X-Source": "mailport",
  "X-Project-Id": "42"
}
```

JSON requires double quotes for keys and strings, and no trailing comma after the last entry.
The format is validated on save — a malformed object is rejected instead of being stored.

### Custom body and placeholders

Leave empty to use the default body:

```json
{
  "to": "{{to}}",
  "subject": "{{subject}}",
  "text": "{{text}}",
  "html": "{{html}}"
}
```

The `{{to}}` notation is a **placeholder**: before sending, MailPort replaces each placeholder with
the actual mail content; placeholders with no matching content become empty strings. Available placeholders:

| Placeholder | Meaning |
| --- | --- |
| `{{to}}` | Recipient address |
| `{{subject}}` | Subject |
| `{{text}}` | Plain-text body |
| `{{html}}` | HTML body |
| `{{from}}` | From address (as configured in the dashboard) |
| `{{from_name}}` | From display name |

If the upstream API expects different field names, edit the template. For example, if it wants `email` and `content`:

```json
{
  "email": "{{to}}",
  "title": "{{subject}}",
  "content": "{{text}}"
}
```

If it wants form-encoded data instead of JSON, change the Content-Type header and write the body in its format:

```
to={{to}}&subject={{subject}}&body={{text}}
```

The body field allows line breaks, which helps with longer templates.

---

## Upstream responses

- A status code below `400` counts as success. MailPort answers the caller with `{ "success": true, "messageId": ... }`.
  The `messageId` is read from the upstream JSON (`messageId` / `message_id` / `id` / `data.id`) when present,
  otherwise it falls back to `http:<status>`.
- A status code `>= 400` counts as failure; the error includes the upstream response body (up to 500 chars) for debugging.
- If the upstream is unreachable, the error states the request to the upstream failed.

Every call, success or failure, is written to the send logs — visible under the "Logs" tab of the sender.

---

## End-to-end example

Suppose you have a sending service at `https://mail.example.com/api/send` that expects:

- Method `POST`
- Header `Authorization: Bearer secret-token`
- Body `{"recipient": "...", "title": "...", "body": "..."}`

Dashboard configuration:

- Request URL: `https://mail.example.com/api/send`
- HTTP method: `POST`
- Custom headers:

  ```json
  {
    "Authorization": "Bearer secret-token"
  }
  ```

- Custom body:

  ```json
  {
    "recipient": "{{to}}",
    "title": "{{subject}}",
    "body": "{{text}}"
  }
  ```

Then call it like any other sender:

```bash
curl -X POST https://your-app.vercel.app/api/{pid}/send \
  -H "Authorization: Bearer <mailport-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"to": "someone@example.com", "subject": "Hi", "text": "Hello"}'
```

MailPort will issue:

```bash
POST https://mail.example.com/api/send
Authorization: Bearer secret-token
Content-Type: application/json

{"recipient": "someone@example.com", "title": "Hi", "body": "Hello"}
```

---

## FAQ

**Why does saving fail with "Custom headers must be a JSON object"?**
Headers must be a JSON object (curly-brace key/value pairs), not an array or a plain string. Check that quotes are balanced and there is no trailing comma.

**My placeholders were sent through unreplaced. Why?**
Placeholders must be written with double braces, e.g. `{{to}}`. Whitespace inside is tolerated (`{{ TO }}` works) and matching is case-insensitive.

**Can I use GET and put the parameters in the query string?**
Yes. Choose `GET`; MailPort does not move template variables into the query for you, so write the placeholders directly into the Request URL, e.g. `https://api.example.com/send?to={{to}}`.

**Are the secrets in custom headers safe?**
They are stored encrypted (AES-256-GCM), like every other credential in MailPort, and never displayed in plaintext afterwards.
