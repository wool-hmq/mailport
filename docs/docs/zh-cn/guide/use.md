# 控制面板使用教程

## 一、访问网站与初始化
1. 前往 Vercel 的项目概览面板，找到你部署的 Mailport 项目，点击 **Visit**。然后正常应该进入控制台登录页。

![控制台使用教程01](https://pic1.imgdb.cn/i/034lzkuQx87YpVW5qSWAzm.jpg)

![控制台使用教程02](https://pic1.imgdb.cn/i/034lzqqby4JISJy3FR6ouy.jpg)

2. 访问 `https://xxxx.vercel.app/api/health` 进行健康检查,根据输出排查是否有缺失。

① 部署无误时,数据库驱动已识别、必需变量齐全:

```json
{
  "status": "ok",
  "driver": "postgres",
  "adminConfigured": true,
  "secretConfigured": true,
  "timestamp": 1730000000000
}
```

`driver` 是当前生效的驱动:`postgres`、`mongodb`、`mysql` 或 `sqlite`。`adminConfigured` 与 `secretConfigured` 都为 `true` 表示管理密码与主密钥已配置(`MAILPORT_SECRET` 需至少 32 个字符)。

② 缺少数据库配置时,`status` 为 `degraded`、`driver` 为 `null`:

```json
{
  "status": "degraded",
  "driver": null,
  "adminConfigured": true,
  "secretConfigured": true,
  "timestamp": 1730000000000
}
```

此时后台保存会返回 503:

```json
{
  "error": "No database configured. Configure one of PG_*, MONGO_*, MYSQL_*, SQLITE_* in environment variables."
}
```

按[数据库配置指南](./db-guide)配置任意一组数据库变量即可。

③ 其它常见错误:

| 报错 | 原因 | 处理 |
| --- | --- | --- |
| `{"error":"ADMIN_PASSWORD is not configured on the server."}`(503) | 未设置 `ADMIN_PASSWORD` | 在部署平台补上该变量并重新部署 |
| `{"error":"Invalid password."}`(401) | 输入的密码与 `ADMIN_PASSWORD` 不一致 | 核对环境变量中的值 |
| `{"error":"MAILPORT_SECRET is not configured or shorter than 32 characters."}`(503) | 主密钥缺失或不足 32 位 | 设置至少 32 字符的 `MAILPORT_SECRET` |
| `PostgreSQL config incomplete: PG_DB/PG_USER (or POSTGRES_*) are required.` | 库名或用户名没填 | 补齐 `PG_DB` 与 `PG_USER` |
| `MongoDB config incomplete: MONGO_DB is required.` | 库名没填 | 补齐 `MONGO_DB` |
| `password authentication failed` / `bad auth : Authentication failed` | 用户名或密码错误 | 核对控制台里的用户名与密码,重置后同步更新环境变量 |
| `Server selection timed out after 8000 ms` | 网络不通或 IP 白名单未放行 | Atlas 检查 Network Access;自建检查防火墙与白名单配置 |

完整排错表见[数据库配置指南](./db-guide#六通用排错)。

## 二、登录控制面板
使用设置好的 `ADMIN_PASSWORD` 环境变量作为密码登录。详见[环境变量-必填变量](../reference/env.html#必填变量)。

点击**登录**，密码正确正常情况会登录成功。进入管理面板。

![控制台使用教程03](https://pic1.imgdb.cn/i/034m0QJLVk45W3JboxMD7E.jpg)

## 三、管理发件商
1. 点击 **新建发件商**。
2. 填写信息，并点击 **新建**。

> [!Note]
> Oauth 发件配置教程：[《Outlook / Gmail OAuth 发件》](./oauth)  
> HTTP API 发件配置教程：[《HTTP API 发件商》](./http-sender)

3. 如图，自动跳转该发件商的设置（密钥）页面。

![控制台使用教程04](https://pic1.imgdb.cn/i/034m0YvyLuWsC77p3Fqbil.jpg)

4. 在设置（密钥）页面，可以创建新密钥 / 禁用或删除某个密钥。

> [!IMPORTANT]
> 请不要泄露你的密钥，任何人只需要获取到你的密钥，加之你自己泄露了调用地址，就可以使用你配置的发件商批量发送邮件，包括垃圾邮件  
> 把密钥直接硬编码到代码中，也属于主动泄露密钥行为  
> 本项目作者针对因主动泄露密钥或调用地址，导致被人滥用发件服务，不承担任何法律责任

5. 在设置（设置）页面，可以查看当前的发件商配置，允许的收件人域名，以及进行发件测试。也可以在设置页编辑发件商配置信息。

6. 在设置（日志）页面，可以查看调用日志。调用失败时也会记录报错原因。

![控制台使用教程05](https://pic1.imgdb.cn/i/034m0sTGCDdbtsKgticzTx.jpg)
