# はじめに

MailPort はメール送信を HTTP API に変換します。送信者ごとに専用のエンドポイントと API キーが割り当てられ、すべてウェブダッシュボードから管理できます。データは任意のデータベースに保存されます。

## できること

- **ダッシュボード** — SMTP、HTTP API、Gmail・Outlook OAuth の各送信者を作成・管理するための、パスワード保護付き管理 UI。
- **送信者ごとのエンドポイント** — `POST /api/{pid}/send`。`pid` は作成時に生成される 5〜10 文字のランダム ID です。
- **送信者ごとの複数キー** — 設定ページで 32 文字の API キーを生成し、いつでも表示・有効化・無効化・失効できます。
- **宛先ドメインのホワイトリスト** — ダッシュボードで送信者ごとに設定し、データベースに保存します。
- **多データベース対応** — PostgreSQL、MongoDB、MySQL/TiDB、SQLite から環境変数に応じて自動選択。
- **送信ログ** — すべてのリクエストにステータス・エラー・処理時間を記録。
- **認証情報の暗号化** — SMTP パスワード、OAuth シークレット、API キーは AES-256-GCM で暗号化して保存。
- **CAPTCHA 画像の埋め込み** — 送信エンドポイントはメール本文に CAPTCHA 画像を埋め込めます。

## クイックスタート

```bash
# 依存パッケージをインストール
npm install

# 環境変数テンプレートをコピーして記入
cp .env.example .env

# 開発サーバーを起動
npm run dev
```

`http://localhost:3000/login` を開き、`ADMIN_PASSWORD` でログインします。

最小限の動作設定（SQLite）:

```ini
ADMIN_PASSWORD=your-admin-password
MAILPORT_SECRET=at-least-32-random-characters
SQLITE_PATH=./data
```

## API の呼び出し

```bash
curl -X POST https://your-app.vercel.app/api/a1b2c3/send \
  -H "Authorization: Bearer <32-char-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"to": "someone@example.com", "subject": "Hi", "text": "Hello from MailPort"}'
```

## 次のステップ

- [デプロイガイド](./deploy) — Vercel または自分のサーバーにデプロイします。
- [データベース設定ガイド](./db-guide) — Supabase、Neon、MongoDB Atlas などから接続情報を取得し、環境変数に分割します。
- [ダッシュボードの使い方](./use) — ログイン、送信者の作成、キーの生成。
- [API リファレンス](../reference/api) — 送信エンドポイントとエラーコード。
