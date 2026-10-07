/**
 * 管理员会话:JWT(jose)签名的 HttpOnly Cookie,无状态、无需额外的会话表。
 * 密钥取自 MAILPORT_SECRET,与凭据加密共用(派生不同用途)。
 */

import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "mailport_session";
const ISSUER = "mailport";

function getSecret(): Uint8Array {
  const secret = process.env.MAILPORT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("MAILPORT_SECRET is not configured or shorter than 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

function getTtl(): number {
  const raw = process.env.SESSION_TTL;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 7 * 24 * 60 * 60;
}

export interface SessionPayload {
  role: "admin";
}

export async function createSessionCookie(): Promise<string> {
  const ttl = getTtl();
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .setIssuer(ISSUER)
    .sign(getSecret());
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${ttl}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function getClearCookie(): string {
  const secure = process.env.NODE_ENV === "production";
  const parts = [`${COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export async function verifyRequest(request: Request): Promise<boolean> {
  const cookie = request.headers.get("cookie") ?? "";
  const token = parseCookie(cookie, COOKIE_NAME);
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { issuer: ISSUER });
    return (payload as unknown as SessionPayload).role === "admin";
  } catch {
    return false;
  }
}

function parseCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) return part.slice(idx + 1).trim();
  }
  return null;
}

export function getCookieName(): string {
  return COOKIE_NAME;
}
