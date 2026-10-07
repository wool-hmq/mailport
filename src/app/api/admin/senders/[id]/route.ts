/**
 * 管理端:单个发件商的读取、更新、删除
 * GET    /api/admin/senders/{id}     详情
 * PUT    /api/admin/senders/{id}     更新
 * DELETE /api/admin/senders/{id}     删除
 */

import { getStorage } from "@/server/lib/db";
import { errorResponse, json, readJsonBody, toErrorResponse } from "@/server/lib/api";
import { requireAdmin } from "@/server/lib/guard";
import {
  normalizeSenderInput,
  validateSenderInput,
  type SenderInput,
} from "@/server/lib/sender-input";

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

    const storage = await getStorage();
    const existing = await storage.getSenderById(id);
    if (!existing) return errorResponse("Sender not found.", 404);

    const issue = validateSenderInput(body, body.type ?? existing.type, true);
    if (issue) return errorResponse(issue, 400);

    const normalized = normalizeSenderInput(body);
    // 空密码 / 空 secret 视为"不修改"
    if (normalized.password === "") delete normalized.password;
    if (normalized.oauthClientSecret === "") delete normalized.oauthClientSecret;
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
