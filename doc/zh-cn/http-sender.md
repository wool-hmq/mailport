# HTTP API 发件商

除了 SMTP 账号密码发件,MailPort 还支持「HTTP API」类型的发件商:把收到的邮件请求
原样转发到你指定的 HTTP 接口(通常是你自己的服务,或第三方发件平台提供的 Webhook)。

---

## 它是怎么工作的

你调用 MailPort 的发件接口:

```
POST /api/{pid}/send
```

MailPort 拿到邮件内容后,按你填写的配置,向**你的 API 地址**发起一个 HTTP 请求:

- 请求方法:默认 `POST`,可改
- 请求头:默认带 `Content-Type: application/json`,可追加任意自定义头
- 请求体:默认是一段 JSON,把邮件内容填进去;也支持完全自定义

你的服务收到请求后完成真正的投递,返回结果给 MailPort;MailPort 再把结果返回给调用方。

```
你的应用  →  POST /api/{pid}/send  →  MailPort  →  POST 你的 API 地址  →  你的服务发件
```

---

## 在后台怎么配置

新建发件商时,「发件方式」选择 **HTTP API**,然后填写:

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| 请求 API 地址 | 是 | 你的接口地址,必须以 `http://` 或 `https://` 开头 |
| 请求方法 | 否 | 默认 `POST`;可选 `POST` / `PUT` / `PATCH` / `GET` / `DELETE` |
| 自定义请求头 | 否 | 标准 JSON 对象格式,见下文 |
| 自定义请求体 | 否 | 邮件内容的模板,见下文 |

### 自定义请求头

留空表示只发默认的 `Content-Type: application/json`。需要附加头时,按标准 JSON 对象填写,
**允许换行**:

```json
{
  "Authorization": "Bearer your-token-here",
  "X-Source": "mailport",
  "X-Project-Id": "42"
}
```

JSON 要求键名和字符串都用双引号,最后一项后面不要加逗号。保存前会校验格式,
格式不对会提示而不会保存。

### 自定义请求体与占位符

留空时使用默认请求体:

```json
{
  "to": "{{to}}",
  "subject": "{{subject}}",
  "text": "{{text}}",
  "html": "{{html}}"
}
```

`{{to}}` 这类写法是**占位符**:MailPort 发请求前会把它们替换成实际的邮件内容,
没有对应内容时替换为空字符串。可用占位符:

| 占位符 | 含义 |
| --- | --- |
| `{{to}}` | 收件人地址 |
| `{{subject}}` | 邮件主题 |
| `{{text}}` | 纯文本正文 |
| `{{html}}` | HTML 正文 |
| `{{from}}` | 发件人地址(后台填写的「发件人地址」) |
| `{{from_name}}` | 发件人名称 |

如果对方的接口字段名不同,直接改模板。比如对方要求 `email` 和 `content`:

```json
{
  "email": "{{to}}",
  "title": "{{subject}}",
  "content": "{{text}}"
}
```

对方要的是表单格式而不是 JSON?把 Content-Type 改掉、请求体写成对方要的样子即可:

```
to={{to}}&subject={{subject}}&body={{text}}
```

请求体允许换行,方便排版较长的模板。

---

## 上游响应的处理

- 上游接口返回状态码 `< 400` 视为成功,MailPort 向调用方返回 `{ "success": true, "messageId": ... }`。
  `messageId` 会尝试从上游响应 JSON 里读取 `messageId` / `message_id` / `id` / `data.id`,读不到就用 `http:<状态码>`。
- 上游返回 `>= 400` 视为失败,错误信息里会带上上游返回的正文(最多 500 字符),方便排查。
- 上游网络不可达时,失败信息会写明是请求对方时出错。

所有调用无论成败都会写入发送日志,在发件商详情页的「日志」里可以看到。

---

## 完整示例

假设你有一个发件服务 `https://mail.example.com/api/send`,要求:

- 方法 `POST`
- 头部带 `Authorization: Bearer secret-token`
- 请求体 `{"recipient": "...", "title": "...", "body": "..."}`

后台填写:

- 请求 API 地址:`https://mail.example.com/api/send`
- 请求方法:`POST`
- 自定义请求头:

  ```json
  {
    "Authorization": "Bearer secret-token"
  }
  ```

- 自定义请求体:

  ```json
  {
    "recipient": "{{to}}",
    "title": "{{subject}}",
    "body": "{{text}}"
  }
  ```

然后就可以像普通发件商一样调用:

```bash
curl -X POST https://your-app.vercel.app/api/{pid}/send \
  -H "Authorization: Bearer <mailport-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"to": "someone@example.com", "subject": "Hi", "text": "Hello"}'
```

MailPort 会向你的服务发出:

```bash
POST https://mail.example.com/api/send
Authorization: Bearer secret-token
Content-Type: application/json

{"recipient": "someone@example.com", "title": "Hi", "body": "Hello"}
```

---

## 常见问题

**问:为什么保存时提示「Custom headers must be a JSON object」?**
请求头必须是 JSON 对象(花括号包裹的键值对),不能是数组、不能是普通字符串。检查引号是否成对、有没有多余的逗号。

**问:占位符没有被替换,原样发出去了?**
占位符必须写成 `{{to}}` 这样双花括号包裹,大小写不敏感中间的空格可有可无(`{{ TO }}` 也可以)。

**问:可以用 GET 方法把参数放在 query 里吗?**
可以。选 `GET` 方法,请求体里写的仍是模板;MailPort 不会自动把参数挪到 query,需要你在「请求 API 地址」里直接把占位符写进 URL,例如 `https://api.example.com/send?to={{to}}`。

**问:自定义请求头里的密钥安全吗?**
保存在数据库里,不会被明文展示;MailPort 的所有凭据都使用 AES-256-GCM 加密存储。
