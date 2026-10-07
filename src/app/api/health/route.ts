/**
 * 健康检查:GET /api/health
 * 返回已配置的数据库驱动与必需环境变量状态,便于部署后排障。
 */

import { detectDriver } from "@/server/lib/db";
import { json } from "@/server/lib/api";

export async function GET() {
  const driver = detectDriver();
  return json({
    status: driver ? "ok" : "degraded",
    driver: driver?.name ?? null,
    adminConfigured: Boolean(process.env.ADMIN_PASSWORD),
    secretConfigured: Boolean(process.env.ADMIN_PASSWORD && (process.env.MAILPORT_SECRET?.length ?? 0) >= 32),
    timestamp: Date.now(),
  });
}
