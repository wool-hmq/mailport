/**
 * i18n 核心:
 * - 默认语言由环境变量 SITE_LOCALE 决定
 * - 用户在导航栏手动切换后,以 cookie 覆盖默认值
 * - 新增语言:locales/ 下新增字典,并在下方 LOCALES / dictionaries 注册
 */

import en from "./locales/en";
import zhCn from "./locales/zh-cn";

export type Locale = (typeof LOCALES)[number];

export const LOCALES = ["en", "zh-cn"] as const;
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "mailport_locale";
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  "zh-cn": "简体中文",
};

const dictionaries = {
  en,
  "zh-cn": zhCn,
} as const;

type Dict = Record<string, string>;

function dict(locale: string): Dict {
  return (dictionaries as Record<string, Dict>)[locale] ?? (dictionaries[DEFAULT_LOCALE] as Dict);
}

/** 解析环境变量配置的语言,非法值回退默认 */
export function parseLocale(env?: string): Locale {
  if (env && (LOCALES as readonly string[]).includes(env)) {
    return env as Locale;
  }
  return DEFAULT_LOCALE;
}

/** 服务端读取当前语言:env 设默认值 */
export function getServerLocale(): Locale {
  return parseLocale(process.env.SITE_LOCALE);
}

export type Translate = (key: string, vars?: Record<string, string>) => string;

/** 翻译,支持 {var} 占位符;缺 key 时回退英文,再缺则返回 key 本身 */
export function createTranslate(locale: string): Translate {
  const primary = dict(locale);
  const fallback = dict(DEFAULT_LOCALE);
  return (key: string, vars?: Record<string, string>) => {
    let value = primary[key] ?? fallback[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        value = value.replaceAll(`{${k}}`, v);
      }
    }
    return value;
  };
}
