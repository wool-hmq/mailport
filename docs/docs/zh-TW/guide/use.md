# 控制面板使用教程

## 一、訪問網站與初始化
1. 前往 Vercel 的專案概覽面板，找到你部署的 Mailport 專案，點選 **Visit**。然後正常應該進入控制檯登入頁。

![控制檯使用教程01](https://pic1.imgdb.cn/i/034lzkuQx87YpVW5qSWAzm.jpg)

![控制檯使用教程02](https://pic1.imgdb.cn/i/034lzqqby4JISJy3FR6ouy.jpg)

2. 訪問 `https://xxxx.vercel.app/api/health` 進行健康檢查,根據輸出排查是否有缺失。

① 部署無誤時,資料庫驅動已識別、必需變數齊全:

```json
{
  "status": "ok",
  "driver": "postgres",
  "adminConfigured": true,
  "secretConfigured": true,
  "timestamp": 1730000000000
}
```

`driver` 是當前生效的驅動:`postgres`、`mongodb`、`mysql` 或 `sqlite`。`adminConfigured` 與 `secretConfigured` 都為 `true` 表示管理密碼與主金鑰已設定(`MAILPORT_SECRET` 需至少 32 個字元)。

② 缺少資料庫設定時,`status` 為 `degraded`、`driver` 為 `null`:

```json
{
  "status": "degraded",
  "driver": null,
  "adminConfigured": true,
  "secretConfigured": true,
  "timestamp": 1730000000000
}
```

此時後臺儲存會返回 503:

```json
{
  "error": "No database configured. Configure one of PG_*, MONGO_*, MYSQL_*, SQLITE_* in environment variables."
}
```

按[資料庫設定指南](./db-guide)設定任意一組資料庫變數即可。

③ 其它常見錯誤:

| 報錯 | 原因 | 處理 |
| --- | --- | --- |
| `{"error":"ADMIN_PASSWORD is not configured on the server."}`(503) | 未設定 `ADMIN_PASSWORD` | 在部署平臺補上該變數並重新部署 |
| `{"error":"Invalid password."}`(401) | 輸入的密碼與 `ADMIN_PASSWORD` 不一致 | 核對環境變數中的值 |
| `{"error":"MAILPORT_SECRET is not configured or shorter than 32 characters."}`(503) | 主金鑰缺失或不足 32 位 | 設定至少 32 字元的 `MAILPORT_SECRET` |
| `PostgreSQL config incomplete: PG_DB/PG_USER (or POSTGRES_*) are required.` | 庫名或使用者名稱沒填 | 補齊 `PG_DB` 與 `PG_USER` |
| `MongoDB config incomplete: MONGO_DB is required.` | 庫名沒填 | 補齊 `MONGO_DB` |
| `password authentication failed` / `bad auth : Authentication failed` | 使用者名稱或密碼錯誤 | 核對控制檯裡的使用者名稱與密碼,重設後同步更新環境變數 |
| `Server selection timed out after 8000 ms` | 網路不通或 IP 白名單未放行 | Atlas 檢查 Network Access;自建檢查防火牆與白名單設定 |

完整排錯表見[資料庫設定指南](./db-guide#六通用排錯)。

## 二、登入控制面板
使用設定好的 `ADMIN_PASSWORD` 環境變數作為密碼登入。詳見[環境變數-必填變數](../reference/env.html#必填變數)。

點選**登入**，密碼正確正常情況會登入成功。進入管理面板。

![控制檯使用教程03](https://pic1.imgdb.cn/i/034m0QJLVk45W3JboxMD7E.jpg)

## 三、管理寄件商
1. 點選 **新建寄件商**。
2. 填寫資訊，並點選 **新建**。

> [!Note]
> Oauth 寄件設定教程：[《Outlook / Gmail OAuth 寄件》](./oauth)  
> HTTP API 寄件設定教程：[《HTTP API 寄件商》](./http-sender)

3. 如圖，自動跳轉該寄件商的設定（金鑰）頁面。

![控制檯使用教程04](https://pic1.imgdb.cn/i/034m0YvyLuWsC77p3Fqbil.jpg)

4. 在設定（金鑰）頁面，可以建立新金鑰 / 禁用或刪除某個金鑰。

> [!IMPORTANT]
> 請不要洩露你的金鑰，任何人只需要獲取到你的金鑰，加之你自己洩露了呼叫地址，就可以使用你設定的寄件商批次傳送郵件，包括垃圾郵件  
> 把金鑰直接硬編碼到程式碼中，也屬於主動洩露金鑰行為  
> 本專案作者針對因主動洩露金鑰或呼叫地址，導致被人濫用寄件服務，不承擔任何法律責任

5. 在設定（設定）頁面，可以檢視當前的寄件商設定，允許的收件人域名，以及進行寄件測試。也可以在設定頁編輯寄件商設定資訊。

6. 在設定（日誌）頁面，可以檢視呼叫日誌。呼叫失敗時也會記錄報錯原因。

![控制檯使用教程05](https://pic1.imgdb.cn/i/034m0sTGCDdbtsKgticzTx.jpg)
