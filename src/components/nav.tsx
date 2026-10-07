"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { LOCALE_LABELS, LOCALES, type Locale } from "@/i18n";
import { useLocale, useT } from "@/components/locale-provider";
import { api } from "@/lib/api";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const [switching, setSwitching] = useState(false);

  async function handleLogout() {
    try {
      await api.logout();
    } finally {
      router.replace("/login");
    }
  }

  async function handleLocaleChange(next: Locale) {
    if (next === locale) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      if (res.ok) router.refresh();
    } finally {
      setSwitching(false);
    }
  }

  const linkClass = (href: string) =>
    [
      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      pathname === href
        ? "bg-indigo-600 text-white"
        : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
    ].join(" ");

  return (
    <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="mr-2 flex items-center gap-2 font-bold">
          <span className="inline-block h-7 w-7 rounded bg-indigo-600 text-center leading-7 text-white">M</span>
          MailPort
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/" className={linkClass("/")}>
            {t("nav.senders")}
          </Link>
          <Link href="/senders/new" className={linkClass("/senders/new")}>
            {t("nav.newSender")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <label className="sr-only" htmlFor="locale-select">
            {t("nav.language")}
          </label>
          <select
            id="locale-select"
            value={locale}
            disabled={switching}
            onChange={(e) => handleLocaleChange(e.target.value as Locale)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700"
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_LABELS[l]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {t("nav.logout")}
          </button>
        </div>
      </div>
    </header>
  );
}
