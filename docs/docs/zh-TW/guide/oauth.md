# Outlook / Gmail OAuth 寄件

對於 Outlook(Microsoft 365)和 Gmail 信箱,MailPort 支援用 OAuth2 授權寄件,
不需要在信箱裡開啟"應用專用密碼"或 IMTP 授權碼。授權後透過 SMTP XOAUTH2 投遞。

---

## 工作流程程

```
在 provider 註冊應用(填寫固定的回撥地址)
  →  後臺填寫 Client ID / Secret  →  點選「去授權」  →  跳轉到微軟/Google 授權頁
  →  同意後回撥 /api/oauth/callback  →  refresh token 加密入庫  →  可寄件
```

> 回撥地址是**固定值** `https://<你的域名>/api/oauth/callback`,不含寄件商資訊。
> 所以你可以在**建立寄件商之前**就先填進微軟/Google 的控制檯,不會卡在
> "要回撥地址才能建應用、要建應用才能看到寄件商回撥地址"的迴圈裡。
> 究竟是哪個寄件商,由授權時簽名的 `state` 引數在回撥時確定。

寄件時 MailPort 用 refresh token 自動換取 access token,再以 SMTP XOAUTH2 登入:
Outlook 走 `smtp.office365.com:587`,Gmail 走 `smtp.gmail.com`。

---

## 一、註冊 OAuth 應用

### Outlook(Microsoft Entra ID / Azure)

1. 開啟 [Azure 門戶 → 應用註冊](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade),點選「新建註冊」。
2. 名稱隨意;「受支援的帳戶型別」選「任何組織目錄中的帳戶和個人 Microsoft 帳戶」。
3. 「重定向 URI」選 **Web**,填入固定的回撥地址 `https://xxx.vercel.app/api/oauth/callback`(把域名換成你部署 MailPort 的域名)。
4. 註冊後,「概述」頁的**應用程式(客戶端) ID** 就是 Client ID。
5. 「證書和密碼 → 新客戶端密碼」建立一個 Secret,**複製 Value**(建立後只顯示一次)。

### Gmail(Google Cloud)

1. 開啟 [Google Cloud Console](https://console.cloud.google.com/),新建一個專案。
2. 「API 和服務 → 憑證 → 建立憑證 → OAuth 客戶端 ID」。應用型別選 **Web 應用**。
3. 按下表填好兩個地址,再點選「建立」。
4. 建立後記錄 **客戶端 ID** 和 **客戶端金鑰**。
5. 如果介面提示需要先設定「OAuth 同意螢幕」,按提示填好基本資訊(測試模式下填自己信箱為測試使用者即可)。

#### Gmail:在 Google 控制檯要填的兩個地址

在 Google Cloud「OAuth 客戶端 ID(Web 應用)」裡需要填兩個地址,**都以 MailPort 自己的域名為準**:

| Google 控制檯欄位 | 填什麼 | 示例 |
| --- | --- | --- |
| 已授權的 JavaScript 來源 | MailPort 部署的**站點地址**(出站請求的來源) | `https://your-app.vercel.app` |
| 已授權的重定向 URI | 固定的**回撥地址** | `https://your-app.vercel.app/api/oauth/callback` |

- 站點地址就是你部署 MailPort 的域名,不帶路徑,末尾不要加 `/`。
- 回撥地址固定為 `站點地址 + /api/oauth/callback`,所有寄件商相同,建立寄件商之前就可以填。
- 回撥地址必須與 Google 裡填的**完全一致**,否則 Google 會拒絕授權(報 `redirect_uri_mismatch`)。

> 回撥地址必須能從公網訪問,所以本地 `localhost` 只能用於除錯流程,正式使用要部署到 Vercel 等平臺。

---

## 二、在 MailPort 設定

1. 新建寄件商,「寄件方式」選 **Outlook OAuth** 或 **Gmail OAuth**。
2. 填寫:
   - **帳號信箱**:要授權的寄件信箱地址(如 `you@outlook.com`),用於 OAuth 登入。
   - **Client ID**:上一步拿到應用程式 ID。
   - **Client Secret**:上一步拿到的金鑰(儲存後不可再檢視,留空表示不修改)。
3. 點選「去授權」——設定會先儲存,然後跳轉到微軟/Google 的授權頁。
4. 在授權頁用對應信箱登入並同意許可權。
5. 授權成功會自動跳回 MailPort 寄件商頁面,提示「OAuth 授權成功」。

授權狀態會在「設定」標籤頁顯示(已授權 + 日期)。之後像普通寄件商一樣呼叫介面即可:

```bash
curl -X POST https://your-app.vercel.app/api/{pid}/send \
  -H "Authorization: Bearer <mailport-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"to": "someone@example.com", "subject": "Hi", "text": "Hello"}'
```

---

## 重新授權

以下情況需要重新授權(頁面上點「重新授權」即可,不用重填設定):

- refresh token 過期或被吊銷
- 換了 OAuth 應用(Client ID/Secret 變了)
- 想換一個信箱授權

Outlook 的 refresh token 通常長期有效;Gmail 預設 7 天不用會失效,失效後重新授權一次即可。

---

## 需要申請的許可權範圍

MailPort 只申請寄件所需的最小許可權:

| 信箱 | Scope |
| --- | --- |
| Outlook | `https://outlook.office.com/SMTP.Send` + `offline_access` |
| Gmail | `https://mail.google.com/` |

- `offline_access`(Outlook)/ `access_type=offline`(Gmail)用於拿到 refresh token,這是持久寄件的前提。
- Gmail 授權時固定帶上 `prompt=consent`,確保每次都能拿到新的 refresh token。

---

## 安全說明

- Client Secret 與 refresh token 在資料庫裡以 AES-256-GCM 加密儲存,前端不再回顯。
- 授權回撥裡的 `state` 引數用 `MAILPORT_SECRET` 簽名(10 分鐘有效),既用於防止跨站請求偽造,也用於在固定回撥地址下定位是哪個寄件商。
- 授權回撥介面是公開的,但它只能完成"寫入授權權杖"這一件事,不會洩露任何已存在的憑證。
