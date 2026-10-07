/**
 * SQLite 存储驱动(仅本地/自托管)
 *
 * 注意:Vercel Serverless 文件系统只读,SQLite 无法持久化。
 * 本驱动面向本地开发与 VPS 独立部署。
 */

import path from "node:path";

import Database from "better-sqlite3";

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

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  const dir = process.env.SQLITE_PATH ?? "./data";
  const file = process.env.SQLITE_DB ?? "mailport.db";
  const full = path.resolve(dir, file);
  const database = new Database(full);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  db = database;
  return db;
}

interface SenderRow {
  id: string;
  pid: string;
  name: string;
  type: string;
  enabled: number;
  host: string | null;
  port: number | null;
  secure: number;
  service: string | null;
  username: string | null;
  password: string | null;
  from_address: string | null;
  from_name: string | null;
  allowed_domains: string | null;
  http_url: string | null;
  http_method: string | null;
  http_headers: string | null;
  http_body: string | null;
  oauth_client_id: string | null;
  oauth_client_secret: string | null;
  oauth_refresh_token: string | null;
  oauth_authorized_at: number | null;
  created_at: number;
  updated_at: number;
}

interface KeyRow {
  id: string;
  sender_id: string;
  key: string;
  label: string;
  enabled: number;
  last_used_at: number | null;
  created_at: number;
}

interface LogRow {
  id: string;
  sender_id: string;
  key_id: string | null;
  to_addr: string;
  subject: string;
  status: string;
  error: string | null;
  duration: number;
  created_at: number;
}

function rowToSender(r: SenderRow): Sender {
  let domains: string[] = [];
  if (r.allowed_domains) {
    try {
      const parsed = JSON.parse(r.allowed_domains);
      if (Array.isArray(parsed)) domains = parsed;
    } catch {
      domains = [];
    }
  }
  return {
    id: r.id,
    pid: r.pid,
    name: r.name,
    type: r.type as Sender["type"],
    enabled: r.enabled === 1,
    host: r.host,
    port: r.port,
    secure: r.secure === 1,
    service: r.service,
    username: r.username,
    password: r.password ? decrypt(r.password) : null,
    fromAddress: r.from_address,
    fromName: r.from_name,
    allowedDomains: domains,
    httpUrl: r.http_url,
    httpMethod: r.http_method,
    httpHeaders: r.http_headers,
    httpBody: r.http_body,
    oauthClientId: r.oauth_client_id,
    oauthClientSecret: r.oauth_client_secret ? decrypt(r.oauth_client_secret) : null,
    oauthRefreshToken: r.oauth_refresh_token ? decrypt(r.oauth_refresh_token) : null,
    oauthAuthorizedAt: r.oauth_authorized_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToKey(r: KeyRow): SenderKey {
  return {
    id: r.id,
    senderId: r.sender_id,
    key: decrypt(r.key),
    label: r.label,
    enabled: r.enabled === 1,
    lastUsedAt: r.last_used_at,
    createdAt: r.created_at,
  };
}

function rowToLog(r: LogRow): SendLog {
  return {
    id: r.id,
    senderId: r.sender_id,
    keyId: r.key_id,
    to: r.to_addr,
    subject: r.subject,
    status: r.status as SendLogStatus,
    error: r.error,
    duration: r.duration,
    createdAt: r.created_at,
  };
}

function now(): number {
  return Date.now();
}

export async function createStorage(): Promise<IStorage> {
  return {
    driver: "sqlite",

    async init() {
      const d = getDb();
      d.exec(`
        CREATE TABLE IF NOT EXISTS senders (
          id            TEXT PRIMARY KEY,
          pid           TEXT NOT NULL UNIQUE,
          name          TEXT NOT NULL,
          type          TEXT NOT NULL DEFAULT 'smtp',
          enabled       INTEGER NOT NULL DEFAULT 1,
          host          TEXT,
          port          INTEGER,
          secure        INTEGER NOT NULL DEFAULT 1,
          service       TEXT,
          username      TEXT,
          password      TEXT,
          from_address  TEXT,
          from_name     TEXT,
          allowed_domains TEXT,
          created_at    INTEGER NOT NULL,
          updated_at    INTEGER NOT NULL
        )
      `);
      d.exec(`CREATE INDEX IF NOT EXISTS idx_senders_pid ON senders(pid)`);

      // 老库升级:补齐新增列(SQLite 不支持 ADD COLUMN IF NOT EXISTS,先查表结构)
      const existing = d.prepare(`PRAGMA table_info(senders)`).all() as { name: string }[];
      const have = new Set(existing.map((c) => c.name));
      const extraColumns: Record<string, string> = {
        http_url: "TEXT",
        http_method: "TEXT",
        http_headers: "TEXT",
        http_body: "TEXT",
        oauth_client_id: "TEXT",
        oauth_client_secret: "TEXT",
        oauth_refresh_token: "TEXT",
        oauth_authorized_at: "INTEGER",
      };
      for (const [col, ddl] of Object.entries(extraColumns)) {
        if (!have.has(col)) d.exec(`ALTER TABLE senders ADD COLUMN ${col} ${ddl}`);
      }
      d.exec(`
        CREATE TABLE IF NOT EXISTS sender_keys (
          id            TEXT PRIMARY KEY,
          sender_id     TEXT NOT NULL REFERENCES senders(id) ON DELETE CASCADE,
          key           TEXT NOT NULL,
          label         TEXT NOT NULL DEFAULT '',
          enabled       INTEGER NOT NULL DEFAULT 1,
          last_used_at  INTEGER,
          created_at    INTEGER NOT NULL
        )
      `);
      d.exec(`CREATE INDEX IF NOT EXISTS idx_sender_keys_sender ON sender_keys(sender_id)`);
      d.exec(`
        CREATE TABLE IF NOT EXISTS send_logs (
          id            TEXT PRIMARY KEY,
          sender_id     TEXT NOT NULL REFERENCES senders(id) ON DELETE CASCADE,
          key_id        TEXT,
          to_addr       TEXT NOT NULL,
          subject       TEXT NOT NULL,
          status        TEXT NOT NULL,
          error         TEXT,
          duration      INTEGER NOT NULL DEFAULT 0,
          created_at    INTEGER NOT NULL
        )
      `);
      d.exec(`CREATE INDEX IF NOT EXISTS idx_send_logs_sender ON send_logs(sender_id, created_at DESC)`);
      d.exec(`CREATE INDEX IF NOT EXISTS idx_send_logs_status ON send_logs(status)`);
    },

    async createSender(data) {
      const d = getDb();
      const ts = now();
      const id = cryptoRandomId();
      d.prepare(
        `INSERT INTO senders (id, pid, name, type, enabled, host, port, secure, service, username, password, from_address, from_name, allowed_domains,
         http_url, http_method, http_headers, http_body,
         oauth_client_id, oauth_client_secret, oauth_refresh_token, oauth_authorized_at,
         created_at, updated_at)
         VALUES (@id,@pid,@name,@type,@enabled,@host,@port,@secure,@service,@username,@password,@from_address,@from_name,@allowed_domains,
         @http_url,@http_method,@http_headers,@http_body,
         @oauth_client_id,@oauth_client_secret,@oauth_refresh_token,@oauth_authorized_at,
         @created_at,@updated_at)`,
      ).run({
        id,
        pid: data.pid,
        name: data.name,
        type: data.type,
        enabled: data.enabled ? 1 : 0,
        host: data.host,
        port: data.port,
        secure: data.secure ? 1 : 0,
        service: data.service,
        username: data.username,
        password: data.password ? encrypt(data.password) : null,
        from_address: data.fromAddress,
        from_name: data.fromName,
        allowed_domains: JSON.stringify(data.allowedDomains ?? []),
        http_url: data.httpUrl,
        http_method: data.httpMethod,
        http_headers: data.httpHeaders,
        http_body: data.httpBody,
        oauth_client_id: data.oauthClientId,
        oauth_client_secret: data.oauthClientSecret ? encrypt(data.oauthClientSecret) : null,
        oauth_refresh_token: data.oauthRefreshToken ? encrypt(data.oauthRefreshToken) : null,
        oauth_authorized_at: data.oauthAuthorizedAt,
        created_at: ts,
        updated_at: ts,
      });
      const row = d.prepare(`SELECT * FROM senders WHERE id = ?`).get(id) as SenderRow;
      return rowToSender(row);
    },

    async updateSender(id, data) {
      const d = getDb();
      const sets: string[] = [];
      const params: Record<string, any> = { id };
      const push = (col: string, val: any) => {
        sets.push(`${col} = @${col}`);
        params[col] = val;
      };
      if (data.name !== undefined) push("name", data.name);
      if (data.type !== undefined) push("type", data.type);
      if (data.enabled !== undefined) push("enabled", data.enabled ? 1 : 0);
      if (data.host !== undefined) push("host", data.host);
      if (data.port !== undefined) push("port", data.port);
      if (data.secure !== undefined) push("secure", data.secure ? 1 : 0);
      if (data.service !== undefined) push("service", data.service);
      if (data.username !== undefined) push("username", data.username);
      if (data.password !== undefined) push("password", data.password ? encrypt(data.password) : null);
      if (data.fromAddress !== undefined) push("from_address", data.fromAddress);
      if (data.fromName !== undefined) push("from_name", data.fromName);
      if (data.allowedDomains !== undefined) push("allowed_domains", JSON.stringify(data.allowedDomains ?? []));
      if (data.httpUrl !== undefined) push("http_url", data.httpUrl);
      if (data.httpMethod !== undefined) push("http_method", data.httpMethod);
      if (data.httpHeaders !== undefined) push("http_headers", data.httpHeaders);
      if (data.httpBody !== undefined) push("http_body", data.httpBody);
      if (data.oauthClientId !== undefined) push("oauth_client_id", data.oauthClientId);
      if (data.oauthClientSecret !== undefined) push("oauth_client_secret", data.oauthClientSecret ? encrypt(data.oauthClientSecret) : null);
      if (data.oauthRefreshToken !== undefined) push("oauth_refresh_token", data.oauthRefreshToken ? encrypt(data.oauthRefreshToken) : null);
      if (data.oauthAuthorizedAt !== undefined) push("oauth_authorized_at", data.oauthAuthorizedAt);
      if (sets.length === 0) {
        const row = d.prepare(`SELECT * FROM senders WHERE id = ?`).get(id) as SenderRow | undefined;
        return row ? rowToSender(row) : null;
      }
      push("updated_at", now());
      d.prepare(`UPDATE senders SET ${sets.join(", ")} WHERE id = @id`).run(params);
      const row = d.prepare(`SELECT * FROM senders WHERE id = ?`).get(id) as SenderRow | undefined;
      return row ? rowToSender(row) : null;
    },

    async getSenderById(id) {
      const d = getDb();
      const row = d.prepare(`SELECT * FROM senders WHERE id = ?`).get(id) as SenderRow | undefined;
      return row ? rowToSender(row) : null;
    },

    async getSenderByPid(pid) {
      const d = getDb();
      const row = d.prepare(`SELECT * FROM senders WHERE pid = ? AND enabled = 1`).get(pid) as SenderRow | undefined;
      return row ? rowToSender(row) : null;
    },

    async listSenders(options = {}) {
      const d = getDb();
      const limit = options.limit ?? 50;
      const offset = options.offset ?? 0;
      const order = options.order === "asc" ? "ASC" : "DESC";
      const col = mapOrderColumn(options.orderBy ?? "createdAt");
      const rows = d.prepare(`SELECT * FROM senders ORDER BY ${col} ${order} LIMIT ? OFFSET ?`).all(limit, offset) as SenderRow[];
      const totalRow = d.prepare(`SELECT COUNT(*) AS count FROM senders`).get() as { count: number };
      return { rows: rows.map(rowToSender), total: totalRow.count };
    },

    async deleteSender(id) {
      const d = getDb();
      d.prepare(`DELETE FROM senders WHERE id = ?`).run(id);
    },

    async createSenderKey(data) {
      const d = getDb();
      const id = cryptoRandomId();
      d.prepare(
        `INSERT INTO sender_keys (id, sender_id, key, label, enabled, last_used_at, created_at)
         VALUES (@id,@sender_id,@key,@label,@enabled,@last_used_at,@created_at)`,
      ).run({
        id,
        sender_id: data.senderId,
        key: encrypt(data.key),
        label: data.label,
        enabled: data.enabled ? 1 : 0,
        last_used_at: null,
        created_at: now(),
      });
      const row = d.prepare(`SELECT * FROM sender_keys WHERE id = ?`).get(id) as KeyRow;
      return rowToKey(row);
    },

    async listSenderKeys(senderId) {
      const d = getDb();
      const rows = d.prepare(`SELECT * FROM sender_keys WHERE sender_id = ? ORDER BY created_at DESC`).all(senderId) as KeyRow[];
      return rows.map(rowToKey);
    },

    async getKeyBySenderAndKey(senderId, plainKey) {
      const d = getDb();
      const rows = d.prepare(`SELECT * FROM sender_keys WHERE sender_id = ? AND enabled = 1`).all(senderId) as KeyRow[];
      const hit = rows.find((r) => decrypt(r.key) === plainKey);
      return hit ? rowToKey(hit) : null;
    },

    async updateSenderKey(id, data) {
      const d = getDb();
      const sets: string[] = [];
      const params: Record<string, any> = { id };
      if (data.label !== undefined) {
        sets.push("label = @label");
        params.label = data.label;
      }
      if (data.enabled !== undefined) {
        sets.push("enabled = @enabled");
        params.enabled = data.enabled ? 1 : 0;
      }
      if (sets.length === 0) {
        const row = d.prepare(`SELECT * FROM sender_keys WHERE id = ?`).get(id) as KeyRow | undefined;
        return row ? rowToKey(row) : null;
      }
      d.prepare(`UPDATE sender_keys SET ${sets.join(", ")} WHERE id = @id`).run(params);
      const row = d.prepare(`SELECT * FROM sender_keys WHERE id = ?`).get(id) as KeyRow | undefined;
      return row ? rowToKey(row) : null;
    },

    async touchSenderKey(id, time) {
      const d = getDb();
      d.prepare(`UPDATE sender_keys SET last_used_at = ? WHERE id = ?`).run(time, id);
    },

    async deleteSenderKey(id) {
      const d = getDb();
      d.prepare(`DELETE FROM sender_keys WHERE id = ?`).run(id);
    },

    async createSendLog(data) {
      const d = getDb();
      const id = cryptoRandomId();
      const ts = now();
      d.prepare(
        `INSERT INTO send_logs (id, sender_id, key_id, to_addr, subject, status, error, duration, created_at)
         VALUES (@id,@sender_id,@key_id,@to_addr,@subject,@status,@error,@duration,@created_at)`,
      ).run({
        id,
        sender_id: data.senderId,
        key_id: data.keyId,
        to_addr: data.to,
        subject: data.subject,
        status: data.status,
        error: data.error,
        duration: data.duration,
        created_at: ts,
      });
      return {
        id,
        senderId: data.senderId,
        keyId: data.keyId,
        to: data.to,
        subject: data.subject,
        status: data.status,
        error: data.error,
        duration: data.duration,
        createdAt: ts,
      };
    },

    async listSendLogs(senderId, options = {}) {
      const d = getDb();
      const limit = options.limit ?? 50;
      const offset = options.offset ?? 0;
      const order = options.order === "asc" ? "ASC" : "DESC";
      const rows = d
        .prepare(`SELECT * FROM send_logs WHERE sender_id = ? ORDER BY created_at ${order} LIMIT ? OFFSET ?`)
        .all(senderId, limit, offset) as LogRow[];
      const totalRow = d
        .prepare(`SELECT COUNT(*) AS count FROM send_logs WHERE sender_id = ?`)
        .get(senderId) as { count: number };
      return { rows: rows.map(rowToLog), total: totalRow.count };
    },

    async countSenders() {
      const d = getDb();
      const row = d.prepare(`SELECT COUNT(*) AS count FROM senders`).get() as { count: number };
      return row.count;
    },

    async countSendLogs(status) {
      const d = getDb();
      if (status) {
        const row = d.prepare(`SELECT COUNT(*) AS count FROM send_logs WHERE status = ?`).get(status) as { count: number };
        return row.count;
      }
      const row = d.prepare(`SELECT COUNT(*) AS count FROM send_logs`).get() as { count: number };
      return row.count;
    },
  };
}

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
