# Outlook / Gmail OAuth 送信者

Outlook（Microsoft 365）と Gmail のメールボックスでは、MailPort は OAuth2 で送信できます。アプリパスワードや IMAP トークンはメールボックス側で発行する必要がありません。承認後、メールは SMTP XOAUTH2 で配信されます。

---

## 流れ

```
プロバイダーにアプリを登録（固定のコールバック URL を入力）
  →  ダッシュボード: Client ID / Secret  →  「Authorize」をクリック  →  プロバイダーの同意ページ
  →  コールバック /api/oauth/callback  →  リフレッシュトークンを暗号化して保存  →  送信準備完了
```

> コールバック URL は `https://<your-domain>/api/oauth/callback` という**固定値**で、送信者の情報を含みません。そのため、送信者を作成する**前に** Azure/Google に入力できます。「アプリ登録のためにコールバック URL が必要」と「コールバック URL を見るために送信者が必要」という循環依存は発生しません。どの送信者を承認しているかは、コールバック時に署名済みの `state` によって判別されます。

送信時、MailPort はリフレッシュトークンをアクセストークンに交換し、SMTP XOAUTH2 でログインします。Outlook は `smtp.office365.com:587`、Gmail は `smtp.gmail.com` を使用します。

---

## 1. OAuth アプリケーションを登録する

### Outlook（Microsoft Entra ID / Azure）

1. [Azure portal → アプリの登録](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) を開き、「新規登録」をクリックします。
2. 名前は任意。「サポートされているアカウントの種類」は「任意の組織ディレクトリ内のアカウントと個人の Microsoft アカウント」を選択します。
3. 「リダイレクト URI」で **Web** を選択し、固定のコールバック URL `https://xxx.vercel.app/api/oauth/callback` を入力します（ドメインは MailPort をデプロイした場所に置き換えてください）。
4. 登録後、概要ページの **アプリケーション (クライアント) ID** が Client ID です。
5. 「証明書とシークレット → 新しいクライアント シークレット」でシークレットを作成し、**その値をコピー**します。値は一度しか表示されません。

### Gmail（Google Cloud）

1. [Google Cloud Console](https://console.cloud.google.com/) を開き、プロジェクトを作成します。
2. 「API とサービス → 認証情報 → 認証情報を作成 → OAuth クライアント ID」に進み、アプリケーションの種類は **ウェブ アプリケーション** を選択します。
3. 後述の 2 つのアドレスを入力して「作成」をクリックします。
4. **クライアント ID** と **クライアント シークレット** を控えます。
5. 先に「OAuth 同意画面」の設定を求められた場合は、基本情報を入力します（テストモードでは自分のメールアドレスをテストユーザーに追加します）。

#### Gmail: Google Cloud に入力する 2 つのアドレス

Google Cloud の「OAuth クライアント ID（ウェブ アプリケーション）」フォームには、**どちらも MailPort 自身のドメインを基準**とした 2 つのアドレスを入力します。

| Google Cloud の項目 | 入力する内容 | 例 |
| --- | --- | --- |
| 承認済みの JavaScript 生成元 | MailPort をデプロイした**サイトのアドレス**（送信リクエストのオリジン） | `https://your-app.vercel.app` |
| 承認済みのリダイレクト URI | 固定の**コールバック アドレス** | `https://your-app.vercel.app/api/oauth/callback` |

- サイトのアドレスは MailPort のデプロイ ドメインで、パスも末尾の `/` も付けません。
- コールバック アドレスは固定です: サイトのアドレス + `/api/oauth/callback`。すべての送信者で共通なので、送信者を作成する前に入力できます。
- コールバック アドレスは Google と**完全に一致**する必要があります。一致しない場合、Google は `redirect_uri_mismatch` で承認を拒否します。

> コールバック アドレスは公衆インターネットから到達可能である必要があるため、`localhost` はフローのデバッグにのみ機能します。実際に使う場合は Vercel などにデプロイしてください。

---

## 2. MailPort で設定する

1. 送信者を作成し、配信方式として **Outlook OAuth** または **Gmail OAuth** を選択します。
2. 以下を入力します。
   - **アカウントのメールアドレス**: 承認するメールボックス（例: `you@outlook.com`）。OAuth ログインに使用します。
   - **Client ID**: 前のステップで取得したもの。
   - **Client Secret**: 前のステップで取得したもの（保存後は再表示できません。空欄のままだと変更されません）。
3. **Authorize** をクリックします — 設定がまず保存され、その後プロバイダーの同意ページへリダイレクトされます。
4. メールボックスでサインインして同意します。
5. 成功すると、成功メッセージとともに送信者ページへ戻されます。

承認状態（承認済み + 日付）は「Settings」タブに表示されます。以降は他の送信者と同じようにエンドポイントを呼び出せます。

```bash
curl -X POST https://your-app.vercel.app/api/{pid}/send \
  -H "Authorization: Bearer <mailport-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"to": "someone@example.com", "subject": "Hi", "text": "Hello"}'
```

---

## 再承認

再承認（「Re-authorize」ボタン — 設定の再入力は不要）が必要なのは以下の場合です。

- リフレッシュトークンが失効した、または取り消された
- 別の OAuth アプリケーション（異なる Client ID/Secret）に切り替えた
- 別のメールボックスを承認したい

Outlook のリフレッシュトークンは一般的に長期間有効です。Gmail のトークンは約 7 日間非アクティブで失効します — その場合は再承認してください。

---

## 要求されるスコープ

MailPort は送信に必要な最小限のスコープだけを要求します。

| メールボックス | スコープ |
| --- | --- |
| Outlook | `https://outlook.office.com/SMTP.Send` + `offline_access` |
| Gmail | `https://mail.google.com/` |

- `offline_access`（Outlook）/ `access_type=offline`（Gmail）によりリフレッシュトークンが発行されます。継続的な送信には必須です。
- Gmail は常に `prompt=consent` を送るため、毎回新しいリフレッシュトークンが発行されます。

---

## セキュリティに関する注意

- Client secret とリフレッシュトークンは AES-256-GCM で暗号化して保存され、フロントエンドに再表示されることはありません。
- コールバックの `state` パラメータは `MAILPORT_SECRET` で署名され（有効期間 10 分）、CSRF を防止するとともに、固定コールバックがどの送信者に属するかを識別します。
- コールバックエンドポイントは公開されていますが、その唯一の機能は承認トークンの書き込みであり、既存の認証情報が露出することはありません。
