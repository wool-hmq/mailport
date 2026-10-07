/**
 * 发件商输入的校验与归一化(新增/编辑路由共用)。
 *
 * 校验按 provider 类型分支:
 * - smtp:host 或 service + username + password
 * - http:请求地址必填,自定义请求头须为合法 JSON 对象
 * - outlook_oauth2 / gmail_oauth2:Client ID/Secret + 账号邮箱必填
 */

import type { Sender, SenderType } from "@/server/storage/types";

export interface SenderInput {
  name?: string;
  type?: SenderType;
  enabled?: boolean;
  host?: string | null;
  port?: number | null;
  secure?: boolean;
  service?: string | null;
  username?: string | null;
  password?: string | null;
  fromAddress?: string | null;
  fromName?: string | null;
  allowedDomains?: string[];
  httpUrl?: string | null;
  httpMethod?: string | null;
  httpHeaders?: string | null;
  httpBody?: string | null;
  oauthClientId?: string | null;
  oauthClientSecret?: string | null;
}

const SENDER_TYPES: SenderType[] = ["smtp", "http", "outlook_oauth2", "gmail_oauth2"];
const HTTP_METHODS = ["POST", "PUT", "PATCH", "GET", "DELETE"];

function isValidJsonHeaders(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

/**
 * @param resolvedType 最终生效的发件商类型(新增时取 body.type 或默认 smtp;编辑时取 body.type ?? 旧值)
 * @param partial 是否为部分更新(编辑)
 */
export function validateSenderInput(body: SenderInput, resolvedType: SenderType, partial: boolean): string | null {
  if (!partial || body.name !== undefined) {
    if (!body.name || !body.name.trim()) return "name is required.";
  }
  if (body.type !== undefined && !SENDER_TYPES.includes(body.type)) {
    return `Invalid type. Must be one of: ${SENDER_TYPES.join(", ")}.`;
  }
  if (body.port !== undefined && body.port !== null) {
    if (!Number.isInteger(body.port) || body.port <= 0 || body.port > 65535) {
      return "port must be an integer between 1 and 65535.";
    }
  }
  if (body.allowedDomains !== undefined) {
    if (!Array.isArray(body.allowedDomains)) return "allowedDomains must be an array of strings.";
    for (const d of body.allowedDomains) {
      if (typeof d !== "string" || !/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/.test(d.trim())) {
        return `Invalid domain in allowedDomains: ${d}`;
      }
    }
  }
  if (body.fromAddress !== undefined && body.fromAddress !== null && body.fromAddress !== "") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.fromAddress)) {
      return `Invalid fromAddress: ${body.fromAddress}`;
    }
  }

  if (resolvedType === "smtp") {
    if (!partial || (body.host !== undefined && body.host !== null) || body.service !== undefined) {
      if (!body.host && !body.service) return "Either host or service is required.";
    }
    if (!partial || (body.username !== undefined && body.username !== null)) {
      if (!body.username) return "username is required.";
    }
    if (!partial && !body.password) return "password is required.";
  } else if (resolvedType === "http") {
    if (!partial || body.httpUrl !== undefined) {
      if (!body.httpUrl || !/^https?:\/\//i.test(body.httpUrl.trim())) {
        return "A request URL starting with http:// or https:// is required for the http sender type.";
      }
    }
    if (body.httpMethod !== undefined && body.httpMethod !== null && body.httpMethod !== "") {
      if (!HTTP_METHODS.includes(body.httpMethod.toUpperCase())) {
        return `Invalid httpMethod. Must be one of: ${HTTP_METHODS.join(", ")}.`;
      }
    }
    if (body.httpHeaders !== undefined && body.httpHeaders !== null && body.httpHeaders.trim() !== "") {
      if (!isValidJsonHeaders(body.httpHeaders)) {
        return 'Custom headers must be a JSON object like {"Authorization": "Bearer xxx"}.';
      }
    }
  } else {
    // outlook_oauth2 / gmail_oauth2
    if (!partial || body.oauthClientId !== undefined) {
      if (!body.oauthClientId || !body.oauthClientId.trim()) return "OAuth clientId is required.";
    }
    if (!partial) {
      if (!body.oauthClientSecret) return "OAuth clientSecret is required.";
    }
    if (!partial || (body.username !== undefined && body.username !== null)) {
      if (!body.username) return "The account email address (username) is required for OAuth.";
    }
  }
  return null;
}

export function normalizeSenderInput(body: SenderInput): Partial<Sender> {
  const out: Partial<Sender> = {};
  if (body.name !== undefined) out.name = body.name.trim();
  if (body.type !== undefined) out.type = body.type;
  if (body.enabled !== undefined) out.enabled = body.enabled;
  if (body.host !== undefined) out.host = body.host ? body.host.trim() : null;
  if (body.port !== undefined) out.port = body.port ?? null;
  if (body.secure !== undefined) out.secure = body.secure;
  if (body.service !== undefined) out.service = body.service ? body.service.trim() : null;
  if (body.username !== undefined) out.username = body.username ? body.username.trim() : null;
  if (body.password !== undefined) out.password = body.password ? body.password : null;
  if (body.fromAddress !== undefined) out.fromAddress = body.fromAddress ? body.fromAddress.trim() : null;
  if (body.fromName !== undefined) out.fromName = body.fromName ? body.fromName.trim() : null;
  if (body.allowedDomains !== undefined) {
    out.allowedDomains = body.allowedDomains.map((d) => d.trim().toLowerCase()).filter(Boolean);
  }
  if (body.httpUrl !== undefined) out.httpUrl = body.httpUrl ? body.httpUrl.trim() : null;
  if (body.httpMethod !== undefined) out.httpMethod = body.httpMethod ? body.httpMethod.toUpperCase() : null;
  if (body.httpHeaders !== undefined) out.httpHeaders = body.httpHeaders ?? null;
  if (body.httpBody !== undefined) out.httpBody = body.httpBody ?? null;
  if (body.oauthClientId !== undefined) out.oauthClientId = body.oauthClientId ? body.oauthClientId.trim() : null;
  if (body.oauthClientSecret !== undefined) out.oauthClientSecret = body.oauthClientSecret || null;
  return out;
}
