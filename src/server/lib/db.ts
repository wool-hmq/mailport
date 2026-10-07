/**
 * 按 Waline 模式,根据已配置的环境变量自动检测数据库驱动。
 * 检测顺序:PostgreSQL -> MongoDB -> MySQL -> SQLite
 * (PostgreSQL 优先,因为它是 Vercel 上最常见的免费选项)
 */

import type { IStorage } from "../storage/types";

export type DriverName = "postgres" | "mongodb" | "mysql" | "sqlite";

export interface DetectedDriver {
  name: DriverName;
  /** 人类可读的配置摘要,用于启动日志与报错提示 */
  summary: string;
}

function hasAny(...keys: string[]): boolean {
  return keys.some((k) => {
    const v = process.env[k];
    return v !== undefined && v !== "";
  });
}

function resolveOnce(): DetectedDriver | null {
  // PostgreSQL:支持 PG_* 与 POSTGRES_* 两套写法
  if (hasAny("PG_DB", "POSTGRES_DATABASE")) {
    return { name: "postgres", summary: "PostgreSQL (PG_* / POSTGRES_*)" };
  }
  // MongoDB
  if (hasAny("MONGO_DB", "MONGODB_URI")) {
    return { name: "mongodb", summary: "MongoDB (MONGO_*)" };
  }
  // MySQL / TiDB(MySQL 协议)
  if (hasAny("MYSQL_DB", "TIDB_DB")) {
    return { name: "mysql", summary: "MySQL / TiDB (MYSQL_* / TIDB_*)" };
  }
  // SQLite
  if (hasAny("SQLITE_PATH", "SQLITE_DB")) {
    return { name: "sqlite", summary: "SQLite (SQLITE_*)" };
  }
  return null;
}

let cached: DetectedDriver | null | undefined;

export function detectDriver(): DetectedDriver | null {
  if (cached === undefined) {
    cached = resolveOnce();
    if (cached) {
      console.log(`[mailport] storage driver: ${cached.summary}`);
    } else {
      console.warn("[mailport] no database configured. Set PG_* / MONGO_* / MYSQL_* / SQLITE_* env vars.");
    }
  }
  return cached;
}

let storageInstance: IStorage | null = null;

// 显式映射表:让打包器能静态解析依赖,避免动态字符串 import
const driverLoaders: Record<DriverName, () => Promise<{ createStorage: () => Promise<IStorage> }>> = {
  postgres: () => import("../storage/drivers/postgres"),
  mongodb: () => import("../storage/drivers/mongodb"),
  mysql: () => import("../storage/drivers/mysql"),
  sqlite: () => import("../storage/drivers/sqlite"),
};

/**
 * 获取当前生效的存储适配器(单例)。
 * 未配置数据库时抛出友好错误,由 API 层转为 500/503。
 */
export async function getStorage(): Promise<IStorage> {
  if (storageInstance) return storageInstance;
  const detected = detectDriver();
  if (!detected) {
    throw new Error("No database configured. Configure one of PG_*, MONGO_*, MYSQL_*, SQLITE_* in environment variables.");
  }
  const { createStorage } = await driverLoaders[detected.name]();
  const instance: IStorage = await createStorage();
  await instance.init();
  storageInstance = instance;
  return instance;
}
