# Outlook / Gmail OAuth 发件

对于 Outlook(Microsoft 365)和 Gmail 邮箱,MailPort 支持用 OAuth2 授权发件,
不需要在邮箱里开启"应用专用密码"或 IMTP 授权码。授权后通过 SMTP XOAUTH2 投递。

---

## 工作流程

```
后台填写 Client ID / Secret  →  点击「去授权」  →  跳转到微软/Google 授权页
   →  同意后回调 /api/{pid}/oauth/callback  →  refresh token 加密入库  →  可发件
```

发件时 MailPort 用 refresh token 自动换取 access token,再以 SMTP XOAUTH2 登录:
Outlook 走 `smtp.office365.com:587`,Gmail 走 `smtp.gmail.com`。

---

## 一、注册 OAuth 应用

### Outlook(Microsoft Entra ID / Azure)

1. 打开 [Azure 门户 → 应用注册](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade),点击「新建注册」。
2. 名称随意;「受支持的帐户类型」选「任何组织目录中的帐户和个人 Microsoft 帐户」。
3. 「重定向 URI」选 **Web**,填入后台发件商页面显示的**回调地址**(形如 `https://xxx.vercel.app/api/{pid}/oauth/callback`)。
4. 注册后,「概述」页的**应用程序(客户端) ID** 就是 Client ID。
5. 「证书和密码 → 新客户端密码」创建一个 Secret,**复制 Value**(创建后只显示一次)。

### Gmail(Google Cloud)

1. 打开 [Google Cloud Console](https://console.cloud.google.com/),新建一个项目。
2. 「API 和服务 → 凭据 → 创建凭据 → OAuth 客户端 ID」。应用类型选 **Web 应用**。
3. 「已授权的重定向 URI」填入后台显示的**回调地址**。
4. 创建后记录 **客户端 ID** 和 **客户端密钥**。
5. 如果界面提示需要先配置「OAuth 同意屏幕」,按提示填好基本信息(测试模式下填自己邮箱为测试用户即可)。

#### Gmail:授权请求地址

点击「去授权」时,MailPort 会用下面这个地址向 Google 发起认证请求。把它作为对照,
可以在 Google 应用里核对重定向 URI、Scope 等设置是否一致:

```
https://accounts.google.com/o/oauth2/v2/auth
  ?client_id=<你的客户端 ID>
  &redirect_uri=https://<你的域名>/api/<pid>/oauth/callback
  &response_type=code
  &scope=https://mail.google.com/
  &access_type=offline
  &prompt=consent
  &state=<MailPort 签名的一次性校验值>
```

- `redirect_uri` 就是「已授权的重定向 URI」里要填的那个地址,每个发件商不同。
- `scope=https://mail.google.com/` 是发件所需权限;`access_type=offline` + `prompt=consent`
  保证能拿到长期可用的 refresh token。
- `state` 由 MailPort 自动生成签名,不需要你填写或配置。

> 每个发件商的回调地址不同(路径里带各自的 pid),以发件商配置页面显示的为准。
> 回调地址必须能从公网访问,所以本地 `localhost` 只能用于调试流程,正式使用要部署到 Vercel 等平台。

---

## 二、在 MailPort 配置

1. 新建发件商,「发件方式」选 **Outlook OAuth** 或 **Gmail OAuth**。
2. 填写:
   - **账号邮箱**:要授权的发件邮箱地址(如 `you@outlook.com`),用于 OAuth 登录。
   - **Client ID**:上一步拿到应用程序 ID。
   - **Client Secret**:上一步拿到的密钥(保存后不可再查看,留空表示不修改)。
3. 点击「去授权」——配置会先保存,然后跳转到微软/Google 的授权页。
4. 在授权页用对应邮箱登录并同意权限。
5. 授权成功会自动跳回 MailPort 发件商页面,提示「OAuth 授权成功」。

授权状态会在「设置」标签页显示(已授权 + 日期)。之后像普通发件商一样调用接口即可:

```bash
curl -X POST https://your-app.vercel.app/api/{pid}/send \
  -H "Authorization: Bearer <mailport-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"to": "someone@example.com", "subject": "Hi", "text": "Hello"}'
```

---

## 重新授权

以下情况需要重新授权(页面上点「重新授权」即可,不用重填配置):

- refresh token 过期或被吊销
- 换了 OAuth 应用(Client ID/Secret 变了)
- 想换一个邮箱授权

Outlook 的 refresh token 通常长期有效;Gmail 默认 7 天不用会失效,失效后重新授权一次即可。

---

## 需要申请的权限范围

MailPort 只申请发件所需的最小权限:

| 邮箱 | Scope |
| --- | --- |
| Outlook | `https://outlook.office.com/SMTP.Send` + `offline_access` |
| Gmail | `https://mail.google.com/` |

- `offline_access`(Outlook)/ `access_type=offline`(Gmail)用于拿到 refresh token,这是持久发件的前提。
- Gmail 授权时固定带上 `prompt=consent`,确保每次都能拿到新的 refresh token。

---

## 安全说明

- Client Secret 与 refresh token 在数据库里以 AES-256-GCM 加密存储,前端不再回显。
- 授权回调里的 `state` 参数用 `MAILPORT_SECRET` 签名(10 分钟有效),防止跨站请求伪造。
- 授权回调接口是公开的,但它只能完成"写入授权令牌"这一件事,不会泄露任何已存在的凭据。
