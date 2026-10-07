"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { api } from "@/lib/api";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await api.logout();
    } finally {
      router.replace("/login");
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
            Senders
          </Link>
          <Link href="/senders/new" className={linkClass("/senders/new")}>
            New sender
          </Link>
        </nav>
        <div className="ml-auto">
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
