/**
 * API 路由通用工具:JSON 响应、错误处理、请求体解析。
 */

export interface ApiError {
  error: string;
  details?: string;
}

export function json<T>(body: T, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

export function errorResponse(message: string, status: number, details?: string): Response {
  const body: ApiError = { error: message };
  if (details) body.details = details;
  return json(body, status);
}

/** 将未知错误转为安全的响应信息(不泄漏堆栈) */
export function toErrorResponse(err: unknown): Response {
  const message = err instanceof Error ? err.message : "Internal server error";
  if (isConfigError(message)) {
    return errorResponse(message, 503);
  }
  console.error("[mailport] API error:", err);
  return errorResponse(message, 500);
}

function isConfigError(message: string): boolean {
  return (
    message.includes("is not configured") ||
    message.includes("config incomplete") ||
    message.includes("No database configured")
  );
}

export async function readJsonBody<T = any>(request: Request): Promise<T> {
  const raw = await request.text();
  if (!raw) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("Request body is not valid JSON.");
  }
}

/** 从 Header 或 query 提取 API 密钥 */
export function extractApiKey(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth) {
    const match = /^Bearer\s+(.+)$/i.exec(auth);
    if (match) return match[1].trim();
  }
  const xKey = request.headers.get("x-api-key");
  if (xKey) return xKey.trim();
  const url = new URL(request.url);
  const qKey = url.searchParams.get("key");
  if (qKey) return qKey.trim();
  return null;
}
