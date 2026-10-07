/**
 * MySQL 存储驱动(同样适用于 TiDB / PlanetScale / FreeDB 等 MySQL 协议数据库)
 *
 * 说明:数组(allowed_domains)用 JSON 列存;时间戳用 BIGINT 存毫秒。
 */

import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";

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
  const host = process.env.MYSQL_HOST || process.env.TIDB_HOST || "127.0.0.1";
  const port = Number(process.env.MYSQL_PORT || process.env.TIDB_PORT || 3306);
  const database = process.env.MYSQL_DB || process.env.TIDB_DB || "";
  const user = process.env.MYSQL_USER || process.env.TIDB_USER || "";
  const password = process.env.MYSQL_PASSWORD || process.env.TIDB_PASSWORD || "";
  const ssl = bool(process.env.MYSQL_SSL ?? process.env.TIDB_SSL ?? "false");

  if (!database || !user) {
    throw new Error("MySQL config incomplete: MYSQL_DB/MYSQL_USER (or TIDB_*) are required.");
  }
  pool = mysql.createPool({
    host,
    port,
    database,
    user,
    password,
    ssl: ssl ? {} : undefined,
    connectionLimit: 5,
    waitForConnections: true,
  });
  return pool;
}

type AnyRow = RowDataPacket;

function rowToSender(r: AnyRow): Sender {
  let domains: string[] = [];
  const raw = r.allowed_domains;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) domains = parsed;
    } catch {
      domains = [];
    }
  } else if (Array.isArray(raw)) {
    domains = raw;
  }
  return {
    id: String(r.id),
    pid: String(r.pid),
    name: String(r.name),
    type: String(r.type) as Sender["type"],
    enabled: !!r.enabled,
    host: r.host === null ? null : String(r.host),
    port: r.port === null ? null : Number(r.port),
    secure: !!r.secure,
    service: r.service === null ? null : String(r.service),
    username: r.username === null ? null : String(r.username),
    password: r.password ? decrypt(String(r.password)) : null,
    fromAddress: r.from_address === null ? null : String(r.from_address),
    fromName: r.from_name === null ? null : String(r.from_name),
    allowedDomains: domains,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

function rowToKey(r: AnyRow): SenderKey {
  return {
    id: String(r.id),
    senderId: String(r.sender_id),
    key: decrypt(String(r.key)),
    label: String(r.label ?? ""),
    enabled: !!r.enabled,
    lastUsedAt: r.last_used_at === null ? null : Number(r.last_used_at),
    createdAt: Number(r.created_at),
  };
}

function rowToLog(r: AnyRow): SendLog {
  return {
    id: String(r.id),
    senderId: String(r.sender_id),
    keyId: r.key_id === null ? null : String(r.key_id),
    to: String(r.to_addr),
    subject: String(r.subject),
    status: String(r.status) as SendLogStatus,
    error: r.error === null ? null : String(r.error),
    duration: Number(r.duration),
    createdAt: Number(r.created_at),
  };
}

function now(): number {
  return Date.now();
}

export async function createStorage(): Promise<IStorage> {
  const q = async (sql: string, params: any[] = []): Promise<AnyRow[]> => {
    const p = getPool();
    const [rows] = await p.query<AnyRow[]>(sql, params);
    return rows;
  };

  return {
    driver: "mysql",

    async init() {
      await q(`
        CREATE TABLE IF NOT EXISTS senders (
          id            VARCHAR(64) NOT NULL PRIMARY KEY,
          pid           VARCHAR(32) NOT NULL,
          name          VARCHAR(128) NOT NULL,
          type          VARCHAR(32) NOT NULL DEFAULT 'smtp',
          enabled       TINYINT(1) NOT NULL DEFAULT 1,
          host          VARCHAR(255) NULL,
          port          INT NULL,
          secure        TINYINT(1) NOT NULL DEFAULT 1,
          service       VARCHAR(64) NULL,
          username      VARCHAR(255) NULL,
          password      TEXT NULL,
          from_address  VARCHAR(255) NULL,
          from_name     VARCHAR(255) NULL,
          allowed_domains JSON NULL,
          created_at    BIGINT NOT NULL,
          updated_at    BIGINT NOT NULL,
          UNIQUE KEY uk_pid (pid)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await q(`CREATE INDEX idx_senders_pid ON senders(pid)`);
      await q(`
        CREATE TABLE IF NOT EXISTS sender_keys (
          id            VARCHAR(64) NOT NULL PRIMARY KEY,
          sender_id     VARCHAR(64) NOT NULL,
          key           TEXT NOT NULL,
          label         VARCHAR(128) NOT NULL DEFAULT '',
          enabled       TINYINT(1) NOT NULL DEFAULT 1,
          last_used_at  BIGINT NULL,
          created_at    BIGINT NOT NULL,
          INDEX idx_sender_keys_sender (sender_id),
          CONSTRAINT fk_sender_keys_sender FOREIGN KEY (sender_id) REFERENCES senders(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await q(`
        CREATE TABLE IF NOT EXISTS send_logs (
          id            VARCHAR(64) NOT NULL PRIMARY KEY,
          sender_id     VARCHAR(64) NOT NULL,
          key_id        VARCHAR(64) NULL,
          to_addr       VARCHAR(255) NOT NULL,
          subject       VARCHAR(500) NOT NULL,
          status        VARCHAR(16) NOT NULL,
          error         TEXT NULL,
          duration      BIGINT NOT NULL DEFAULT 0,
          created_at    BIGINT NOT NULL,
          INDEX idx_send_logs_sender (sender_id, created_at),
          INDEX idx_send_logs_status (status),
          CONSTRAINT fk_send_logs_sender FOREIGN KEY (sender_id) REFERENCES senders(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    },

    async createSender(data) {
      const ts = now();
      const id = cryptoRandomId();
      await q(
        `INSERT INTO senders (id, pid, name, type, enabled, host, port, secure, service, username, password, from_address, from_name, allowed_domains, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id,
          data.pid,
          data.name,
          data.type,
          data.enabled ? 1 : 0,
          data.host,
          data.port,
          data.secure ? 1 : 0,
          data.service,
          data.username,
          data.password ? encrypt(data.password) : null,
          data.fromAddress,
          data.fromName,
          JSON.stringify(data.allowedDomains ?? []),
          ts,
          ts,
        ],
      );
      const res = await q(`SELECT * FROM senders WHERE id = ?`, [id]);
      return rowToSender(res[0]);
    },

    async updateSender(id, data) {
      const sets: string[] = [];
      const params: any[] = [];
      const push = (col: string, val: any) => {
        sets.push(`${col} = ?`);
        params.push(val);
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
      if (sets.length === 0) {
        const res = await q(`SELECT * FROM senders WHERE id = ?`, [id]);
        return res[0] ? rowToSender(res[0]) : null;
      }
      push("updated_at", now());
      params.push(id);
      await q(`UPDATE senders SET ${sets.join(", ")} WHERE id = ?`, params);
      const res = await q(`SELECT * FROM senders WHERE id = ?`, [id]);
      return res[0] ? rowToSender(res[0]) : null;
    },

    async getSenderById(id) {
      const res = await q(`SELECT * FROM senders WHERE id = ?`, [id]);
      return res[0] ? rowToSender(res[0]) : null;
    },

    async getSenderByPid(pid) {
      const res = await q(`SELECT * FROM senders WHERE pid = ? AND enabled = 1`, [pid]);
      return res[0] ? rowToSender(res[0]) : null;
    },

    async listSenders(options = {}) {
      const limit = options.limit ?? 50;
      const offset = options.offset ?? 0;
      const order = options.order === "asc" ? "ASC" : "DESC";
      const col = mapOrderColumn(options.orderBy ?? "createdAt");
      const rows = await q(`SELECT * FROM senders ORDER BY ${col} ${order} LIMIT ? OFFSET ?`, [limit, offset]);
      const totalRows = await q(`SELECT COUNT(*) AS count FROM senders`);
      return { rows: rows.map(rowToSender), total: Number(totalRows[0].count) };
    },

    async deleteSender(id) {
      await q(`DELETE FROM senders WHERE id = ?`, [id]);
    },

    async createSenderKey(data) {
      const ts = now();
      const id = cryptoRandomId();
      await q(
        `INSERT INTO sender_keys (id, sender_id, key, label, enabled, last_used_at, created_at)
         VALUES (?,?,?,?,?,?,?)`,
        [id, data.senderId, encrypt(data.key), data.label, data.enabled ? 1 : 0, null, ts],
      );
      const res = await q(`SELECT * FROM sender_keys WHERE id = ?`, [id]);
      return rowToKey(res[0]);
    },

    async listSenderKeys(senderId) {
      const rows = await q(`SELECT * FROM sender_keys WHERE sender_id = ? ORDER BY created_at DESC`, [senderId]);
      return rows.map(rowToKey);
    },

    async getKeyBySenderAndKey(senderId, plainKey) {
      const rows = await q(
        `SELECT * FROM sender_keys WHERE sender_id = ? AND enabled = 1`,
        [senderId],
      );
      const hit = rows.find((r) => decrypt(String(r.key)) === plainKey);
      return hit ? rowToKey(hit) : null;
    },

    async updateSenderKey(id, data) {
      const sets: string[] = [];
      const params: any[] = [];
      if (data.label !== undefined) {
        sets.push("label = ?");
        params.push(data.label);
      }
      if (data.enabled !== undefined) {
        sets.push("enabled = ?");
        params.push(data.enabled ? 1 : 0);
      }
      if (sets.length === 0) {
        const res = await q(`SELECT * FROM sender_keys WHERE id = ?`, [id]);
        return res[0] ? rowToKey(res[0]) : null;
      }
      params.push(id);
      await q(`UPDATE sender_keys SET ${sets.join(", ")} WHERE id = ?`, params);
      const res = await q(`SELECT * FROM sender_keys WHERE id = ?`, [id]);
      return res[0] ? rowToKey(res[0]) : null;
    },

    async touchSenderKey(id, time) {
      await q(`UPDATE sender_keys SET last_used_at = ? WHERE id = ?`, [time, id]);
    },

    async deleteSenderKey(id) {
      await q(`DELETE FROM sender_keys WHERE id = ?`, [id]);
    },

    async createSendLog(data) {
      const id = cryptoRandomId();
      const ts = now();
      await q(
        `INSERT INTO send_logs (id, sender_id, key_id, to_addr, subject, status, error, duration, created_at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          id,
          data.senderId,
          data.keyId,
          data.to,
          data.subject,
          data.status,
          data.error,
          data.duration,
          ts,
        ],
      );
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
      const limit = options.limit ?? 50;
      const offset = options.offset ?? 0;
      const order = options.order === "asc" ? "ASC" : "DESC";
      const rows = await q(
        `SELECT * FROM send_logs WHERE sender_id = ? ORDER BY created_at ${order} LIMIT ? OFFSET ?`,
        [senderId, limit, offset],
      );
      const totalRows = await q(`SELECT COUNT(*) AS count FROM send_logs WHERE sender_id = ?`, [senderId]);
      return { rows: rows.map(rowToLog), total: Number(totalRows[0].count) };
    },

    async countSenders() {
      const rows = await q(`SELECT COUNT(*) AS count FROM senders`);
      return Number(rows[0].count);
    },

    async countSendLogs(status) {
      if (status) {
        const rows = await q(`SELECT COUNT(*) AS count FROM send_logs WHERE status = ?`, [status]);
        return Number(rows[0].count);
      }
      const rows = await q(`SELECT COUNT(*) AS count FROM send_logs`);
      return Number(rows[0].count);
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
