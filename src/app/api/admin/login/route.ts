/**
 * 管理员登录:POST /api/admin/login { password }
 * 校验环境变量 ADMIN_PASSWORD,成功后下发签名 Cookie。
 */

import { errorResponse, json, readJsonBody, toErrorResponse } from "@/server/lib/api";
import { createSessionCookie } from "@/server/lib/session";

export async function POST(request: Request) {
  try {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) {
      return errorResponse("ADMIN_PASSWORD is not configured on the server.", 503);
    }
    const body = await readJsonBody<{ password?: string }>(request);
    const password = (body.password ?? "").trim();
    if (!password) {
      return errorResponse("Password is required.", 400);
    }
    if (password !== expected) {
      return errorResponse("Invalid password.", 401);
    }
    return json({ success: true }, 200, { "Set-Cookie": await createSessionCookie() });
  } catch (err) {
    return toErrorResponse(err);
  }
}
