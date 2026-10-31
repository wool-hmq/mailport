# データベース設定

MailPort は **PostgreSQL、MongoDB、MySQL / TiDB、SQLite** の 4 種類のデータベースに対応しています。アプリは **PostgreSQL → MongoDB → MySQL → SQLite** の固定順で設定済みドライバを検出するため、設定するのは 1 グループだけにしてください。変数の全リストは [環境変数](../reference/env.html) を参照してください。

このガイドは 2 つの問いに答えます。

1. **接続情報をどこから取得するか**（ホスト、ポート、データベース名、ユーザー名、パスワード）。
2. **接続文字列を MailPort が期待する環境変数にどう分割するか**。各セクションにコピーしてすぐ使える例を用意しています。

> [!IMPORTANT]
> MailPort は `DATABASE_URL` を**読みません**。どのプロバイダーも接続文字列を発行しますが、各セクションの対応表を使って個別の変数に分割する必要があります。

## 1. PostgreSQL

[Supabase](https://supabase.com)、[Neon](https://neon.tech)、[Tembo](https://tembo.io)、セルフホスト PostgreSQL で動作します。

### 1.1 変数の対応

| 変数 | 接続文字列のどの部分か | 例 |
| --- | --- | --- |
| `PG_HOST` | `//` の後、`:` の前のホスト名 | `db.example.com` |
| `PG_PORT` | ホスト名の後のポート | `5432` |
| `PG_USER` | `//` の後のユーザー名 | `myuser` |
| `PG_PASSWORD` | ユーザー名の後のパスワード | `secret` |
| `PG_DB` | 最後の `/` の後のデータベース名 | `mailport` |
| `PG_SSL` | 文字列内の `sslmode=require` → `true` | `true` |

接続文字列の実例:

```
postgresql://myuser:secret@db.example.com:5432/mailport?sslmode=require
```

環境変数:

```ini
PG_HOST=db.example.com
PG_PORT=5432
PG_USER=myuser
PG_PASSWORD=secret
PG_DB=mailport
PG_SSL=true
```

別名: `POSTGRES_DATABASE`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_HOST`、`POSTGRES_PORT`、`POSTGRES_SSL` は同じ意味で、`PG_*` が優先されます。

> [!TIP]
> `@`、`:`、`/` を含むパスワードは、接続文字列内ではパーセントエンコードされます（`%40`、`%3A` など）。`PG_PASSWORD` には**エンコード前の生のパスワード**を入れてください。

### 1.2 Supabase

**接続情報の取得**: [Supabase](https://supabase.com) ダッシュボードにログイン → プロジェクトを選択 → 上部の **Connect** → **Connection string** → **URI** をコピーします。ダッシュボードには 3 つのモードが表示されます。

| モード | 接続文字列の形 | ポート | 使いどころ |
| --- | --- | --- | --- |
| Session pooler | `postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres` | 5432 | 長時間稼働サービスに**推奨** |
| Transaction pooler | 上と同じでポート `6543` | 6543 | 短いトランザクションが多いサーバーレス |
| Direct connection | `postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres` | 5432 | 直接アクセス。ホストは IPv6 のみ |

**分割例（Session pooler）**:

```ini
PG_HOST=aws-0-ap-northeast-1.pooler.supabase.com
PG_PORT=5432
PG_USER=postgres.abcdefghijkl
PG_PASSWORD=your-database-password
PG_DB=postgres
PG_SSL=true
```

注意点:

- プーラー経由のユーザー名は**プロジェクトリファレンスを含みます**（`postgres.<project-ref>`）。一方、直接接続では単なる `postgres` を使います。ユーザー名を間違えると `password authentication failed for user "postgres"` になります。
- 直接接続のホスト `db.<ref>.supabase.co` は IPv6 のみで解決されます。IPv6 のない環境では接続できないため、プーラーのホストを使ってください。
- パスワードは **Database → Settings → Reset password** でリセットでき、その際は Vercel の `PG_PASSWORD` も更新してください。
- Supabase は SSL を要求するため、`PG_SSL=true` のままで構いません。

### 1.3 Neon

**接続情報の取得**: [Neon](https://neon.tech) コンソールにログイン → プロジェクトを選択 → **Dashboard** → **Connection details**（または右上の **Connect**）から、**Pooled connection** または **Direct connection** の URI をコピーします。

```
postgresql://neondb_owner:PASSWORD@ep-xxx-pooler.us-east-2.aws.neon.tech:5432/neondb?sslmode=require
```

**分割例**:

```ini
PG_HOST=ep-xxx-pooler.us-east-2.aws.neon.tech
PG_PORT=5432
PG_USER=neondb_owner
PG_PASSWORD=your-password
PG_DB=neondb
PG_SSL=true
```

注意点:

- プーラーのホスト名には `-pooler` が付き、直接接続のホスト名には付きません。混同しないでください。
- Neon は TLS を強制するため、`PG_SSL` は必ず `true` にします。
- デフォルトのデータベースは `neondb`、デフォルトのロールは `neondb_owner` です。**Roles** で独自のロールを作成した場合はその名前を使います。
- サーバーレスデプロイではプーラーエンドポイントを使ってください。直接接続エンドポイントの同時実行上限ははるかに低くなります。

### 1.4 Tembo

**接続情報の取得**: [Tembo](https://tembo.io) コンソールにログイン → インスタンスを開く → **Connection details** から PostgreSQL 接続文字列をコピーします。

```
postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

**分割例**:

```ini
PG_HOST=your-instance-host
PG_PORT=5432
PG_USER=your-user
PG_PASSWORD=your-password
PG_DB=your-database
PG_SSL=true
```

Tembo は標準的な PostgreSQL なので、対応は上のセクションと同じです。Tembo の接続ドキュメントは現在アクセスコードを要求する場合があります。迷ったらコンソールの **Connection details** パネルを信頼してください。

### 1.5 セルフホスト PostgreSQL

**接続情報の取得**:

- ローカルインストール: `psql "postgresql://user:pass@localhost:5432/mailport" -c '\conninfo'` を実行し、出力からホスト、ポート、ユーザー、データベースを取得します。
- リモートサーバー: サーバーのデータベースパネル（aaPanel、DataEase など）からホスト、ポート、ユーザー名、パスワード、データベース名を確認します。
- サーバー上では `127.0.0.1` を使い、コンテナ構成ではサービス名（例: `postgres`）を使います。

**分割例**:

```ini
PG_HOST=127.0.0.1
PG_PORT=5432
PG_USER=mailport
PG_PASSWORD=your-password
PG_DB=mailport
PG_SSL=false
```

セルフホストサーバーは通常 SSL なしで動くため `PG_SSL=false` です。`postgresql.conf` で `ssl = on` を有効にした場合は `true` にします。

## 2. MongoDB

[MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) とセルフホスト MongoDB で動作します。

### 2.1 変数の対応

| 変数 | 説明 | デフォルト |
| --- | --- | --- |
| `MONGO_DB` | データベース名。**必須** | |
| `MONGO_USER` | ユーザー名 | |
| `MONGO_PASSWORD` | パスワード | |
| `MONGO_HOST` | ホスト名。複数ホストはカンマ区切りまたは `["h1","h2"]` のような JSON 配列 | `127.0.0.1` |
| `MONGO_PORT` | ポート。配列も同様に使えます | `27017` |
| `MONGO_AUTHSOURCE` | 認証データベース | ユーザー設定時は `admin` |
| `MONGO_REPLICASET` | レプリカセット名。**複数ホストでは必須** | |
| `MONGO_OPT_SSL` | TLS を有効化 | `false` |

完全な接続文字列も指定できます。

| 変数 | 説明 |
| --- | --- |
| `MONGODB_URI` | 完全な接続文字列。設定すると上記の変数はすべて無視されます（`MONGO_DB` を除く） |

### 2.2 セルフホスト MongoDB

**接続情報の取得**:

```bash
# ローカル
mongosh "mongodb://user:pass@127.0.0.1:27017/mailport?authSource=admin"
```

リモートサーバーでは、サーバーパネルからホスト、ポート、ユーザー名、パスワードを確認します。MongoDB は認証が無効のまま出荷されるため、`--auth` を付けて起動し、ユーザーを作成してください。

**分割例**:

```ini
MONGO_HOST=127.0.0.1
MONGO_PORT=27017
MONGO_USER=mailport
MONGO_PASSWORD=your-password
MONGO_DB=mailport
MONGO_AUTHSOURCE=admin
MONGO_OPT_SSL=false
```

### 2.3 MongoDB Atlas（手順追い形式）

MongoDB Atlas は MongoDB のマネージドサービスです。無料の M0 共有クラスタで約 500 MB のストレージが得られ、MailPort の送信者設定、API キー、送信ログには十分すぎる容量です。以下の手順は Vercel デプロイを前提とします。

#### ステップ 1: 登録してクラスタを作成する

1. [MongoDB Atlas の登録ページ](https://www.mongodb.com/cloud/atlas/register) を開き、メールアドレス、Google アカウント、GitHub のいずれかで登録します。
2. 初回ログイン時に **Organization** と **Project** を作成します（プロジェクト名は任意、`mailport` で構いません）。
3. プロジェクトのホームページで **Create a deployment** をクリックし、**Shared** タブの無料 **M0** クラスタを選んで **Create** をクリックします。
4. バックエンドに近いリージョンを選んで接続レイテンシを下げます。Vercel のデフォルトは米国東海岸なので `AWS / N. Virginia (us-east-1)` が適切です。迷う場合は `AWS / Oregon (us-west-2)` が無難です。

#### ステップ 2: データベースユーザーを作成する

1. サイドバーで **Security → Database Access** を開きます（インターフェースのバージョンによっては **Project Settings → Database Access** にあります）。
2. **Add New Database User** をクリックします。
   - **Authentication Method** を `Password` にします。
   - **Password Authentication** にユーザー名を入力するか、**Auto Generate** をクリックして特殊文字を含まない強力なパスワードを生成します。
   - **Database User Privileges** で **Add Built In Role** をクリックし、**Select Role** を `Atlas Admin` にして **Add User** をクリックします。
3. **Finish and Close** をクリックします。

![Create a database user](https://twikoo.js.org/assets/mongodb-1.kzmwAvw2.png)

> [!IMPORTANT]
> 自動生成パスワードは一度しか表示されません — すぐにパスワード管理ツールにコピーしてください。忘れたパスワードは Database Access ページからのみリセットできます。

#### ステップ 3: IP アクセスリストを設定する

1. サイドバーで **Security → Network Access** を開きます（インターフェースのバージョンによっては **Project Settings → Network Access** にあります）。
2. **Add IP Address** をクリックします。
   - **Vercel / Netlify / Lambda の場合**: 送信 IP は変動するため、**Access List Entry** に `0.0.0.0/0` を入れてどこからでも接続できるようにします。
   - **自分の VPS の場合**: サーバーの固定グローバル IP（例: `203.0.113.10/32`）を入力します。
3. **Confirm** をクリックします。

![Configure the IP access list](https://twikoo.js.org/assets/mongodb-2.wGC2d7_O.png)

> [!WARNING]
> `0.0.0.0/0` はインターネット全体に接続試行を許します。データの安全性はデータベースユーザーのパスワードに完全に依存します。強力なパスワードを使い、漏洩が疑われたらすぐローテーションしてください。

#### ステップ 4: 接続文字列をコピーする

1. サイドバーで **Database → Clusters** を開き、クラスタの隣の **Connect** をクリックします。
2. **Drivers** を選び、**Node.js** を選択して接続文字列をコピーします。
3. `<username>:<password>` をステップ 2 の認証情報に置き換えます。

![Copy the connection string](https://twikoo.js.org/assets/mongodb-3.BlCbBw8p.png)

SRV 接続文字列は次の形です。

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
```

`@`、`:`、`/`、`?`、`#`、`%` を含むパスワードは URL エンコードが必要です（`@` は `%40` になります）。エンコードしないとドライバが URI をパースできません。

#### ステップ 5: 環境変数を入力する

Vercel プロジェクトの **Settings → Environment Variables** で変数を追加します。2 つの方法のどちらか一方を使ってください。混在させないこと。

**方法 A: 完全な接続文字列（推奨）**

```ini
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority&authSource=admin&ssl=true
MONGO_DB=mailport
```

- `MONGODB_URI` を設定すると、`MONGO_HOST`、`MONGO_PORT`、`MONGO_USER`、`MONGO_PASSWORD`、`MONGO_REPLICASET`、`MONGO_AUTHSOURCE`、`MONGO_OPT_SSL` はすべて無視されます。
- データベース名は `MONGO_DB`（または `MONGODB_DB`）から取得され、接続文字列に含まれている必要はありません。
- `authSource=admin` は Atlas Admin ユーザーを `admin` データベースに対して認証します。これが Atlas のデフォルトです。

**方法 B: 個別の変数に分割**

**Connect** ダイアログで **SRV Connection String** トグルをオフにし、標準の接続文字列をコピーします。

```
mongodb://<username>:<password>@<cluster>-shard-00-00.<xxxx>.mongodb.net:27017/?ssl=true&replicaSet=atlas-<xxxx>-shard-0&authSource=admin
```

一つずつ分割します。

```ini
MONGO_HOST=ac-xxxx.sh-xx.region.aws.future.mongodb.net
MONGO_PORT=27017
MONGO_USER=your-username
MONGO_PASSWORD=your-password
MONGO_DB=mailport
MONGO_AUTHSOURCE=admin
MONGO_REPLICASET=atlas-xxxx-shard-0
MONGO_OPT_SSL=true
```

> [!TIP]
> `MONGO_HOST` と `MONGO_PORT` は複数ホストを受け付けます。カンマ区切りまたは `["h1","h2"]`、`["27017","27017"]` のような JSON 配列です。ホストが 2 つ以上ある場合は `MONGO_REPLICASET` が必須です。

#### ステップ 6: 再デプロイして確認する

1. 変数を保存したら、Vercel プロジェクトで **Redeploy** をクリックします — 新しい環境変数は再デプロイ後にのみ反映されます。
2. `https://<your-app>.vercel.app/api/health` にリクエストし、ドライバが MongoDB として検出されていることを確認します。

```json
{
  "status": "ok",
  "driver": "mongodb",
  "adminConfigured": true,
  "secretConfigured": true,
  "timestamp": 1730000000000
}
```

3. `https://<your-app>.vercel.app/login` を開き、`ADMIN_PASSWORD` でログインし、送信者を作成して API キーを生成し、テストメールを送ってみます。

> MailPort は最初の書き込み時にテーブルとコレクションを作成します — 実行すべきマイグレーションスクリプトはありません。

#### MongoDB のトラブルシューティング

| 症状 | 原因 | 対処 |
| --- | --- | --- |
| `bad auth : Authentication failed` | ユーザー名かパスワードが誤り、特殊文字が URL エンコードされていない | パスワードをコピーし直し、上記の方法で特殊文字をエンコード |
| `Server selection timed out after 8000 ms` | 送信 IP がアクセスリストにない | Network Access で `0.0.0.0/0` または現在のグローバル IP を追加 |
| アクセスリストで許可されているのに `Authentication failed` | ユーザーが別のプロジェクトに所属している | Database Access のユーザーが現在のプロジェクトに属しているか確認 |
| ヘルスチェックは `status: "ok"` だが保存が失敗する | `MONGO_DB` のデータベースが存在しないか書き込み不可 | Atlas Data Explorer でデータベースを作成するか、既存のものを `MONGO_DB` に指定 |
| 初回デプロイ後に何も書き込めない | 再デプロイを忘れて変数が未反映 | Vercel で再デプロイを実行 |

## 3. MySQL / TiDB

セルフホスト MySQL、[PlanetScale](https://planetscale.com)、[FreeDB](https://freedb.tech)、[TiDB Cloud](https://tidbcloud.com) で動作します。TiDB は MySQL プロトコルを喋るため、`MYSQL_*` 変数がそのまま使えます。

### 3.1 変数の対応

| 変数 | 接続文字列のどの部分か | 例 |
| --- | --- | --- |
| `MYSQL_HOST` | `//` の後のホスト名 | `gateway01.xxx.prod.aws.tidbcloud.com` |
| `MYSQL_PORT` | ホスト名の後のポート | `4000` |
| `MYSQL_USER` | ユーザー名 | `root` |
| `MYSQL_PASSWORD` | パスワード | `secret` |
| `MYSQL_DB` | データベース名 | `mailport` |
| `MYSQL_SSL` | 接続が TLS を使うか | `true` |

実例:

```
mysql://root:secret@gateway01.xxx.prod.aws.tidbcloud.com:4000/mailport?ssl=true
```

```ini
MYSQL_HOST=gateway01.xxx.prod.aws.tidbcloud.com
MYSQL_PORT=4000
MYSQL_USER=root
MYSQL_PASSWORD=secret
MYSQL_DB=mailport
MYSQL_SSL=true
```

別名: `TIDB_DB`、`TIDB_USER`、`TIDB_PASSWORD`、`TIDB_HOST`、`TIDB_PORT`、`TIDB_SSL`。`MYSQL_*` が優先されます。

### 3.2 TiDB Cloud

**接続情報の取得**: TiDB Cloud にログイン → **Clusters** → クラスタ名をクリック → **Connect** → ダイアログで **Generate Password** をクリック（パスワードは一度しか表示されません）。同じパネルにホスト、ポート、ユーザー名、パスワードが表示されます。

```ini
MYSQL_HOST=gateway01.xxx.prod.aws.tidbcloud.com
MYSQL_PORT=4000
MYSQL_USER=root
MYSQL_PASSWORD=generated-password
MYSQL_DB=mailport
MYSQL_SSL=true
```

TiDB Cloud は TLS を強制するため、`MYSQL_SSL` は必ず `true` にします。データベースは **SQL Editor** またはクライアントから `CREATE DATABASE` で先に作成してください。

### 3.3 PlanetScale / FreeDB

**接続情報の取得**: コンソールの **Connect** パネルから接続文字列をコピーし、ブランチがユーザー名/パスワードの認証情報を発行していることを確認します（MailPort の MySQL ドライバは標準のユーザー名とパスワードで認証します）。文字列を取得したら 3.1 のルールで分割します。

```ini
MYSQL_HOST=hostname-from-the-connection-string
MYSQL_PORT=3306
MYSQL_USER=username-from-the-console
MYSQL_PASSWORD=password-from-the-console
MYSQL_DB=database-from-the-connection-string
MYSQL_SSL=true
```

### 3.4 セルフホスト MySQL

**接続情報の取得**: `mysql -u root -p -e "SELECT @@hostname, @@port, CURRENT_USER();"` を実行するか、サーバーパネルからホスト、ポート、ユーザー名、パスワード、データベース名を確認します。

```ini
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-password
MYSQL_DB=mailport
MYSQL_SSL=false
```

## 4. SQLite

SQLite はローカルファイルデータベースです。接続文字列は不要で、書き込み可能なディレクトリだけが要ります。

| 変数 | 説明 | デフォルト |
| --- | --- | --- |
| `SQLITE_PATH` | データベースファイルを置くディレクトリ | `./data` |
| `SQLITE_DB` | データベースファイル名 | `mailport.db` |

**ローカル開発**:

```ini
SQLITE_PATH=./data
```

**VPS デプロイ**: `SQLITE_PATH` を `/var/lib/mailport` のような永続ディレクトリに向けてください。コンテナの再構築やディレクトリのクリーンアップでもデータが失われなくなります。

```ini
SQLITE_PATH=/var/lib/mailport
SQLITE_DB=mailport.db
```

> [!WARNING]
> **Vercel Serverless のファイルシステムは読み取り専用のため、SQLite はデータを永続化できません** — インスタンスのリサイクル時に失われます。Vercel へのデプロイには PostgreSQL、MongoDB、MySQL を使ってください。

## 5. 設定の確認

変数を保存して再デプロイした後、`GET /api/health` にリクエストします。

```json
{
  "status": "ok",
  "driver": "postgres",
  "adminConfigured": true,
  "secretConfigured": true,
  "timestamp": 1730000000000
}
```

`driver` には有効なドライバが表示されます: `postgres`、`mongodb`、`mysql`、`sqlite`。

## 6. 一般的なトラブルシューティング

| 症状 | 原因 | 対処 |
| --- | --- | --- |
| `status: "degraded"`、`driver: null` | データベース変数が一つもない | いずれか 1 グループを設定。検出順は PostgreSQL → MongoDB → MySQL → SQLite で、最初に一致したものが使われる |
| 書き込みが 503 `No database configured...` を返す | 上に同じ、または変数名のタイプミス | `PG_DB` / `MONGO_DB` / `MYSQL_DB` / `SQLITE_PATH` の綴りと値が空でないことを確認 |
| `PostgreSQL config incomplete: PG_DB/PG_USER ... are required` | データベース名かユーザー名が未設定 | `PG_DB` と `PG_USER` を記入 |
| `MongoDB config incomplete: MONGO_DB is required` | データベース名が未設定 | `MONGO_DB` を記入 |
| `MySQL config incomplete: MYSQL_DB/MYSQL_USER ... are required` | データベース名かユーザー名が未設定 | `MYSQL_DB` と `MYSQL_USER` を記入 |
| `MongoDB: multiple MONGO_HOST values require MONGO_REPLICASET to be set` | レプリカセット名のない複数ホスト | `MONGO_REPLICASET` を追加 |
| `password authentication failed` | ユーザー名かパスワードが誤り。Supabase のプーラーユーザーはプロジェクトリファレンスが必要 | プロバイダーのコンソールでユーザー名を確認し、パスワードリセット後は変数を更新 |
| `Server selection timed out after 8000 ms` | ネットワーク到達不可、または IP が未許可 | Atlas の Network Access リストを確認。セルフホストではファイアウォールと `pg_hba.conf` / MongoDB のバインドアドレスを確認 |
| `MAILPORT_SECRET is not configured or shorter than 32 characters` | マスターシークレット未設定または短すぎる | `MAILPORT_SECRET` を 32 文字以上に設定 |
| 変数が反映されない | Vercel では再デプロイが必要 | プロジェクトページで再デプロイを実行 |

> [!TIP]
> データベースパスワード、SMTP パスワード、OAuth シークレット、API キーは MailPort 内では AES-256-GCM で暗号化されますが、接続パスワード自体はホスティングプラットフォームの環境変数に平文で存在し続けます。プラットフォームの環境変数機能を使い、認証情報をリポジトリにコミットしないでください。
