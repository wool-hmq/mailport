import type { Metadata } from "next";
import { cookies } from "next/headers";

import { LOCALE_COOKIE, LOCALES, getServerLocale, type Locale } from "@/i18n";
import { LocaleProvider } from "@/components/locale-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "MailPort",
  description: "Turn SMTP into an HTTP API. Manage multiple senders, each with its own endpoint and key.",
};

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (fromCookie && (LOCALES as readonly string[]).includes(fromCookie)) {
    return fromCookie as Locale;
  }
  return getServerLocale();
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await resolveLocale();
  return (
    <html lang={locale}>
      <body className="min-h-screen antialiased">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
