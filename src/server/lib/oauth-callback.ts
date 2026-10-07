/**
 * OAuth 授权回调处理(公开,由 provider 直接跳转)。
 *
 * 回调地址固定为 /api/oauth/callback,不含发件商信息;发件商由签名的 state 定位。
 * 这样在创建发件商之前就能把回调地址填进 provider 控制台,避免循环依赖。
 */

import { getStorage } from "./db";
import { exchangeCode, getCallbackUrl, verifyState } from "./oauth";

export async function handleOAuthCallback(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  try {
    if (error) {
      return errorPage(`Authorization was rejected by the provider: ${error}`);
    }
    if (!code || !state) {
      return errorPage("Missing authorization code or state.");
    }
    const senderId = await verifyState(state);
    if (!senderId) {
      return errorPage("Invalid or expired authorization state. Please try again.");
    }

    const storage = await getStorage();
    const sender = await storage.getSenderById(senderId);
    if (!sender) return errorPage("Sender not found or disabled.");
    if (sender.type !== "outlook_oauth2" && sender.type !== "gmail_oauth2") {
      return errorPage("This sender does not use OAuth.");
    }

    const redirectUri = getCallbackUrl(url.origin);
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
