# デプロイ

MailPort は標準的な Next.js アプリです。Vercel へのデプロイは 3 ステップで完了します。

## 1. Vercel へのデプロイ（推奨）

### 1. リポジトリをインポートする

[vercel.com](https://vercel.com) で **Add New → Project** を選択し、MailPort のリポジトリをインポートします。Next.js として自動判定されるため、ビルド設定を変更する必要はありません。

**または**

下のボタンから Vercel に直接アクセスしてデプロイできます。

[![Vercel Deploy](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwool-hmq%2Fmailport%2Ftree%2Fmain%2Fexample)

> [!TIP]
> 未ログインの場合、Vercel から登録またはログインを求められます。GitHub アカウントでのログインが一番手軽です。

### 2. データベースを作成する

無料 PostgreSQL を提供しているサービスならどれでも構いません。

- [Neon](https://neon.tech) — 無料 512MB、サーバーレス向き、推奨
- [Supabase](https://supabase.com) — 無料 500MB
- [Tembo](https://tembo.io) — 無料 10GB

接続情報（ホスト、ポート、データベース名、ユーザー、パスワード）を控えておいてください。

他の種類のデータベースを使う場合は [データベース設定ガイド](./db-guide) を参照してください。

### 3. 環境変数を設定する

Vercel プロジェクトの **Settings → Environment Variables** で以下を設定します。

| 変数 | 値 |
| --- | --- |
| `ADMIN_PASSWORD` | ダッシュボードのパスワード |
| `MAILPORT_SECRET` | 32 文字以上のランダムな文字列 |
| `PG_DB` | データベース名 |
| `PG_USER` | ユーザー名 |
| `PG_PASSWORD` | パスワード |
| `PG_HOST` | データベースのホスト |
| `PG_PORT` | ポート（通常は 5432） |
| `PG_SSL` | `true`（クラウドデータベースでは通常必須） |

変数を反映するには再デプロイが必要です。

### 4. 動作確認

- `https://<your-app>.vercel.app/api/health` を開き、`status: "ok"`、`driver: "postgres"` が返ることを確認します。
- `https://<your-app>.vercel.app/login` を開き、`ADMIN_PASSWORD` でログインします。
- 送信者を作成してキーを発行し、キータブに表示される curl のスニペットを実行してみます。

> テーブルは最初のリクエスト時に自動作成されます。マイグレーションスクリプトの実行は不要です。

## 2. ローカル開発

```bash
# 依存パッケージをインストール
npm install

# ローカルデータベース用ディレクトリを用意（SQLite）
mkdir -p data

# 環境変数を設定
cp .env.example .env
# .env を編集 — 最低限必要な項目：
#   ADMIN_PASSWORD
#   MAILPORT_SECRET（32 文字以上）
#   SQLITE_PATH=./data

# 開発サーバーを起動
npm run dev
```

`http://localhost:3000/login` を開きます。

## 3. VPS / Docker デプロイ

```bash
# ビルドして起動
npm run build
npm run start

# または PM2 で常駐させる
pm2 start "npm run start" --name mailport
```

VPS では SQLite が使えます（ファイルシステムが書き込み可能なため）。`SQLITE_PATH` を永続化ディレクトリに向けてください。ポート 3000 の前面に Nginx を置きます。

## 4. データベースの選び方

| シナリオ | 推奨 |
| --- | --- |
| Vercel デプロイ | PostgreSQL（Neon / Supabase） |
| 中国本土からのアクセス | MongoDB Atlas またはセルフホスト MySQL |
| ローカル開発 | SQLite（設定不要） |
| VPS デプロイ | 何でも可。SQLite が最も簡単 |

**Vercel で SQLite は使わないでください** — サーバーレス関数のファイルシステムは読み取り専用で、書き込みが失われます。

## 5. リバースプロキシの注意点

Nginx を経由する場合、大きな HTML メールに備えてリクエストボディの上限を引き上げます。

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    client_max_body_size 10m;
}
```

## 6. アップグレード

```bash
git pull
npm install
npm run build
# プロセスを再起動
```

スキーマの変更は起動時にアプリ側で処理されます（`init()` 内の `CREATE TABLE IF NOT EXISTS`）。破壊的な変更については、リリースノートに専用のマイグレーションスクリプトが同梱されます。

## 7. トラブルシューティング

**ログインページに「ADMIN_PASSWORD is not configured」と表示される**
変数が設定されていません。Vercel プロジェクトの設定を確認して再デプロイしてください。

**`/api/health` が `degraded` を返す**
データベースグループが検出できていません。変数名（例：`PG_DATABASE` ではなく `PG_DB`）と値が空でないことを確認してください。

**503「MAILPORT_SECRET is not configured」**
`MAILPORT_SECRET` がないか、32 文字未満です。

**403「domain is not allowed」**
送信者に宛先ドメインのホワイトリストが設定されており、宛先ドメインが含まれていません。送信者の設定にドメインを追加するか、ホワイトリストを空にしてください（空の場合は制限なし）。

**SMTP が失敗する、またはタイムアウトする**
ポート 25 はクラウドプロバイダーでブロックされていることが多いです。465（SSL）か 587（TLS）を使ってください。一部のプロバイダー（QQ、163、Gmail など）ではログインパスワードの代わりにアプリ固有の認証コードが必要です。
