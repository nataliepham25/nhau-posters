import Link from "next/link";
import { getDictionary } from "@/lib/dictionaries";
import { HTML_LANG, LANGUAGE_NAMES, LOCALES, localePath } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

type Props = {
  locale: Locale;
  /** The current path without the locale prefix, e.g. "/cocktails/canh-chua". */
  path?: string;
};

// Slugs aren't localized, so swapping the locale prefix keeps the user on the
// same page.
export function LanguageSwitcher({ locale, path = "" }: Props) {
  const dict = getDictionary(locale);

  return (
    <nav aria-label={dict.languageSwitcherLabel}>
      <ul className="flex gap-3 text-sm">
        {LOCALES.map((target) => (
          <li key={target}>
            {target === locale ? (
              <span aria-current="page" lang={HTML_LANG[target]} className="font-semibold">
                {LANGUAGE_NAMES[target]}
              </span>
            ) : (
              <Link
                href={localePath(target, path)}
                hrefLang={HTML_LANG[target]}
                lang={HTML_LANG[target]}
                className="underline underline-offset-4"
              >
                {LANGUAGE_NAMES[target]}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
