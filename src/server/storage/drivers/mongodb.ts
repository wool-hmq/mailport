/**
 * MongoDB 存储驱动(适用于 MongoDB Atlas / 自建 MongoDB)
 *
 * 说明:文档字段做蛇形转换以贴近关系模型;时间戳存毫秒数(long)。
 */

import { MongoClient, type Collection, type Db, type Document, type Filter } from "mongodb";

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

let client: MongoClient | null = null;
let db: Db | null = null;

function getDb(): Db {
  if (db) return db;
  const user = process.env.MONGO_USER;
  const password = process.env.MONGO_PASSWORD;
  const dbName = process.env.MONGO_DB || process.env.MONGODB_DB || "";
  if (!dbName) {
    throw new Error("MongoDB config incomplete: MONGO_DB is required.");
  }

  const hosts = parseArrayEnv(process.env.MONGO_HOST) || ["127.0.0.1"];
  const ports = parseArrayEnv(process.env.MONGO_PORT) || ["27017"];
  const replicaSet = process.env.MONGO_REPLICASET;
  const authSource = process.env.MONGO_AUTHSOURCE || (user ? "admin" : "");
  const ssl = process.env.MONGO_OPT_SSL === "true" || process.env.MONGO_OPT_SSL === "1";

  if (hosts.length > 1 && !replicaSet) {
    throw new Error("MongoDB: multiple MONGO_HOST values require MONGO_REPLICASET to be set.");
  }

  const authPart = user ? `${encodeURIComponent(user)}:${encodeURIComponent(password ?? "")}@` : "";
  const hostPart = hosts.map((h, i) => `${h}:${ports[i] ?? ports[0]}`).join(",");
  const params = new URLSearchParams();
  if (replicaSet) params.set("replicaSet", replicaSet);
  if (authSource) params.set("authSource", authSource);
  params.set("ssl", String(ssl));
  const uri =
    process.env.MONGODB_URI ??
    `mongodb://${authPart}${hostPart}/?${params.toString()}`;

  client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  db = client.db(dbName);
  return db;
}

function parseArrayEnv(v?: string): string[] | null {
  if (!v) return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("[")) return [trimmed];
  try {
    const arr = JSON.parse(trimmed);
    return Array.isArray(arr) ? arr.map(String) : null;
  } catch {
    return null;
  }
}

interface SenderDoc extends Document {
  _id: string;
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
  allowed_domains: string[];
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

interface KeyDoc extends Document {
  _id: string;
  sender_id: string;
  key: string;
  label: string;
  enabled: boolean;
  last_used_at: number | null;
  created_at: number;
}

interface LogDoc extends Document {
  _id: string;
  sender_id: string;
  key_id: string | null;
  to_addr: string;
  subject: string;
  status: string;
  error: string | null;
  duration: number;
  created_at: number;
}

function docToSender(d: SenderDoc): Sender {
  return {
    id: String(d._id),
    pid: d.pid,
    name: d.name,
    type: d.type as Sender["type"],
    enabled: d.enabled,
    host: d.host,
    port: d.port,
    secure: d.secure,
    service: d.service,
    username: d.username,
    password: d.password ? decrypt(d.password) : null,
    fromAddress: d.from_address,
    fromName: d.from_name,
    allowedDomains: Array.isArray(d.allowed_domains) ? d.allowed_domains : [],
    httpUrl: d.http_url,
    httpMethod: d.http_method,
    httpHeaders: d.http_headers,
    httpBody: d.http_body,
    oauthClientId: d.oauth_client_id,
    oauthClientSecret: d.oauth_client_secret ? decrypt(d.oauth_client_secret) : null,
    oauthRefreshToken: d.oauth_refresh_token ? decrypt(d.oauth_refresh_token) : null,
    oauthAuthorizedAt: d.oauth_authorized_at,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

function docToKey(d: KeyDoc): SenderKey {
  return {
    id: String(d._id),
    senderId: d.sender_id,
    key: decrypt(d.key),
    label: d.label ?? "",
    enabled: d.enabled,
    lastUsedAt: d.last_used_at ?? null,
    createdAt: d.created_at,
  };
}

function docToLog(d: LogDoc): SendLog {
  return {
    id: String(d._id),
    senderId: d.sender_id,
    keyId: d.key_id,
    to: d.to_addr,
    subject: d.subject,
    status: d.status as SendLogStatus,
    error: d.error,
    duration: d.duration,
    createdAt: d.created_at,
  };
}

function now(): number {
  return Date.now();
}

export async function createStorage(): Promise<IStorage> {
  const col = <T extends Document>(name: string): Collection<T> => getDb().collection<T>(name);

  return {
    driver: "mongodb",

    async init() {
      const senders = col<SenderDoc>("senders");
      await senders.createIndex({ pid: 1 }, { unique: true });
      const keys = col<KeyDoc>("sender_keys");
      await keys.createIndex({ sender_id: 1, created_at: -1 });
      const logs = col<LogDoc>("send_logs");
      await logs.createIndex({ sender_id: 1, created_at: -1 });
      await logs.createIndex({ status: 1 });
    },

    async createSender(data) {
      const ts = now();
      const doc: SenderDoc = {
        _id: cryptoRandomId(),
        pid: data.pid,
        name: data.name,
        type: data.type,
        enabled: data.enabled,
        host: data.host,
        port: data.port,
        secure: data.secure,
        service: data.service,
        username: data.username,
        password: data.password ? encrypt(data.password) : null,
        from_address: data.fromAddress,
        from_name: data.fromName,
        allowed_domains: data.allowedDomains ?? [],
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
      };
      await col<SenderDoc>("senders").insertOne(doc);
      return docToSender(doc);
    },

    async updateSender(id, data) {
      const sets: Partial<SenderDoc> = {};
      if (data.name !== undefined) sets.name = data.name;
      if (data.type !== undefined) sets.type = data.type;
      if (data.enabled !== undefined) sets.enabled = data.enabled;
      if (data.host !== undefined) sets.host = data.host;
      if (data.port !== undefined) sets.port = data.port;
      if (data.secure !== undefined) sets.secure = data.secure;
      if (data.service !== undefined) sets.service = data.service;
      if (data.username !== undefined) sets.username = data.username;
      if (data.password !== undefined) sets.password = data.password ? encrypt(data.password) : null;
      if (data.fromAddress !== undefined) sets.from_address = data.fromAddress;
      if (data.fromName !== undefined) sets.from_name = data.fromName;
      if (data.allowedDomains !== undefined) sets.allowed_domains = data.allowedDomains ?? [];
      if (data.httpUrl !== undefined) sets.http_url = data.httpUrl;
      if (data.httpMethod !== undefined) sets.http_method = data.httpMethod;
      if (data.httpHeaders !== undefined) sets.http_headers = data.httpHeaders;
      if (data.httpBody !== undefined) sets.http_body = data.httpBody;
      if (data.oauthClientId !== undefined) sets.oauth_client_id = data.oauthClientId;
      if (data.oauthClientSecret !== undefined) sets.oauth_client_secret = data.oauthClientSecret ? encrypt(data.oauthClientSecret) : null;
      if (data.oauthRefreshToken !== undefined) sets.oauth_refresh_token = data.oauthRefreshToken ? encrypt(data.oauthRefreshToken) : null;
      if (data.oauthAuthorizedAt !== undefined) sets.oauth_authorized_at = data.oauthAuthorizedAt;
      if (Object.keys(sets).length === 0) {
        const cur = await col<SenderDoc>("senders").findOne({ _id: id });
        return cur ? docToSender(cur) : null;
      }
      sets.updated_at = now();
      const after = await col<SenderDoc>("senders").findOneAndUpdate(
        { _id: id },
        { $set: sets },
        { returnDocument: "after" },
      );
      return after ? docToSender(after) : null;
    },

    async getSenderById(id) {
      const doc = await col<SenderDoc>("senders").findOne({ _id: id });
      return doc ? docToSender(doc) : null;
    },

    async getSenderByPid(pid) {
      const doc = await col<SenderDoc>("senders").findOne({ pid, enabled: true });
      return doc ? docToSender(doc) : null;
    },

    async listSenders(options = {}) {
      const limit = options.limit ?? 50;
      const offset = options.offset ?? 0;
      const sortField = sortKey(options.orderBy ?? "createdAt");
      const sortDir = options.order === "asc" ? 1 : -1;
      const cursor = col<SenderDoc>("senders").find({}, { sort: { [sortField]: sortDir } });
      const [rows, total] = await Promise.all([
        cursor.skip(offset).limit(limit).toArray(),
        col<SenderDoc>("senders").countDocuments(),
      ]);
      return { rows: rows.map(docToSender), total };
    },

    async deleteSender(id) {
      await col<SenderDoc>("senders").deleteOne({ _id: id });
      await col<KeyDoc>("sender_keys").deleteMany({ sender_id: id });
      await col<LogDoc>("send_logs").deleteMany({ sender_id: id });
    },

    async createSenderKey(data) {
      const doc: KeyDoc = {
        _id: cryptoRandomId(),
        sender_id: data.senderId,
        key: encrypt(data.key),
        label: data.label,
        enabled: data.enabled,
        last_used_at: null,
        created_at: now(),
      };
      await col<KeyDoc>("sender_keys").insertOne(doc);
      return docToKey(doc);
    },

    async listSenderKeys(senderId) {
      const rows = await col<KeyDoc>("sender_keys")
        .find({ sender_id: senderId })
        .sort({ created_at: -1 })
        .toArray();
      return rows.map(docToKey);
    },

    async getKeyBySenderAndKey(senderId, plainKey) {
      const rows = await col<KeyDoc>("sender_keys")
        .find({ sender_id: senderId, enabled: true })
        .toArray();
      const hit = rows.find((r) => decrypt(r.key) === plainKey);
      return hit ? docToKey(hit) : null;
    },

    async updateSenderKey(id, data) {
      const sets: Partial<KeyDoc> = {};
      if (data.label !== undefined) sets.label = data.label;
      if (data.enabled !== undefined) sets.enabled = data.enabled;
      if (Object.keys(sets).length === 0) {
        const cur = await col<KeyDoc>("sender_keys").findOne({ _id: id });
        return cur ? docToKey(cur) : null;
      }
      const after = await col<KeyDoc>("sender_keys").findOneAndUpdate(
        { _id: id },
        { $set: sets },
        { returnDocument: "after" },
      );
      return after ? docToKey(after) : null;
    },

    async touchSenderKey(id, time) {
      await col<KeyDoc>("sender_keys").updateOne({ _id: id }, { $set: { last_used_at: time } });
    },

    async deleteSenderKey(id) {
      await col<KeyDoc>("sender_keys").deleteOne({ _id: id });
    },

    async createSendLog(data) {
      const doc: LogDoc = {
        _id: cryptoRandomId(),
        sender_id: data.senderId,
        key_id: data.keyId,
        to_addr: data.to,
        subject: data.subject,
        status: data.status,
        error: data.error,
        duration: data.duration,
        created_at: now(),
      };
      await col<LogDoc>("send_logs").insertOne(doc);
      return docToLog(doc);
    },

    async listSendLogs(senderId, options = {}) {
      const limit = options.limit ?? 50;
      const offset = options.offset ?? 0;
      const sortDir = options.order === "asc" ? 1 : -1;
      const filter: Filter<LogDoc> = { sender_id: senderId };
      const cursor = col<LogDoc>("send_logs").find(filter, { sort: { created_at: sortDir } });
      const [rows, total] = await Promise.all([
        cursor.skip(offset).limit(limit).toArray(),
        col<LogDoc>("send_logs").countDocuments(filter),
      ]);
      return { rows: rows.map(docToLog), total };
    },

    async countSenders() {
      return col<SenderDoc>("senders").countDocuments();
    },

    async countSendLogs(status) {
      const filter: Filter<LogDoc> = status ? { status } : {};
      return col<LogDoc>("send_logs").countDocuments(filter);
    },
  };
}

function sortKey(col: string): string {
  switch (col) {
    case "createdAt":
      return "created_at";
    case "updatedAt":
      return "updated_at";
    default:
      return "created_at";
  }
}

function cryptoRandomId(): string {
  return globalThis.crypto.randomUUID();
}
