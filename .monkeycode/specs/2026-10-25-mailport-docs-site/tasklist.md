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
| 7 | 更新 README 文档链接 | Done | 入口指向 `https://wool-hmq.github.io/mailport/`，表格链接改为 `docs/docs/...` |
| 8 | 新增 `.github/workflows/docs.yml` | Done | Node 20 + `npm ci` + `actions/deploy-pages` |
| 9 | 本地开发服务器预览 | Done | `npm run dev` 启动并通过平台预览地址验证 |
| 10 | 提交并推送到 `main` | Done | 提交包含文档工程、迁移、README 与工作流 |
| 11 | 仓库 Settings → Pages 设置 Source 为 GitHub Actions | Pending | 需要仓库管理员在 GitHub 页面操作 |

## Verification

- `cd docs && npm run build`：构建成功，无警告与错误。
- 产物检查：`doc_build/index.html`（简体中文首页）、`doc_build/en/index.html`（English 首页）、`doc_build/api.html` 与 `doc_build/en/api.html` 均存在。
- 侧边栏检查：两种语言的 `api.html` 均渲染六篇文档入口。
- 首页链接检查：简体中文首页指向 `/mailport/api.html`，English 首页指向 `/mailport/en/api.html`。
