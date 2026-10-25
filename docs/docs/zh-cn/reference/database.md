# 数据库结构 / Database Schema

MailPort 共三张表( MongoDB 中为三个集合)。应用首次启动时自动创建,无需手动执行 SQL。

字段命名在各数据库中保持一致;下文以关系型数据库的蛇形命名为准。

## `senders` — 发件商

每条记录是一个独立的发件通道,拥有独立的调用端点、密钥与收件域名白名单。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | TEXT / VARCHAR(64) | 主键,UUID |
| `pid` | TEXT,唯一 | 路由标识。创建时随机生成的 5–10 位字母数字,用于拼接发件接口路径 `/api/{pid}/send` |
| `name` | TEXT | 显示名称,仅用于后台识别 |
| `type` | TEXT | 发件方式:`smtp`(账号密码)、`http`(HTTP API 转发)、`outlook_oauth2`、`gmail_oauth2` |
| `enabled` | BOOLEAN | 是否启用。禁用后接口返回 404 |
| `host` | TEXT,可空 | SMTP 主机。设置 `service` 时为空 |
| `port` | INT,可空 | SMTP 端口,通常 465 / 587 |
| `secure` | BOOLEAN | 是否使用 SSL/TLS |
| `service` | TEXT,可空 | nodemailer 预置服务名,如 `QQ`、`Gmail`。设置后忽略 host/port。[所有支持的运营商](https://github.com/nodemailer/nodemailer/blob/master/src/well-known/services.json) |
| `username` | TEXT,可空 | SMTP 登录账号;OAuth 类型下为授权的邮箱地址 |
| `password` | TEXT,可空 | SMTP 密码。**AES-256-GCM 加密存储**,读取时自动解密 |
| `from_address` | TEXT,可空 | 发件人地址,为空时用 `username` |
| `from_name` | TEXT,可空 | 发件人显示名 |
| `allowed_domains` | JSON / JSONB | 允许的收件域名数组。**空数组 `[]` 表示不限制** |
| `http_url` | TEXT,可空 | `http` 类型的请求地址 |
| `http_method` | TEXT,可空 | `http` 类型的请求方法,默认 `POST` |
| `http_headers` | TEXT,可空 | `http` 类型的自定义请求头,标准 JSON 对象文本 |
| `http_body` | TEXT,可空 | `http` 类型的自定义请求体模板,支持 `{{to}}` 等占位符 |
| `oauth_client_id` | TEXT,可空 | OAuth 应用 Client ID |
| `oauth_client_secret` | TEXT,可空 | OAuth 应用 Client Secret。**AES-256-GCM 加密存储** |
| `oauth_refresh_token` | TEXT,可空 | OAuth 刷新令牌。**AES-256-GCM 加密存储** |
| `oauth_authorized_at` | BIGINT,可空 | 完成 OAuth 授权的时间戳(毫秒),未授权为空 |
| `created_at` | BIGINT | 创建时间戳(毫秒) |
| `updated_at` | BIGINT | 更新时间戳(毫秒) |

索引:`pid` 唯一索引。

> **升级说明**:v0.1.0 之后新增的 8 列(`http_*` / `oauth_*`)由应用启动时自动补齐,老库无需手动迁移。

## `sender_keys` — 发件商密钥

一个发件商可持有多个 32 位密钥,各自可启停、删除。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | TEXT / VARCHAR(64) | 主键,UUID |
| `sender_id` | TEXT | 所属发件商 `id`,外键级联删除 |
| `key` | TEXT | 32 位随机密钥。**AES-256-GCM 加密存储**,后台可解密重复查看 |
| `label` | TEXT | 备注名,用于区分调用方 |
| `enabled` | BOOLEAN | 是否启用。禁用后使用该密钥的请求返回 401 |
| `last_used_at` | BIGINT,可空 | 最近一次成功调用的时间戳(毫秒) |
| `created_at` | BIGINT | 创建时间戳(毫秒) |

索引:`sender_id` 索引。

## `send_logs` — 发送日志

每次调用接口(无论成败)都会写入一条。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | TEXT / VARCHAR(64) | 主键,UUID |
| `sender_id` | TEXT | 所属发件商 `id`,外键级联删除 |
| `key_id` | TEXT,可空 | 使用的密钥 `id` |
| `to_addr` | TEXT | 收件人地址 |
| `subject` | TEXT | 邮件主题 |
| `status` | TEXT | `success` 或 `failed` |
| `error` | TEXT,可空 | 失败时的错误信息 |
| `duration` | BIGINT | 耗时,毫秒 |
| `created_at` | BIGINT | 时间戳(毫秒) |

索引:`(sender_id, created_at DESC)` 复合索引、`status` 索引。

## 各数据库差异说明

| 项目 | PostgreSQL | MySQL / TiDB | MongoDB | SQLite |
| --- | --- | --- | --- | --- |
| 数组列 | JSONB | JSON | 原生数组 | JSON 字符串 |
| 时间戳 | BIGINT | BIGINT | Long | INTEGER |
| 主键 | TEXT | VARCHAR(64) | `_id` (String) | TEXT |
| 外键级联 | 支持 | 支持 | 应用层删除 | 支持 |
| 表前缀 | 无 | 无 | 无 | 无 |

MongoDB 驱动在删除发件商时,由应用层同时删除其密钥与日志(MongoDB 无外键约束)。

## 数据安全

- SMTP 密码、OAuth Client Secret / Refresh Token 与 API 密钥均以 `v1:` 前缀的 AES-256-GCM 密文存储。
- `MAILPORT_SECRET` 是唯一解密途径,不会写入数据库或日志。
- 日志表不记录邮件正文、密钥明文。
- 健康检查接口只返回配置是否存在,不返回任何凭据。
