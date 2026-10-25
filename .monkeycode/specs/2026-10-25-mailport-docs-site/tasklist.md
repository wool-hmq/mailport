# Implementation Task List

Feature: mailport-docs-site
Updated: 2026-10-25

## Tasks

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | 迁移 `doc/en`、`doc/zh-cn` 到 `docs/docs/{en,zh-cn}` | Done | 12 个文件保持原文件名与内容 |
| 2 | 创建文档工程 `docs/package.json`、`docs/tsconfig.json`、`docs/.gitignore` | Done | npm + `@rspress/core` ^2.0.1，锁文件入库 |
| 3 | 编写 `docs/rspress.config.ts` | Done | `lang: zh-cn`、`base: /mailport/`、`locales: zh-cn/en`、`i18nSource` 双语文案 |
| 4 | 添加站点图标与双语首页 | Done | `docs/docs/public/mailport-icon.svg`、`docs/docs/index.md`、`docs/docs/en/index.md` |
| 5 | 配置顶部导航与全局侧边栏 | Done | 每个语言目录含 `_nav.json` 与 v2 格式 `_meta.json` |
| 6 | 本地构建验证 | Done | `npm run build` 通过，产物含根路径首页与 `en/` 页面，资源带 `/mailport/` 前缀 |
| 7 | 更新 README 文档链接 | Done | 入口指向 `https://mailport.lab.j3.ink/`，表格链接改为 `docs/docs/...` |
| 8 | 新增 `.github/workflows/docs.yml` | Done | Node 20 + `npm ci` + `actions/deploy-pages` |
| 9 | 本地开发服务器预览 | Done | `npm run dev` 启动（端口 4173），通过平台预览地址验证后已停止 |
| 10 | 提交并推送到 `main` | Done | 提交 `376902e`，推送至 `wool-hmq/mailport` main |
| 11 | 仓库 Settings → Pages 设置 Source 为 GitHub Actions | Done | 工作流 `Deploy Rspress site to Pages` 构建与部署均成功，站点已可访问 |
| 12 | 文档目录拆分为 `guide/` 与 `reference/` | Done | 中文沿用远程提交的 `guide/`、`reference/` 分栏；英文镜像同样的目录结构，`_meta.json` 下沉到各子目录 |
| 13 | 修复两种语言的顶部导航 | Done | `_nav.json` 按「使用指南 / 发件商配置 / 参考手册」分组，链接指向 `/guide/...`、`/reference/...` |
| 14 | 编写 `guide/db-guide.md` | Done | 单一文件覆盖 PostgreSQL（Supabase / Neon / Tembo / 自建）、MongoDB（自建 + Atlas 详细图文教程）、MySQL / TiDB、SQLite，每节给出「获取连接信息 → 拆成环境变量」的示例与通用排错表 |
| 15 | 补齐 `guide/introduction.md` 与 `guide/use.md` | Done | 简介按 README 特性改写；`use.md` 填入 `/api/health` 三种真实输出（成功、缺数据库、其它错误）并修正环境变量链接 |
| 16 | 英文镜像新增页面 | Done | 新增 `en/guide/introduction.md`、`en/guide/use.md`、`en/guide/db-guide.md` |
| 17 | 同步 README 文档表格与首页按钮链接 | Done | README 指向新目录路径；双语首页按钮指向 `/reference/api.html` 与 `/guide/deploy.html` |
| 18 | 本地构建验证 | Done | `cd docs && npm run build` 通过，产物含 `/guide/*.html`、`/reference/*.html` 及 `/en/` 对应页面 |

## Verification

- `cd docs && npm run build`：构建成功，无警告与错误。
- 产物检查：`doc_build/index.html`（简体中文首页）、`doc_build/en/index.html`（English 首页）、`doc_build/guide/db-guide.html`、`doc_build/reference/api.html` 与 `doc_build/en/guide/db-guide.html` 均存在。
- 侧边栏检查：两种语言均渲染 `guide/` 六篇与 `reference/` 三篇入口。
- 首页链接检查：简体中文首页指向 `/reference/api.html`，English 首页指向 `/en/reference/api.html`。
- 图片检查：`guide/db-guide.html` 引用 MongoDB Atlas 三张官方界面截图。
