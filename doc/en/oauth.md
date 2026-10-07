# Outlook / Gmail OAuth sending

For Outlook (Microsoft 365) and Gmail mailboxes, MailPort can send via OAuth2 — no app passwords or
IMAP tokens needed in the mailbox itself. After authorization, mail is delivered over SMTP XOAUTH2.

---

## Flow

```
dashboard: Client ID / Secret  →  click "Authorize"  →  provider consent page
   →  callback /api/{pid}/oauth/callback  →  refresh token stored encrypted  →  ready to send
```

When sending, MailPort exchanges the refresh token for an access token and logs in via SMTP XOAUTH2:
Outlook uses `smtp.office365.com:587`, Gmail uses `smtp.gmail.com`.

---

## 1. Register an OAuth application

### Outlook (Microsoft Entra ID / Azure)

1. Open [Azure portal → App registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) and click "New registration".
2. Pick any name; for "Supported account types" choose "Accounts in any organizational directory and personal Microsoft accounts".
3. Under "Redirect URI" select **Web** and paste the **redirect URI** shown on the sender page in the dashboard (e.g. `https://xxx.vercel.app/api/{pid}/oauth/callback`).
4. After registering, the **Application (client) ID** on the Overview page is your Client ID.
5. Under "Certificates & secrets → New client secret", create a secret and **copy its Value** — it is only shown once.

### Gmail (Google Cloud)

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Go to "APIs & Services → Credentials → Create credentials → OAuth client ID", application type **Web application**.
3. Under "Authorized redirect URIs" add the redirect URI shown in the dashboard.
4. Note the **Client ID** and **Client secret**.
5. If prompted to configure the "OAuth consent screen" first, fill in the basic details (in test mode, add your own email as a test user).

> The redirect URI is unique per sender (it contains that sender's `pid`). Always copy it from the sender configuration page.
> The redirect URI must be reachable from the public internet, so `localhost` only works for debugging the flow — deploy to Vercel or similar for real use.

---

## 2. Configure in MailPort

1. Create a sender and choose **Outlook OAuth** or **Gmail OAuth** as the delivery method.
2. Fill in:
   - **Account email**: the mailbox to authorize (e.g. `you@outlook.com`), used for the OAuth login.
   - **Client ID**: from the previous step.
   - **Client Secret**: from the previous step (cannot be viewed again after saving; leave blank to keep unchanged).
3. Click **Authorize** — the configuration is saved first, then you are redirected to the provider's consent page.
4. Sign in with the mailbox and consent.
5. On success you are redirected back to the sender page with a success message.

The authorization status (authorized + date) is shown under the "Settings" tab. From then on, call the endpoint like any other sender:

```bash
curl -X POST https://your-app.vercel.app/api/{pid}/send \
  -H "Authorization: Bearer <mailport-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"to": "someone@example.com", "subject": "Hi", "text": "Hello"}'
```

---

## Re-authorizing

Re-authorize (the "Re-authorize" button — no need to re-enter the configuration) when:

- the refresh token expired or was revoked
- you switched to a different OAuth application (different Client ID/Secret)
- you want to authorize a different mailbox

Outlook refresh tokens are typically long-lived; Gmail tokens lapse after about 7 days of inactivity — just re-authorize when that happens.

---

## Requested scopes

MailPort requests only the minimum needed to send:

| Mailbox | Scope |
| --- | --- |
| Outlook | `https://outlook.office.com/SMTP.Send` + `offline_access` |
| Gmail | `https://mail.google.com/` |

- `offline_access` (Outlook) / `access_type=offline` (Gmail) is what yields a refresh token, required for persistent sending.
- Gmail always sends `prompt=consent` so a fresh refresh token is issued each time.

---

## Security notes

- Client secrets and refresh tokens are encrypted at rest with AES-256-GCM and never echoed back to the frontend.
- The `state` parameter in the callback is signed with `MAILPORT_SECRET` (valid for 10 minutes) to prevent CSRF.
- The callback endpoint is public, but its only capability is writing the authorization token — it never exposes existing credentials.
