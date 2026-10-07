/**
 * 管理端:测试发信(用发件商自身配置向指定地址发一封测试邮件)
 * POST /api/admin/senders/{id}/test { to }
 */

import { getStorage } from "@/server/lib/db";
import { errorResponse, json, readJsonBody, toErrorResponse } from "@/server/lib/api";
import { requireAdmin } from "@/server/lib/guard";
import { isDomainAllowed, isValidEmail, sendMail } from "@/server/lib/mail";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if (guard) return guard;
  try {
    const { id } = await context.params;
    const storage = await getStorage();
    const sender = await storage.getSenderById(id);
    if (!sender) return errorResponse("Sender not found.", 404);

    const body = await readJsonBody<{ to?: string }>(request);
    const to = (body.to ?? "").trim();
    if (!to) return errorResponse("to is required.", 400);
    if (!isValidEmail(to)) return errorResponse(`Invalid recipient address: ${to}`, 400);
    if (!isDomainAllowed(sender, to)) {
      const domain = to.split("@")[1] ?? "invalid";
      return errorResponse(
        `Recipient domain ${domain} is not allowed by this sender.`,
        403,
      );
    }

    const result = await sendMail(sender, {
      to,
      subject: "[MailPort] Test email",
      text: `This is a test email from MailPort sender "${sender.name}".`,
    });
    return json({ success: true, messageId: result.messageId });
  } catch (err) {
    return toErrorResponse(err);
  }
}
