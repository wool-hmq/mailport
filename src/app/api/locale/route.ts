/**
 * 语言切换:POST /api/locale { locale }
 * 写入 cookie 覆盖环境变量的默认语言,有效期 1 年。
 */

import { json, readJsonBody, toErrorResponse } from "@/server/lib/api";
import { LOCALE_COOKIE, LOCALES, parseLocale } from "@/i18n";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<{ locale?: string }>(request);
    const locale = parseLocale(body.locale);
    const secure = process.env.NODE_ENV === "production";
    const parts = [
      `${LOCALE_COOKIE}=${locale}`,
      "Path=/",
      "SameSite=Lax",
      "Max-Age=31536000",
    ];
    if (secure) parts.push("Secure");
    return json({ locale }, 200, { "Set-Cookie": parts.join("; ") });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function GET() {
  return json({ locales: LOCALES, current: parseLocale(process.env.SITE_LOCALE) });
}
