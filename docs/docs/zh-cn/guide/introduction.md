# 简介

MailPort 把邮件发送变成 HTTP API。每个发件商拥有独立接口地址与独立 API 密钥,统一在网页控制台里管理,数据存储在你选择的数据库里。

## 它能做什么

- **控制台** — 带密码保护的管理后台,创建并管理 SMTP、HTTP API、Gmail 与 Outlook OAuth 发件商。
- **每个发件商一个接口** — `POST /api/{pid}/send`,`pid` 是创建时随机生成的 5–10 位字符。
- **每个发件商多把密钥** — 在设置页生成 32 位 API 密钥,可随时查看、禁用或删除。
- **收件域名白名单** — 按发件商配置允许的收件人域名,存在数据库里。
- **多数据库** — PostgreSQL、MongoDB、MySQL / TiDB、SQLite,按环境变量自动选择。
- **发送日志** — 每次请求都记录状态、错误信息与耗时。
- **凭据加密** — SMTP 密码、OAuth 密钥与 API 密钥以 AES-256-GCM 加密存储。
- **内嵌验证码图片** — 发送接口支持在邮件正文中内嵌验证码图片。

## 快速开始

```bash
# 安装依赖
npm install

# 复制环境变量模板并填写
cp .env.example .env

# 启动开发服务器
npm run dev
```

打开 `http://localhost:3000/login`,用 `ADMIN_PASSWORD` 登录。

最小可用配置(以 SQLite 为例):

```ini
ADMIN_PASSWORD=your-admin-password
MAILPORT_SECRET=at-least-32-random-characters
SQLITE_PATH=./data
```

## 调用接口

```bash
curl -X POST https://your-app.vercel.app/api/a1b2c3/send \
  -H "Authorization: Bearer <32-char-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"to": "someone@example.com", "subject": "Hi", "text": "Hello from MailPort"}'
```

## 下一步

- [部署指南](./deploy) — 部署到 Vercel 或自己的服务器。
- [数据库配置指南](./db-guide) — 从 Supabase、Neon、MongoDB Atlas 等平台获取连接信息,并拆成环境变量。
- [控制台使用教程](./use) — 登录后台、创建发件商、生成密钥。
- [API 参考](../reference/api) — 发送接口与错误码。
