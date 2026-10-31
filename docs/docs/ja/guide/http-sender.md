# HTTP API 送信者

プレーンな SMTP に加えて、MailPort は「HTTP API」タイプの送信者に対応しています。これはメールリクエストを、あなたが用意した HTTP エンドポイント — 自作のサービスや、サードパーティ配信プラットフォームのウェブフック — にそのまま転送するものです。

---

## 仕組み

MailPort の送信エンドポイントを呼び出します。

```
POST /api/{pid}/send
```

MailPort はメール内容を受け取り、設定に基づいて**あなたの API URL** へ HTTP リクエストを発行します。

- メソッド: デフォルトは `POST`、変更可能
- ヘッダー: デフォルトは `Content-Type: application/json`、追加したカスタムヘッダーも付与
- ボディ: デフォルトはメール内容を運ぶ JSON ドキュメント、完全にカスタマイズ可能

実際の配信はあなたのサービスが行って応答し、MailPort がその結果を呼び出し元に返します。

```
your app  →  POST /api/{pid}/send  →  MailPort  →  POST your API URL  →  your service sends
```

---

## ダッシュボードでの設定

送信者を作成するとき、配信方式として **HTTP API** を選び、以下を入力します。

| 項目 | 必須 | 説明 |
| --- | --- | --- |
| リクエスト URL | はい | あなたのエンドポイント。`http://` または `https://` で始まる必要があります |
| HTTP メソッド | いいえ | デフォルトは `POST`。`POST` / `PUT` / `PATCH` / `GET` / `DELETE` |
| カスタムヘッダー | いいえ | JSON オブジェクト。下記参照 |
| カスタムボディ | いいえ | メール内容のテンプレート。下記参照 |

### カスタムヘッダー

空欄にするとデフォルトの `Content-Type: application/json` のみを送ります。ヘッダーを追加するには、標準的な JSON オブジェクトを指定します（**改行可**）。

```json
{
  "Authorization": "Bearer your-token-here",
  "X-Source": "mailport",
  "X-Project-Id": "42"
}
```

JSON ではキーと文字列にダブルクォートが必要で、最後の項目の後にカンマを置けません。形式は保存時に検証され、不正なオブジェクトは保存されずに拒否されます。

### カスタムボディとプレースホルダー

空欄にするとデフォルトのボディが使われます。

```json
{
  "to": "{{to}}",
  "subject": "{{subject}}",
  "text": "{{text}}",
  "html": "{{html}}"
}
```

`{{to}}` という表記は**プレースホルダー**です。送信前に MailPort が各プレースホルダーを実際のメール内容に置き換えます。対応する内容がないプレースホルダーは空文字列になります。利用できるプレースホルダー:

| プレースホルダー | 意味 |
| --- | --- |
| `{{to}}` | 宛先アドレス |
| `{{subject}}` | 件名 |
| `{{text}}` | 平文本文 |
| `{{html}}` | HTML 本文 |
| `{{from}}` | 差出人アドレス（ダッシュボードでの設定値） |
| `{{from_name}}` | 差出人表示名 |

上流 API が異なるフィールド名を期待している場合は、テンプレートを編集します。たとえば `email` と `content` を要求するなら:

```json
{
  "email": "{{to}}",
  "title": "{{subject}}",
  "content": "{{text}}"
}
```

JSON の代わりにフォームエンコードを要求する場合は、Content-Type ヘッダーを変更し、ボディをその形式で書きます。

```
to={{to}}&subject={{subject}}&body={{text}}
```

ボディ欄は改行できるので、長いテンプレートにも向いています。

---

## 上流レスポンス

- ステータスコードが `400` 未満なら成功とみなされます。MailPort は呼び出し元に `{ "success": true, "messageId": ... }` を返します。`messageId` は上流の JSON（`messageId` / `message_id` / `id` / `data.id`）から読み取られ、存在しない場合は `http:<status>` にフォールバックします。
- ステータスコードが `400` 以上なら失敗です。エラーにはデバッグ用に上流レスポンスボディ（最大 500 文字）が含まれます。
- 上流に到達できなかった場合、エラーは上流へのリクエストが失敗したことを示します。

成功・失敗を問わず、すべての呼び出しは送信ログに記録され、送信者の「Logs」タブで確認できます。

---

## エンドツーエンドの例

`https://mail.example.com/api/send` に送信サービスがあり、次を要求するとします。

- メソッド `POST`
- ヘッダー `Authorization: Bearer secret-token`
- ボディ `{"recipient": "...", "title": "...", "body": "..."}`

ダッシュボードの設定:

- リクエスト URL: `https://mail.example.com/api/send`
- HTTP メソッド: `POST`
- カスタムヘッダー:

  ```json
  {
    "Authorization": "Bearer secret-token"
  }
  ```

- カスタムボディ:

  ```json
  {
    "recipient": "{{to}}",
    "title": "{{subject}}",
    "body": "{{text}}"
  }
  ```

あとは他の送信者と同じように呼び出します。

```bash
curl -X POST https://your-app.vercel.app/api/{pid}/send \
  -H "Authorization: Bearer <mailport-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"to": "someone@example.com", "subject": "Hi", "text": "Hello"}'
```

MailPort が発行するリクエスト:

```bash
POST https://mail.example.com/api/send
Authorization: Bearer secret-token
Content-Type: application/json

{"recipient": "someone@example.com", "title": "Hi", "body": "Hello"}
```

---

## FAQ

**保存時に「Custom headers must be a JSON object」と失敗するのはなぜ？**
ヘッダーは JSON オブジェクト（波括弧のキー/値のペア）である必要があり、配列やただの文字列は受け付けません。クォートの対応と、末尾カンマがないかを確認してください。

**プレースホルダーが置換されないまま送信されたのはなぜ？**
プレースホルダーは `{{to}}` のように二重波括弧で書く必要があります。内部の空白は許容され（`{{ TO }}` も動作します）、大文字小文字は区別されません。

**GET を使ってクエリ文字列にパラメータを置けますか？**
はい。`GET` を選んでください。MailPort がテンプレート変数をクエリへ自動移動することはないため、プレースホルダーをリクエスト URL に直接書いてください。例: `https://api.example.com/send?to={{to}}`。

**カスタムヘッダー内のシークレットは安全ですか？**
MailPort の他の認証情報と同様に暗号化して（AES-256-GCM）保存され、以後平文で表示されることはありません。
