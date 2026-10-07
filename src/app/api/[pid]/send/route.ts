/**
 * 公开发件接口:POST /api/{pid}/send
 *
 * 鉴权:Authorization: Bearer <32位密钥> 或 x-api-key 或 ?key=
 * 路由标识 pid 为发件商创建时随机生成的 5-10 位字母数字。
 * 每个发件商的域名白名单、密钥均独立存储于数据库。
 */

import { getStorage } from "@/server/lib/db";
import { errorResponse, extractApiKey, json, readJsonBody, toErrorResponse } from "@/server/lib/api";
import { isDomainAllowed, isValidEmail, sendMail } from "@/server/lib/mail";
import type { SendLogStatus } from "@/server/storage/types";

interface SendBody {
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ pid: string }> },
) {
  const { pid } = await context.params;
  const started = Date.now();

  try {
    const storage = await getStorage();
    const sender = await storage.getSenderByPid(pid);
    if (!sender) {
      return errorResponse("Sender not found or disabled.", 404);
    }

    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return errorResponse("Missing API key. Provide it via Authorization: Bearer <key>.", 401);
    }

    const keyRecord = await storage.getKeyBySenderAndKey(sender.id, apiKey);
    if (!keyRecord) {
      return errorResponse("Invalid API key for this sender.", 401);
    }

    const body = await readJsonBody<SendBody>(request);
    const to = (body.to ?? "").trim();
    const subject = (body.subject ?? "").trim();
    const text = (body.text ?? "").trim();
    const html = body.html;

    if (!to || !subject) {
      return errorResponse("Missing required fields: to, subject.", 400);
    }
    if (!text && !html) {
      return errorResponse("At least one of text or html is required.", 400);
    }
    if (!isValidEmail(to)) {
      return errorResponse(`Invalid recipient address: ${to}`, 400);
    }
    if (!isDomainAllowed(sender, to)) {
      const domain = to.split("@")[1] ?? "invalid";
      return errorResponse(
        `Recipient domain ${domain} is not allowed by this sender. Allowed domains: ${sender.allowedDomains.join(", ") || "(none)"}`,
        403,
      );
    }

    try {
      const result = await sendMail(sender, { to, subject, text, html });
      await storage.touchSenderKey(keyRecord.id, Date.now());
      await storage.createSendLog({
        senderId: sender.id,
        keyId: keyRecord.id,
        to,
        subject,
        status: "success" satisfies SendLogStatus,
        error: null,
        duration: Date.now() - started,
      });
      return json({ success: true, messageId: result.messageId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send email.";
      await storage.createSendLog({
        senderId: sender.id,
        keyId: keyRecord.id,
        to,
        subject,
        status: "failed" satisfies SendLogStatus,
        error: message,
        duration: Date.now() - started,
      });
      return errorResponse("Failed to send email.", 500, message);
    }
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function GET() {
  return json({
    name: "MailPort",
    endpoint: "/api/{pid}/send",
    method: "POST",
    auth: "Authorization: Bearer <api-key>",
    fields: ["to", "subject", "text", "html"],
  });
}
