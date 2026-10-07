/**
 * 管理端:单个密钥的启停/备注/删除
 * PATCH  /api/admin/senders/{id}/keys/{keyId}
 * DELETE /api/admin/senders/{id}/keys/{keyId}
 */

import { getStorage } from "@/server/lib/db";
import { errorResponse, json, readJsonBody, toErrorResponse } from "@/server/lib/api";
import { requireAdmin } from "@/server/lib/guard";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; keyId: string }> },
) {
  const guard = await requireAdmin(request);
  if (guard) return guard;
  try {
    const { id, keyId } = await context.params;
    const body = await readJsonBody<{ label?: string; enabled?: boolean }>(request);
    const storage = await getStorage();
    const sender = await storage.getSenderById(id);
    if (!sender) return errorResponse("Sender not found.", 404);

    const keys = await storage.listSenderKeys(id);
    if (!keys.some((k) => k.id === keyId)) return errorResponse("Key not found.", 404);

    const updated = await storage.updateSenderKey(keyId, {
      label: body.label,
      enabled: body.enabled,
    });
    return json({ key: updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; keyId: string }> },
) {
  const guard = await requireAdmin(request);
  if (guard) return guard;
  try {
    const { id, keyId } = await context.params;
    const storage = await getStorage();
    const sender = await storage.getSenderById(id);
    if (!sender) return errorResponse("Sender not found.", 404);

    const keys = await storage.listSenderKeys(id);
    if (!keys.some((k) => k.id === keyId)) return errorResponse("Key not found.", 404);

    await storage.deleteSenderKey(keyId);
    return json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
