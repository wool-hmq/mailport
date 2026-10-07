"use client";

import { createContext, useContext, useMemo } from "react";

import { createTranslate, type Locale, type Translate } from "@/i18n";

const LocaleContext = createContext<{
  locale: Locale;
  t: Translate;
}>({
  locale: "en",
  t: createTranslate("en"),
});

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ locale, t: createTranslate(locale) }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}

export function useT(): Translate {
  return useContext(LocaleContext).t;
}
