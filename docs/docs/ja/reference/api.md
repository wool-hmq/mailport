# API リファレンス

## 送信エンドポイント

```
POST /api/{pid}/send
```

`pid` は送信者作成時に生成される 5〜10 文字のランダムなルート ID です。送信者ごとに専用のエンドポイント、専用のキー、専用の宛先ドメインホワイトリストを持ちます。

### 認証

その送信者に対応する 32 文字の API キーを、以下のいずれかの方法で添付します。

```http
Authorization: Bearer <api-key>
```

または

```http
x-api-key: <api-key>
```

またはクエリパラメータ `?key=<api-key>`（非推奨 — アクセスログに残る可能性があります）。

### リクエストボディ

| フィールド | 必須 | 説明 |
| --- | --- | --- |
| `to` | はい | 宛先アドレス |
| `subject` | はい | 件名 |
| `text` | どちらか 1 つ | 平文本体 |
| `html` | どちらか 1 つ | HTML 本体 |

`text` / `html` のいずれか片方は必須です。

### 例

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

### 成功レスポンス

```json
{
  "success": true,
  "messageId": "<uuid@example.com>"
}
```

### エラー

| ステータス | 意味 |
| --- | --- |
| 400 | 必須フィールドの欠落、宛先アドレスが不正 |
| 401 | キー未指定、またはキーが無効 / 無効化済み |
| 403 | 宛先ドメインがこの送信者のホワイトリストに含まれていない |
| 404 | `pid` が存在しない、または送信者が無効化されている |
| 500 | SMTP 配信に失敗。`details` に根本的なエラーが入ります |
| 503 | データベースまたはマスターシークレットが未設定 |

すべてのエラーは `{ "error": "...", "details"?: "..." }` の形式です。

## Admin API

`/api/admin/**` のすべてのルートは、ログイン時に発行された署名済み Cookie を要求します。なければ 401 を返します。

### セッション

```
POST /api/admin/login     body: { "password": "..." }     → { "success": true }  (Cookie を設定)
POST /api/admin/logout                                      → { "success": true }  (Cookie を削除)
```

### 送信者

```
GET    /api/admin/senders                    → { rows: Sender[], total: number }
POST   /api/admin/senders                    → { sender: Sender, keys: SenderKey[] }
GET    /api/admin/senders/{id}               → { sender: Sender, keys: SenderKey[] }
PUT    /api/admin/senders/{id}               → { sender: Sender }
DELETE /api/admin/senders/{id}               → { success: true }
```

送信者の作成時には、最初の 32 文字キーも自動生成されます。送信者を削除すると、そのキーとログにカスケード削除が行われます。

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

`type` の値:

| 値 | 説明 | 必須フィールド |
| --- | --- | --- |
| `smtp` | アカウント/パスワードによる通常の SMTP | `host` または `service`、`username`、`password` |
| `http` | カスタム HTTP API への転送 | `httpUrl` |
| `outlook_oauth2` | OAuth2 経由の Outlook、SMTP で送信 | `username`、`oauthClientId`、`oauthClientSecret` |
| `gmail_oauth2` | OAuth2 経由の Gmail、SMTP で送信 | `username`、`oauthClientId`、`oauthClientSecret` |

`smtp` タイプでは、`service` に nodemailer の組み込みサービス名（例: `QQ`、`Gmail`、`Outlook`）を指定すると `host` / `port` を省略できます。
[対応プロバイダーの一覧はこちら](https://github.com/nodemailer/nodemailer/blob/master/src/well-known/services.json)。

> レスポンスの `password` / `oauthClientSecret` フィールドは復号された平文で、ダッシュボード表示専用です。外部ログには決して出力しないでください。
> `oauthRefreshToken` は OAuth コールバックが書き込むもので、この API からは設定できません。

### キー

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

### ログと統計

```
GET /api/admin/senders/{id}/logs?limit=50   → { rows: SendLog[], total: number }
GET /api/admin/stats                        → { senders, logs: { total, success, failed } }
```

### テスト送信

```
POST /api/admin/senders/{id}/test  body: { "to": "..." }  → { success: true, messageId }
```

送信者自身の SMTP 設定を使ってテストメールを送ります。宛先ドメインホワイトリストの制約を受けます。

## ヘルスチェック

```
GET /api/health → { status, driver, adminConfigured, secretConfigured, timestamp }
```

認証は不要で、デプロイ後のスモークテストに便利です。
