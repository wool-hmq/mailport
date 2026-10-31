# 環境變數 / Environment Variables

MailPort 透過環境變數完成所有設定。在 Vercel 上進入專案 **Settings → Environment Variables** 設定;本地開發複製 `.env.example` 為 `.env`。

## 必填變數

| 變數 | 說明 |
| --- | --- |
| `ADMIN_PASSWORD` | 管理後臺登入密碼。建議長隨機字串。 |
| `MAILPORT_SECRET` | 應用主金鑰。用於加密 SMTP 密碼與 API 金鑰、簽名管理員會話。**至少 32 個字元**,妥善保管,洩露後需全部重設。 |

> 未設定這兩個變數時,後臺登入會返回 503,資料寫入會報錯。

## 資料庫(按需設定一組)

MailPort 會按固定順序自動檢測已設定的資料庫驅動:**PostgreSQL → MongoDB → MySQL → SQLite**。只需設定其中一組。

### PostgreSQL

適用於 [Supabase](https://supabase.com)、[Neon](https://neon.tech)、[Tembo](https://tembo.io)、自建 PostgreSQL。

| 變數 | 必填 | 預設值 | 說明 |
| --- | --- | --- | --- |
| `PG_DB` | 是 | | 資料庫名 |
| `PG_USER` | 是 | | 使用者名稱 |
| `PG_PASSWORD` | 是 | | 密碼 |
| `PG_HOST` | | `127.0.0.1` | 地址 |
| `PG_PORT` | | `5432` | 埠 |
| `PG_SSL` | | `false` | 是否強制 SSL |

相容寫法:同樣接受 `POSTGRES_DATABASE`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_HOST`、`POSTGRES_PORT`、`POSTGRES_SSL`。

### MongoDB

適用於 [MongoDB Atlas](https://www.mongodb.com) 或自建 MongoDB。

| 變數 | 必填 | 預設值 | 說明 |
| --- | --- | --- | --- |
| `MONGO_DB` | 是 | | 資料庫名 |
| `MONGO_USER` | | | 使用者名稱(自建庫通常需要) |
| `MONGO_PASSWORD` | | | 密碼 |
| `MONGO_HOST` | | `127.0.0.1` | 地址。多機部署寫 JSON 陣列,如 `["h1","h2"]` |
| `MONGO_PORT` | | `27017` | 埠。多機寫 JSON 陣列 |
| `MONGO_REPLICASET` | | | 副本集名稱。多機時必填 |
| `MONGO_AUTHSOURCE` | | `admin`(有使用者時) | 認證源 |
| `MONGO_OPT_SSL` | | `false` | Atlas 等需設 `true` |

也接受完整的 `MONGODB_URI` 直連字串,設定後忽略以上變數。

### MySQL / TiDB

適用於自建 MySQL、[PlanetScale](https://planetscale.com)、[FreeDB](https://freedb.tech);TiDB 協議相容,直接用 MySQL 設定即可。

| 變數 | 必填 | 預設值 | 說明 |
| --- | --- | --- | --- |
| `MYSQL_DB` | 是 | | 資料庫名 |
| `MYSQL_USER` | 是 | | 使用者名稱 |
| `MYSQL_PASSWORD` | 是 | | 密碼 |
| `MYSQL_HOST` | | `127.0.0.1` | 地址 |
| `MYSQL_PORT` | | `3306` | 埠 |
| `MYSQL_SSL` | | `false` | 是否強制 SSL |

TiDB 相容寫法:同樣接受 `TIDB_DB`、`TIDB_USER`、`TIDB_PASSWORD`、`TIDB_HOST`、`TIDB_PORT`、`TIDB_SSL`。

### SQLite

僅適用於本地開發與 VPS 獨立部署。**Vercel Serverless 檔案系統只讀,SQLite 無法持久化。**

| 變數 | 必填 | 預設值 | 說明 |
| --- | --- | --- | --- |
| `SQLITE_PATH` | 是 | `./data` | 資料庫檔案所在目錄 |
| `SQLITE_DB` | | `mailport.db` | 資料庫檔名 |

## 可選變數

| 變數 | 預設值 | 說明 |
| --- | --- | --- |
| `SITE_LOCALE` | `en` | 介面預設語言。可選值:`en`(英文)、`zh-cn`(簡體中文) |
| `SESSION_TTL` | `604800`(7 天) | 管理員會話有效期,單位秒 |
| `TZ` | `UTC` | 預留。當前版本不影響介面顯示(見下方說明) |

## 關於時區(TZ)

當前版本傳送日誌與金鑰使用時間的格式化都在瀏覽器端完成,跟隨訪問者系統的時區,服務端 `TZ` 變數不影響介面顯示。該變數僅為預留,方便未來新增服務端時間格式化時使用。

若以後需要填寫,注意 POSIX 寫法的符號是**反的**:

| 填寫 | 實際時區 |
| --- | --- |
| `Asia/Shanghai` | 東八區(推薦,IANA 名稱,正確處理夏令時) |
| `UTC-8` | 東八區 |
| `Etc/GMT-8` | 東八區 |
| `UTC+8` | **西八區**(符號反了,是常見陷阱) |

## 介面語言

透過 `SITE_LOCALE` 設定管理後臺的預設語言:

| 值 | 語言 |
| --- | --- |
| `en` | 英文(預設) |
| `zh-cn` | 簡體中文 |

填錯或不填時回退為英文。

使用者也可以在後臺右上角的下拉框裡手動切換,選擇會寫入 cookie 並覆蓋環境變數的預設值,有效期 1 年。新增語言的方法見 `src/i18n/` 目錄說明。

## 驅動檢測順序

```
PG_DB / POSTGRES_DATABASE  →  PostgreSQL
MONGO_DB / MONGODB_URI     →  MongoDB
MYSQL_DB / TIDB_DB         →  MySQL
SQLITE_PATH / SQLITE_DB    →  SQLite
```

任意一組存在即生效。全部未設定時 `/api/health` 返回 `status: "degraded"`,所有寫操作返回 503。

## 金鑰輪換

`MAILPORT_SECRET` 一旦修改,歷史加密的 SMTP 密碼與 API 金鑰將無法解密。輪換流程:

1. 修改 `MAILPORT_SECRET`。
2. 在後臺逐個寄件商重新填寫 SMTP 密碼並儲存。
3. 刪除舊 API 金鑰,重新生成(呼叫方需替換新金鑰)。

## 部署後自檢

訪問 `GET /api/health`:

```json
{
  "status": "ok",
  "driver": "postgres",
  "adminConfigured": true,
  "secretConfigured": true,
  "timestamp": 1730000000000
}
```

`driver` 為 `null` 或 `status` 為 `degraded` 時,說明資料庫未設定成功。各平臺連線資訊如何獲取、如何拆成上面這些變數,見[資料庫設定指南](../guide/db-guide.html)。
