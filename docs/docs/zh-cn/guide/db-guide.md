# 数据库配置指南

MailPort 支持四种数据库:**PostgreSQL、MongoDB、MySQL / TiDB、SQLite**。应用按固定顺序自动检测已配置的驱动:**PostgreSQL → MongoDB → MySQL → SQLite**,只需配置其中一组,变量清单见[环境变量](../reference/env.html)。

本文解决两件事:

1. **去哪里拿到连接信息**(主机、端口、库名、用户名、密码)。
2. **怎么把连接串拆成 MailPort 需要的环境变量**,每一节都给出可直接照抄的示例。

> [!IMPORTANT]
> MailPort **不读取 `DATABASE_URL`**。各平台给的连接字符串必须拆成独立变量,拆解规则见每一节的「变量映射」表。

## 一、PostgreSQL

适用于 [Supabase](https://supabase.com)、[Neon](https://neon.tech)、[Tembo](https://tembo.io) 以及自建 PostgreSQL。

### 1.1 变量映射

| 环境变量 | 取自连接串的哪一部分 | 示例 |
| --- | --- | --- |
| `PG_HOST` | `//` 之后、`:` 之前的主机名 | `db.example.com` |
| `PG_PORT` | 主机名后的端口 | `5432` |
| `PG_USER` | `//` 之后的用户名 | `myuser` |
| `PG_PASSWORD` | 用户名后的密码 | `secret` |
| `PG_DB` | 最后一个 `/` 之后的库名 | `mailport` |
| `PG_SSL` | 连接串里的 `sslmode=require` → `true` | `true` |

拆解示例,连接串:

```
postgresql://myuser:secret@db.example.com:5432/mailport?sslmode=require
```

对应环境变量:

```ini
PG_HOST=db.example.com
PG_PORT=5432
PG_USER=myuser
PG_PASSWORD=secret
PG_DB=mailport
PG_SSL=true
```

兼容写法:`POSTGRES_DATABASE`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_HOST`、`POSTGRES_PORT`、`POSTGRES_SSL` 含义相同,`PG_*` 优先。

> [!TIP]
> 密码里含 `@`、`:`、`/` 等字符时,连接串中会被编码成 `%40`、`%3A` 等。填 `PG_PASSWORD` 时写**原始密码**,不要带百分号编码。

### 1.2 Supabase

**获取连接信息**:登录 [Supabase](https://supabase.com) 控制台 → 选择项目 → 顶部 **Connect** → **Connection string** → 复制 **URI**。控制台提供三种模式:

| 模式 | 连接串形态 | 端口 | 适用场景 |
| --- | --- | --- | --- |
| Session pooler | `postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres` | 5432 | **推荐**,长驻服务首选 |
| Transaction pooler | 同上,端口改为 `6543` | 6543 | Serverless 高并发短事务 |
| Direct connection | `postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres` | 5432 | 直连,IPv6-only 主机 |

**拆分示例(Session pooler)**:

```ini
PG_HOST=aws-0-ap-northeast-1.pooler.supabase.com
PG_PORT=5432
PG_USER=postgres.abcdefghijkl
PG_PASSWORD=你的数据库密码
PG_DB=postgres
PG_SSL=true
```

注意事项:

- 池化连接的**用户名带项目 ref**(`postgres.<project-ref>`),直连连接的用户名是 `postgres`。填错用户名的典型报错是 `password authentication failed for user "postgres"`。
- 直连地址 `db.<ref>.supabase.co` 只解析 IPv6,服务器没有 IPv6 时连不上,请改用池化地址。
- 密码在 Supabase 控制台的 **Database → Settings → Reset password** 处重置,重置后需要同步更新 Vercel 上的 `PG_PASSWORD`。
- Supabase 默认给连接加了 SSL,`PG_SSL` 保持 `true`。

### 1.3 Neon

**获取连接信息**:登录 [Neon](https://neon.tech) 控制台 → 选择项目 → **Dashboard** → **Connection details**(或右上角 **Connect**),复制 **Pooled connection** 或 **Direct connection** 的 URI。

```
postgresql://neondb_owner:PASSWORD@ep-xxx-pooler.us-east-2.aws.neon.tech:5432/neondb?sslmode=require
```

**拆分示例**:

```ini
PG_HOST=ep-xxx-pooler.us-east-2.aws.neon.tech
PG_PORT=5432
PG_USER=neondb_owner
PG_PASSWORD=你的密码
PG_DB=neondb
PG_SSL=true
```

注意事项:

- 池化地址的主机名带 `-pooler`,直连地址不带,两者不能混用。
- Neon 强制 TLS,`PG_SSL` 必须为 `true`。
- 默认库名是 `neondb`,默认用户是 `neondb_owner`;在 **Roles** 里建了自己的角色就用自己的角色名。
- Serverless 部署请用池化地址,直连地址的并发连接数上限很低。

### 1.4 Tembo

**获取连接信息**:登录 [Tembo](https://tembo.io) 控制台 → 进入实例 → **Connection details**,复制 PostgreSQL 连接串:

```
postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

**拆分示例**:

```ini
PG_HOST=your-instance-host
PG_PORT=5432
PG_USER=your-user
PG_PASSWORD=你的密码
PG_DB=your-database
PG_SSL=true
```

Tembo 兼容标准 PostgreSQL 协议,变量映射与上面完全一致。Tembo Cloud 的连接文档目前需要访问码,拿不准时以控制台 **Connection details** 面板显示的内容为准。

### 1.5 自建 PostgreSQL

**获取连接信息**:

- 本机安装:执行 `psql "postgresql://user:pass@localhost:5432/mailport" -c '\conninfo'`,输出的 host、port、user、database 就是要填的值。
- 远程服务器:在服务器管理面板(宝塔、DataEase 等)的数据库管理页查看「主机地址、端口、用户名、密码、数据库名」。
- 服务器本机安装时 host 填 `127.0.0.1`,容器部署时填容器服务名(如 `postgres`)。

**拆分示例**:

```ini
PG_HOST=127.0.0.1
PG_PORT=5432
PG_USER=mailport
PG_PASSWORD=你的密码
PG_DB=mailport
PG_SSL=false
```

自建库默认不开 SSL,`PG_SSL` 填 `false`;若在 `postgresql.conf` 里开启了 `ssl = on`,改成 `true`。

## 二、MongoDB

适用于 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) 与自建 MongoDB。

### 2.1 变量映射

| 环境变量 | 说明 | 默认值 |
| --- | --- | --- |
| `MONGO_DB` | 数据库名,**必填** | |
| `MONGO_USER` | 用户名 | |
| `MONGO_PASSWORD` | 密码 | |
| `MONGO_HOST` | 主机名。多机用逗号分隔或 JSON 数组,如 `["h1","h2"]` | `127.0.0.1` |
| `MONGO_PORT` | 端口。多机同样支持数组 | `27017` |
| `MONGO_AUTHSOURCE` | 认证库 | 有用户名时为 `admin` |
| `MONGO_REPLICASET` | 副本集名,**多主机时必填** | |
| `MONGO_OPT_SSL` | 是否启用 TLS | `false` |

也可以直接给完整连接串:

| 环境变量 | 说明 |
| --- | --- |
| `MONGODB_URI` | 完整连接串,设置后上面所有变量都被忽略(`MONGO_DB` 除外) |

### 2.2 自建 MongoDB

**获取连接信息**:

```bash
# 本机
mongosh "mongodb://user:pass@127.0.0.1:27017/mailport?authSource=admin"
```

远程服务器在管理面板查看 host、port、用户名、密码;MongoDB 默认不开鉴权,自建环境建议开启 `--auth` 并创建用户。

**拆分示例**:

```ini
MONGO_HOST=127.0.0.1
MONGO_PORT=27017
MONGO_USER=mailport
MONGO_PASSWORD=你的密码
MONGO_DB=mailport
MONGO_AUTHSOURCE=admin
MONGO_OPT_SSL=false
```

### 2.3 MongoDB Atlas(详细教程)

MongoDB Atlas 是 MongoDB 官方托管服务,免费 M0 共享集群存储额度约 500 MB,足够存放 MailPort 的发件商配置、API 密钥与发送日志。下面以 Vercel 部署为例。

#### 第一步:注册账号并创建集群

1. 打开 [MongoDB Atlas 注册页](https://www.mongodb.com/cloud/atlas/register),使用邮箱、Google 或 GitHub 账号注册并登录。
2. 首次登录时按提示创建 **Organization**(组织)与 **Project**(项目),项目名随意,例如 `mailport`。
3. 在项目首页点击 **Create a deployment**,在 **Shared** 标签页选择免费 **M0** 集群,点击 **Create**。
4. 区域建议选择离后端较近的数据中心以降低连接延迟。Vercel 默认部署在美国东部时可选 `AWS / N. Virginia (us-east-1)`;拿不准可选基建成熟的 `AWS / Oregon (us-west-2)`。

#### 第二步:创建数据库用户

1. 左侧边栏进入 **Security → Database Access**(部分界面版本位于 **Project Settings → Database Access**)。
2. 点击 **Add New Database User**:
   - **Authentication Method** 选择 `Password`。
   - **Password Authentication** 填写用户名,或点击 **Auto Generate** 自动生成强密码(不含特殊符号,便于直接使用)。
   - **Database User Privileges** 点击 **Add Built In Role**,**Select Role** 选择 `Atlas Admin`,点击 **Add User**。
3. 点击 **Finish and Close** 保存。

![创建数据库用户](https://twikoo.js.org/assets/mongodb-1.kzmwAvw2.png)

> [!IMPORTANT]
> 自动生成的密码只显示一次,请立刻复制保存。忘记密码只能在 Database Access 页面重置。

#### 第三步:配置 IP 白名单

1. 左侧边栏进入 **Security → Network Access**(部分界面版本位于 **Project Settings → Network Access**)。
2. 点击 **Add IP Address**:
   - **部署在 Vercel / Netlify / Lambda**:出口 IP 不固定,`Access List Entry` 填 `0.0.0.0/0`,允许任意 IP 连接。
   - **部署在自己的 VPS**:填服务器的固定公网 IP,例如 `203.0.113.10/32`。
3. 点击 **Confirm** 保存。

![配置 IP 白名单](https://twikoo.js.org/assets/mongodb-2.wGC2d7_O.png)

> [!WARNING]
> `0.0.0.0/0` 让全网都能尝试连接数据库,安全性完全依赖数据库用户密码强度。请配合强密码使用,发现异常时立即轮换密码。

#### 第四步:获取连接字符串

1. 左侧边栏进入 **Database → Clusters**,点击目标集群右侧的 **Connect**。
2. 连接方式选择 **Drivers**,驱动选择 **Node.js**,复制连接字符串。
3. 把字符串里的 `<username>:<password>` 替换成第二步创建的用户名与密码。

![获取连接字符串](https://twikoo.js.org/assets/mongodb-3.BlCbBw8p.png)

SRV 连接字符串形如:

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
```

密码含 `@`、`:`、`/`、`?`、`#`、`%` 等字符时必须做 URL 编码(`@` 写成 `%40`),否则驱动解析失败。

#### 第五步:填写环境变量

在 Vercel 项目的 **Settings → Environment Variables** 中添加。两种写法任选其一,不要同时配置。

**方式 A:使用完整连接字符串(推荐)**

```ini
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority&authSource=admin&ssl=true
MONGO_DB=mailport
```

- `MONGODB_URI` 一旦设置,`MONGO_HOST`、`MONGO_PORT`、`MONGO_USER`、`MONGO_PASSWORD`、`MONGO_REPLICASET`、`MONGO_AUTHSOURCE`、`MONGO_OPT_SSL` 全部被忽略。
- 数据库名由 `MONGO_DB`(或 `MONGODB_DB`)决定,连接串里不写库名也可以。
- `authSource=admin` 表示用 Atlas Admin 用户在 `admin` 库完成认证,这是 Atlas 的默认做法。

**方式 B:拆分成独立变量**

在 **Connect** 对话框中关闭 **SRV Connection String** 开关,复制标准连接字符串:

```
mongodb://<username>:<password>@<cluster>-shard-00-00.<xxxx>.mongodb.net:27017/?ssl=true&replicaSet=atlas-<xxxx>-shard-0&authSource=admin
```

按连接串逐项拆开:

```ini
MONGO_HOST=ac-xxxx.sh-xx.region.aws.future.mongodb.net
MONGO_PORT=27017
MONGO_USER=你的用户名
MONGO_PASSWORD=你的密码
MONGO_DB=mailport
MONGO_AUTHSOURCE=admin
MONGO_REPLICASET=atlas-xxxx-shard-0
MONGO_OPT_SSL=true
```

> [!TIP]
> `MONGO_HOST` 与 `MONGO_PORT` 支持多机写法:逗号分隔或 JSON 数组,如 `["h1","h2"]` 与 `["27017","27017"]`。配置多个主机时 `MONGO_REPLICASET` 必填。

#### 第六步:重新部署并验证

1. 保存环境变量后,在 Vercel 项目里点击 **Redeploy** 重新部署,新变量才会生效。
2. 访问 `https://<your-app>.vercel.app/api/health`,确认驱动识别为 MongoDB:

```json
{
  "status": "ok",
  "driver": "mongodb",
  "adminConfigured": true,
  "secretConfigured": true,
  "timestamp": 1730000000000
}
```

3. 打开 `https://<your-app>.vercel.app/login`,用 `ADMIN_PASSWORD` 登录,新建发件商、生成密钥并发送测试邮件。

> 首次写入时 MailPort 会自动建表与集合,无需手动执行迁移脚本。

#### MongoDB 常见问题

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `bad auth : Authentication failed` | 用户名或密码错误;密码含特殊字符时未做 URL 编码 | 重新复制密码,特殊字符按上文编码后重填 |
| `Server selection timed out after 8000 ms` | 出口 IP 不在白名单里 | Network Access 补 `0.0.0.0/0` 或当前公网 IP |
| `Authentication failed` 且白名单已放行 | 用户创建在其它项目下 | 确认 Database Access 里的用户属于当前项目 |
| 健康检查 `status: "ok"` 但后台保存报错 | `MONGO_DB` 指向的库不存在或无权限 | 在 Atlas 的 Data Explorer 里创建同名库,或改用已有库名 |
| 部署后一直写不进去 | 忘了重新部署,新环境变量未生效 | 在 Vercel 触发 Redeploy |

## 三、MySQL / TiDB

适用于自建 MySQL、[PlanetScale](https://planetscale.com)、[FreeDB](https://freedb.tech)、[TiDB Cloud](https://tidbcloud.com)。TiDB 兼容 MySQL 协议,直接用 `MYSQL_*` 变量。

### 3.1 变量映射

| 环境变量 | 取自连接串的哪一部分 | 示例 |
| --- | --- | --- |
| `MYSQL_HOST` | `//` 之后的主机名 | `gateway01.xxx.prod.aws.tidbcloud.com` |
| `MYSQL_PORT` | 主机名后的端口 | `4000` |
| `MYSQL_USER` | 用户名 | `root` |
| `MYSQL_PASSWORD` | 密码 | `secret` |
| `MYSQL_DB` | 库名 | `mailport` |
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

兼容写法:`TIDB_DB`、`TIDB_USER`、`TIDB_PASSWORD`、`TIDB_HOST`、`TIDB_PORT`、`TIDB_SSL`,`MYSQL_*` 优先。

### 3.2 TiDB Cloud

**获取连接信息**:登录 TiDB Cloud → **Clusters** → 点击集群名 → **Connect**,在弹窗中点击 **Generate Password** 设置密码(只显示一次),页面同时给出 host、port、username、password。

```ini
MYSQL_HOST=gateway01.xxx.prod.aws.tidbcloud.com
MYSQL_PORT=4000
MYSQL_USER=root
MYSQL_PASSWORD=生成的密码
MYSQL_DB=mailport
MYSQL_SSL=true
```

TiDB Cloud 强制 TLS,`MYSQL_SSL` 必须为 `true`。库需要先在 **SQL Editor** 或客户端里 `CREATE DATABASE` 建好。

### 3.3 PlanetScale / FreeDB

**获取连接信息**:在控制台的 **Connect** 面板复制连接串,并确认该分支提供了用户名密码凭据(MailPort 的 MySQL 驱动使用标准用户名密码认证)。拿到连接串后按 3.1 的规则拆分即可。

```ini
MYSQL_HOST=连接串里的主机名
MYSQL_PORT=3306
MYSQL_USER=控制台给出的用户名
MYSQL_PASSWORD=控制台给出的密码
MYSQL_DB=连接串里的库名
MYSQL_SSL=true
```

### 3.4 自建 MySQL

**获取连接信息**:执行 `mysql -u root -p -e "SELECT @@hostname, @@port, CURRENT_USER();"`,或在服务器管理面板查看 host、端口、用户名、密码、库名。

```ini
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=你的密码
MYSQL_DB=mailport
MYSQL_SSL=false
```

## 四、SQLite

SQLite 是本地文件数据库,不需要连接串,只需要一个可写目录。

| 环境变量 | 说明 | 默认值 |
| --- | --- | --- |
| `SQLITE_PATH` | 数据库文件所在目录 | `./data` |
| `SQLITE_DB` | 数据库文件名 | `mailport.db` |

**本地开发**:

```ini
SQLITE_PATH=./data
```

**VPS 部署**:把 `SQLITE_PATH` 指向持久化目录,例如 `/var/lib/mailport`,避免容器重建或目录清理导致数据丢失。

```ini
SQLITE_PATH=/var/lib/mailport
SQLITE_DB=mailport.db
```

> [!WARNING]
> **Vercel Serverless 的文件系统只读,SQLite 无法持久化**,数据在实例回收后即丢失。Vercel 部署请使用 PostgreSQL、MongoDB 或 MySQL。

## 五、配置完成后验证

保存环境变量并重新部署后,访问 `GET /api/health`:

```json
{
  "status": "ok",
  "driver": "postgres",
  "adminConfigured": true,
  "secretConfigured": true,
  "timestamp": 1730000000000
}
```

`driver` 会显示当前生效的驱动:`postgres`、`mongodb`、`mysql` 或 `sqlite`。

## 六、通用排错

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `status: "degraded"`,`driver: null` | 一组数据库变量都没配 | 按本文配置任意一组;驱动检测顺序为 PostgreSQL → MongoDB → MySQL → SQLite,先配的那组生效 |
| 写入返回 503 `No database configured...` | 同上,或变量名写错 | 检查 `PG_DB` / `MONGO_DB` / `MYSQL_DB` / `SQLITE_PATH` 是否拼写正确且非空 |
| `PostgreSQL config incomplete: PG_DB/PG_USER ... are required` | 库名或用户名没填 | 补齐 `PG_DB` 与 `PG_USER` |
| `MongoDB config incomplete: MONGO_DB is required` | 库名没填 | 补齐 `MONGO_DB` |
| `MySQL config incomplete: MYSQL_DB/MYSQL_USER ... are required` | 库名或用户名没填 | 补齐 `MYSQL_DB` 与 `MYSQL_USER` |
| `MongoDB: multiple MONGO_HOST values require MONGO_REPLICASET to be set` | 配了多台主机但没写副本集名 | 补齐 `MONGO_REPLICASET` |
| `password authentication failed` | 用户名或密码错误;Supabase 池化用户要带项目 ref | 核对控制台里的用户名,重置密码后同步更新环境变量 |
| `Server selection timed out after 8000 ms` | 网络不通或 IP 白名单未放行 | Atlas 检查 Network Access;自建检查防火墙与 `pg_hba.conf` / MongoDB 监听地址 |
| `MAILPORT_SECRET is not configured or shorter than 32 characters` | 主密钥缺失或不足 32 位 | 设置至少 32 字符的 `MAILPORT_SECRET` |
| 部署后变量没生效 | Vercel 需要重新部署 | 项目页触发 Redeploy |

> [!TIP]
> 数据库密码、SMTP 密码、OAuth 密钥与 API 密钥在 MailPort 中均以 AES-256-GCM 加密存储,但连接密码本身仍以明文存在于部署平台的环境变量里。请使用平台的环境变量功能,不要写进代码仓库。
