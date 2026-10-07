/**
 * 发件能力:按 provider 类型分流。
 *
 * - smtp:经典账号密码(nodemailer 直连)
 * - outlook_oauth2 / gmail_oauth2:OAuth2 授权后用 SMTP XOAUTH2 发件
 * - http:把邮件请求转发到用户自定义的 HTTP API
 */

import nodemailer, { type Transporter } from "nodemailer";

import type { Sender } from "../storage/types";

const transporterCache = new Map<string, Transporter>();

function cacheKey(sender: Sender): string {
  return `${sender.id}@${sender.updatedAt}`;
}

/** 未填请求体时使用的默认模板(JSON) */
const DEFAULT_HTTP_BODY = `{
  "to": "{{to}}",
  "subject": "{{subject}}",
  "text": "{{text}}",
  "html": "{{html}}"
}`;

/** 把 {{占位符}} 替换为实际值;未定义的占位符替换为空字符串,占位符名大小写不敏感 */
function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => vars[key.toLowerCase()] ?? "");
}

/** 解析用户填写的自定义请求头:标准 JSON 对象文本,留空返回空对象 */
function parseHttpHeaders(raw: string | null | undefined): Record<string, string> {
  if (!raw || !raw.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Custom headers are not valid JSON. Expected an object like {\"Authorization\": \"Bearer xxx\"}.");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Custom headers must be a JSON object like {\"Authorization\": \"Bearer xxx\"}.");
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    out[String(k)] = String(v ?? "");
  }
  return out;
}

function buildSmtpTransporter(sender: Sender): Transporter {
  if (!sender.host && !sender.service) {
    throw new Error("SMTP configuration incomplete: host or service is required.");
  }
  if (!sender.username || !sender.password) {
    throw new Error("SMTP configuration incomplete: username and password are required.");
  }
  const config: Record<string, unknown> = {
    auth: { user: sender.username, pass: sender.password },
  };
  if (sender.service) {
    config.service = sender.service;
  } else {
    config.host = sender.host;
    config.port = sender.port ?? 465;
    config.secure = sender.secure;
  }
  return nodemailer.createTransport(config as any);
}

/** OAuth2 发件:Outlook / Gmail,统一走 SMTP XOAUTH2 */
function buildOAuth2Transporter(sender: Sender): Transporter {
  if (!sender.oauthClientId || !sender.oauthClientSecret) {
    throw new Error("OAuth2 configuration incomplete: clientId and clientSecret are required.");
  }
  if (!sender.oauthRefreshToken) {
    throw new Error("This sender has not been authorized yet. Complete OAuth authorization in the dashboard first.");
  }
  if (!sender.username) {
    throw new Error("OAuth2 configuration incomplete: the account email address is required.");
  }

  const auth = {
    type: "OAuth2" as const,
    user: sender.username,
    clientId: sender.oauthClientId,
    clientSecret: sender.oauthClientSecret,
    refreshToken: sender.oauthRefreshToken,
  };

  if (sender.type === "outlook_oauth2") {
    return nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      authMethod: "XOAUTH2",
      tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      auth,
    } as any);
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth,
  } as any);
}

function getTransporter(sender: Sender): Transporter {
  const key = cacheKey(sender);
  const cached = transporterCache.get(key);
  if (cached) return cached;
  const transporter =
    sender.type === "outlook_oauth2" || sender.type === "gmail_oauth2"
      ? buildOAuth2Transporter(sender)
      : buildSmtpTransporter(sender);
  if (transporterCache.size > 64) transporterCache.clear();
  transporterCache.set(key, transporter);
  return transporter;
}

async function sendViaMailTransporter(sender: Sender, input: SendMailInput): Promise<SendMailResult> {
  const transporter = getTransporter(sender);
  const from = sender.fromAddress
    ? sender.fromName
      ? `"${sender.fromName}" <${sender.fromAddress}>`
      : sender.fromAddress
    : sender.username!;
  const info = await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  return { messageId: info.messageId };
}

async function sendViaHttp(sender: Sender, input: SendMailInput): Promise<SendMailResult> {
  if (!sender.httpUrl) {
    throw new Error("HTTP sender configuration incomplete: request URL is required.");
  }
  const method = (sender.httpMethod || "POST").toUpperCase();
  if (!/^https?:\/\//i.test(sender.httpUrl)) {
    throw new Error("Request URL must start with http:// or https://");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...parseHttpHeaders(sender.httpHeaders),
  };
  const tpl = sender.httpBody && sender.httpBody.trim() ? sender.httpBody : DEFAULT_HTTP_BODY;
  const body = renderTemplate(tpl, {
    to: input.to,
    subject: input.subject,
    text: input.text ?? "",
    html: input.html ?? "",
    from: sender.fromAddress ?? sender.username ?? "",
    from_name: sender.fromName ?? "",
  });

  let res: Response;
  try {
    res = await fetch(sender.httpUrl, { method, headers, body });
  } catch (err) {
    throw new Error(
      `Failed to call the configured API: ${err instanceof Error ? err.message : "network error"}`,
    );
  }
  const responseText = await res.text();
  if (!res.ok) {
    throw new Error(`Upstream API responded with status ${res.status}: ${responseText.slice(0, 500)}`);
  }
  return { messageId: extractMessageId(responseText) ?? `http:${res.status}` };
}

/** 尝试从上游响应里读出邮件 ID,读不到就用状态码兜底 */
function extractMessageId(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const data = JSON.parse(trimmed);
    if (data && typeof data === "object") {
      for (const key of ["messageId", "message_id", "id", "data"]) {
        const v = (data as Record<string, unknown>)[key];
        if (typeof v === "string" && v) return v;
        if (v && typeof v === "object") {
          const inner = (v as Record<string, unknown>)["id"];
          if (typeof inner === "string" && inner) return inner;
        }
      }
    }
  } catch {
    // 非 JSON 响应,忽略
  }
  return null;
}

export interface SendMailInput {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface SendMailResult {
  messageId: string;
}

export async function sendMail(sender: Sender, input: SendMailInput): Promise<SendMailResult> {
  if (sender.type === "http") return sendViaHttp(sender, input);
  return sendViaMailTransporter(sender, input);
}

/** 该发件商是否已完成 OAuth 授权(可用于前端展示状态) */
export function isOAuthAuthorized(sender: Sender): boolean {
  return sender.type !== "outlook_oauth2" && sender.type !== "gmail_oauth2"
    ? false
    : Boolean(sender.oauthRefreshToken && sender.oauthAuthorizedAt);
}

/** 校验收件人是否在发件商允许的域名白名单内;白名单为空表示不限制 */
export function isDomainAllowed(sender: Sender, to: string): boolean {
  if (!sender.allowedDomains || sender.allowedDomains.length === 0) return true;
  const domain = to.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return sender.allowedDomains.some((d) => d.toLowerCase() === domain);
}

/** 基础邮箱格式校验 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
