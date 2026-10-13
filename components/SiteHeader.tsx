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
    <header className="border-b border-border">
      <div className="container-page flex items-center justify-between gap-6 py-4">
        {/* Generous line height leaves room for the stacked marks on Ậ. */}
        <Link
          href={localePath(locale)}
          lang="vi"
          className="font-serif text-[1.75rem] font-medium leading-[1.5] tracking-[0.18em]"
        >
          {dict.siteTitle}
        </Link>
        <LanguageSwitcher locale={locale} path={path} />
      </div>
    </header>
  );
}
