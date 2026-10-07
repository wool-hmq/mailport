# 多数据库支持(参考:Waline)

> 本文整理自 Waline 评论系统的多数据库服务支持文档,作为 MailPort 数据层设计的参考。
> 原文:<https://waline.js.org/guide/database.html>(GPL-2.0, Copyright © 2020-present lizheming)

Waline 支持多种数据库,包括 MySQL、PostgreSQL、SQLite 以及 MongoDB。只需配置对应数据库的环境变量,Waline 会自动根据配置的环境变量切换到对应的数据存储服务。

## MongoDB

<https://mongodb.com> 官方免费提供 512M 的 MongoDB 数据库支持。

| 环境变量名称 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- |
| `MONGO_DB` | 是 |  | MongoDB 数据库名称 |
| `MONGO_USER` | 是 |  | MongoDB 服务的用户名 |
| `MONGO_PASSWORD` | 是 |  | MongoDB 服务的密码 |
| `MONGO_HOST` |  | 127.0.0.1 | MongoDB 服务的地址,支持数组格式 |
| `MONGO_PORT` |  | 27017 | MongoDB 服务的端口,支持数组格式 |
| `MONGO_REPLICASET` |  |  | MongoDB 集群 |
| `MONGO_AUTHSOURCE` |  |  | MongoDB 认证源 |
| `MONGO_OPT_SSL` |  | `false` | 是否使用 SSL 进行连接 |

配置示例(多机需将 `MONGO_HOST` 和 `MONGO_PORT` 配置成 JSON 格式):

```ini
MONGO_HOST=["cluster0-shard-00-00.p4edw.mongodb.net","cluster0-shard-00-01.p4edw.mongodb.net","cluster0-shard-00-02.p4edw.mongodb.net"]
MONGO_PORT=[27017,27017,27017,27017]
MONGO_DB=waline
MONGO_USER=admin
MONGO_PASSWORD=xxxx
MONGO_REPLICASET=atlas-12cebf-shard-0
MONGO_AUTHSOURCE=admin
MONGO_OPT_SSL=true
```

## MySQL

除自建 MySQL 外,可使用 PlanetScale(仅付费计划)或 FreeDB(免费 25M)。使用前需先导入表结构,再配置环境变量。

| 环境变量名称 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- |
| `MYSQL_HOST` |  | 127.0.0.1 | MySQL 服务的地址 |
| `MYSQL_PORT` |  | 3306 | MySQL 服务的端口 |
| `MYSQL_DB` | 是 |  | MySQL 数据库库名 |
| `MYSQL_USER` | 是 |  | MySQL 数据库的用户名 |
| `MYSQL_PASSWORD` | 是 |  | MySQL 数据库的密码 |
| `MYSQL_PREFIX` |  | `wl_` | MySQL 数据表的表前缀 |
| `MYSQL_CHARSET` |  | `utf8mb4` | MySQL 数据表的字符集 |
| `MYSQL_SSL` |  | `false` | 是否使用 SSL 连接数据库 |

## TiDB

TiDB 是开源 NewSQL 数据库;TiDB Cloud 提供 5GB 免费额度。

| 环境变量名称 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- |
| `TIDB_DB` | 是 |  | TiDB 数据库库名 |
| `TIDB_USER` | 是 |  | TiDB 数据库的用户名 |
| `TIDB_PASSWORD` | 是 |  | TiDB 数据库的密码 |
| `TIDB_HOST` |  | 127.0.0.1 | TiDB 服务的地址 |
| `TIDB_PORT` |  | 4000 | TiDB 服务的端口 |
| `TIDB_PREFIX` |  | `wl_` | TiDB 数据表的表前缀 |
| `TIDB_CHARSET` |  | `utf8mb4` | TiDB 数据表的字符集 |

## SQLite

使用 SQLite 需下载数据库文件至合适位置。

| 环境变量名称 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- |
| `SQLITE_PATH` | 是 |  | SQLite 数据库文件的路径,不包含文件名本身 |
| `JWT_TOKEN` | 是 |  | 用户登录密钥,随机字符串即可 |
| `SQLITE_DB` |  | waline | SQLite 数据库文件名 |
| `SQLITE_PREFIX` |  | `wl_` | SQLite 数据表的表前缀 |

## PostgreSQL

Supabase 和 Neon 均提供 512M 免费支持,Tembo 提供 10G 免费空间。使用前需先导入表结构。

| 环境变量名称 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- |
| `PG_DB` | 是 |  | PostgreSQL 数据库库名 |
| `PG_USER` | 是 |  | PostgreSQL 数据库的用户名 |
| `PG_PASSWORD` | 是 |  | PostgreSQL 数据库的密码 |
| `PG_HOST` |  | 127.0.0.1 | PostgreSQL 服务的地址 |
| `PG_PORT` |  | 3211 | PostgreSQL 服务的端口 |
| `PG_PREFIX` |  | `wl_` | PostgreSQL 数据表的表前缀 |
| `PG_SSL` |  | `false` | 是否使用 SSL 连接数据库 |
| `POSTGRES_DATABASE` |  |  | 同 `PG_DB` |
| `POSTGRES_USER` |  |  | 同 `PG_USER` |
| `POSTGRES_PASSWORD` |  |  | 同 `PG_PASSWORD` |
| `POSTGRES_HOST` |  |  | 同 `PG_HOST` |
| `POSTGRES_PORT` |  | 3211 | 同 `PG_PORT` |
| `POSTGRES_PREFIX` |  | `wl_` | 同 `PG_PREFIX` |
| `POSTGRES_SSL` |  | `false` | 同 `PG_SSL` |

## CloudBase(腾讯云开发)

腾讯云开发提供一定的免费数据库支持。若部署在云开发上,不需要配置任何环境变量,Waline 默认使用云开发的数据库;部署在其它地方则需配置以下变量。

| 环境变量名称 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- |
| `TCB_ENV` | 是 |  | 腾讯云开发环境 ID |
| `TCB_ID` | 是 |  | 腾讯云 API 密钥 ID |
| `TCB_KEY` | 是 |  | 腾讯云 API 密钥 Key |
| `JWT_TOKEN` |  |  | 用户登录密钥;如果没有配任何环境变量则需要配置此变量,随机字符串即可 |

## GitHub

支持将数据以 CSV 文件格式存储在 GitHub 仓库中。需申请 Personal access tokens(勾选 `repo` 权限)。

| 环境变量名称 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- |
| `GITHUB_TOKEN` | 是 |  | Personal access tokens |
| `GITHUB_REPO` | 是 |  | 仓库名称,例如 `walinejs/waline` |
| `GITHUB_PATH` |  |  | 数据存储目录,默认存在仓库根目录下 |

注意:出于国内 GitHub 访问稳定性与 CSV 读写性能原因,不建议国内用户使用 GitHub 作为存储库。

## 扩展其它存储服务

Waline 能够很方便地扩展其它存储服务:Fork 项目,继承存储基类后分别实现对应存储服务的 `select()`、`add()`、`update()`、`delete()` 方法即可。

基类参考:<https://github.com/walinejs/waline/blob/main/packages/server/src/service/storage/base.js>

---

## 对 MailPort 的启示

- **按环境变量自动切换适配器**:用户只配一组 env,应用自动选择存储驱动,无需改代码。
- **存储适配器接口**:抽象出统一的 `select / add / update / delete`(MailPort 可按需调整为 `find / insert / update / delete` 或 ORM 风格),每个驱动各自实现。
- **表前缀与字符集**:通过 `*_PREFIX` / `*_CHARSET` 适配不同实例,避免与同库其它项目冲突。
- **双写变量名兼容**:PostgreSQL 同时接受 `PG_*` 与 `POSTGRES_*`,降低配置心智成本。
- **登录密钥独立配置**:`JWT_TOKEN` 与存储解耦,MailPort 的管理员会话签名应同样独立于数据库配置。
- **Vercel 场景下的取舍**:SQLite 需要本地文件,在 Serverless 上不可持久化;GitHub CSV 仅适合极轻量场景。MailPort 在 Vercel 上应优先 PostgreSQL(Neon/Supabase)与 MongoDB,SQLite 可作为本地开发选项。
