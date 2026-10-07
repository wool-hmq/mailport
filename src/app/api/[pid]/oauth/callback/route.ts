/**
 * OAuth 授权回调(公开接口,由 provider 直接跳转)
 * GET /api/{pid}/oauth/callback?code=...&state=...
 *
 * 校验 state 签名后,用授权码换取 token,把 refresh token 加密入库,
 * 然后跳回发件商管理页。
 */

import { getStorage } from "@/server/lib/db";
import { errorResponse, json } from "@/server/lib/api";
import { exchangeCode, getCallbackUrl, verifyState } from "@/server/lib/oauth";

export async function GET(request: Request, context: { params: Promise<{ pid: string }> }) {
  const { pid } = await context.params;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  try {
    const storage = await getStorage();
    const sender = await storage.getSenderByPid(pid);

    if (error) {
      return errorPage(`Authorization was rejected by the provider: ${error}`);
    }
    if (!sender) return errorPage("Sender not found or disabled.");
    if (sender.type !== "outlook_oauth2" && sender.type !== "gmail_oauth2") {
      return errorPage("This sender does not use OAuth.");
    }
    if (!code || !state) return errorPage("Missing authorization code or state.");
    const senderId = await verifyState(state);
    if (senderId !== sender.id) return errorPage("Invalid or expired authorization state. Please try again.");

    const redirectUri = getCallbackUrl(url.origin, sender);
    const tokens = await exchangeCode(sender, code, redirectUri);

    await storage.updateSender(sender.id, {
      oauthRefreshToken: tokens.refreshToken,
      oauthAuthorizedAt: Date.now(),
    });

    return new Response(null, {
      status: 302,
      headers: { Location: `/senders/${sender.id}?oauth=success` },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth callback failed.";
    return errorPage(message);
  }
}

function errorPage(message: string): Response {
  return new Response(
    `<!DOCTYPE html><html lang="en"><body style="font-family:system-ui;padding:2rem;max-width:36rem;margin:auto">
      <h2>Authorization failed</h2>
      <p style="color:#b91c1c">${message.replace(/[<>&"]/g, (c) => `&#${c.charCodeAt(0)};`)}</p>
      <p>Go back to the dashboard and click "Authorize" again.</p>
    </body></html>`,
    { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function POST() {
  return json({ error: "Method not allowed." }, 405);
}
