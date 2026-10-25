---
pageType: home

hero:
  tagline: 把邮件发送变成 HTTP API
  description: 每个发件商拥有独立接口与 API 密钥，在网页控制台中统一管理
  image:
    src: /mailport-logo.png
    alt: MailPort
  actions:
    - theme: brand
      text: API 参考
      link: /reference/api.html
    - theme: alt
      text: 部署指南
      link: /guide/deploy.html
    - theme: alt
      text: GitHub
      link: https://github.com/wool-hmq/mailport

features:
  - title: 统一发件商
    details: 同一控制台管理 SMTP、HTTP API、Gmail 与 Outlook OAuth 发件商
  - title: 独立接口与密钥
    details: 每个发件商拥有独立接口地址、独立 API 密钥与收件域名白名单
  - title: 多数据库支持
    details: PostgreSQL、MongoDB、MySQL/TiDB 与 SQLite，按环境变量自动选择
  - title: 发送日志
    details: 每次请求都记录状态、错误信息与耗时
  - title: 凭据加密
    details: SMTP 密码、OAuth 密钥与 API 密钥以 AES-256-GCM 加密存储
  - title: 发送验证码图片
    details: 发件接口支持内嵌验证码图片，满足带图片验证码的邮件场景
---
