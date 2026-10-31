# データベース構造

MailPort は 3 つのテーブルを使用します（MongoDB ではコレクション）。最初のリクエスト時に自動作成されるため、手動のマイグレーションは不要です。

フィールド名はどのデータベースでも同一です。以下の snake_case 名はリレーショナル形式の表記です。

## `senders` — 送信者

各行は独立した送信チャネルで、専用のエンドポイント、キー、宛先ドメインホワイトリストを持ちます。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `id` | TEXT / VARCHAR(64) | 主キー、UUID |
| `pid` | TEXT, unique | ルート ID。作成時に生成される 5〜10 文字の英数字で、送信エンドポイント `/api/{pid}/send` の構成に使われます |
| `name` | TEXT | 表示名。ダッシュボード専用 |
| `type` | TEXT | 配信方式: `smtp`（アカウント/パスワード）、`http`（HTTP API 転送）、`outlook_oauth2`、`gmail_oauth2` |
| `enabled` | BOOLEAN | 無効化するとエンドポイントは 404 を返します |
| `host` | TEXT, nullable | SMTP ホスト。`service` 設定時は null |
| `port` | INT, nullable | SMTP ポート。通常は 465 / 587 |
| `secure` | BOOLEAN | SSL/TLS を使用 |
| `service` | TEXT, nullable | nodemailer の組み込みサービス名（例: `QQ`、`Gmail`）。host/port を上書きします。[対応プロバイダー一覧](https://github.com/nodemailer/nodemailer/blob/master/src/well-known/services.json) |
| `username` | TEXT, nullable | SMTP ログインアカウント。OAuth タイプでは承認済みメールボックスのアドレス |
| `password` | TEXT, nullable | SMTP パスワード。**AES-256-GCM で暗号化**、読み取り時に復号 |
| `from_address` | TEXT, nullable | 差出人アドレス。未設定時は `username` にフォールバック |
| `from_name` | TEXT, nullable | 差出人表示名 |
| `allowed_domains` | JSON / JSONB | 許可された宛先ドメイン。**空配列は制限なしを意味します** |
| `http_url` | TEXT, nullable | `http` タイプのリクエスト URL |
| `http_method` | TEXT, nullable | `http` タイプの HTTP メソッド。デフォルトは `POST` |
| `http_headers` | TEXT, nullable | `http` タイプのカスタムヘッダー。JSON オブジェクト文字列 |
| `http_body` | TEXT, nullable | `http` タイプのカスタムボディテンプレート。`{{to}}` プレースホルダーに対応 |
| `oauth_client_id` | TEXT, nullable | OAuth アプリケーションの Client ID |
| `oauth_client_secret` | TEXT, nullable | OAuth アプリケーションの Client Secret。**AES-256-GCM で暗号化** |
| `oauth_refresh_token` | TEXT, nullable | OAuth リフレッシュトークン。**AES-256-GCM で暗号化** |
| `oauth_authorized_at` | BIGINT, nullable | OAuth 承認完了時のタイムスタンプ（エポック ms）。完了までは null |
| `created_at` | BIGINT | 作成時刻、エポック ms |
| `updated_at` | BIGINT | 更新時刻、エポック ms |

インデックス: `pid` のユニークインデックス。

> **アップグレードに関する注意**: v0.1.0 以降に追加された 8 列（`http_*` / `oauth_*`）はアプリ起動時に自動追加されます — 既存データベースで手動マイグレーションは不要です。

## `sender_keys` — 送信者 API キー

1 つの送信者は複数の 32 文字キーを持て、それぞれ個別に有効化・無効化・失効できます。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `id` | TEXT / VARCHAR(64) | 主キー、UUID |
| `sender_id` | TEXT | 所属する送信者の `id`。カスケード削除 |
| `key` | TEXT | 32 文字のランダムキー。**AES-256-GCM で暗号化**、ダッシュボードで表示可能 |
| `label` | TEXT | 呼び出し元を識別するメモ |
| `enabled` | BOOLEAN | 無効化すると、このキーを使うリクエストは 401 を返します |
| `last_used_at` | BIGINT, nullable | 最終成功呼び出し、エポック ms |
| `created_at` | BIGINT | 作成時刻、エポック ms |

インデックス: `sender_id`。

## `send_logs` — 送信ログ

エンドポイントへの呼び出しはすべて、成功・失敗を問わず記録されます。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `id` | TEXT / VARCHAR(64) | 主キー、UUID |
| `sender_id` | TEXT | 所属する送信者の `id`。カスケード削除 |
| `key_id` | TEXT, nullable | 呼び出しに使われたキーの `id` |
| `to_addr` | TEXT | 宛先アドレス |
| `subject` | TEXT | 件名 |
| `status` | TEXT | `success` または `failed` |
| `error` | TEXT, nullable | 失敗時のエラーメッセージ |
| `duration` | BIGINT | 経過ミリ秒 |
| `created_at` | BIGINT | タイムスタンプ、エポック ms |

インデックス: `(sender_id, created_at DESC)` 複合、`status`。

## データベースごとの違い

| 項目 | PostgreSQL | MySQL / TiDB | MongoDB | SQLite |
| --- | --- | --- | --- | --- |
| 配列カラム | JSONB | JSON | ネイティブ配列 | JSON 文字列 |
| タイムスタンプ | BIGINT | BIGINT | Long | INTEGER |
| 主キー | TEXT | VARCHAR(64) | `_id`（String） | TEXT |
| カスケード削除 | FK | FK | アプリケーションレベル | FK |
| テーブル接頭辞 | なし | なし | なし | なし |

MongoDB には外部キーがないため、送信者を削除すると、そのキーとログも同じ操作で削除されます。

## セキュリティに関する注意

- SMTP パスワード、OAuth の client secret / リフレッシュトークン、API キーは、`v1:` 接頭辞付きの AES-256-GCM 暗号文として保存されます。
- `MAILPORT_SECRET` が唯一の復号経路であり、データベースやログに書き込まれることはありません。
- ログテーブルに本文や平文キーが記録されることはありません。
- ヘルスエンドポイントは設定の有無だけを報告し、認証情報は一切返しません。
