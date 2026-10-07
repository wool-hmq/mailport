/**
 * 加解密工具:用于 SMTP 密码与 API 密钥的对称加密。
 * 算法 AES-256-GCM,密钥取自 MAILPORT_SECRET。
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.MAILPORT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "MAILPORT_SECRET is not configured or shorter than 32 characters. Set it in your environment variables.",
    );
  }
  cachedKey = createHash("sha256").update(secret).digest();
  return cachedKey;
}

/** 加密为 "v1:<base64 iv>:<base64 ciphertext>:<base64 tag>" 格式 */
export function encrypt(plain: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${enc.toString("base64")}:${tag.toString("base64")}`;
}

/** 解密;非 v1 前缀(明文历史数据)直接返回原值,兼容旧数据 */
export function decrypt(cipherText: string | null | undefined): string {
  if (!cipherText) return "";
  if (!cipherText.startsWith("v1:")) return cipherText;
  const [, ivB64, dataB64, tagB64] = cipherText.split(":");
  if (!ivB64 || !dataB64 || !tagB64) return "";
  try {
    const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return "";
  }
}

/** 生成指定长度的不重复随机字符串(字母+数字) */
export function randomToken(length: number, alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

/** 生成发件商路由 pid:5-10 位随机字母数字 */
export function generatePid(): string {
  return randomToken(5 + (randomBytes(1)[0] % 6));
}

/** 生成 32 位 API 密钥 */
export function generateApiKey(): string {
  return randomToken(32);
}
