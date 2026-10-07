/**
 * OAuth2 授权流程工具(Outlook / Gmail)。
 *
 * 流程:
 * 1. 管理员在发件商配置里填写 Client ID / Client Secret,保存
 * 2. 点击"去授权",跳转到 provider 的授权页(redirect_uri 为 /api/{pid}/oauth/callback)
 * 3. 用户同意后 provider 回调本应用,后端用 code 换 access/refresh token
 * 4. refresh token 加密入库,之后发件走 SMTP XOAUTH2
 *
 * state 用 MAILPORT_SECRET 签名的 JWT,携带发件商 id 与过期时间,防 CSRF。
 */

import { SignJWT, jwtVerify } from "jose";

import type { Sender } from "../storage/types";

interface ProviderConfig {
  /** 授权页地址 */
  authorizeUrl: string;
  /** 换 token 的地址 */
  tokenUrl: string;
  /** 申请的权限范围 */
  scope: string;
  /** 额外的授权页参数 */
  extraAuthParams?: Record<string, string>;
}

const PROVIDERS: Record<"outlook_oauth2" | "gmail_oauth2", ProviderConfig> = {
  outlook_oauth2: {
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "https://outlook.office.com/SMTP.Send offline_access",
  },
  gmail_oauth2: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://mail.google.com/",
    // Google 默认只对首次授权下发 refresh_token,强制每次都重新确认
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },
};

function getSecret(): Uint8Array {
  const secret = process.env.MAILPORT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("MAILPORT_SECRET is not configured or shorter than 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

function provider(sender: Sender): ProviderConfig {
  if (sender.type !== "outlook_oauth2" && sender.type !== "gmail_oauth2") {
    throw new Error(`Sender type ${sender.type} does not support OAuth.`);
  }
  return PROVIDERS[sender.type];
}

/** 回调地址:每个发件商独立,用其 pid 作为路由标识 */
export function getCallbackUrl(origin: string, sender: Sender): string {
  return `${origin.replace(/\/$/, "")}/api/${sender.pid}/oauth/callback`;
}

async function signState(senderId: string): Promise<string> {
  return new SignJWT({ sid: senderId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .setIssuer("mailport-oauth")
    .sign(getSecret());
}

export async function verifyState(state: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(state, getSecret(), { issuer: "mailport-oauth" });
    const sid = (payload as { sid?: unknown }).sid;
    return typeof sid === "string" ? sid : null;
  } catch {
    return null;
  }
}

/** 构造授权页跳转地址 */
export async function buildAuthUrl(origin: string, sender: Sender): Promise<string> {
  const cfg = provider(sender);
  if (!sender.oauthClientId) {
    throw new Error("OAuth clientId is required before authorization.");
  }
  const redirectUri = getCallbackUrl(origin, sender);
  const params = new URLSearchParams({
    client_id: sender.oauthClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: cfg.scope,
    state: await signState(sender.id),
    ...(cfg.extraAuthParams ?? {}),
  });
  return `${cfg.authorizeUrl}?${params.toString()}`;
}

export interface OAuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
}

/** 用授权码换 token */
export async function exchangeCode(
  sender: Sender,
  code: string,
  redirectUri: string,
): Promise<OAuthTokens> {
  const cfg = provider(sender);
  if (!sender.oauthClientId || !sender.oauthClientSecret) {
    throw new Error("OAuth clientId / clientSecret are required.");
  }
  const body = new URLSearchParams({
    client_id: sender.oauthClientId,
    client_secret: sender.oauthClientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OAuth token exchange failed (${res.status}): ${text.slice(0, 300)}`);
  }
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("OAuth token exchange returned a non-JSON response.");
  }
  const refreshToken = data["refresh_token"];
  if (!refreshToken || typeof refreshToken !== "string") {
    throw new Error(
      "The provider did not return a refresh_token. Re-authorize and make sure you consent to offline access.",
    );
  }
  return {
    accessToken: typeof data["access_token"] === "string" ? (data["access_token"] as string) : null,
    refreshToken: refreshToken as string,
    expiresIn: typeof data["expires_in"] === "number" ? (data["expires_in"] as number) : null,
  };
}
