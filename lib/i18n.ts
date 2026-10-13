import type { Locale } from "./types";

export const LOCALES = ["en-US", "vi"] as const satisfies readonly Locale[];

export const DEFAULT_LOCALE: Locale = "en-US";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Value for the <html lang> attribute. */
export const HTML_LANG: Record<Locale, string> = {
  "en-US": "en",
  vi: "vi",
};

/** Each language's name in that language, as shown in the language switcher. */
export const LANGUAGE_NAMES: Record<Locale, string> = {
  "en-US": "English",
  vi: "Tiếng Việt",
};

/** Builds a path in the given locale, e.g. localePath("vi", "/cocktails/canh-chua"). */
export function localePath(locale: Locale, path = ""): string {
  return `/${locale}${path}`;
}
