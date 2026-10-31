---
pageType: home

hero:
  tagline: 把郵件傳送變成 HTTP API
  description: 每個寄件商擁有獨立介面與 API 金鑰，在網頁控制台中統一管理
  image:
    src: /mailport-logo.png
    alt: MailPort
  actions:
    - theme: brand
      text: API 參考
      link: /zh-TW/reference/api.html
    - theme: alt
      text: 部署指南
      link: /zh-TW/guide/deploy.html
    - theme: alt
      text: GitHub
      link: https://github.com/wool-hmq/mailport

features:
  - title: 統一寄件商
    details: 同一控制台管理 SMTP、HTTP API、Gmail 與 Outlook OAuth 寄件商
  - title: 獨立介面與金鑰
    details: 每個寄件商擁有獨立介面位址、獨立 API 金鑰與收件網域白名單
  - title: 多資料庫支援
    details: PostgreSQL、MongoDB、MySQL/TiDB 與 SQLite，依環境變數自動選擇
  - title: 傳送日誌
    details: 每次請求都記錄狀態、錯誤資訊與耗時
  - title: 憑證加密
    details: SMTP 密碼、OAuth 金鑰與 API 金鑰以 AES-256-GCM 加密儲存
  - title: 傳送驗證碼圖片
    details: 寄件介面支援內嵌驗證碼圖片，滿足帶圖片驗證碼的郵件場景
---
