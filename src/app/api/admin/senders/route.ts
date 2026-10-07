/**
 * 管理端:发件商新增与列表
 * POST   /api/admin/senders          新增
 * GET    /api/admin/senders          列表
 */

import { getStorage } from "@/server/lib/db";
import { errorResponse, json, readJsonBody, toErrorResponse } from "@/server/lib/api";
import { requireAdmin } from "@/server/lib/guard";
import { generateApiKey, generatePid } from "@/server/lib/crypto";
import {
  normalizeSenderInput,
  validateSenderInput,
  type SenderInput,
} from "@/server/lib/sender-input";

export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (guard) return guard;
  try {
    const body = await readJsonBody<SenderInput>(request);
    const type = body.type ?? "smtp";
    const issue = validateSenderInput(body, type, false);
    if (issue) return errorResponse(issue, 400);

    const storage = await getStorage();
    // pid 保证唯一:冲突时重试
    let pid = generatePid();
    for (let i = 0; i < 8; i++) {
      const exists = await storage.getSenderByPid(pid);
      if (!exists) break;
      pid = generatePid();
    }
    const n = normalizeSenderInput(body);
    const sender = await storage.createSender({
      pid,
      name: n.name!,
      type,
      enabled: n.enabled ?? true,
      host: n.host ?? null,
      port: n.port ?? null,
      secure: n.secure ?? true,
      service: n.service ?? null,
      username: n.username ?? null,
      password: n.password ?? null,
      fromAddress: n.fromAddress ?? null,
      fromName: n.fromName ?? null,
      allowedDomains: n.allowedDomains ?? [],
      httpUrl: n.httpUrl ?? null,
      httpMethod: n.httpMethod ?? null,
      httpHeaders: n.httpHeaders ?? null,
      httpBody: n.httpBody ?? null,
      oauthClientId: n.oauthClientId ?? null,
      oauthClientSecret: n.oauthClientSecret ?? null,
      oauthRefreshToken: null,
      oauthAuthorizedAt: null,
    });
    // 创建发件商时自动生成第一个 32 位密钥
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
