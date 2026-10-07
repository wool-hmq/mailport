"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api, type Sender } from "@/lib/api";
import { Nav } from "@/components/nav";

export interface SenderFormProps {
  mode: "create" | "edit";
  sender?: Sender;
}

export function SenderForm({ mode, sender }: SenderFormProps) {
  const router = useRouter();
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
      setError(err instanceof Error ? err.message : "Failed to save sender.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-xl font-bold">
          {mode === "create" ? "New sender" : `Edit ${sender?.name}`}
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
          <Field label="Name" hint="A label to identify this sender in the dashboard.">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="My blog mailer"
            />
          </Field>

          <Field label="SMTP service" hint="Optional. Set to skip host/port (e.g. QQ, Gmail, Outlook).">
            <input
              value={service}
              onChange={(e) => setService(e.target.value)}
              className={inputClass}
              placeholder="QQ"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="SMTP host" hint="Required unless a service is set.">
              <input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className={inputClass}
                placeholder="smtp.example.com"
                disabled={usingService}
              />
            </Field>
            <Field label="SMTP port">
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className={inputClass}
                placeholder="465"
                disabled={usingService}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} disabled={usingService} />
            Use SSL/TLS (usually port 465)
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Username" hint="The SMTP login account.">
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
                placeholder="user@example.com"
              />
            </Field>
            <Field
              label="Password"
              hint={mode === "edit" ? "Leave blank to keep the current password." : "SMTP password or app-specific token."}
            >
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder={mode === "edit" ? "unchanged" : "••••••••"}
                required={mode === "create"}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="From address" hint="Optional. Defaults to the username.">
              <input
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                className={inputClass}
                placeholder="noreply@example.com"
              />
            </Field>
            <Field label="From name" hint="Optional display name.">
              <input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className={inputClass}
                placeholder="My Blog"
              />
            </Field>
          </div>

          <Field
            label="Allowed recipient domains"
            hint="One domain per line or comma separated. Empty means no restriction. Configured per sender and stored in the database."
          >
            <textarea
              value={domains}
              onChange={(e) => setDomains(e.target.value)}
              rows={4}
              className={`${inputClass} font-mono`}
              placeholder={"example.com\ngmail.com"}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Enabled (endpoint returns 404 while disabled)
          </label>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-800">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : mode === "create" ? "Create sender" : "Save changes"}
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
