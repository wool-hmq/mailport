/**
 * 管理端:发起 OAuth 授权
 * POST /api/admin/senders/{id}/oauth/start -> { authUrl }
 *
 * 前端拿到 authUrl 后跳转,用户在 provider 页面同意授权后
 * 会被回调到 /api/{pid}/oauth/callback。
 */

import { getStorage } from "@/server/lib/db";
import { errorResponse, json, toErrorResponse } from "@/server/lib/api";
import { requireAdmin } from "@/server/lib/guard";
import { buildAuthUrl } from "@/server/lib/oauth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if (guard) return guard;
  try {
    const { id } = await context.params;
    const storage = await getStorage();
    const sender = await storage.getSenderById(id);
    if (!sender) return errorResponse("Sender not found.", 404);
    if (sender.type !== "outlook_oauth2" && sender.type !== "gmail_oauth2") {
      return errorResponse("This sender type does not use OAuth.", 400);
    }
    const origin = new URL(request.url).origin;
    const authUrl = await buildAuthUrl(origin, sender);
    return json({ authUrl });
  } catch (err) {
    return toErrorResponse(err);
  }
}
