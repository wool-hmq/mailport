/**
 * 管理端:发件商新增与列表
 * POST   /api/admin/senders          新增
 * GET    /api/admin/senders          列表
 */

import { getStorage } from "@/server/lib/db";
import { errorResponse, json, readJsonBody, toErrorResponse } from "@/server/lib/api";
import { requireAdmin } from "@/server/lib/guard";
import { generateApiKey, generatePid } from "@/server/lib/crypto";
import type { Sender, SenderType } from "@/server/storage/types";

interface SenderInput {
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
}

function validateInput(body: SenderInput, partial: boolean): string | null {
  if (!partial || body.name !== undefined) {
    if (!body.name || !body.name.trim()) return "name is required.";
  }
  if (!partial || (body.host !== undefined && body.host !== null) || body.service !== undefined) {
    if (!body.host && !body.service) return "Either host or service is required.";
  }
  if (!partial || (body.username !== undefined && body.username !== null)) {
    if (!body.username) return "username is required.";
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
  return null;
}

function normalize(body: SenderInput): Partial<Sender> {
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
  return out;
}

export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (guard) return guard;
  try {
    const body = await readJsonBody<SenderInput>(request);
    const issue = validateInput(body, false);
    if (issue) return errorResponse(issue, 400);

    const storage = await getStorage();
    // pid 保证唯一:冲突时重试
    let pid = generatePid();
    for (let i = 0; i < 8; i++) {
      const exists = await storage.getSenderByPid(pid);
      if (!exists) break;
      pid = generatePid();
    }
    const normalized = normalize(body);
    const sender = await storage.createSender({
      pid,
      name: normalized.name!,
      type: normalized.type ?? "smtp",
      enabled: normalized.enabled ?? true,
      host: normalized.host ?? null,
      port: normalized.port ?? null,
      secure: normalized.secure ?? true,
      service: normalized.service ?? null,
      username: normalized.username ?? null,
      password: normalized.password ?? null,
      fromAddress: normalized.fromAddress ?? null,
      fromName: normalized.fromName ?? null,
      allowedDomains: normalized.allowedDomains ?? [],
    });
    // 创建发件商时自动生成首个 32 位密钥
    const key = await storage.createSenderKey({
      senderId: sender.id,
      key: generateApiKey(),
      label: "default",
      enabled: true,
    });
    return json({ sender, keys: [key] }, 201);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (guard) return guard;
  try {
    const storage = await getStorage();
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
    const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
    const result = await storage.listSenders({ limit, offset, orderBy: "createdAt", order: "desc" });
    return json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
