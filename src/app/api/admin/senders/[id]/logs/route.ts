/**
 * 管理端:发送日志
 * GET /api/admin/senders/{id}/logs
 * GET /api/admin/logs
 */

import { getStorage } from "@/server/lib/db";
import { errorResponse, json, toErrorResponse } from "@/server/lib/api";
import { requireAdmin } from "@/server/lib/guard";

async function handleList(request: Request, senderId: string | null) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
  const storage = await getStorage();
  const result = senderId
    ? await storage.listSendLogs(senderId, { limit, offset, order: "desc" })
    : { rows: [], total: 0 };
  return json(result);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if (guard) return guard;
  try {
    const { id } = await context.params;
    const storage = await getStorage();
    const sender = await storage.getSenderById(id);
    if (!sender) return errorResponse("Sender not found.", 404);
    return await handleList(request, id);
  } catch (err) {
    return toErrorResponse(err);
  }
}
