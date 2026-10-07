# 部署 / Deployment

MailPort 是标准 Next.js 应用,部署到 Vercel 只需三步。

## 一、Vercel 部署(推荐)

### 1. 导入仓库

在 [vercel.com](https://vercel.com) 选择 **Add New → Project**,导入你的 MailPort 仓库。框架自动识别为 Next.js,构建命令与输出目录无需修改。

### 2. 创建数据库

任选一个提供免费 PostgreSQL 的服务:

- [Neon](https://neon.tech) — 512MB 免费,Serverless 友好,推荐
- [Supabase](https://supabase.com) — 500MB 免费
- [Tembo](https://tembo.io) — 10GB 免费

拿到连接信息(主机、端口、库名、用户名、密码)。

### 3. 配置环境变量

在 Vercel 项目的 **Settings → Environment Variables** 中添加:

| 变量 | 值 |
| --- | --- |
| `ADMIN_PASSWORD` | 自定义管理后台密码 |
| `MAILPORT_SECRET` | 至少 32 字符随机字符串 |
| `PG_DB` | 数据库名 |
| `PG_USER` | 用户名 |
| `PG_PASSWORD` | 密码 |
| `PG_HOST` | 数据库地址 |
| `PG_PORT` | 端口(通常 5432) |
| `PG_SSL` | `true`(云数据库通常需要) |

重新部署使变量生效。

### 4. 验证

- 访问 `https://<your-app>.vercel.app/api/health`,确认 `status: "ok"`、`driver: "postgres"`。
- 访问 `https://<your-app>.vercel.app/login`,用 `ADMIN_PASSWORD` 登录。
- 新建发件商,生成密钥,按页面提示的 curl 调用一次。

> 首次请求时应用会自动建表,无需手动执行迁移脚本。

## 二、本地开发

```bash
# 1. 安装依赖
npm install

# 2. 准备本地数据库(以 SQLite 为例)
mkdir -p data

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env,至少填写:
#   ADMIN_PASSWORD
#   MAILPORT_SECRET(>= 32 字符)
#   SQLITE_PATH=./data

# 4. 启动开发服务器
npm run dev
```

打开 `http://localhost:3000/login`。

## 三、VPS / Docker 独立部署

```bash
# 构建并启动
npm run build
npm run start

# 或用 PM2 守护
pm2 start "npm run start" --name mailport
```

VPS 部署时 SQLite 可用(文件可写),配置 `SQLITE_PATH` 指向持久化目录即可。用 Nginx 反代 3000 端口。

## 四、数据库选型建议

| 场景 | 推荐 |
| --- | --- |
| Vercel 部署 | PostgreSQL(Neon / Supabase) |
| 国内访问 | MongoDB Atlas 或自建 MySQL |
| 本地开发 | SQLite,零配置 |
| VPS 独立部署 | 任意,SQLite 最省事 |

**SQLite 不能用于 Vercel**:Serverless 函数的文件系统只读,写入会丢失。

## 五、反向代理注意事项

若在 Nginx 后面部署,需要放行请求体大小(发送 HTML 邮件时可能较大):

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    client_max_body_size 10m;
}
```

## 六、升级

```bash
git pull
npm install
npm run build
# 重启进程
```

表结构变更由应用在启动时自动处理(`init()` 中的 `CREATE TABLE IF NOT EXISTS`)。若遇到不兼容的破坏性变更,会在发布说明中单独给出迁移脚本。

## 七、常见问题

**登录页提示 "ADMIN_PASSWORD is not configured"**
环境变量未生效。检查 Vercel 项目设置,确认添加后重新部署。

**`/api/health` 返回 `degraded`**
没有任何一组数据库变量被识别。确认变量名拼写(如 `PG_DB` 不是 `PG_DATABASE`),且值非空。

**接口返回 503 "MAILPORT_SECRET is not configured"**
`MAILPORT_SECRET` 未设置或不足 32 字符。

**调用接口 403 "domain is not allowed"**
该发件商配置了收件域名白名单,收件人域名不在其中。在后台该发件商的设置里添加,或清空白名单(空表示不限制)。

**SMTP 发送失败 / 超时**
云服务商可能封锁 25 端口;改用 465(SSL)或 587(TLS)。部分邮箱(QQ、163、Gmail)需要在后台开启 SMTP 并使用授权码而非登录密码。
