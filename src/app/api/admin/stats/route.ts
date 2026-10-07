/**
 * 管理端:仪表盘统计
 * GET /api/admin/stats
 */

import { getStorage } from "@/server/lib/db";
import { json, toErrorResponse } from "@/server/lib/api";
import { requireAdmin } from "@/server/lib/guard";

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (guard) return guard;
  try {
    const storage = await getStorage();
    const [senders, total, success, failed] = await Promise.all([
      storage.countSenders(),
      storage.countSendLogs(),
      storage.countSendLogs("success"),
      storage.countSendLogs("failed"),
    ]);
    return json({ senders, logs: { total, success, failed } });
  } catch (err) {
    return toErrorResponse(err);
  }
}
