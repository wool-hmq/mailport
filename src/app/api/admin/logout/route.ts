/**
 * 管理员登出:POST /api/admin/logout
 */

import { json } from "@/server/lib/api";
import { getClearCookie } from "@/server/lib/session";

export async function POST() {
  return json({ success: true }, 200, { "Set-Cookie": getClearCookie() });
}
