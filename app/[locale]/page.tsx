import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="mb-8 text-3xl font-semibold">{dict.cocktailsHeading}</h1>
        <ul className="grid gap-6 sm:grid-cols-2">
          {cocktails.map((cocktail) => (
            <li key={cocktail.id}>
              <Link
                href={localePath(locale, `/cocktails/${cocktail.slug}`)}
                className="block rounded border border-zinc-200 p-4 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              >
                {/* Decorative here: the link text already names the cocktail. */}
                <Poster
                  spec={generatePoster(posterSource.get(cocktail.slug) ?? cocktail)}
                  className="mb-4 block h-auto w-full"
                />
                <h2 lang="vi" className="text-xl font-semibold">
                  {cocktail.name}
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400">{cocktail.subtitle}</p>
                {cocktail.region && (
                  <p className="mt-2 text-sm text-zinc-500">{cocktail.region.name}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
