import Link from "next/link";
import { locale as localeParam } from "next/root-params";
import { SiteHeader } from "@/components/SiteHeader";
import { getDictionary } from "@/lib/dictionaries";
import { DEFAULT_LOCALE, isLocale, localePath } from "@/lib/i18n";

// Shown for unknown cocktail slugs (and other notFound() calls) inside a
// valid locale. Unknown locales are handled by app/global-not-found.tsx.
export default async function NotFound() {
  const value = await localeParam();
  const locale = value && isLocale(value) ? value : DEFAULT_LOCALE;
  const dict = getDictionary(locale);

  return (
    <>
      <SiteHeader locale={locale} />
      <main id="main" className="container-page py-24">
        <h1 className="font-serif text-display font-medium">{dict.notFoundHeading}</h1>
        <p className="mt-4 font-serif text-lead italic text-muted">{dict.notFoundBody}</p>
        <p className="mt-8 text-ui">
          <Link
            href={localePath(locale)}
            className="underline decoration-accent underline-offset-[6px] transition-colors hover:text-accent"
          >
            {dict.allCocktails}
          </Link>
        </p>
      </main>
    </>
  );
}
