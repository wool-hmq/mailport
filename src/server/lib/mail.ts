/**
 * 发件能力:根据 Sender 配置构造 nodemailer transporter 并发送。
 * provider 类型预留 outlook_oauth2,当前仅实现 smtp。
 */

import nodemailer, { type Transporter } from "nodemailer";

import type { Sender } from "../storage/types";

const transporterCache = new WeakMap<Sender, Transporter>();

function buildTransporter(sender: Sender): Transporter {
  const cached = transporterCache.get(sender);
  if (cached) return cached;

  if (sender.type === "outlook_oauth2") {
    throw new Error(
      "Outlook OAuth2 provider is not implemented yet. Create an SMTP sender instead.",
    );
  }

  if (!sender.host && !sender.service) {
    throw new Error("SMTP configuration incomplete: host or service is required.");
  }
  if (!sender.username || !sender.password) {
    throw new Error("SMTP configuration incomplete: username and password are required.");
  }

  const config: Record<string, unknown> = {
    auth: { user: sender.username, pass: sender.password },
  };
  if (sender.service) {
    config.service = sender.service;
  } else {
    config.host = sender.host;
    config.port = sender.port ?? 465;
    config.secure = sender.secure;
  }

  const transporter = nodemailer.createTransport(config as any);
  transporterCache.set(sender, transporter);
  return transporter;
}

export interface SendMailInput {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface SendMailResult {
  messageId: string;
}

export async function sendMail(sender: Sender, input: SendMailInput): Promise<SendMailResult> {
  const transporter = buildTransporter(sender);
  const from = sender.fromAddress
    ? sender.fromName
      ? `"${sender.fromName}" <${sender.fromAddress}>`
      : sender.fromAddress
    : sender.username!;
  const info = await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  return { messageId: info.messageId };
}

/** 校验收件人是否在发件商允许的域名白名单内;白名单为空表示不限制 */
export function isDomainAllowed(sender: Sender, to: string): boolean {
  if (!sender.allowedDomains || sender.allowedDomains.length === 0) return true;
  const domain = to.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return sender.allowedDomains.some((d) => d.toLowerCase() === domain);
}

/** 基础邮箱格式校验 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
