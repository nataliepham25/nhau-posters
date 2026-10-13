import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Poster } from "@/components/Poster";
import { SiteHeader } from "@/components/SiteHeader";
import { getCocktailBySlug, getCocktails } from "@/lib/contentful";
import { getDictionary } from "@/lib/dictionaries";
import { DEFAULT_LOCALE, isLocale, localePath } from "@/lib/i18n";
import { describePoster } from "@/lib/poster/describe";
import { generatePoster } from "@/lib/poster/generate";

type Props = PageProps<"/[locale]/cocktails/[slug]">;

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) return [];
  const cocktails = await getCocktails(params.locale);
  return cocktails.map((cocktail) => ({ slug: cocktail.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const cocktail = await getCocktailBySlug(slug, locale);
  if (!cocktail) return {};
  return { title: cocktail.name, description: cocktail.subtitle };
}

export default async function CocktailPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const cocktail = await getCocktailBySlug(slug, locale);
  if (!cocktail) notFound();

  const dict = getDictionary(locale);

  // Posters are always generated from English data, so they match across languages.
  const posterSource =
    locale === DEFAULT_LOCALE ? cocktail : ((await getCocktailBySlug(slug, DEFAULT_LOCALE)) ?? cocktail);
  const poster = generatePoster(posterSource);
  const posterAlt = describePoster(
    poster,
    dict.poster,
    new Map(cocktail.ingredients.map((ingredient) => [ingredient.id, ingredient.name])),
  );
  const paragraphs = cocktail.story.split(/\n\s*\n/).filter(Boolean);

  return (
    <>
      <SiteHeader locale={locale} path={`/cocktails/${cocktail.slug}`} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <p className="mb-6 text-sm">
          <Link href={localePath(locale)} className="underline underline-offset-4">
            {dict.allCocktails}
          </Link>
        </p>

        <article className="grid gap-8 sm:grid-cols-2">
          <Poster spec={poster} title={posterAlt} className="block h-auto w-full" />

          <div>
            <h1 lang="vi" className="text-3xl font-semibold">
              {cocktail.name}
            </h1>
            <p className="mt-1 text-lg text-zinc-600 dark:text-zinc-400">{cocktail.subtitle}</p>

            <dl className="mt-6 space-y-2 text-sm">
              {cocktail.region && (
                <div>
                  <dt className="inline font-semibold">{dict.region}: </dt>
                  <dd className="inline">
                    {cocktail.region.name} ({dict.areas[cocktail.region.area]})
                  </dd>
                </div>
              )}
              <div>
                <dt className="inline font-semibold">{dict.inspiredBy}: </dt>
                <dd className="inline">{cocktail.inspiredBy}</dd>
              </div>
            </dl>

            <div className="mt-6 space-y-4">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            {cocktail.ingredients.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-2 text-lg font-semibold">{dict.ingredients}</h2>
                <ol className="list-decimal space-y-1 pl-5">
                  {cocktail.ingredients.map((ingredient) => (
                    <li key={ingredient.id}>{ingredient.name}</li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        </article>
      </main>
    </>
  );
}
