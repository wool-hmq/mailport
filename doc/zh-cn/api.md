# API 接口 / API Reference

## 公开发件接口

```
POST /api/{pid}/send
```

`pid` 是发件商创建时随机生成的 5–10 位路由标识。每个发件商有独立的接口地址、独立的密钥与收件域名白名单。

### 鉴权

在以下任一位置携带该发件商的 32 位 API 密钥:

```http
Authorization: Bearer <api-key>
```

或

```http
x-api-key: <api-key>
```

或 query 参数 `?key=<api-key>`(不推荐,可能被日志记录)。

### 请求体

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `to` | 是 | 收件人地址 |
| `subject` | 是 | 邮件主题 |
| `text` | 二选一 | 纯文本正文 |
| `html` | 二选一 | HTML 正文 |

`text` 与 `html` 至少传一个;都传时客户端按类型展示。

### 请求示例

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

### 成功响应

```json
{
  "success": true,
  "messageId": "<uuid@example.com>"
}
```

### 错误响应

| 状态码 | 含义 |
| --- | --- |
| 400 | 缺少必填字段、收件地址格式无效 |
| 401 | 未提供密钥或密钥无效/已禁用 |
| 403 | 收件域名不在该发件商的白名单内 |
| 404 | `pid` 不存在或发件商已禁用 |
| 500 | SMTP 发送失败,`details` 为底层错误 |
| 503 | 服务器未配置数据库或主密钥 |

所有错误响应格式为 `{ "error": "...", "details"?: "..." }`。

## 管理端接口

所有 `/api/admin/**` 接口需要登录后的签名 Cookie,未登录返回 401。

### 会话

```
POST /api/admin/login     body: { "password": "..." }     → { "success": true }  (下发 Cookie)
POST /api/admin/logout                                      → { "success": true }  (清除 Cookie)
```

### 发件商

```
GET    /api/admin/senders                    → { rows: Sender[], total: number }
POST   /api/admin/senders                    → { sender: Sender, keys: SenderKey[] }
GET    /api/admin/senders/{id}               → { sender: Sender, keys: SenderKey[] }
PUT    /api/admin/senders/{id}               → { sender: Sender }
DELETE /api/admin/senders/{id}               → { success: true }
```

新增发件商时会自动生成首个 32 位密钥。删除发件商会级联删除其全部密钥与日志。

`Sender` 字段:

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
  "createdAt": 1735000000000,
  "updatedAt": 1735000000000
}
```

> 接口返回的 `password` 字段为解密后的明文,仅用于后台回显,请勿记录到外部日志。

### 密钥

```
GET    /api/admin/senders/{id}/keys                → { keys: SenderKey[] }
POST   /api/admin/senders/{id}/keys  body: { "label"?: "..." }  → { key: SenderKey }
PATCH  /api/admin/senders/{id}/keys/{keyId} body: { "label"?, "enabled"? } → { key: SenderKey }
DELETE /api/admin/senders/{id}/keys/{keyId}        → { success: true }
```

`SenderKey` 字段:

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

### 日志与统计

```
GET /api/admin/senders/{id}/logs?limit=50   → { rows: SendLog[], total: number }
GET /api/admin/stats                        → { senders, logs: { total, success, failed } }
```

### 测试发信

```
POST /api/admin/senders/{id}/test  body: { "to": "..." }  → { success: true, messageId }
```

用发件商自身的 SMTP 配置发一封测试邮件,同样受其域名白名单限制。

## 健康检查

```
GET /api/health → { status, driver, adminConfigured, secretConfigured, timestamp }
```

无需鉴权,可用于部署后自检。
