---
pageType: home

hero:
  tagline: メール送信を HTTP API に
  description: 送信者ごとに独立したエンドポイントと API キーを持ち、ウェブダッシュボードで一元管理
  image:
    src: /mailport-logo.png
    alt: MailPort
  actions:
    - theme: brand
      text: API リファレンス
      link: /ja/reference/api.html
    - theme: alt
      text: デプロイガイド
      link: /ja/guide/deploy.html
    - theme: alt
      text: GitHub
      link: https://github.com/wool-hmq/mailport

features:
  - title: 送信者の一元管理
    details: SMTP、HTTP API、Gmail・Outlook OAuth の送信者を 1 つのダッシュボードで管理
  - title: 独立したエンドポイントとキー
    details: 送信者ごとに専用エンドポイント、API キー、宛先ドメインのホワイトリストを発行
  - title: 多データベース対応
    details: PostgreSQL、MongoDB、MySQL/TiDB、SQLite から環境変数で自動選択
  - title: 送信ログ
    details: 全リクエストのステータス・エラー・処理時間を記録
  - title: 認証情報の暗号化
    details: SMTP パスワード、OAuth シークレット、API キーを AES-256-GCM で暗号化して保存
  - title: CAPTCHA 画像の送信
    details: 送信エンドポイントは CAPTCHA 画像を埋め込めるため、画像認証付きメールにも対応
---
