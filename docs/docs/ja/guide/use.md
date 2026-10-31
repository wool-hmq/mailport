# ダッシュボードの使い方

## 1. サイトを開いてデプロイを確認する

1. Vercel プロジェクトの概要ページを開き、デプロイした MailPort プロジェクトを見つけて **Visit** をクリックします。ダッシュボードのログインページに移動するはずです。

![Dashboard walkthrough 01](https://pic1.imgdb.cn/i/034lzkuQx87YpVW5qSWAzm.jpg)

![Dashboard walkthrough 02](https://pic1.imgdb.cn/i/034lzqqby4JISJy3FR6ouy.jpg)

2. `https://xxxx.vercel.app/api/health` にリクエストしてヘルスチェックを行い、不足している設定を見つけます。

① すべて設定済み — データベースドライバが検出され、必須変数も揃っています:

```json
{
  "status": "ok",
  "driver": "postgres",
  "adminConfigured": true,
  "secretConfigured": true,
  "timestamp": 1730000000000
}
```

`driver` は有効なドライバです: `postgres`、`mongodb`、`mysql`、`sqlite` のいずれか。`adminConfigured` と `secretConfigured` がどちらも `true` なら、管理者パスワードとマスターシークレットが設定されています（`MAILPORT_SECRET` は 32 文字以上必要です）。

② データベース未設定 — `status` が `degraded` で `driver` が `null` です:

```json
{
  "status": "degraded",
  "driver": null,
  "adminConfigured": true,
  "secretConfigured": true,
  "timestamp": 1730000000000
}
```

この状態でダッシュボードから何かを保存しようとすると 503 が返ります:

```json
{
  "error": "No database configured. Configure one of PG_*, MONGO_*, MYSQL_*, SQLITE_* in environment variables."
}
```

データベース変数のいずれか 1 グループを設定してください — [データベース設定ガイド](./db-guide) を参照。

③ その他のよくあるエラー:

| エラー | 原因 | 対処 |
| --- | --- | --- |
| `{"error":"ADMIN_PASSWORD is not configured on the server."}`（503） | `ADMIN_PASSWORD` 未設定 | ホスティングプラットフォームで変数を追加して再デプロイ |
| `{"error":"Invalid password."}`（401） | パスワードが `ADMIN_PASSWORD` と不一致 | 環境変数の値を確認 |
| `{"error":"MAILPORT_SECRET is not configured or shorter than 32 characters."}`（503） | マスターシークレット未設定または短すぎる | `MAILPORT_SECRET` を 32 文字以上に設定 |
| `PostgreSQL config incomplete: PG_DB/PG_USER (or POSTGRES_*) are required.` | データベース名またはユーザー未設定 | `PG_DB` と `PG_USER` を記入 |
| `MongoDB config incomplete: MONGO_DB is required.` | データベース名未設定 | `MONGO_DB` を記入 |
| `password authentication failed` / `bad auth : Authentication failed` | ユーザー名かパスワードが誤り | プロバイダーのコンソールで認証情報を確認し、環境変数を更新 |
| `Server selection timed out after 8000 ms` | ネットワーク到達不可、または IP が許可されていない | Atlas の Network Access リストを確認。セルフホストならファイアウォールと許可リストを確認 |

トラブルシューティングの全表は [データベース設定ガイド](./db-guide#6-一般的なトラブルシューティング) にあります。

## 2. ログイン

設定した `ADMIN_PASSWORD` をパスワードとしてログインします。詳しくは [環境変数 → 必須](../reference/env.html#必須) を参照してください。

**Sign in** をクリックします。正しいパスワードなら管理画面に入れます。

![Dashboard walkthrough 03](https://pic1.imgdb.cn/i/034m0QJLVk45W3JboxMD7E.jpg)

## 3. 送信者を管理する

1. **New sender** をクリックします。
2. フォームを記入して **Create** をクリックします。

> [!Note]
> OAuth 送信者の設定: [Outlook / Gmail OAuth 送信者](./oauth)
> HTTP API 送信者の設定: [HTTP API 送信者](./http-sender)

3. その送信者の設定（キー）ページへリダイレクトされます。

![Dashboard walkthrough 04](https://pic1.imgdb.cn/i/034m0YvyLuWsC77p3Fqbil.jpg)

4. キーページでは新しいキーの作成や、既存キーの無効化・削除ができます。

> [!IMPORTANT]
> キーを漏らさないでください。キーとエンドポイント URL を知る人は誰でも、あなたの送信者からスパムを含む大量メールを送れます。
> ソースコードへのキーのハードコードも漏洩とみなします。
> 漏洩したキーやエンドポイントによる悪用について、作者は一切の責任を負いません。

5. 設定ページでは送信者の設定内容、許可された宛先ドメインの確認と送信テストができます。設定の編集もここで行えます。

6. ログページでは呼び出し履歴を確認できます。失敗時にはエラー理由も記録されます。

![Dashboard walkthrough 05](https://pic1.imgdb.cn/i/034m0sTGCDdbtsKgticzTx.jpg)
