# 簡介

MailPort 把郵件傳送變成 HTTP API。每個寄件商擁有獨立介面地址與獨立 API 金鑰,統一在網頁控制檯裡管理,資料儲存在你選擇的資料庫裡。

## 它能做什麼

- **控制檯** — 帶密碼保護的管理後臺,建立並管理 SMTP、HTTP API、Gmail 與 Outlook OAuth 寄件商。
- **每個寄件商一個介面** — `POST /api/{pid}/send`,`pid` 是建立時隨機生成的 5–10 位字元。
- **每個寄件商多把金鑰** — 在設定頁生成 32 位 API 金鑰,可隨時檢視、禁用或刪除。
- **收件域名白名單** — 按寄件商設定允許的收件人域名,存在資料庫裡。
- **多資料庫** — PostgreSQL、MongoDB、MySQL / TiDB、SQLite,按環境變數自動選擇。
- **傳送日誌** — 每次請求都記錄狀態、錯誤資訊與耗時。
- **憑證加密** — SMTP 密碼、OAuth 金鑰與 API 金鑰以 AES-256-GCM 加密儲存。
- **內嵌驗證碼圖片** — 傳送介面支援在郵件正文中內嵌驗證碼圖片。

## 快速開始

```bash
# 安裝依賴
npm install

# 複製環境變數模板並填寫
cp .env.example .env

# 啟動開發伺服器
npm run dev
```

開啟 `http://localhost:3000/login`,用 `ADMIN_PASSWORD` 登入。

最小可用設定(以 SQLite 為例):

```ini
ADMIN_PASSWORD=your-admin-password
MAILPORT_SECRET=at-least-32-random-characters
SQLITE_PATH=./data
```

## 呼叫介面

```bash
curl -X POST https://your-app.vercel.app/api/a1b2c3/send \
  -H "Authorization: Bearer <32-char-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"to": "someone@example.com", "subject": "Hi", "text": "Hello from MailPort"}'
```

## 下一步

- [部署指南](./deploy) — 部署到 Vercel 或自己的伺服器。
- [資料庫設定指南](./db-guide) — 從 Supabase、Neon、MongoDB Atlas 等平臺獲取連線資訊,並拆成環境變數。
- [控制檯使用教程](./use) — 登入後臺、建立寄件商、生成金鑰。
- [API 參考](../reference/api) — 傳送介面與錯誤碼。
