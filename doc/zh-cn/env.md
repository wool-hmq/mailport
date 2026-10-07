# 环境变量 / Environment Variables

MailPort 通过环境变量完成所有配置。在 Vercel 上进入项目 **Settings → Environment Variables** 设置;本地开发复制 `.env.example` 为 `.env`。

## 必填变量

| 变量 | 说明 |
| --- | --- |
| `ADMIN_PASSWORD` | 管理后台登录密码。建议长随机字符串。 |
| `MAILPORT_SECRET` | 应用主密钥。用于加密 SMTP 密码与 API 密钥、签名管理员会话。**至少 32 个字符**,妥善保管,泄露后需全部重置。 |

> 未配置这两个变量时,后台登录会返回 503,数据写入会报错。

## 数据库(按需配置一组)

MailPort 会按固定顺序自动检测已配置的数据库驱动:**PostgreSQL → MongoDB → MySQL → SQLite**。只需配置其中一组。

### PostgreSQL

适用于 [Supabase](https://supabase.com)、[Neon](https://neon.tech)、[Tembo](https://tembo.io)、自建 PostgreSQL。

| 变量 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `PG_DB` | 是 | | 数据库名 |
| `PG_USER` | 是 | | 用户名 |
| `PG_PASSWORD` | 是 | | 密码 |
| `PG_HOST` | | `127.0.0.1` | 地址 |
| `PG_PORT` | | `5432` | 端口 |
| `PG_SSL` | | `false` | 是否强制 SSL |

兼容写法:同样接受 `POSTGRES_DATABASE`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_HOST`、`POSTGRES_PORT`、`POSTGRES_SSL`。

### MongoDB

适用于 [MongoDB Atlas](https://www.mongodb.com) 或自建 MongoDB。

| 变量 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `MONGO_DB` | 是 | | 数据库名 |
| `MONGO_USER` | | | 用户名(自建库通常需要) |
| `MONGO_PASSWORD` | | | 密码 |
| `MONGO_HOST` | | `127.0.0.1` | 地址。多机部署写 JSON 数组,如 `["h1","h2"]` |
| `MONGO_PORT` | | `27017` | 端口。多机写 JSON 数组 |
| `MONGO_REPLICASET` | | | 副本集名称。多机时必填 |
| `MONGO_AUTHSOURCE` | | `admin`(有用户时) | 认证源 |
| `MONGO_OPT_SSL` | | `false` | Atlas 等需设 `true` |

也接受完整的 `MONGODB_URI` 直连字符串,设置后忽略以上变量。

### MySQL / TiDB

适用于自建 MySQL、[PlanetScale](https://planetscale.com)、[FreeDB](https://freedb.tech);TiDB 协议兼容,直接用 MySQL 配置即可。

| 变量 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `MYSQL_DB` | 是 | | 数据库名 |
| `MYSQL_USER` | 是 | | 用户名 |
| `MYSQL_PASSWORD` | 是 | | 密码 |
| `MYSQL_HOST` | | `127.0.0.1` | 地址 |
| `MYSQL_PORT` | | `3306` | 端口 |
| `MYSQL_SSL` | | `false` | 是否强制 SSL |

TiDB 兼容写法:同样接受 `TIDB_DB`、`TIDB_USER`、`TIDB_PASSWORD`、`TIDB_HOST`、`TIDB_PORT`、`TIDB_SSL`。

### SQLite

仅适用于本地开发与 VPS 独立部署。**Vercel Serverless 文件系统只读,SQLite 无法持久化。**

| 变量 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `SQLITE_PATH` | 是 | `./data` | 数据库文件所在目录 |
| `SQLITE_DB` | | `mailport.db` | 数据库文件名 |

## 可选变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `SITE_LOCALE` | `en` | 界面默认语言。可选值:`en`(英文)、`zh-cn`(简体中文) |
| `SESSION_TTL` | `604800`(7 天) | 管理员会话有效期,单位秒 |
| `TZ` | `UTC` | 预留。当前版本不影响界面显示(见下方说明) |

## 关于时区(TZ)

当前版本发送日志与密钥使用时间的格式化都在浏览器端完成,跟随访问者系统的时区,服务端 `TZ` 变量不影响界面显示。该变量仅为预留,方便未来添加服务端时间格式化时使用。

若以后需要填写,注意 POSIX 写法的符号是**反的**:

| 填写 | 实际时区 |
| --- | --- |
| `Asia/Shanghai` | 东八区(推荐,IANA 名称,正确处理夏令时) |
| `UTC-8` | 东八区 |
| `Etc/GMT-8` | 东八区 |
| `UTC+8` | **西八区**(符号反了,是常见陷阱) |

## 界面语言

通过 `SITE_LOCALE` 设置管理后台的默认语言:

| 值 | 语言 |
| --- | --- |
| `en` | 英文(默认) |
| `zh-cn` | 简体中文 |

填错或不填时回退为英文。

用户也可以在后台右上角的下拉框里手动切换,选择会写入 cookie 并覆盖环境变量的默认值,有效期 1 年。新增语言的方法见 `src/i18n/` 目录说明。

## 驱动检测顺序

```
PG_DB / POSTGRES_DATABASE  →  PostgreSQL
MONGO_DB / MONGODB_URI     →  MongoDB
MYSQL_DB / TIDB_DB         →  MySQL
SQLITE_PATH / SQLITE_DB    →  SQLite
```

任意一组存在即生效。全部未配置时 `/api/health` 返回 `status: "degraded"`,所有写操作返回 503。

## 密钥轮换

`MAILPORT_SECRET` 一旦修改,历史加密的 SMTP 密码与 API 密钥将无法解密。轮换流程:

1. 修改 `MAILPORT_SECRET`。
2. 在后台逐个发件商重新填写 SMTP 密码并保存。
3. 删除旧 API 密钥,重新生成(调用方需替换新密钥)。

## 部署后自检

访问 `GET /api/health`:

```json
{
  "status": "ok",
  "driver": "postgres",
  "adminConfigured": true,
  "secretConfigured": true
}
```

`driver` 为 `null` 或 `status` 为 `degraded` 时,说明数据库未配置成功。
