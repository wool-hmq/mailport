"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api, type Sender } from "@/lib/api";
import { Nav } from "@/components/nav";
import { useT } from "@/components/locale-provider";

export interface SenderFormProps {
  mode: "create" | "edit";
  sender?: Sender;
}

export function SenderForm({ mode, sender }: SenderFormProps) {
  const router = useRouter();
  const t = useT();
  const [name, setName] = useState(sender?.name ?? "");
  const [host, setHost] = useState(sender?.host ?? "");
  const [port, setPort] = useState(sender?.port?.toString() ?? "465");
  const [secure, setSecure] = useState(sender?.secure ?? true);
  const [service, setService] = useState(sender?.service ?? "");
  const [username, setUsername] = useState(sender?.username ?? "");
  const [password, setPassword] = useState("");
  const [fromAddress, setFromAddress] = useState(sender?.fromAddress ?? "");
  const [fromName, setFromName] = useState(sender?.fromName ?? "");
  const [domains, setDomains] = useState((sender?.allowedDomains ?? []).join("\n"));
  const [enabled, setEnabled] = useState(sender?.enabled ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const usingService = service.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        type: "smtp",
        enabled,
        host: usingService ? null : host.trim(),
        port: usingService ? null : Number(port) || null,
        secure: usingService ? true : secure,
        service: usingService ? service.trim() : null,
        username: username.trim(),
        fromAddress: fromAddress.trim(),
        fromName: fromName.trim(),
        allowedDomains: domains
          .split(/[\n,]/)
          .map((d) => d.trim())
          .filter(Boolean),
      };
      if (mode === "create") {
        body.password = password;
        const res = await api.createSender(body);
        router.push(`/senders/${res.sender.id}`);
      } else if (sender) {
        if (password) body.password = password;
        await api.updateSender(sender.id, body);
        router.push(`/senders/${sender.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

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

          <Field label={t("form.service")} hint={t("form.serviceHint")}>
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
            <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} disabled={usingService} />
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

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-800">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? t("form.saving") : mode === "create" ? t("form.createBtn") : t("form.saveBtn")}
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
  hint?: string;
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
