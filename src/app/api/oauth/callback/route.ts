/**
 * OAuth 授权回调(公开接口,由 provider 直接跳转)
 * GET /api/oauth/callback?code=...&state=...
 *
 * 回调地址固定不变,发件商由签名的 state 定位,详见 server/lib/oauth-callback.ts。
 */

import { json } from "@/server/lib/api";
import { handleOAuthCallback } from "@/server/lib/oauth-callback";

export async function GET(request: Request) {
  return handleOAuthCallback(request);
}

export async function POST() {
  return json({ error: "Method not allowed." }, 405);
}
