import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { Poster } from "@/components/Poster";
import { SiteHeader } from "@/components/SiteHeader";
import { getCocktails } from "@/lib/contentful";
import { getDictionary } from "@/lib/dictionaries";
import { DEFAULT_LOCALE, isLocale, localePath } from "@/lib/i18n";
import { generatePoster } from "@/lib/poster/generate";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  // The layout's title template only applies to nested segments, not this page.
  return { title: { absolute: `${dict.cocktailsHeading} · ${dict.siteTitle}` } };
}

export default async function CocktailIndexPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);
  // Posters are always generated from English data, so they match across languages.
  const [cocktails, englishCocktails] = await Promise.all([
    getCocktails(locale),
    locale === DEFAULT_LOCALE ? null : getCocktails(DEFAULT_LOCALE),
  ]);
  const posterSource = new Map((englishCocktails ?? cocktails).map((c) => [c.slug, c]));

  return (
    <>
      <SiteHeader locale={locale} />
      <main id="main" className="container-page pb-24">
        <section className="reveal max-w-3xl py-16 sm:py-24">
          <p className="text-label uppercase text-accent">{dict.introLabel}</p>
          <h1 className="mt-4 font-serif text-display font-medium">{dict.introHeading}</h1>
          <p className="mt-6 max-w-[60ch] font-serif text-lead italic text-muted">{dict.introBody}</p>
        </section>

        <ul className="grid gap-x-10 gap-y-16 sm:grid-cols-2">
          {cocktails.map((cocktail, index) => (
            <li
              key={cocktail.id}
              className="reveal"
              style={{ "--reveal-index": index + 1 } as CSSProperties}
            >
              <Link href={localePath(locale, `/cocktails/${cocktail.slug}`)} className="poster-card group block">
                {/* Decorative here: the link text already names the cocktail. */}
                <div className="poster-frame bg-poster">
                  <Poster
                    spec={generatePoster(posterSource.get(cocktail.slug) ?? cocktail)}
                    className="block h-auto w-full"
                  />
                </div>
                <h2 lang="vi" className="mt-6 font-serif text-title font-medium">
                  <span className="underline decoration-transparent decoration-1 underline-offset-[6px] transition-colors group-hover:decoration-accent">
                    {cocktail.name}
                  </span>
                </h2>
                <p className="mt-1 font-serif text-lead italic text-muted">{cocktail.subtitle}</p>
                {cocktail.region && (
                  <p className="mt-3 text-label uppercase text-muted">{cocktail.region.name}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
