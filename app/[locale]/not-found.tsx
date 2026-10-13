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
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="text-3xl font-semibold">{dict.notFoundHeading}</h1>
        <p className="mt-4">{dict.notFoundBody}</p>
        <p className="mt-6">
          <Link href={localePath(locale)} className="underline underline-offset-4">
            {dict.allCocktails}
          </Link>
        </p>
      </main>
    </>
  );
}
