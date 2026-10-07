/**
 * PostgreSQL 存储驱动(同样适用于 Supabase / Neon / Tembo / CockroachDB)
 *
 * 说明:本驱动统一用 JSONB 列存数组(allowedDomains),
 * 用大整数存时间戳(毫秒),保证与其它驱动行为一致。
 */

import { Pool } from "pg";

import { decrypt, encrypt } from "../../lib/crypto";
import type {
  IStorage,
  ListOptions,
  ListResult,
  SendLog,
  SendLogStatus,
  Sender,
  SenderKey,
} from "../types";

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const bool = (v?: string) => v === "true" || v === "1";
  const host = process.env.PG_HOST || process.env.POSTGRES_HOST || "127.0.0.1";
  const port = Number(process.env.PG_PORT || process.env.POSTGRES_PORT || 5432);
  const database = process.env.PG_DB || process.env.POSTGRES_DATABASE || "";
  const user = process.env.PG_USER || process.env.POSTGRES_USER || "";
  const password = process.env.PG_PASSWORD || process.env.POSTGRES_PASSWORD || "";
  const ssl = bool(process.env.PG_SSL ?? process.env.POSTGRES_SSL ?? "false");

  if (!database || !user) {
    throw new Error("PostgreSQL config incomplete: PG_DB/PG_USER (or POSTGRES_*) are required.");
  }
  pool = new Pool({
    host,
    port,
    database,
    user,
    password,
    ssl: ssl ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30000,
  });
  return pool;
}

interface SenderRow {
  id: string;
  pid: string;
  name: string;
  type: string;
  enabled: boolean;
  host: string | null;
  port: number | null;
  secure: boolean;
  service: string | null;
  username: string | null;
  password: string | null;
  from_address: string | null;
  from_name: string | null;
  allowed_domains: string[] | null;
  http_url: string | null;
  http_method: string | null;
  http_headers: string | null;
  http_body: string | null;
  oauth_client_id: string | null;
  oauth_client_secret: string | null;
  oauth_refresh_token: string | null;
  oauth_authorized_at: number | null;
  created_at: string;
  updated_at: string;
}

interface KeyRow {
  id: string;
  sender_id: string;
  key: string;
  label: string;
  enabled: boolean;
  last_used_at: string | null;
  created_at: string;
}

interface LogRow {
  id: string;
  sender_id: string;
  key_id: string | null;
  to: string;
  subject: string;
  status: string;
  error: string | null;
  duration: number;
  created_at: string;
}

function rowToSender(r: SenderRow): Sender {
  return {
    id: r.id,
    pid: r.pid,
    name: r.name,
    type: r.type as Sender["type"],
    enabled: r.enabled,
    host: r.host,
    port: r.port,
    secure: r.secure,
    service: r.service,
    username: r.username,
    password: r.password ? decrypt(r.password) : null,
    fromAddress: r.from_address,
    fromName: r.from_name,
    allowedDomains: Array.isArray(r.allowed_domains) ? r.allowed_domains : [],
    httpUrl: r.http_url,
    httpMethod: r.http_method,
    httpHeaders: r.http_headers,
    httpBody: r.http_body,
    oauthClientId: r.oauth_client_id,
    oauthClientSecret: r.oauth_client_secret ? decrypt(r.oauth_client_secret) : null,
    oauthRefreshToken: r.oauth_refresh_token ? decrypt(r.oauth_refresh_token) : null,
    oauthAuthorizedAt: r.oauth_authorized_at,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

function rowToKey(r: KeyRow): SenderKey {
  return {
    id: r.id,
    senderId: r.sender_id,
    key: decrypt(r.key),
    label: r.label,
    enabled: r.enabled,
    lastUsedAt: r.last_used_at === null ? null : Number(r.last_used_at),
    createdAt: Number(r.created_at),
  };
}

function rowToLog(r: LogRow): SendLog {
  return {
    id: r.id,
    senderId: r.sender_id,
    keyId: r.key_id,
    to: r.to,
    subject: r.subject,
    status: r.status as SendLogStatus,
    error: r.error,
    duration: Number(r.duration),
    createdAt: Number(r.created_at),
  };
}

function now(): number {
  return Date.now();
}

export async function createStorage(): Promise<IStorage> {
  const q = async <T = any>(text: string, params?: (string | number | boolean | string[] | null)[]): Promise<T[]> => {
    const p = getPool();
    const res = await p.query(text, params as any[]);
    return res.rows as T[];
  };

  return {
    driver: "postgres",

    async init() {
      await q(`
        CREATE TABLE IF NOT EXISTS senders (
          id            TEXT PRIMARY KEY,
          pid           TEXT NOT NULL UNIQUE,
          name          TEXT NOT NULL,
          type          TEXT NOT NULL DEFAULT 'smtp',
          enabled       BOOLEAN NOT NULL DEFAULT TRUE,
          host          TEXT,
          port          INTEGER,
          secure        BOOLEAN NOT NULL DEFAULT TRUE,
          service       TEXT,
          username      TEXT,
          password      TEXT,
          from_address  TEXT,
          from_name     TEXT,
          allowed_domains JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at    BIGINT NOT NULL,
          updated_at    BIGINT NOT NULL
        )
      `);
      await q(`CREATE INDEX IF NOT EXISTS idx_senders_pid ON senders(pid)`);

      // 老库升级:补齐新增列
      const cols = await q<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'senders'`,
      );
      const have = new Set(cols.map((c) => c.column_name));
      const extraColumns: Record<string, string> = {
        http_url: "TEXT",
        http_method: "TEXT",
        http_headers: "TEXT",
        http_body: "TEXT",
        oauth_client_id: "TEXT",
        oauth_client_secret: "TEXT",
        oauth_refresh_token: "TEXT",
        oauth_authorized_at: "BIGINT",
      };
      for (const [col, ddl] of Object.entries(extraColumns)) {
        if (!have.has(col)) await q(`ALTER TABLE senders ADD COLUMN IF NOT EXISTS ${col} ${ddl}`);
      }
      await q(`
        CREATE TABLE IF NOT EXISTS sender_keys (
          id            TEXT PRIMARY KEY,
          sender_id     TEXT NOT NULL REFERENCES senders(id) ON DELETE CASCADE,
          key           TEXT NOT NULL,
          label         TEXT NOT NULL DEFAULT '',
          enabled       BOOLEAN NOT NULL DEFAULT TRUE,
          last_used_at  BIGINT,
          created_at    BIGINT NOT NULL
        )
      `);
      await q(`CREATE INDEX IF NOT EXISTS idx_sender_keys_sender ON sender_keys(sender_id)`);
      await q(`
        CREATE TABLE IF NOT EXISTS send_logs (
          id            TEXT PRIMARY KEY,
          sender_id     TEXT NOT NULL REFERENCES senders(id) ON DELETE CASCADE,
          key_id        TEXT,
          to_addr       TEXT NOT NULL,
          subject       TEXT NOT NULL,
          status        TEXT NOT NULL,
          error         TEXT,
          duration      BIGINT NOT NULL DEFAULT 0,
          created_at    BIGINT NOT NULL
        )
      `);
      await q(`CREATE INDEX IF NOT EXISTS idx_send_logs_sender ON send_logs(sender_id, created_at DESC)`);
      await q(`CREATE INDEX IF NOT EXISTS idx_send_logs_status ON send_logs(status)`);
    },

    async createSender(data) {
      const ts = now();
      const row = await q<SenderRow>(
        `INSERT INTO senders (id, pid, name, type, enabled, host, port, secure, service, username, password, from_address, from_name, allowed_domains,
          http_url, http_method, http_headers, http_body,
          oauth_client_id, oauth_client_secret, oauth_refresh_token, oauth_authorized_at,
          created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24) RETURNING *`,
        [
          cryptoRandomId(),
          data.pid,
          data.name,
          data.type,
          data.enabled,
          data.host,
          data.port,
          data.secure,
          data.service,
          data.username,
          data.password ? encrypt(data.password) : null,
          data.fromAddress,
          data.fromName,
          data.allowedDomains,
          data.httpUrl,
          data.httpMethod,
          data.httpHeaders,
          data.httpBody,
          data.oauthClientId,
          data.oauthClientSecret ? encrypt(data.oauthClientSecret) : null,
          data.oauthRefreshToken ? encrypt(data.oauthRefreshToken) : null,
          data.oauthAuthorizedAt,
          ts,
          ts,
        ],
      );
      return rowToSender(row[0]);
    },

    async updateSender(id, data) {
      const sets: string[] = [];
      const params: (string | number | boolean | string[] | null)[] = [];
      let i = 1;
      const push = (col: string, val: string | number | boolean | string[] | null) => {
        sets.push(`${col} = $${i++}`);
        params.push(val);
      };
      if (data.name !== undefined) push("name", data.name);
      if (data.type !== undefined) push("type", data.type);
      if (data.enabled !== undefined) push("enabled", data.enabled);
      if (data.host !== undefined) push("host", data.host);
      if (data.port !== undefined) push("port", data.port);
      if (data.secure !== undefined) push("secure", data.secure);
      if (data.service !== undefined) push("service", data.service);
      if (data.username !== undefined) push("username", data.username);
      if (data.password !== undefined) push("password", data.password ? encrypt(data.password) : null);
      if (data.fromAddress !== undefined) push("from_address", data.fromAddress);
      if (data.fromName !== undefined) push("from_name", data.fromName);
      if (data.allowedDomains !== undefined) push("allowed_domains", data.allowedDomains);
      if (data.httpUrl !== undefined) push("http_url", data.httpUrl);
      if (data.httpMethod !== undefined) push("http_method", data.httpMethod);
      if (data.httpHeaders !== undefined) push("http_headers", data.httpHeaders);
      if (data.httpBody !== undefined) push("http_body", data.httpBody);
      if (data.oauthClientId !== undefined) push("oauth_client_id", data.oauthClientId);
      if (data.oauthClientSecret !== undefined) push("oauth_client_secret", data.oauthClientSecret ? encrypt(data.oauthClientSecret) : null);
      if (data.oauthRefreshToken !== undefined) push("oauth_refresh_token", data.oauthRefreshToken ? encrypt(data.oauthRefreshToken) : null);
      if (data.oauthAuthorizedAt !== undefined) push("oauth_authorized_at", data.oauthAuthorizedAt);
      if (sets.length === 0) {
        const cur = await q<SenderRow>(`SELECT * FROM senders WHERE id = $1`, [id]);
        return cur[0] ? rowToSender(cur[0]) : null;
      }
      push("updated_at", now());
      params.push(id);
      const row = await q<SenderRow>(
        `UPDATE senders SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
        params,
      );
      return row[0] ? rowToSender(row[0]) : null;
    },

    async getSenderById(id) {
      const row = await q<SenderRow>(`SELECT * FROM senders WHERE id = $1`, [id]);
      return row[0] ? rowToSender(row[0]) : null;
    },

    async getSenderByPid(pid) {
      const row = await q<SenderRow>(`SELECT * FROM senders WHERE pid = $1 AND enabled = TRUE`, [pid]);
      return row[0] ? rowToSender(row[0]) : null;
    },

    async listSenders(options = {}) {
      const limit = options.limit ?? 50;
      const offset = options.offset ?? 0;
      const order = options.order === "asc" ? "ASC" : "DESC";
      const col = mapOrderColumn(options.orderBy ?? "createdAt");
      const rows = await q<SenderRow>(
        `SELECT * FROM senders ORDER BY ${col} ${order} LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      const totalRow = await q<{ count: string }>(`SELECT COUNT(*)::text AS count FROM senders`);
      return { rows: rows.map(rowToSender), total: Number(totalRow[0].count) };
    },

    async deleteSender(id) {
      await q(`DELETE FROM senders WHERE id = $1`, [id]);
    },

    async createSenderKey(data) {
      const ts = now();
      const row = await q<KeyRow>(
        `INSERT INTO sender_keys (id, sender_id, key, label, enabled, last_used_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [cryptoRandomId(), data.senderId, encrypt(data.key), data.label, data.enabled, null, ts],
      );
      return rowToKey(row[0]);
    },

    async listSenderKeys(senderId) {
      const rows = await q<KeyRow>(
        `SELECT * FROM sender_keys WHERE sender_id = $1 ORDER BY created_at DESC`,
        [senderId],
      );
      return rows.map(rowToKey);
    },

    async getKeyBySenderAndKey(senderId, plainKey) {
      const rows = await q<KeyRow>(
        `SELECT * FROM sender_keys WHERE sender_id = $1 AND enabled = TRUE`,
        [senderId],
      );
      const hit = rows.find((r) => decrypt(r.key) === plainKey);
      return hit ? rowToKey(hit) : null;
    },

    async updateSenderKey(id, data) {
      const sets: string[] = [];
      const params: (string | number | boolean | null)[] = [];
      let i = 1;
      if (data.label !== undefined) {
        sets.push(`label = $${i++}`);
        params.push(data.label);
      }
      if (data.enabled !== undefined) {
        sets.push(`enabled = $${i++}`);
        params.push(data.enabled);
      }
      if (sets.length === 0) {
        const cur = await q<KeyRow>(`SELECT * FROM sender_keys WHERE id = $1`, [id]);
        return cur[0] ? rowToKey(cur[0]) : null;
      }
      params.push(id);
      const row = await q<KeyRow>(
        `UPDATE sender_keys SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
        params,
      );
      return row[0] ? rowToKey(row[0]) : null;
    },

    async touchSenderKey(id, time) {
      await q(`UPDATE sender_keys SET last_used_at = $1 WHERE id = $2`, [time, id]);
    },

    async deleteSenderKey(id) {
      await q(`DELETE FROM sender_keys WHERE id = $1`, [id]);
    },

    async createSendLog(data) {
      const row = await q<LogRow>(
        `INSERT INTO send_logs (id, sender_id, key_id, to_addr, subject, status, error, duration, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [
          cryptoRandomId(),
          data.senderId,
          data.keyId,
          data.to,
          data.subject,
          data.status,
          data.error,
          data.duration,
          now(),
        ],
      );
      return rowToLog(row[0]);
    },

    async listSendLogs(senderId, options = {}) {
      const limit = options.limit ?? 50;
      const offset = options.offset ?? 0;
      const order = options.order === "asc" ? "ASC" : "DESC";
      const rows = await q<LogRow>(
        `SELECT * FROM send_logs WHERE sender_id = $1 ORDER BY created_at ${order} LIMIT $2 OFFSET $3`,
        [senderId, limit, offset],
      );
      const totalRow = await q<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM send_logs WHERE sender_id = $1`,
        [senderId],
      );
      return { rows: rows.map(rowToLog), total: Number(totalRow[0].count) };
    },

    async countSenders() {
      const row = await q<{ count: string }>(`SELECT COUNT(*)::text AS count FROM senders`);
      return Number(row[0].count);
    },

    async countSendLogs(status) {
      if (status) {
        const row = await q<{ count: string }>(`SELECT COUNT(*)::text AS count FROM send_logs WHERE status = $1`, [status]);
        return Number(row[0].count);
      }
      const row = await q<{ count: string }>(`SELECT COUNT(*)::text AS count FROM send_logs`);
      return Number(row[0].count);
    },
  };
}

/** 白名单列名,防 SQL 注入 */
function mapOrderColumn(col: string): string {
  switch (col) {
    case "createdAt":
      return "created_at";
    case "updatedAt":
      return "updated_at";
    case "name":
    case "pid":
      return col;
    default:
      return "created_at";
  }
}

function cryptoRandomId(): string {
  return globalThis.crypto.randomUUID();
}
