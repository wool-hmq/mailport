"use client";

import { useEffect, useState } from "react";

import { api, type SendLog, type Sender, type SenderKey } from "@/lib/api";
import { Nav } from "@/components/nav";
import { SenderForm } from "@/components/sender-form";
import { useT } from "@/components/locale-provider";

export default function SenderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useT();
  const [id, setId] = useState<string | null>(null);
  const [sender, setSender] = useState<Sender | null>(null);
  const [keys, setKeys] = useState<SenderKey[]>([]);
  const [logs, setLogs] = useState<SendLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"keys" | "settings" | "logs">("keys");
  const [oauthJustSucceeded, setOauthJustSucceeded] = useState(false);

  useEffect(() => {
    void params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("oauth") === "success") {
      setOauthJustSucceeded(true);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    void load();
  }, [id]);

  async function load() {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const [detail, logsRes] = await Promise.all([
        api.getSender(id),
        api.listLogs(id).catch(() => ({ rows: [] as SendLog[], total: 0 })),
      ]);
      setSender(detail.sender);
      setKeys(detail.keys);
      setLogs(logsRes.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("detail.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (loading || !sender) {
    return (
      <div>
        <Nav />
        <main className="mx-auto max-w-4xl px-4 py-8">
          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          ) : (
            <p className="text-sm text-gray-500">{t("common.loading")}</p>
          )}
        </main>
      </div>
    );
  }

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold">{sender.name}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("detail.endpoint")}{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
              POST /api/{sender.pid}/send
            </code>
          </p>
        </div>

        {error ? (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </p>
        ) : null}

        {oauthJustSucceeded ? (
          <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            {t("detail.oauthSuccess")}
          </p>
        ) : null}

        <div className="mb-6 flex gap-1 border-b border-gray-200 dark:border-gray-800">
          {(["keys", "settings", "logs"] as const).map((tabKey) => {
            const labelKey = {
              keys: "detail.tabKeys",
              settings: "detail.tabSettings",
              logs: "detail.tabLogs",
            }[tabKey];
            return (
              <button
                key={tabKey}
                type="button"
                onClick={() => setTab(tabKey)}
                className={[
                  "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
                  tab === tabKey
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400",
                ].join(" ")}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>

        {tab === "keys" ? <KeysTab sender={sender} keys={keys} onChange={load} /> : null}
        {tab === "settings" ? <SettingsTab sender={sender} /> : null}
        {tab === "logs" ? <LogsTab logs={logs} /> : null}
      </main>
    </div>
  );
}

function KeysTab({ sender, keys, onChange }: { sender: Sender; keys: SenderKey[]; onChange: () => void }) {
  const t = useT();
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleCreate() {
    setErr(null);
    setBusy(true);
    try {
      await api.createKey(sender.id, newLabel);
      setNewLabel("");
      await onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("keys.createFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(key: SenderKey) {
    setErr(null);
    try {
      await api.patchKey(sender.id, key.id, { enabled: !key.enabled });
      await onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("keys.updateFailed"));
    }
  }

  async function handleDelete(key: SenderKey) {
    if (!window.confirm(t("keys.deleteConfirm", { label: key.label }))) return;
    setErr(null);
    try {
      await api.deleteKey(sender.id, key.id);
      await onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("keys.deleteFailed"));
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Copy this value:", text);
    }
  }

  return (
    <div className="space-y-4">
      {err ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {err}
        </p>
      ) : null}

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm dark:border-indigo-900 dark:bg-indigo-950/30">
        <div className="font-medium text-indigo-700 dark:text-indigo-300">{t("keys.howTo")}</div>
        <pre className="mt-2 overflow-x-auto rounded bg-white p-3 text-xs dark:bg-gray-900">{`curl -X POST ${typeof window !== "undefined" ? window.location.origin : "https://your-app.vercel.app"}/api/${sender.pid}/send \\
  -H "Authorization: Bearer <your-api-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"to": "someone@example.com", "subject": "Hi", "text": "Hello from MailPort"}'`}</pre>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="grow">
          <label className="mb-1.5 block text-sm font-medium" htmlFor="newKeyLabel">
            {t("keys.newLabel")}
          </label>
          <input
            id="newKeyLabel"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
            placeholder={t("keys.labelPlaceholder")}
          />
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={busy}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? t("keys.generating") : t("keys.generate")}
        </button>
      </div>

      {keys.length === 0 ? (
        <p className="text-sm text-gray-500">{t("keys.empty")}</p>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
          {keys.map((k) => {
            const shown = revealed[k.id];
            return (
              <li key={k.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{k.label}</span>
                  {k.enabled ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      {t("common.enabled")}
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {t("common.disabled")}
                    </span>
                  )}
                  {k.lastUsedAt ? (
                    <span className="text-xs text-gray-500">
                      {t("keys.lastUsed", { time: new Date(k.lastUsedAt).toLocaleString() })}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <code className="grow break-all rounded bg-gray-100 px-2 py-1 font-mono text-xs dark:bg-gray-800">
                    {shown ? k.key : "•".repeat(Math.min(k.key.length, 32))}
                  </code>
                  <button
                    type="button"
                    onClick={() => setRevealed((r) => ({ ...r, [k.id]: !r[k.id] }))}
                    className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    {shown ? t("common.hide") : t("common.show")}
                  </button>
                  <button
                    type="button"
                    onClick={() => copy(k.key)}
                    className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    {t("common.copy")}
                  </button>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(k)}
                    className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    {k.enabled ? t("keys.disable") : t("keys.enable")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(k)}
                    className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SettingsTab({ sender }: { sender: Sender }) {
  const t = useT();
  const [to, setTo] = useState("");
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  async function handleTest(e: React.FormEvent) {
    e.preventDefault();
    setTestMsg(null);
    setTesting(true);
    try {
      const res = await api.testSend(sender.id, to);
      setTestMsg(t("settings.testSent", { id: res.messageId }));
    } catch (err) {
      setTestMsg(err instanceof Error ? err.message : t("settings.testTitle"));
    } finally {
      setTesting(false);
    }
  }

  const isOAuth = sender.type === "outlook_oauth2" || sender.type === "gmail_oauth2";
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6">
      {sender.type === "smtp" ? (
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase text-gray-500">{t("settings.smtpTitle")}</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-xl border border-gray-200 bg-white p-4 text-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-2">
            <Detail label={t("settings.type")} value={t(`type.${sender.type}` as never)} />
            <Detail label={t("settings.service")} value={sender.service} />
            <Detail label={t("settings.host")} value={sender.host} />
            <Detail label={t("settings.port")} value={sender.port?.toString()} />
            <Detail label={t("settings.secure")} value={sender.secure ? t("common.yes") : t("common.no")} />
            <Detail label={t("settings.username")} value={sender.username} />
            <Detail label={t("settings.fromAddress")} value={sender.fromAddress} />
            <Detail label={t("settings.fromName")} value={sender.fromName} />
          </dl>
        </div>
      ) : null}

      {sender.type === "http" ? (
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase text-gray-500">{t("settings.httpTitle")}</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-xl border border-gray-200 bg-white p-4 text-sm dark:border-gray-800 dark:bg-gray-900">
            <Detail label={t("settings.type")} value={t(`type.${sender.type}` as never)} />
            <Detail label={t("settings.httpUrl")} value={sender.httpUrl} />
            <Detail label={t("settings.httpMethod")} value={sender.httpMethod ?? "POST"} />
            <Detail label={t("settings.fromAddress")} value={sender.fromAddress} />
            <Detail label={t("settings.fromName")} value={sender.fromName} />
            <div className="col-span-full border-t border-gray-100 pt-2 dark:border-gray-800/60">
              <dt className="text-gray-500 dark:text-gray-400">{t("settings.httpHeaders")}</dt>
              <dd className="mt-1">
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-gray-100 p-2 font-mono text-xs dark:bg-gray-800">
                  {sender.httpHeaders?.trim() ? sender.httpHeaders : "—"}
                </pre>
              </dd>
            </div>
            <div className="col-span-full">
              <dt className="text-gray-500 dark:text-gray-400">{t("settings.httpBody")}</dt>
              <dd className="mt-1">
                <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-all rounded bg-gray-100 p-2 font-mono text-xs dark:bg-gray-800">
                  {sender.httpBody?.trim() ? sender.httpBody : t("form.httpBodyPlaceholder")}
                </pre>
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      {isOAuth ? (
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase text-gray-500">{t("settings.oauthTitle")}</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-xl border border-gray-200 bg-white p-4 text-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-2">
            <Detail label={t("settings.type")} value={t(`type.${sender.type}` as never)} />
            <Detail label={t("settings.username")} value={sender.username} />
            <Detail label={t("settings.oauthClientId")} value={sender.oauthClientId} />
            <div className="flex justify-between gap-4 border-b border-gray-100 pb-2 dark:border-gray-800/60">
              <dt className="text-gray-500 dark:text-gray-400">{t("settings.oauthStatus")}</dt>
              <dd>
                {sender.oauthRefreshToken && sender.oauthAuthorizedAt ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    {t("settings.oauthAuthorized")}{" "}
                    {new Date(sender.oauthAuthorizedAt).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                    {t("settings.oauthNotAuthorized")}
                  </span>
                )}
              </dd>
            </div>
            <div className="col-span-full">
              <dt className="text-gray-500 dark:text-gray-400">{t("settings.oauthCallback")}</dt>
              <dd className="mt-1">
                <code className="block break-all rounded bg-gray-100 p-2 font-mono text-xs dark:bg-gray-800">
                  {origin}/api/oauth/callback
                </code>
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase text-gray-500">{t("settings.domainsTitle")}</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          {sender.allowedDomains.length === 0 ? (
            <p className="text-sm text-gray-500">{t("settings.domainsEmpty")}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {sender.allowedDomains.map((d) => (
                <li
                  key={d}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-mono dark:bg-gray-800"
                >
                  {d}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase text-gray-500">{t("settings.testTitle")}</h2>
        <form
          onSubmit={handleTest}
          className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="grow">
              <label className="mb-1.5 block text-sm font-medium" htmlFor="testTo">
                {t("settings.recipient")}
              </label>
              <input
                id="testTo"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
                placeholder={t("settings.recipientPlaceholder")}
              />
            </div>
            <button
              type="submit"
              disabled={testing}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {testing ? t("settings.testing") : t("settings.testBtn")}
            </button>
          </div>
          {testMsg ? (
            <p className="rounded-md bg-gray-100 px-3 py-2 text-sm dark:bg-gray-800">{testMsg}</p>
          ) : null}
        </form>
      </div>

      <SenderForm mode="edit" sender={sender} />
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 pb-2 dark:border-gray-800/60">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-right font-mono text-xs break-all">{value || "—"}</dd>
    </div>
  );
}

function LogsTab({ logs }: { logs: SendLog[] }) {
  const t = useT();
  if (logs.length === 0) {
    return <p className="text-sm text-gray-500">{t("logs.empty")}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-400">
          <tr>
            <th className="px-4 py-3">{t("logs.thTime")}</th>
            <th className="px-4 py-3">{t("logs.thTo")}</th>
            <th className="px-4 py-3">{t("logs.thSubject")}</th>
            <th className="px-4 py-3">{t("logs.thStatus")}</th>
            <th className="px-4 py-3">{t("logs.thError")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {logs.map((l) => (
            <tr key={l.id} className="align-top">
              <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                {new Date(l.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-3 font-mono text-xs">{l.to}</td>
              <td className="max-w-[16rem] truncate px-4 py-3">{l.subject}</td>
              <td className="px-4 py-3">
                {l.status === "success" ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    {t("home.statSuccess")}
                  </span>
                ) : (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
                    {t("home.statFailed")}
                  </span>
                )}
              </td>
              <td className="max-w-[20rem] truncate px-4 py-3 text-xs text-red-600 dark:text-red-400">
                {l.error || ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
