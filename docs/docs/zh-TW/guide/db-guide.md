# 資料庫設定指南

MailPort 支援四種資料庫:**PostgreSQL、MongoDB、MySQL / TiDB、SQLite**。應用按固定順序自動檢測已設定的驅動:**PostgreSQL → MongoDB → MySQL → SQLite**,只需設定其中一組,變數清單見[環境變數](../reference/env.html)。

本文解決兩件事:

1. **去哪裡拿到連線資訊**(主機、埠、庫名、使用者名稱、密碼)。
2. **怎麼把連線串拆成 MailPort 需要的環境變數**,每一節都給出可直接照抄的示例。

> [!IMPORTANT]
> MailPort **不讀取 `DATABASE_URL`**。各平臺給的連線字串必須拆成獨立變數,拆解規則見每一節的「變數對映」表。

## 一、PostgreSQL

適用於 [Supabase](https://supabase.com)、[Neon](https://neon.tech)、[Tembo](https://tembo.io) 以及自建 PostgreSQL。

### 1.1 變數對映

| 環境變數 | 取自連線串的哪一部分 | 示例 |
| --- | --- | --- |
| `PG_HOST` | `//` 之後、`:` 之前的主機名 | `db.example.com` |
| `PG_PORT` | 主機名後的埠 | `5432` |
| `PG_USER` | `//` 之後的使用者名稱 | `myuser` |
| `PG_PASSWORD` | 使用者名稱後的密碼 | `secret` |
| `PG_DB` | 最後一個 `/` 之後的庫名 | `mailport` |
| `PG_SSL` | 連線串裡的 `sslmode=require` → `true` | `true` |

拆解示例,連線串:

```
postgresql://myuser:secret@db.example.com:5432/mailport?sslmode=require
```

對應環境變數:

```ini
PG_HOST=db.example.com
PG_PORT=5432
PG_USER=myuser
PG_PASSWORD=secret
PG_DB=mailport
PG_SSL=true
```

相容寫法:`POSTGRES_DATABASE`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_HOST`、`POSTGRES_PORT`、`POSTGRES_SSL` 含義相同,`PG_*` 優先。

> [!TIP]
> 密碼裡含 `@`、`:`、`/` 等字元時,連線串中會被編碼成 `%40`、`%3A` 等。填 `PG_PASSWORD` 時寫**原始密碼**,不要帶百分號編碼。

### 1.2 Supabase

**獲取連線資訊**:登入 [Supabase](https://supabase.com) 控制檯 → 選擇專案 → 頂部 **Connect** → **Connection string** → 複製 **URI**。控制檯提供三種模式:

| 模式 | 連線串形態 | 埠 | 適用場景 |
| --- | --- | --- | --- |
| Session pooler | `postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres` | 5432 | **推薦**,長駐服務首選 |
| Transaction pooler | 同上,埠改為 `6543` | 6543 | Serverless 高併發短事務 |
| Direct connection | `postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres` | 5432 | 直連,IPv6-only 主機 |

**拆分示例(Session pooler)**:

```ini
PG_HOST=aws-0-ap-northeast-1.pooler.supabase.com
PG_PORT=5432
PG_USER=postgres.abcdefghijkl
PG_PASSWORD=你的資料庫密碼
PG_DB=postgres
PG_SSL=true
```

注意事項:

- 池化連線的**使用者名稱帶專案 ref**(`postgres.<project-ref>`),直連連線的使用者名稱是 `postgres`。填錯使用者名稱的典型報錯是 `password authentication failed for user "postgres"`。
- 直連地址 `db.<ref>.supabase.co` 只解析 IPv6,伺服器沒有 IPv6 時連不上,請改用池化地址。
- 密碼在 Supabase 控制檯的 **Database → Settings → Reset password** 處重設,重設後需要同步更新 Vercel 上的 `PG_PASSWORD`。
- Supabase 預設給連線加了 SSL,`PG_SSL` 保持 `true`。

### 1.3 Neon

**獲取連線資訊**:登入 [Neon](https://neon.tech) 控制檯 → 選擇專案 → **Dashboard** → **Connection details**(或右上角 **Connect**),複製 **Pooled connection** 或 **Direct connection** 的 URI。

```
postgresql://neondb_owner:PASSWORD@ep-xxx-pooler.us-east-2.aws.neon.tech:5432/neondb?sslmode=require
```

**拆分示例**:

```ini
PG_HOST=ep-xxx-pooler.us-east-2.aws.neon.tech
PG_PORT=5432
PG_USER=neondb_owner
PG_PASSWORD=你的密碼
PG_DB=neondb
PG_SSL=true
```

注意事項:

- 池化地址的主機名帶 `-pooler`,直連地址不帶,兩者不能混用。
- Neon 強制 TLS,`PG_SSL` 必須為 `true`。
- 預設庫名是 `neondb`,預設使用者是 `neondb_owner`;在 **Roles** 裡建了自己的角色就用自己的角色名。
- Serverless 部署請用池化地址,直連地址的併發連線數上限很低。

### 1.4 Tembo

**獲取連線資訊**:登入 [Tembo](https://tembo.io) 控制檯 → 進入例項 → **Connection details**,複製 PostgreSQL 連線串:

```
postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

**拆分示例**:

```ini
PG_HOST=your-instance-host
PG_PORT=5432
PG_USER=your-user
PG_PASSWORD=你的密碼
PG_DB=your-database
PG_SSL=true
```

Tembo 相容標準 PostgreSQL 協議,變數對映與上面完全一致。Tembo Cloud 的連線文件目前需要訪問碼,拿不準時以控制檯 **Connection details** 面板顯示的內容為準。

### 1.5 自建 PostgreSQL

**獲取連線資訊**:

- 本機安裝:執行 `psql "postgresql://user:pass@localhost:5432/mailport" -c '\conninfo'`,輸出的 host、port、user、database 就是要填的值。
- 遠端伺服器:在伺服器管理面板(寶塔、DataEase 等)的資料庫管理頁檢視「主機地址、埠、使用者名稱、密碼、資料庫名」。
- 伺服器本機安裝時 host 填 `127.0.0.1`,容器部署時填容器服務名(如 `postgres`)。

**拆分示例**:

```ini
PG_HOST=127.0.0.1
PG_PORT=5432
PG_USER=mailport
PG_PASSWORD=你的密碼
PG_DB=mailport
PG_SSL=false
```

自建庫預設不開 SSL,`PG_SSL` 填 `false`;若在 `postgresql.conf` 裡開啟了 `ssl = on`,改成 `true`。

## 二、MongoDB

適用於 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) 與自建 MongoDB。

### 2.1 變數對映

| 環境變數 | 說明 | 預設值 |
| --- | --- | --- |
| `MONGO_DB` | 資料庫名,**必填** | |
| `MONGO_USER` | 使用者名稱 | |
| `MONGO_PASSWORD` | 密碼 | |
| `MONGO_HOST` | 主機名。多機用逗號分隔或 JSON 陣列,如 `["h1","h2"]` | `127.0.0.1` |
| `MONGO_PORT` | 埠。多機同樣支援陣列 | `27017` |
| `MONGO_AUTHSOURCE` | 認證庫 | 有使用者名稱時為 `admin` |
| `MONGO_REPLICASET` | 副本集名,**多主機時必填** | |
| `MONGO_OPT_SSL` | 是否啟用 TLS | `false` |

也可以直接給完整連線串:

| 環境變數 | 說明 |
| --- | --- |
| `MONGODB_URI` | 完整連線串,設定後上面所有變數都被忽略(`MONGO_DB` 除外) |

### 2.2 自建 MongoDB

**獲取連線資訊**:

```bash
# 本機
mongosh "mongodb://user:pass@127.0.0.1:27017/mailport?authSource=admin"
```

遠端伺服器在管理面板檢視 host、port、使用者名稱、密碼;MongoDB 預設不開鑑權,自建環境建議開啟 `--auth` 並建立使用者。

**拆分示例**:

```ini
MONGO_HOST=127.0.0.1
MONGO_PORT=27017
MONGO_USER=mailport
MONGO_PASSWORD=你的密碼
MONGO_DB=mailport
MONGO_AUTHSOURCE=admin
MONGO_OPT_SSL=false
```

### 2.3 MongoDB Atlas(詳細教程)

MongoDB Atlas 是 MongoDB 官方託管服務,免費 M0 共享叢集儲存額度約 500 MB,足夠存放 MailPort 的寄件商設定、API 金鑰與傳送日誌。下面以 Vercel 部署為例。

#### 第一步:註冊帳號並建立叢集

1. 開啟 [MongoDB Atlas 註冊頁](https://www.mongodb.com/cloud/atlas/register),使用信箱、Google 或 GitHub 帳號註冊並登入。
2. 首次登入時按提示建立 **Organization**(組織)與 **Project**(專案),專案名隨意,例如 `mailport`。
3. 在專案首頁點選 **Create a deployment**,在 **Shared** 標籤頁選擇免費 **M0** 叢集,點選 **Create**。
4. 區域建議選擇離後端較近的資料中心以降低連線延遲。Vercel 預設部署在美國東部時可選 `AWS / N. Virginia (us-east-1)`;拿不準可選基建成熟的 `AWS / Oregon (us-west-2)`。

#### 第二步:建立資料庫使用者

1. 左側邊欄進入 **Security → Database Access**(部分介面版本位於 **Project Settings → Database Access**)。
2. 點選 **Add New Database User**:
   - **Authentication Method** 選擇 `Password`。
   - **Password Authentication** 填寫使用者名稱,或點選 **Auto Generate** 自動生成強密碼(不含特殊符號,便於直接使用)。
   - **Database User Privileges** 點選 **Add Built In Role**,**Select Role** 選擇 `Atlas Admin`,點選 **Add User**。
3. 點選 **Finish and Close** 儲存。

![建立資料庫使用者](https://twikoo.js.org/assets/mongodb-1.kzmwAvw2.png)

> [!IMPORTANT]
> 自動生成的密碼只顯示一次,請立刻複製儲存。忘記密碼只能在 Database Access 頁面重設。

#### 第三步:設定 IP 白名單

1. 左側邊欄進入 **Security → Network Access**(部分介面版本位於 **Project Settings → Network Access**)。
2. 點選 **Add IP Address**:
   - **部署在 Vercel / Netlify / Lambda**:出口 IP 不固定,`Access List Entry` 填 `0.0.0.0/0`,允許任意 IP 連線。
   - **部署在自己的 VPS**:填伺服器的固定公網 IP,例如 `203.0.113.10/32`。
3. 點選 **Confirm** 儲存。

![設定 IP 白名單](https://twikoo.js.org/assets/mongodb-2.wGC2d7_O.png)

> [!WARNING]
> `0.0.0.0/0` 讓全網都能嘗試連線資料庫,安全性完全依賴資料庫使用者密碼強度。請配合強密碼使用,發現異常時立即輪換密碼。

#### 第四步:獲取連線字串

1. 左側邊欄進入 **Database → Clusters**,點選目標叢集右側的 **Connect**。
2. 連線方式選擇 **Drivers**,驅動選擇 **Node.js**,複製連線字串。
3. 把字串裡的 `<username>:<password>` 替換成第二步建立的使用者名稱與密碼。

![獲取連線字串](https://twikoo.js.org/assets/mongodb-3.BlCbBw8p.png)

SRV 連線字串形如:

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
```

密碼含 `@`、`:`、`/`、`?`、`#`、`%` 等字元時必須做 URL 編碼(`@` 寫成 `%40`),否則驅動解析失敗。

#### 第五步:填寫環境變數

在 Vercel 專案的 **Settings → Environment Variables** 中新增。兩種寫法任選其一,不要同時設定。

**方式 A:使用完整連線字串(推薦)**

```ini
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority&authSource=admin&ssl=true
MONGO_DB=mailport
```

- `MONGODB_URI` 一旦設定,`MONGO_HOST`、`MONGO_PORT`、`MONGO_USER`、`MONGO_PASSWORD`、`MONGO_REPLICASET`、`MONGO_AUTHSOURCE`、`MONGO_OPT_SSL` 全部被忽略。
- 資料庫名由 `MONGO_DB`(或 `MONGODB_DB`)決定,連線串裡不寫庫名也可以。
- `authSource=admin` 表示用 Atlas Admin 使用者在 `admin` 庫完成認證,這是 Atlas 的預設做法。

**方式 B:拆分成獨立變數**

在 **Connect** 對話方塊中關閉 **SRV Connection String** 開關,複製標準連線字串:

```
mongodb://<username>:<password>@<cluster>-shard-00-00.<xxxx>.mongodb.net:27017/?ssl=true&replicaSet=atlas-<xxxx>-shard-0&authSource=admin
```

按連線串逐項拆開:

```ini
MONGO_HOST=ac-xxxx.sh-xx.region.aws.future.mongodb.net
MONGO_PORT=27017
MONGO_USER=你的使用者名稱
MONGO_PASSWORD=你的密碼
MONGO_DB=mailport
MONGO_AUTHSOURCE=admin
MONGO_REPLICASET=atlas-xxxx-shard-0
MONGO_OPT_SSL=true
```

> [!TIP]
> `MONGO_HOST` 與 `MONGO_PORT` 支援多機寫法:逗號分隔或 JSON 陣列,如 `["h1","h2"]` 與 `["27017","27017"]`。設定多個主機時 `MONGO_REPLICASET` 必填。

#### 第六步:重新部署並驗證

1. 儲存環境變數後,在 Vercel 專案裡點選 **Redeploy** 重新部署,新變數才會生效。
2. 訪問 `https://<your-app>.vercel.app/api/health`,確認驅動識別為 MongoDB:

```json
{
  "status": "ok",
  "driver": "mongodb",
  "adminConfigured": true,
  "secretConfigured": true,
  "timestamp": 1730000000000
}
```

3. 開啟 `https://<your-app>.vercel.app/login`,用 `ADMIN_PASSWORD` 登入,新建寄件商、生成金鑰併傳送測試郵件。

> 首次寫入時 MailPort 會自動建表與集合,無需手動執行遷移指令碼。

#### MongoDB 常見問題

| 現象 | 原因 | 處理 |
| --- | --- | --- |
| `bad auth : Authentication failed` | 使用者名稱或密碼錯誤;密碼含特殊字元時未做 URL 編碼 | 重新複製密碼,特殊字元按上文編碼後重填 |
| `Server selection timed out after 8000 ms` | 出口 IP 不在白名單裡 | Network Access 補 `0.0.0.0/0` 或當前公網 IP |
| `Authentication failed` 且白名單已放行 | 使用者建立在其它專案下 | 確認 Database Access 裡的使用者屬於當前專案 |
| 健康檢查 `status: "ok"` 但後臺儲存報錯 | `MONGO_DB` 指向的庫不存在或無許可權 | 在 Atlas 的 Data Explorer 裡建立同名庫,或改用已有庫名 |
| 部署後一直寫不進去 | 忘了重新部署,新環境變數未生效 | 在 Vercel 觸發 Redeploy |

## 三、MySQL / TiDB

適用於自建 MySQL、[PlanetScale](https://planetscale.com)、[FreeDB](https://freedb.tech)、[TiDB Cloud](https://tidbcloud.com)。TiDB 相容 MySQL 協議,直接用 `MYSQL_*` 變數。

### 3.1 變數對映

| 環境變數 | 取自連線串的哪一部分 | 示例 |
| --- | --- | --- |
| `MYSQL_HOST` | `//` 之後的主機名 | `gateway01.xxx.prod.aws.tidbcloud.com` |
| `MYSQL_PORT` | 主機名後的埠 | `4000` |
| `MYSQL_USER` | 使用者名稱 | `root` |
| `MYSQL_PASSWORD` | 密碼 | `secret` |
| `MYSQL_DB` | 庫名 | `mailport` |
| `MYSQL_SSL` | 是否走 TLS | `true` |

拆解示例:

```
mysql://root:secret@gateway01.xxx.prod.aws.tidbcloud.com:4000/mailport?ssl=true
```

```ini
MYSQL_HOST=gateway01.xxx.prod.aws.tidbcloud.com
MYSQL_PORT=4000
MYSQL_USER=root
MYSQL_PASSWORD=secret
MYSQL_DB=mailport
MYSQL_SSL=true
```

相容寫法:`TIDB_DB`、`TIDB_USER`、`TIDB_PASSWORD`、`TIDB_HOST`、`TIDB_PORT`、`TIDB_SSL`,`MYSQL_*` 優先。

### 3.2 TiDB Cloud

**獲取連線資訊**:登入 TiDB Cloud → **Clusters** → 點選叢集名 → **Connect**,在彈窗中點選 **Generate Password** 設定密碼(只顯示一次),頁面同時給出 host、port、username、password。

```ini
MYSQL_HOST=gateway01.xxx.prod.aws.tidbcloud.com
MYSQL_PORT=4000
MYSQL_USER=root
MYSQL_PASSWORD=生成的密碼
MYSQL_DB=mailport
MYSQL_SSL=true
```

TiDB Cloud 強制 TLS,`MYSQL_SSL` 必須為 `true`。庫需要先在 **SQL Editor** 或客戶端裡 `CREATE DATABASE` 建好。

### 3.3 PlanetScale / FreeDB

**獲取連線資訊**:在控制檯的 **Connect** 面板複製連線串,並確認該分支提供了使用者名稱密碼憑證(MailPort 的 MySQL 驅動使用標準使用者名稱密碼認證)。拿到連線串後按 3.1 的規則拆分即可。

```ini
MYSQL_HOST=連線串裡的主機名
MYSQL_PORT=3306
MYSQL_USER=控制檯給出的使用者名稱
MYSQL_PASSWORD=控制檯給出的密碼
MYSQL_DB=連線串裡的庫名
MYSQL_SSL=true
```

### 3.4 自建 MySQL

**獲取連線資訊**:執行 `mysql -u root -p -e "SELECT @@hostname, @@port, CURRENT_USER();"`,或在伺服器管理面板檢視 host、埠、使用者名稱、密碼、庫名。

```ini
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=你的密碼
MYSQL_DB=mailport
MYSQL_SSL=false
```

## 四、SQLite

SQLite 是本地檔案資料庫,不需要連線串,只需要一個可寫目錄。

| 環境變數 | 說明 | 預設值 |
| --- | --- | --- |
| `SQLITE_PATH` | 資料庫檔案所在目錄 | `./data` |
| `SQLITE_DB` | 資料庫檔名 | `mailport.db` |

**本地開發**:

```ini
SQLITE_PATH=./data
```

**VPS 部署**:把 `SQLITE_PATH` 指向持久化目錄,例如 `/var/lib/mailport`,避免容器重建或目錄清理導致資料丟失。

```ini
SQLITE_PATH=/var/lib/mailport
SQLITE_DB=mailport.db
```

> [!WARNING]
> **Vercel Serverless 的檔案系統只讀,SQLite 無法持久化**,資料在例項回收後即丟失。Vercel 部署請使用 PostgreSQL、MongoDB 或 MySQL。

## 五、設定完成後驗證

儲存環境變數並重新部署後,訪問 `GET /api/health`:

```json
{
  "status": "ok",
  "driver": "postgres",
  "adminConfigured": true,
  "secretConfigured": true,
  "timestamp": 1730000000000
}
```

`driver` 會顯示當前生效的驅動:`postgres`、`mongodb`、`mysql` 或 `sqlite`。

## 六、通用排錯

| 現象 | 原因 | 處理 |
| --- | --- | --- |
| `status: "degraded"`,`driver: null` | 一組資料庫變數都沒配 | 按本文設定任意一組;驅動檢測順序為 PostgreSQL → MongoDB → MySQL → SQLite,先配的那組生效 |
| 寫入返回 503 `No database configured...` | 同上,或變數名寫錯 | 檢查 `PG_DB` / `MONGO_DB` / `MYSQL_DB` / `SQLITE_PATH` 是否拼寫正確且非空 |
| `PostgreSQL config incomplete: PG_DB/PG_USER ... are required` | 庫名或使用者名稱沒填 | 補齊 `PG_DB` 與 `PG_USER` |
| `MongoDB config incomplete: MONGO_DB is required` | 庫名沒填 | 補齊 `MONGO_DB` |
| `MySQL config incomplete: MYSQL_DB/MYSQL_USER ... are required` | 庫名或使用者名稱沒填 | 補齊 `MYSQL_DB` 與 `MYSQL_USER` |
| `MongoDB: multiple MONGO_HOST values require MONGO_REPLICASET to be set` | 配了多臺主機但沒寫副本集名 | 補齊 `MONGO_REPLICASET` |
| `password authentication failed` | 使用者名稱或密碼錯誤;Supabase 池化使用者要帶專案 ref | 核對控制檯裡的使用者名稱,重設密碼後同步更新環境變數 |
| `Server selection timed out after 8000 ms` | 網路不通或 IP 白名單未放行 | Atlas 檢查 Network Access;自建檢查防火牆與 `pg_hba.conf` / MongoDB 監聽地址 |
| `MAILPORT_SECRET is not configured or shorter than 32 characters` | 主金鑰缺失或不足 32 位 | 設定至少 32 字元的 `MAILPORT_SECRET` |
| 部署後變數沒生效 | Vercel 需要重新部署 | 專案頁觸發 Redeploy |

> [!TIP]
> 資料庫密碼、SMTP 密碼、OAuth 金鑰與 API 金鑰在 MailPort 中均以 AES-256-GCM 加密儲存,但連線密碼本身仍以明文存在於部署平臺的環境變數裡。請使用平臺的環境變數功能,不要寫進程式碼倉庫。
