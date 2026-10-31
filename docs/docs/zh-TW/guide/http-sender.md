# HTTP API 寄件商

除了 SMTP 帳號密碼寄件,MailPort 還支援「HTTP API」型別的寄件商:把收到的郵件請求
原樣轉發到你指定的 HTTP 介面(通常是你自己的服務,或第三方寄件平臺提供的 Webhook)。

---

## 它是怎麼工作的

你呼叫 MailPort 的寄件介面:

```
POST /api/{pid}/send
```

MailPort 拿到郵件內容後,按你填寫的設定,向**你的 API 地址**發起一個 HTTP 請求:

- 請求方法:預設 `POST`,可改
- 請求頭:預設帶 `Content-Type: application/json`,可追加任意自定義頭
- 請求體:預設是一段 JSON,把郵件內容填進去;也支援完全自定義

你的服務收到請求後完成真正的投遞,返回結果給 MailPort;MailPort 再把結果返回給呼叫方。

```
你的應用  →  POST /api/{pid}/send  →  MailPort  →  POST 你的 API 地址  →  你的服務寄件
```

---

## 在後臺怎麼設定

新建寄件商時,「寄件方式」選擇 **HTTP API**,然後填寫:

| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| 請求 API 地址 | 是 | 你的介面地址,必須以 `http://` 或 `https://` 開頭 |
| 請求方法 | 否 | 預設 `POST`;可選 `POST` / `PUT` / `PATCH` / `GET` / `DELETE` |
| 自定義請求頭 | 否 | 標準 JSON 物件格式,見下文 |
| 自定義請求體 | 否 | 郵件內容的模板,見下文 |

### 自定義請求頭

留空表示只發預設的 `Content-Type: application/json`。需要附加頭時,按標準 JSON 物件填寫,
**允許換行**:

```json
{
  "Authorization": "Bearer your-token-here",
  "X-Source": "mailport",
  "X-Project-Id": "42"
}
```

JSON 要求鍵名和字串都用雙引號,最後一項後面不要加逗號。儲存前會校驗格式,
格式不對會提示而不會儲存。

### 自定義請求體與佔位符

留空時使用預設請求體:

```json
{
  "to": "{{to}}",
  "subject": "{{subject}}",
  "text": "{{text}}",
  "html": "{{html}}"
}
```

`{{to}}` 這類寫法是**佔位符**:MailPort 發請求前會把它們替換成實際的郵件內容,
沒有對應內容時替換為空字串。可用佔位符:

| 佔位符 | 含義 |
| --- | --- |
| `{{to}}` | 收件人地址 |
| `{{subject}}` | 郵件主題 |
| `{{text}}` | 純文字正文 |
| `{{html}}` | HTML 正文 |
| `{{from}}` | 寄件人地址(後臺填寫的「寄件人地址」) |
| `{{from_name}}` | 寄件人名稱 |

如果對方的介面欄位名不同,直接改模板。比如對方要求 `email` 和 `content`:

```json
{
  "email": "{{to}}",
  "title": "{{subject}}",
  "content": "{{text}}"
}
```

對方要的是表單格式而不是 JSON?把 Content-Type 改掉、請求體寫成對方要的樣子即可:

```
to={{to}}&subject={{subject}}&body={{text}}
```

請求體允許換行,方便排版較長的模板。

---

## 上游響應的處理

- 上游介面返回狀態碼 `< 400` 視為成功,MailPort 向呼叫方返回 `{ "success": true, "messageId": ... }`。
  `messageId` 會嘗試從上游響應 JSON 裡讀取 `messageId` / `message_id` / `id` / `data.id`,讀不到就用 `http:<狀態碼>`。
- 上游返回 `>= 400` 視為失敗,錯誤資訊裡會帶上上游返回的正文(最多 500 字元),方便排查。
- 上游網路不可達時,失敗資訊會寫明是請求對方時出錯。

所有呼叫無論成敗都會寫入傳送日誌,在寄件商詳情頁的「日誌」裡可以看到。

---

## 完整示例

假設你有一個寄件服務 `https://mail.example.com/api/send`,要求:

- 方法 `POST`
- 頭部帶 `Authorization: Bearer secret-token`
- 請求體 `{"recipient": "...", "title": "...", "body": "..."}`

後臺填寫:

- 請求 API 地址:`https://mail.example.com/api/send`
- 請求方法:`POST`
- 自定義請求頭:

  ```json
  {
    "Authorization": "Bearer secret-token"
  }
  ```

- 自定義請求體:

  ```json
  {
    "recipient": "{{to}}",
    "title": "{{subject}}",
    "body": "{{text}}"
  }
  ```

然後就可以像普通寄件商一樣呼叫:

```bash
curl -X POST https://your-app.vercel.app/api/{pid}/send \
  -H "Authorization: Bearer <mailport-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"to": "someone@example.com", "subject": "Hi", "text": "Hello"}'
```

MailPort 會向你的服務發出:

```bash
POST https://mail.example.com/api/send
Authorization: Bearer secret-token
Content-Type: application/json

{"recipient": "someone@example.com", "title": "Hi", "body": "Hello"}
```

---

## 常見問題

**問:為什麼儲存時提示「Custom headers must be a JSON object」?**
請求頭必須是 JSON 物件(花括號包裹的鍵值對),不能是陣列、不能是普通字串。檢查引號是否成對、有沒有多餘的逗號。

**問:佔位符沒有被替換,原樣發出去了?**
佔位符必須寫成 `{{to}}` 這樣雙花括號包裹,大小寫不敏感中間的空格可有可無(`{{ TO }}` 也可以)。

**問:可以用 GET 方法把引數放在 query 裡嗎?**
可以。選 `GET` 方法,請求體裡寫的仍是模板;MailPort 不會自動把引數挪到 query,需要你在「請求 API 地址」裡直接把佔位符寫進 URL,例如 `https://api.example.com/send?to={{to}}`。

**問:自定義請求頭裡的金鑰安全嗎?**
儲存在資料庫裡,不會被明文展示;MailPort 的所有憑證都使用 AES-256-GCM 加密儲存。
