/**
 * 管理端:发件商密钥管理
 * POST   /api/admin/senders/{id}/keys          生成新密钥(32 位)
 * GET    /api/admin/senders/{id}/keys          列出全部密钥(明文可查看)
 * PATCH  /api/admin/senders/{id}/keys/{keyId}  修改备注/启停
 * DELETE /api/admin/senders/{id}/keys/{keyId}  删除密钥
 */

import { getStorage } from "@/server/lib/db";
import { errorResponse, json, readJsonBody, toErrorResponse } from "@/server/lib/api";
import { requireAdmin } from "@/server/lib/guard";
import { generateApiKey } from "@/server/lib/crypto";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if (guard) return guard;
  try {
    const { id } = await context.params;
    const storage = await getStorage();
    const sender = await storage.getSenderById(id);
    if (!sender) return errorResponse("Sender not found.", 404);

    const body = await readJsonBody<{ label?: string }>(request).catch(() => ({}) as { label?: string });
    const label = (body.label ?? "").trim() || `key-${Date.now().toString(36)}`;
    const key = await storage.createSenderKey({
      senderId: id,
      key: generateApiKey(),
      label,
      enabled: true,
    });
    return json({ key }, 201);
  } catch (err) {
    return toErrorResponse(err);
  }
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
    return json({ keys });
  } catch (err) {
    return toErrorResponse(err);
  }
}
