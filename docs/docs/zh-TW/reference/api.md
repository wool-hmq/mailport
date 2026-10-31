# API 介面 / API Reference

## 公開寄件介面

```
POST /api/{pid}/send
```

`pid` 是寄件商建立時隨機生成的 5–10 位路由標識。每個寄件商有獨立的介面地址、獨立的金鑰與收件域名白名單。

### 鑑權

在以下任一位置攜帶該寄件商的 32 位 API 金鑰:

```http
Authorization: Bearer <api-key>
```

或

```http
x-api-key: <api-key>
```

或 query 引數 `?key=<api-key>`(不推薦,可能被日誌記錄)。

### 請求體

| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| `to` | 是 | 收件人地址 |
| `subject` | 是 | 郵件主題 |
| `text` | 二選一 | 純文字正文 |
| `html` | 二選一 | HTML 正文 |

`text` 與 `html` 至少傳一個;都傳時客戶端按型別展示。

### 請求示例

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

### 成功響應

```json
{
  "success": true,
  "messageId": "<uuid@example.com>"
}
```

### 錯誤響應

| 狀態碼 | 含義 |
| --- | --- |
| 400 | 缺少必填欄位、收件地址格式無效 |
| 401 | 未提供金鑰或金鑰無效/已禁用 |
| 403 | 收件域名不在該寄件商的白名單內 |
| 404 | `pid` 不存在或寄件商已禁用 |
| 500 | 傳送失敗,`details` 為底層錯誤 |
| 503 | 伺服器未設定資料庫或主金鑰 |

所有錯誤響應格式為 `{ "error": "...", "details"?: "..." }`。

## 管理端介面

所有 `/api/admin/**` 介面需要登入後的簽名 Cookie,未登入返回 401。

### 會話

```
POST /api/admin/login     body: { "password": "..." }     → { "success": true }  (下發 Cookie)
POST /api/admin/logout                                      → { "success": true }  (清除 Cookie)
```

### 寄件商

```
GET    /api/admin/senders                    → { rows: Sender[], total: number }
POST   /api/admin/senders                    → { sender: Sender, keys: SenderKey[] }
GET    /api/admin/senders/{id}               → { sender: Sender, keys: SenderKey[] }
PUT    /api/admin/senders/{id}               → { sender: Sender }
DELETE /api/admin/senders/{id}               → { success: true }
```

新增寄件商時會自動生成首個 32 位金鑰。刪除寄件商會級聯刪除其全部金鑰與日誌。

`Sender` 欄位:

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

`type` 取值:

| 值 | 說明 | 必填欄位 |
| --- | --- | --- |
| `smtp` | 帳號密碼直連 SMTP | `host` 或 `service`、`username`、`password` |
| `http` | 轉發到自定義 HTTP API | `httpUrl` |
| `outlook_oauth2` | Outlook OAuth2 授權後 SMTP 寄件 | `username`、`oauthClientId`、`oauthClientSecret` |
| `gmail_oauth2` | Gmail OAuth2 授權後 SMTP 寄件 | `username`、`oauthClientId`、`oauthClientSecret` |

`smtp` 型別的 `service` 為 nodemailer 預置服務名(如 `QQ`、`Gmail`、`Outlook`),填寫後無需再設 `host` / `port`。
你可以在[這裡](https://github.com/nodemailer/nodemailer/blob/master/src/well-known/services.json)檢視所有支援的運營商。

> 介面返回的 `password` / `oauthClientSecret` 欄位為解密後的明文,僅用於後臺回顯,請勿記錄到外部日誌。
> `oauthRefreshToken` 由 OAuth 回撥寫入,不透過本介面修改。

### 金鑰

```
GET    /api/admin/senders/{id}/keys                → { keys: SenderKey[] }
POST   /api/admin/senders/{id}/keys  body: { "label"?: "..." }  → { key: SenderKey }
PATCH  /api/admin/senders/{id}/keys/{keyId} body: { "label"?, "enabled"? } → { key: SenderKey }
DELETE /api/admin/senders/{id}/keys/{keyId}        → { success: true }
```

`SenderKey` 欄位:

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

### 日誌與統計

```
GET /api/admin/senders/{id}/logs?limit=50   → { rows: SendLog[], total: number }
GET /api/admin/stats                        → { senders, logs: { total, success, failed } }
```

### 測試寄信

```
POST /api/admin/senders/{id}/test  body: { "to": "..." }  → { success: true, messageId }
```

用寄件商自身的 SMTP 設定發一封測試郵件,同樣受其域名白名單限制。

## 健康檢查

```
GET /api/health → { status, driver, adminConfigured, secretConfigured, timestamp }
```

無需鑑權,可用於部署後自檢。
