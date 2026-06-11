export const LOCALES = ["en", "zh", "ja"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, { native: string; code: string }> = {
  en: { native: "English", code: "EN" },
  zh: { native: "中文", code: "ZH" },
  ja: { native: "日本語", code: "JA" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * A value that may be a plain string or a per-locale map.
 * Falls back to English (the default locale) when a translation is missing.
 */
export type Localized<T = string> =
  | T
  | ({ en: T } & Partial<Record<Locale, T>>);

export function loc<T>(value: Localized<T>, locale: Locale): T {
  if (value && typeof value === "object" && "en" in (value as object)) {
    const map = value as Record<Locale, T>;
    return map[locale] ?? map.en;
  }
  return value as T;
}
