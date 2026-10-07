"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api, type Sender, type SenderType } from "@/lib/api";
import { Nav } from "@/components/nav";
import { useT } from "@/components/locale-provider";

export interface SenderFormProps {
  mode: "create" | "edit";
  sender?: Sender;
}

const TYPES: SenderType[] = ["smtp", "http", "outlook_oauth2", "gmail_oauth2"];

export function SenderForm({ mode, sender }: SenderFormProps) {
  const router = useRouter();
  const t = useT();
  const [name, setName] = useState(sender?.name ?? "");
  const [type, setType] = useState<SenderType>(sender?.type ?? "smtp");
  const [host, setHost] = useState(sender?.host ?? "");
  const [port, setPort] = useState(sender?.port?.toString() ?? "465");
  const [secure, setSecure] = useState(sender?.secure ?? true);
  const [service, setService] = useState(sender?.service ?? "");
  const [username, setUsername] = useState(sender?.username ?? "");
  const [password, setPassword] = useState("");
  const [httpUrl, setHttpUrl] = useState(sender?.httpUrl ?? "");
  const [httpMethod, setHttpMethod] = useState(sender?.httpMethod ?? "POST");
  const [httpHeaders, setHttpHeaders] = useState(sender?.httpHeaders ?? "");
  const [httpBody, setHttpBody] = useState(sender?.httpBody ?? "");
  const [oauthClientId, setOauthClientId] = useState(sender?.oauthClientId ?? "");
  const [oauthClientSecret, setOauthClientSecret] = useState("");
  const [fromAddress, setFromAddress] = useState(sender?.fromAddress ?? "");
  const [fromName, setFromName] = useState(sender?.fromName ?? "");
  const [domains, setDomains] = useState((sender?.allowedDomains ?? []).join("\n"));
  const [enabled, setEnabled] = useState(sender?.enabled ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const usingService = service.trim().length > 0;
  const isOAuth = type === "outlook_oauth2" || type === "gmail_oauth2";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const callbackUrl = `${origin}/api/oauth/callback`;

  function buildBody(): Record<string, unknown> {
    const body: Record<string, unknown> = {
      name: name.trim(),
      type,
      enabled,
      fromAddress: fromAddress.trim(),
      fromName: fromName.trim(),
      allowedDomains: domains
        .split(/[\n,]/)
        .map((d) => d.trim())
        .filter(Boolean),
    };
    if (type === "smtp") {
      body.host = usingService ? null : host.trim();
      body.port = usingService ? null : Number(port) || null;
      body.secure = usingService ? true : secure;
      body.service = usingService ? service.trim() : null;
      body.username = username.trim();
      if (password) body.password = password;
    } else if (type === "http") {
      body.httpUrl = httpUrl.trim();
      body.httpMethod = httpMethod;
      body.httpHeaders = httpHeaders.trim() ? httpHeaders : null;
      body.httpBody = httpBody.trim() ? httpBody : null;
    } else {
      body.username = username.trim();
      body.oauthClientId = oauthClientId.trim();
      if (oauthClientSecret) body.oauthClientSecret = oauthClientSecret;
    }
    return body;
  }

  async function startAuthorization(id: string): Promise<void> {
    const { authUrl } = await api.oauthStart(id);
    window.location.href = authUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = buildBody();
      let savedId: string;
      if (mode === "create") {
        const res = await api.createSender(body);
        savedId = res.sender.id;
      } else if (sender) {
        await api.updateSender(sender.id, body);
        savedId = sender.id;
      } else {
        return;
      }
      if (isOAuth) {
        await startAuthorization(savedId);
        return;
      }
      router.push(`/senders/${savedId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleAuthorizeOnly() {
    if (!sender) return;
    setError(null);
    setSaving(true);
    try {
      await startAuthorization(sender.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const submitLabel = isOAuth
    ? saving
      ? t("form.oauthAuthorizing")
      : t("form.oauthAuthorizeBtn")
    : saving
      ? t("form.saving")
      : mode === "create"
        ? t("form.createBtn")
        : t("form.saveBtn");

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-xl font-bold">
          {mode === "create" ? t("form.newTitle") : t("form.editTitle", { name: sender?.name ?? "" })}
        </h1>
        {error ? (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
        >
          <Field label={t("common.name")} hint={t("form.nameHint")}>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder={t("form.namePlaceholder")}
            />
          </Field>

          <Field label={t("form.type")} hint={t("form.typeHint")}>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as SenderType)}
              className={inputClass}
              disabled={mode === "edit"}
            >
              {TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {t(`type.${ty}` as never)}
                </option>
              ))}
            </select>
          </Field>

          {type === "smtp" ? (
            <section className="space-y-5 border-t border-gray-200 pt-5 dark:border-gray-800">
              <h2 className="text-sm font-bold uppercase text-gray-500">{t("form.smtpSection")}</h2>
              <Field
                label={t("form.service")}
                hint={
                  <>
                    {t("form.serviceHint")}{" "}
                    <a
                      href="https://github.com/nodemailer/nodemailer/blob/master/src/well-known/services.json"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 underline hover:text-indigo-700 dark:text-indigo-400"
                    >
                      {t("form.serviceListLink")}
                    </a>
                  </>
                }
              >
                <input
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className={inputClass}
                  placeholder={t("form.servicePlaceholder")}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("form.host")} hint={t("form.hostHint")}>
                  <input
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className={inputClass}
                    placeholder={t("form.hostPlaceholder")}
                    disabled={usingService}
                  />
                </Field>
                <Field label={t("form.port")}>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className={inputClass}
                    placeholder={t("form.portPlaceholder")}
                    disabled={usingService}
                  />
                </Field>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={secure}
                  onChange={(e) => setSecure(e.target.checked)}
                  disabled={usingService}
                />
                {t("form.secure")}
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("form.username")} hint={t("form.usernameHint")}>
                  <input
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputClass}
                    placeholder={t("form.usernamePlaceholder")}
                  />
                </Field>
                <Field
                  label={t("form.password")}
                  hint={mode === "edit" ? t("form.passwordHintEdit") : t("form.passwordHintCreate")}
                >
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder={mode === "edit" ? t("form.passwordPlaceholderEdit") : "••••••••"}
                    required={mode === "create"}
                  />
                </Field>
              </div>
            </section>
          ) : null}

          {type === "http" ? (
            <section className="space-y-5 border-t border-gray-200 pt-5 dark:border-gray-800">
              <h2 className="text-sm font-bold uppercase text-gray-500">{t("form.httpSection")}</h2>
              <Field label={t("form.httpUrl")} hint={t("form.httpUrlHint")}>
                <input
                  required
                  type="url"
                  value={httpUrl}
                  onChange={(e) => setHttpUrl(e.target.value)}
                  className={inputClass}
                  placeholder={t("form.httpUrlPlaceholder")}
                />
              </Field>

              <Field label={t("form.httpMethod")}>
                <select
                  value={httpMethod}
                  onChange={(e) => setHttpMethod(e.target.value)}
                  className={inputClass}
                >
                  {["POST", "PUT", "PATCH", "GET", "DELETE"].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={t("form.httpHeaders")} hint={t("form.httpHeadersHint")}>
                <textarea
                  value={httpHeaders}
                  onChange={(e) => setHttpHeaders(e.target.value)}
                  rows={4}
                  className={`${inputClass} font-mono`}
                  placeholder={t("form.httpHeadersPlaceholder")}
                />
              </Field>

              <Field label={t("form.httpBody")} hint={t("form.httpBodyHint")}>
                <textarea
                  value={httpBody}
                  onChange={(e) => setHttpBody(e.target.value)}
                  rows={6}
                  className={`${inputClass} font-mono`}
                  placeholder={t("form.httpBodyPlaceholder")}
                />
              </Field>
            </section>
          ) : null}

          {isOAuth ? (
            <section className="space-y-5 border-t border-gray-200 pt-5 dark:border-gray-800">
              <h2 className="text-sm font-bold uppercase text-gray-500">{t("form.oauthSection")}</h2>

              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm dark:border-indigo-900 dark:bg-indigo-950/30">
                <div className="font-medium text-indigo-700 dark:text-indigo-300">
                  {t("form.oauthCallback")}
                </div>
                <code className="mt-1 block break-all font-mono text-xs">{callbackUrl}</code>
                <p className="mt-2 text-xs text-indigo-700/80 dark:text-indigo-300/80">
                  {t("form.oauthCallbackHint")}
                </p>
              </div>

              <Field label={t("form.accountEmail")} hint={t("form.accountEmailHint")}>
                <input
                  required
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={inputClass}
                  placeholder={t("form.usernamePlaceholder")}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("form.oauthClientId")} hint={t("form.oauthClientIdHint")}>
                  <input
                    required
                    value={oauthClientId}
                    onChange={(e) => setOauthClientId(e.target.value)}
                    className={inputClass}
                    placeholder="xxxxxxxx-xxxx-xxxx"
                  />
                </Field>
                <Field
                  label={t("form.oauthClientSecret")}
                  hint={mode === "edit" ? t("form.oauthClientSecretHint") : undefined}
                >
                  <input
                    type="password"
                    value={oauthClientSecret}
                    onChange={(e) => setOauthClientSecret(e.target.value)}
                    className={inputClass}
                    placeholder={mode === "edit" ? t("form.oauthClientSecretPlaceholderEdit") : "••••••••"}
                    required={mode === "create"}
                  />
                </Field>
              </div>
            </section>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("form.fromAddress")} hint={t("form.fromAddressHint")}>
              <input
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                className={inputClass}
                placeholder={t("form.fromAddressPlaceholder")}
              />
            </Field>
            <Field label={t("form.fromName")} hint={t("form.fromNameHint")}>
              <input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className={inputClass}
                placeholder={t("form.fromNamePlaceholder")}
              />
            </Field>
          </div>

          <Field label={t("form.domains")} hint={t("form.domainsHint")}>
            <textarea
              value={domains}
              onChange={(e) => setDomains(e.target.value)}
              rows={4}
              className={`${inputClass} font-mono`}
              placeholder={t("form.domainsPlaceholder")}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            {t("form.enabledHint")}
          </label>

          <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-800">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {t("common.cancel")}
            </button>
            {isOAuth && mode === "edit" ? (
              <button
                type="button"
                onClick={handleAuthorizeOnly}
                disabled={saving}
                className="rounded-md border border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
              >
                {t("form.oauthReauthorizeBtn")}
              </button>
            ) : null}
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 disabled:opacity-50";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p> : null}
    </div>
  );
}
