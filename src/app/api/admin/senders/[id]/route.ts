/**
 * 管理端:单个发件商的读取、更新、删除
 * GET    /api/admin/senders/{id}     详情
 * PUT    /api/admin/senders/{id}     更新
 * DELETE /api/admin/senders/{id}     删除
 */

import { getStorage } from "@/server/lib/db";
import { errorResponse, json, readJsonBody, toErrorResponse } from "@/server/lib/api";
import { requireAdmin } from "@/server/lib/guard";
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

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if (guard) return guard;
  try {
    const { id } = await context.params;
    const storage = await getStorage();
    const sender = await storage.getSenderById(id);
    if (!sender) return errorResponse("Sender not found.", 404);
    const keys = await storage.listSenderKeys(id);
    return json({ sender, keys });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if (guard) return guard;
  try {
    const { id } = await context.params;
    const body = await readJsonBody<SenderInput>(request);
    const issue = validateInput(body, true);
    if (issue) return errorResponse(issue, 400);

    const storage = await getStorage();
    const existing = await storage.getSenderById(id);
    if (!existing) return errorResponse("Sender not found.", 404);

    const normalized = normalize(body);
    // 空密码视为"不修改"
    if (normalized.password === "") delete normalized.password;
    const updated = await storage.updateSender(id, normalized);
    return json({ sender: updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if (guard) return guard;
  try {
    const { id } = await context.params;
    const storage = await getStorage();
    const existing = await storage.getSenderById(id);
    if (!existing) return errorResponse("Sender not found.", 404);
    await storage.deleteSender(id);
    return json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
