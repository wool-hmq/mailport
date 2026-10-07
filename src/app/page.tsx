"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api, type Sender } from "@/lib/api";
import { Nav } from "@/components/nav";
import { useT } from "@/components/locale-provider";

export default function HomePage() {
  const t = useT();
  const [senders, setSenders] = useState<Sender[]>([]);
  const [stats, setStats] = useState<{ senders: number; logs: { total: number; success: number; failed: number } } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const [sendersRes, statsRes] = await Promise.all([api.listSenders(), api.stats().catch(() => null)]);
      setSenders(sendersRes.rows);
      setStats(statsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("home.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(t("home.deleteConfirm", { name }))) {
      return;
    }
    try {
      await api.deleteSender(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("home.loadFailed"));
    }
  }

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{t("home.title")}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("home.subtitle")}
            </p>
          </div>
          <Link
            href="/senders/new"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {t("home.newSender")}
          </Link>
        </div>

        {stats ? (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label={t("home.statSenders")} value={stats.senders} />
            <StatCard label={t("home.statTotal")} value={stats.logs.total} />
            <StatCard label={t("home.statSuccess")} value={stats.logs.success} accent="text-emerald-600 dark:text-emerald-400" />
            <StatCard label={t("home.statFailed")} value={stats.logs.failed} accent="text-red-600 dark:text-red-400" />
          </div>
        ) : null}

        {error ? (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-gray-500">{t("common.loading")}</p>
        ) : senders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("home.empty")}</p>
            <Link
              href="/senders/new"
              className="mt-3 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {t("home.createFirst")}
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">{t("home.thName")}</th>
                  <th className="px-4 py-3">{t("home.thEndpoint")}</th>
                  <th className="px-4 py-3">{t("home.thType")}</th>
                  <th className="px-4 py-3">{t("home.thStatus")}</th>
                  <th className="px-4 py-3 text-right">{t("home.thActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {senders.map((s) => (
                  <tr key={s.id} className="align-top">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/senders/${s.id}`} className="hover:underline">
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <code className="break-all rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
                        /api/{s.pid}/send
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                        {t(`type.${s.type}` as never)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.enabled ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          {t("common.enabled")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          {t("common.disabled")}
                        </span>
                      )}
                    </td>
                    <td className="space-x-2 px-4 py-3 text-right">
                      <Link
                        href={`/senders/${s.id}`}
                        className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                      >
                        {t("home.manage")}
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id, s.name)}
                        className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
                      >
                        {t("common.delete")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="text-xs uppercase text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent ?? ""}`}>{value}</div>
    </div>
  );
}
