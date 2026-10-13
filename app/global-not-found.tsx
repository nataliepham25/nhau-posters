import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/lib/dictionaries";
import { DEFAULT_LOCALE, HTML_LANG, localePath } from "@/lib/i18n";
import { fontVariables } from "./fonts";
import "./globals.css";

// Used for URLs that don't match any route or locale (e.g. /fr). It skips the
// [locale] layout, so it renders its own <html> in the default locale.
const dict = getDictionary(DEFAULT_LOCALE);

export const metadata: Metadata = {
  title: `${dict.notFoundHeading} · ${dict.siteTitle}`,
};

export default function GlobalNotFound() {
  return (
    <html lang={HTML_LANG[DEFAULT_LOCALE]} className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <main id="main" className="container-page py-24">
          <p lang="vi" className="font-serif text-[1.75rem] font-medium leading-[1.5] tracking-[0.18em]">
            {dict.siteTitle}
          </p>
          <h1 className="mt-12 font-serif text-display font-medium">{dict.notFoundHeading}</h1>
          <p className="mt-4 font-serif text-lead italic text-muted">{dict.notFoundBody}</p>
          <p className="mt-8 text-ui">
            <Link
              href={localePath(DEFAULT_LOCALE)}
              className="underline decoration-accent underline-offset-[6px] transition-colors hover:text-accent"
            >
              {dict.allCocktails}
            </Link>
          </p>
        </main>
      </body>
    </html>
  );
}
