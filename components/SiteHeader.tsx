import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getDictionary } from "@/lib/dictionaries";
import { localePath } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

type Props = {
  locale: Locale;
  /** The current path without the locale prefix, passed to the language switcher. */
  path?: string;
};

export function SiteHeader({ locale, path }: Props) {
  const dict = getDictionary(locale);

  return (
    <header className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <Link href={localePath(locale)} className="font-semibold tracking-wide">
        {dict.siteTitle}
      </Link>
      <LanguageSwitcher locale={locale} path={path} />
    </header>
  );
}
