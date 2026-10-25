# Requirements Document

## Introduction

MailPort 当前以 `doc/en` 与 `doc/zh-cn` 两组 Markdown 文件承载用户文档，README 通过相对路径链接到这些文件。项目需要一个与 Rin 文档站同款的在线文档站：基于 Rspress 构建中英双语站点，并由 GitHub Actions 在代码推送时自动构建并发布到 GitHub Pages。

## Glossary

- **System**: MailPort 文档站工程，包含 Rspress 配置、文档源文件与 GitHub Actions 工作流
- **Documentation Source**: `docs/docs/` 目录下的 Markdown / MDX 源文件
- **Locale**: `en`（English）与 `zh-cn`（简体中文）两套站点语言目录
- **Docs Site**: 构建产物 `docs/doc_build/`，由 Rspress 生成
- **Pages Workflow**: `.github/workflows/docs.yml`，负责构建与发布 Docs Site
- **Documentation Root**: `docs/` 工程目录，与 MailPort 应用代码目录同级

## Requirements

### Requirement 1: 双语文档站构建

**User Story:** AS 文档维护者, I want 用单一构建命令生成中英双语文档站, so that 文档内容无需重复维护即可在线浏览

#### Acceptance Criteria

1. WHEN 在 `docs/` 目录执行构建命令, THE System SHALL 生成同时包含 English 与 简体中文 两套路由的静态站点
2. WHILE 站点处于构建完成状态, THE System SHALL 将简体中文版本发布在根路径 `/`，并将 English 版本发布在 `/en/` 路径下（默认语言占据站点根路径，与 Rspress v2 的默认语言路由规则一致）
3. IF 任一语言的 Markdown 文件存在失效的相对链接, THE System SHALL 在构建阶段报告错误
4. WHEN 维护者修改 `docs/docs/` 下任意语言目录中的文档, THE System SHALL 将该修改应用到对应语言的页面

### Requirement 2: 现有文档迁移与站点结构

**User Story:** AS 文档维护者, I want 现有 `doc/en` 与 `doc/zh-cn` 内容迁移到文档站工程, so that 历史文档保持可访问且进入统一导航

#### Acceptance Criteria

1. WHEN 迁移完成, THE System SHALL 将 `doc/en` 的全部文档置于 `docs/docs/en/`，并将 `doc/zh-cn` 的全部文档置于 `docs/docs/zh-cn/`
2. WHILE 迁移后的站点被访问, THE System SHALL 为 API、环境变量、数据库、HTTP 发件商、OAuth、部署六类文档提供双语入口
3. IF 仓库根 README 引用文档路径, THE System SHALL 将引用更新为迁移后的路径或在线站点地址
4. WHEN 维护者在文档站工程内新增文档, THE System SHALL 依据 `_nav.json` 与 `_meta.json` 声明的顺序展示导航项

### Requirement 3: 站点首页与品牌信息

**User Story:** AS 站点访客, I want 打开文档站即看到 MailPort 的定位与文档入口, so that 我能快速开始使用

#### Acceptance Criteria

1. WHEN 访客访问站点根路径, THE System SHALL 展示 MailPort 首页，含项目简介、核心能力与主要文档入口
2. WHILE 访客切换站点语言, THE System SHALL 同步切换首页文案与文档入口
3. WHEN 访客浏览任意页面, THE System SHALL 展示 MailPort 的站点标题、描述与 GitHub 仓库入口

### Requirement 4: GitHub Pages 自动部署

**User Story:** AS 项目维护者, I want 文档推送到主分支后自动发布到 GitHub Pages, so that 文档更新无需人工操作即可上线

#### Acceptance Criteria

1. WHEN `docs/` 目录或 Pages 工作流文件被推送到 `main` 分支, THE Pages Workflow SHALL 自动执行构建并发布站点
2. WHILE 构建阶段运行, THE Pages Workflow SHALL 安装文档站依赖、执行 Rspress 构建并上传 `docs/doc_build` 作为 Pages 产物
3. IF 需要手动触发发布, THE Maintainer SHALL 能够通过工作流的手动触发入口重新发布站点
4. WHILE 发布任务运行, THE Pages Workflow SHALL 具备读取仓库内容、写入 Pages 与申请 OIDC 令牌的权限
5. IF 同一分支存在多次发布请求, THE Pages Workflow SHALL 串行执行发布任务，避免产物互相覆盖

### Requirement 5: 本地开发与预览

**User Story:** AS 文档维护者, I want 在本地启动文档站开发服务器, so that 我能在提交前确认页面效果

#### Acceptance Criteria

1. WHEN 维护者在 `docs/` 目录执行开发命令, THE System SHALL 启动本地开发服务器并提供文档预览地址
2. WHILE 开发服务器运行, THE System SHALL 支持通过 `.monkeycode-ai.online` 域名访问预览
3. IF 维护者在 `docs/` 目录执行构建命令, THE System SHALL 输出可部署的静态文件到 `docs/doc_build/`
