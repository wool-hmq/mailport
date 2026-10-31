# 環境変数

MailPort は完全に環境変数で設定します。Vercel では **Settings → Environment Variables** へ、ローカル開発では `.env.example` を `.env` にコピーしてください。

## 必須

| 変数 | 説明 |
| --- | --- |
| `ADMIN_PASSWORD` | ダッシュボードのログインパスワード。長いランダム文字列を使ってください |
| `MAILPORT_SECRET` | マスターシークレット。SMTP パスワードと API キーの暗号化、管理セッションの署名に使われます。**32 文字以上。** 安全に保管してください。ローテーションすると暗号化済みの認証情報はすべて無効になります |

これらがないと、ログインが 503 を返し、書き込みは失敗します。

## データベース（1 グループだけ設定）

MailPort は **PostgreSQL → MongoDB → MySQL → SQLite** の固定順でドライバを自動検出します。設定するのは 1 グループだけにしてください。

### PostgreSQL

[Supabase](https://supabase.com)、[Neon](https://neon.tech)、[Tembo](https://tembo.io)、セルフホストで動作します。

| 変数 | 必須 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `PG_DB` | はい | | データベース名 |
| `PG_USER` | はい | | ユーザー名 |
| `PG_PASSWORD` | はい | | パスワード |
| `PG_HOST` | | `127.0.0.1` | ホスト |
| `PG_PORT` | | `5432` | ポート |
| `PG_SSL` | | `false` | SSL を強制 |

別名として `POSTGRES_DATABASE`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_HOST`、`POSTGRES_PORT`、`POSTGRES_SSL` も受け付けます。

### MongoDB

[MongoDB Atlas](https://www.mongodb.com) またはセルフホスト MongoDB で動作します。

| 変数 | 必須 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `MONGO_DB` | はい | | データベース名 |
| `MONGO_USER` | | | ユーザー名（通常セルフホストでは必須） |
| `MONGO_PASSWORD` | | | パスワード |
| `MONGO_HOST` | | `127.0.0.1` | ホスト。クラスタの場合は `["h1","h2"]` のような JSON 配列を使います |
| `MONGO_PORT` | | `27017` | ポート。クラスタでは JSON 配列 |
| `MONGO_REPLICASET` | | | レプリカセット名。複数ホストでは必須 |
| `MONGO_AUTHSOURCE` | | `admin`（ユーザー設定時） | 認証ソース |
| `MONGO_OPT_SSL` | | `false` | Atlas では `true` が必要 |

完全な `MONGODB_URI` 接続文字列も受け付け、上記の変数より優先されます。

### MySQL / TiDB

セルフホスト MySQL、[PlanetScale](https://planetscale.com)、[FreeDB](https://freedb.tech) で動作します。TiDB はワイヤ互換なので MySQL の変数を使います。

| 変数 | 必須 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `MYSQL_DB` | はい | | データベース名 |
| `MYSQL_USER` | はい | | ユーザー名 |
| `MYSQL_PASSWORD` | はい | | パスワード |
| `MYSQL_HOST` | | `127.0.0.1` | ホスト |
| `MYSQL_PORT` | | `3306` | ポート |
| `MYSQL_SSL` | | `false` | SSL を強制 |

TiDB の別名 `TIDB_DB`、`TIDB_USER`、`TIDB_PASSWORD`、`TIDB_HOST`、`TIDB_PORT`、`TIDB_SSL` も受け付けます。

### SQLite

ローカル開発と VPS 専用です。**Vercel Serverless では使えません**（読み取り専用ファイルシステム）。

| 変数 | 必須 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `SQLITE_PATH` | はい | `./data` | データベースファイルを置くディレクトリ |
| `SQLITE_DB` | | `mailport.db` | データベースファイル名 |

## オプション

| 変数 | デフォルト | 説明 |
| --- | --- | --- |
| `SITE_LOCALE` | `en` | UI のデフォルト言語。値: `en`、`zh-cn` |
| `SESSION_TTL` | `604800`（7 日） | 管理セッションの有効期間（秒） |
| `TZ` | `UTC` | 予約。このバージョンでは UI に影響しません（下記注意参照） |

## タイムゾーン（TZ）

現行バージョンでは、送信ログとキー使用時刻はブラウザ側で整形され、閲覧者ごとのシステムタイムゾーンに従います — サーバー側の `TZ` 変数は UI に影響しません。将来のサーバー側時刻整形のために予約されています。

設定する場合は、POSIX タイムゾーンの符号は**逆になる**ことに注意してください。

| 値 | 実際のゾーン |
| --- | --- |
| `Asia/Shanghai` | UTC+8（推奨。IANA 名で DST も処理） |
| `UTC-8` | UTC+8 |
| `Etc/GMT-8` | UTC+8 |
| `UTC+8` | **UTC-8**（逆になる — よくある落とし穴） |

## UI の言語

`SITE_LOCALE` を設定してダッシュボードのデフォルト言語を選びます。

| 値 | 言語 |
| --- | --- |
| `en` | 英語（デフォルト） |
| `zh-cn` | 簡体字中国語 |

無効な値や未設定の場合は英語にフォールバックします。

ユーザーはダッシュボード右上のドロップダウンから言語を切り替えることもできます。選択は Cookie に 1 年間保存され、環境変数のデフォルトを上書きします。言語を追加する方法は `src/i18n/` の説明を参照してください。

## 検出順序

```
PG_DB / POSTGRES_DATABASE  →  PostgreSQL
MONGO_DB / MONGODB_URI     →  MongoDB
MYSQL_DB / TIDB_DB         →  MySQL
SQLITE_PATH / SQLITE_DB    →  SQLite
```

どれも設定されていない場合、`/api/health` は `status: "degraded"` を報告し、すべての書き込みが 503 を返します。

## `MAILPORT_SECRET` のローテーション

変更すると、それまでに暗号化された SMTP パスワードと API キーが復号できなくなります。ローテーション手順:

1. `MAILPORT_SECRET` を変更します。
2. 各送信者の SMTP パスワードをダッシュボードで再入力します。
3. 古い API キーを削除して新しいキーを生成し、呼び出し元を更新します。

## デプロイ後の確認

`GET /api/health`:

```json
{
  "status": "ok",
  "driver": "postgres",
  "adminConfigured": true,
  "secretConfigured": true,
  "timestamp": 1730000000000
}
```

`driver: null` または `status: "degraded"` はデータベースが検出できていないことを意味します。各プロバイダーの接続情報の取得先と、上記の変数への分割方法は [データベース設定ガイド](../guide/db-guide.html) を参照してください。
