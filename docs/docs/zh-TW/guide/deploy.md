# 部署 / Deployment

MailPort 是標準 Next.js 應用,部署到 Vercel 只需三步。

## 一、Vercel 部署(推薦)

### 1. 匯入倉庫

在 [vercel.com](https://vercel.com) 選擇 **Add New → Project**,匯入你的 MailPort 倉庫。框架自動識別為 Next.js,構建命令與輸出目錄無需修改。  

**或**  

點選下方按鈕跳轉至 Vercel 進行部署  

[![Vercel Deploy](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwool-hmq%2Fmailport%2Ftree%2Fmain%2Fexample)

> [!TIP]
> 如果你未登入的話，Vercel 會讓你註冊或登入，建議使用 GitHub 帳戶進行快捷登入。

### 2. 建立資料庫

任選一個提供免費 PostgreSQL 的服務:

- [Neon](https://neon.tech) — 512MB 免費,Serverless 友好,推薦
- [Supabase](https://supabase.com) — 500MB 免費
- [Tembo](https://tembo.io) — 10GB 免費

拿到連線資訊(主機、埠、庫名、使用者名稱、密碼)。

如需選擇其它型別資料庫，詳見 [資料庫設定教程](./db-guide)

### 3. 設定環境變數

在 Vercel 專案的 **Settings → Environment Variables** 中新增:

| 變數 | 值 |
| --- | --- |
| `ADMIN_PASSWORD` | 自定義管理後臺密碼 |
| `MAILPORT_SECRET` | 至少 32 字元隨機字串 |
| `PG_DB` | 資料庫名 |
| `PG_USER` | 使用者名稱 |
| `PG_PASSWORD` | 密碼 |
| `PG_HOST` | 資料庫地址 |
| `PG_PORT` | 埠(通常 5432) |
| `PG_SSL` | `true`(雲資料庫通常需要) |

重新部署使變數生效。

### 4. 驗證

- 訪問 `https://<your-app>.vercel.app/api/health`,確認 `status: "ok"`、`driver: "postgres"`。
- 訪問 `https://<your-app>.vercel.app/login`,用 `ADMIN_PASSWORD` 登入。
- 新建寄件商,生成金鑰,按頁面提示的 curl 呼叫一次。

> 首次請求時應用會自動建表,無需手動執行遷移指令碼。

## 二、本地開發

```bash
# 1. 安裝依賴
npm install

# 2. 準備本地資料庫(以 SQLite 為例)
mkdir -p data

# 3. 設定環境變數
cp .env.example .env
# 編輯 .env,至少填寫:
#   ADMIN_PASSWORD
#   MAILPORT_SECRET(>= 32 字元)
#   SQLITE_PATH=./data

# 4. 啟動開發伺服器
npm run dev
```

開啟 `http://localhost:3000/login`。

## 三、VPS / Docker 獨立部署

```bash
# 構建並啟動
npm run build
npm run start

# 或用 PM2 守護
pm2 start "npm run start" --name mailport
```

VPS 部署時 SQLite 可用(檔案可寫),設定 `SQLITE_PATH` 指向持久化目錄即可。用 Nginx 反代 3000 埠。

## 四、資料庫選型建議

| 場景 | 推薦 |
| --- | --- |
| Vercel 部署 | PostgreSQL(Neon / Supabase) |
| 國內訪問 | MongoDB Atlas 或自建 MySQL |
| 本地開發 | SQLite,零設定 |
| VPS 獨立部署 | 任意,SQLite 最省事 |

**SQLite 不能用於 Vercel**:Serverless 函式的檔案系統只讀,寫入會丟失。

## 五、反向代理注意事項

若在 Nginx 後面部署,需要放行請求體大小(傳送 HTML 郵件時可能較大):

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    client_max_body_size 10m;
}
```

## 六、升級

```bash
git pull
npm install
npm run build
# 重啟程序
```

表結構變更由應用在啟動時自動處理(`init()` 中的 `CREATE TABLE IF NOT EXISTS`)。若遇到不相容的破壞性變更,會在釋出說明中單獨給出遷移指令碼。

## 七、常見問題

**登入頁提示 "ADMIN_PASSWORD is not configured"**
環境變數未生效。檢查 Vercel 專案設定,確認新增後重新部署。

**`/api/health` 返回 `degraded`**
沒有任何一組資料庫變數被識別。確認變數名拼寫(如 `PG_DB` 不是 `PG_DATABASE`),且值非空。

**介面返回 503 "MAILPORT_SECRET is not configured"**
`MAILPORT_SECRET` 未設定或不足 32 字元。

**呼叫介面 403 "domain is not allowed"**
該寄件商設定了收件域名白名單,收件人域名不在其中。在後臺該寄件商的設定裡新增,或清空白名單(空表示不限制)。

**SMTP 傳送失敗 / 超時**
雲服務商可能封鎖 25 埠;改用 465(SSL)或 587(TLS)。部分信箱(QQ、163、Gmail)需要在後臺開啟 SMTP 並使用授權碼而非登入密碼。
