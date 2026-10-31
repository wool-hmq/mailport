# 資料庫結構 / Database Schema

MailPort 共三張表( MongoDB 中為三個集合)。應用首次啟動時自動建立,無需手動執行 SQL。

欄位命名在各資料庫中保持一致;下文以關係型資料庫的蛇形命名為準。

## `senders` — 寄件商

每條記錄是一個獨立的寄件通道,擁有獨立的呼叫端點、金鑰與收件域名白名單。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | TEXT / VARCHAR(64) | 主鍵,UUID |
| `pid` | TEXT,唯一 | 路由標識。建立時隨機生成的 5–10 位字母數字,用於拼接寄件介面路徑 `/api/{pid}/send` |
| `name` | TEXT | 顯示名稱,僅用於後臺識別 |
| `type` | TEXT | 寄件方式:`smtp`(帳號密碼)、`http`(HTTP API 轉發)、`outlook_oauth2`、`gmail_oauth2` |
| `enabled` | BOOLEAN | 是否啟用。禁用後介面返回 404 |
| `host` | TEXT,可空 | SMTP 主機。設定 `service` 時為空 |
| `port` | INT,可空 | SMTP 埠,通常 465 / 587 |
| `secure` | BOOLEAN | 是否使用 SSL/TLS |
| `service` | TEXT,可空 | nodemailer 預置服務名,如 `QQ`、`Gmail`。設定後忽略 host/port。[所有支援的運營商](https://github.com/nodemailer/nodemailer/blob/master/src/well-known/services.json) |
| `username` | TEXT,可空 | SMTP 登入帳號;OAuth 型別下為授權的信箱地址 |
| `password` | TEXT,可空 | SMTP 密碼。**AES-256-GCM 加密儲存**,讀取時自動解密 |
| `from_address` | TEXT,可空 | 寄件人地址,為空時用 `username` |
| `from_name` | TEXT,可空 | 寄件人顯示名 |
| `allowed_domains` | JSON / JSONB | 允許的收件域名陣列。**空陣列 `[]` 表示不限制** |
| `http_url` | TEXT,可空 | `http` 型別的請求地址 |
| `http_method` | TEXT,可空 | `http` 型別的請求方法,預設 `POST` |
| `http_headers` | TEXT,可空 | `http` 型別的自定義請求頭,標準 JSON 物件文字 |
| `http_body` | TEXT,可空 | `http` 型別的自定義請求體模板,支援 `{{to}}` 等佔位符 |
| `oauth_client_id` | TEXT,可空 | OAuth 應用 Client ID |
| `oauth_client_secret` | TEXT,可空 | OAuth 應用 Client Secret。**AES-256-GCM 加密儲存** |
| `oauth_refresh_token` | TEXT,可空 | OAuth 重新整理權杖。**AES-256-GCM 加密儲存** |
| `oauth_authorized_at` | BIGINT,可空 | 完成 OAuth 授權的時間戳(毫秒),未授權為空 |
| `created_at` | BIGINT | 建立時間戳(毫秒) |
| `updated_at` | BIGINT | 更新時間戳(毫秒) |

索引:`pid` 唯一索引。

> **升級說明**:v0.1.0 之後新增的 8 列(`http_*` / `oauth_*`)由應用啟動時自動補齊,老庫無需手動遷移。

## `sender_keys` — 寄件商金鑰

一個寄件商可持有多個 32 位金鑰,各自可啟停、刪除。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | TEXT / VARCHAR(64) | 主鍵,UUID |
| `sender_id` | TEXT | 所屬寄件商 `id`,外來鍵級聯刪除 |
| `key` | TEXT | 32 位隨機金鑰。**AES-256-GCM 加密儲存**,後臺可解密重複檢視 |
| `label` | TEXT | 備註名,用於區分呼叫方 |
| `enabled` | BOOLEAN | 是否啟用。禁用後使用該金鑰的請求返回 401 |
| `last_used_at` | BIGINT,可空 | 最近一次成功呼叫的時間戳(毫秒) |
| `created_at` | BIGINT | 建立時間戳(毫秒) |

索引:`sender_id` 索引。

## `send_logs` — 傳送日誌

每次呼叫介面(無論成敗)都會寫入一條。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | TEXT / VARCHAR(64) | 主鍵,UUID |
| `sender_id` | TEXT | 所屬寄件商 `id`,外來鍵級聯刪除 |
| `key_id` | TEXT,可空 | 使用的金鑰 `id` |
| `to_addr` | TEXT | 收件人地址 |
| `subject` | TEXT | 郵件主題 |
| `status` | TEXT | `success` 或 `failed` |
| `error` | TEXT,可空 | 失敗時的錯誤資訊 |
| `duration` | BIGINT | 耗時,毫秒 |
| `created_at` | BIGINT | 時間戳(毫秒) |

索引:`(sender_id, created_at DESC)` 複合索引、`status` 索引。

## 各資料庫差異說明

| 專案 | PostgreSQL | MySQL / TiDB | MongoDB | SQLite |
| --- | --- | --- | --- | --- |
| 陣列列 | JSONB | JSON | 原生陣列 | JSON 字串 |
| 時間戳 | BIGINT | BIGINT | Long | INTEGER |
| 主鍵 | TEXT | VARCHAR(64) | `_id` (String) | TEXT |
| 外來鍵級聯 | 支援 | 支援 | 應用層刪除 | 支援 |
| 表字首 | 無 | 無 | 無 | 無 |

MongoDB 驅動在刪除寄件商時,由應用層同時刪除其金鑰與日誌(MongoDB 無外來鍵約束)。

## 資料安全

- SMTP 密碼、OAuth Client Secret / Refresh Token 與 API 金鑰均以 `v1:` 字首的 AES-256-GCM 密文儲存。
- `MAILPORT_SECRET` 是唯一解密途徑,不會寫入資料庫或日誌。
- 日誌表不記錄郵件正文、金鑰明文。
- 健康檢查介面只返回設定是否存在,不返回任何憑證。
