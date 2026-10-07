/**
 * 管理端路由统一守卫:校验会话,未登录返回 401。
 * 所有 /api/admin/** 路由在处理前调用 requireAdmin。
 */

import { verifyRequest } from "@/server/lib/session";
import { errorResponse } from "@/server/lib/api";

export async function requireAdmin(request: Request): Promise<Response | null> {
  const ok = await verifyRequest(request);
  if (!ok) {
    return errorResponse("Unauthorized. Please login first.", 401);
  }
  return null;
}
