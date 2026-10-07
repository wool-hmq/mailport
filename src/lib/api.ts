/**
 * 浏览器端 API 调用封装:统一处理 JSON 与 401 跳转登录。
 */

export interface Sender {
  id: string;
  pid: string;
  name: string;
  type: "smtp" | "outlook_oauth2";
  enabled: boolean;
  host: string | null;
  port: number | null;
  secure: boolean;
  service: string | null;
  username: string | null;
  fromAddress: string | null;
  fromName: string | null;
  allowedDomains: string[];
  createdAt: number;
  updatedAt: number;
}

export interface SenderKey {
  id: string;
  senderId: string;
  key: string;
  label: string;
  enabled: boolean;
  lastUsedAt: number | null;
  createdAt: number;
}

export interface SendLog {
  id: string;
  senderId: string;
  keyId: string | null;
  to: string;
  subject: string;
  status: "success" | "failed";
  error: string | null;
  duration: number;
  createdAt: number;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
    throw new Error("Session expired, redirecting to login.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  login: (password: string) =>
    request<{ success: boolean }>("/api/admin/login", { method: "POST", body: JSON.stringify({ password }) }),
  logout: () => request<{ success: boolean }>("/api/admin/logout", { method: "POST" }),

  stats: () =>
    request<{ senders: number; logs: { total: number; success: number; failed: number } }>("/api/admin/stats"),

  listSenders: () => request<{ rows: Sender[]; total: number }>("/api/admin/senders"),
  getSender: (id: string) => request<{ sender: Sender; keys: SenderKey[] }>(`/api/admin/senders/${id}`),
  createSender: (body: Record<string, unknown>) =>
    request<{ sender: Sender; keys: SenderKey[] }>("/api/admin/senders", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateSender: (id: string, body: Record<string, unknown>) =>
    request<{ sender: Sender }>(`/api/admin/senders/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteSender: (id: string) =>
    request<{ success: boolean }>(`/api/admin/senders/${id}`, { method: "DELETE" }),

  listKeys: (id: string) => request<{ keys: SenderKey[] }>(`/api/admin/senders/${id}/keys`),
  createKey: (id: string, label: string) =>
    request<{ key: SenderKey }>(`/api/admin/senders/${id}/keys`, {
      method: "POST",
      body: JSON.stringify({ label }),
    }),
  patchKey: (id: string, keyId: string, body: { label?: string; enabled?: boolean }) =>
    request<{ key: SenderKey }>(`/api/admin/senders/${id}/keys/${keyId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteKey: (id: string, keyId: string) =>
    request<{ success: boolean }>(`/api/admin/senders/${id}/keys/${keyId}`, { method: "DELETE" }),

  listLogs: (id: string, limit = 50) =>
    request<{ rows: SendLog[]; total: number }>(`/api/admin/senders/${id}/logs?limit=${limit}`),
  testSend: (id: string, to: string) =>
    request<{ success: boolean; messageId: string }>(`/api/admin/senders/${id}/test`, {
      method: "POST",
      body: JSON.stringify({ to }),
    }),
};
