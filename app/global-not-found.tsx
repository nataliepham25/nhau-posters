import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/lib/dictionaries";
import { DEFAULT_LOCALE, HTML_LANG, localePath } from "@/lib/i18n";
import "./globals.css";

// Used for URLs that don't match any route or locale (e.g. /fr). It skips the
// [locale] layout, so it renders its own <html> in the default locale.
const dict = getDictionary(DEFAULT_LOCALE);

export const metadata: Metadata = {
  title: `${dict.notFoundHeading} · ${dict.siteTitle}`,
};

export default function GlobalNotFound() {
  return (
    <html lang={HTML_LANG[DEFAULT_LOCALE]} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
          <h1 className="text-3xl font-semibold">{dict.notFoundHeading}</h1>
          <p className="mt-4">{dict.notFoundBody}</p>
          <p className="mt-6">
            <Link href={localePath(DEFAULT_LOCALE)} className="underline underline-offset-4">
              {dict.allCocktails}
            </Link>
          </p>
        </main>
      </body>
    </html>
  );
}
