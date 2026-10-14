import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Poster } from "@/components/Poster";
import { PosterPlayground } from "@/components/PosterPlayground";
import { SiteHeader } from "@/components/SiteHeader";
import { getCocktailBySlug, getCocktails } from "@/lib/contentful";
import { getDictionary } from "@/lib/dictionaries";
import { DEFAULT_LOCALE, isLocale, localePath } from "@/lib/i18n";
import { describePoster } from "@/lib/poster/describe";
import { generatePoster } from "@/lib/poster/generate";
import { ingredientColor } from "@/lib/poster/palette";

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
  const ingredientNames = cocktail.ingredients.map((ingredient) => [ingredient.id, ingredient.name] as [string, string]);
  const posterAlt = describePoster(poster, dict.poster, new Map(ingredientNames));
  // Only what generatePoster reads, so the client payload stays small.
  const playgroundInput = {
    slug: posterSource.slug,
    flavor: posterSource.flavor,
    ingredients: posterSource.ingredients.map(({ id, name, category, colorHint }) => ({ id, name, category, colorHint })),
  };
  const paragraphs = cocktail.story.split(/\n\s*\n/).filter(Boolean);

  return (
    <>
      <SiteHeader locale={locale} path={`/cocktails/${cocktail.slug}`} />
      <main id="main" className="container-page pb-24 pt-10">
        <Link
          href={localePath(locale)}
          className="text-ui text-muted underline decoration-border underline-offset-[6px] transition-colors hover:text-text hover:decoration-accent"
        >
          <span aria-hidden="true">← </span>
          {dict.allCocktails}
        </Link>

        <article className="mt-8 grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="mx-auto max-w-[520px] lg:sticky lg:top-8">
              <div className="bg-poster shadow-[var(--poster-shadow)]">
                <Poster spec={poster} label={posterAlt} live className="block h-auto w-full" />
              </div>
            </div>
          </div>

          <div className="max-w-[62ch] lg:col-span-7">
            <h1 lang="vi" className="font-serif text-display font-medium">
              {cocktail.name}
            </h1>
            <p className="mt-2 font-serif text-lead italic text-muted">{cocktail.subtitle}</p>

            <dl className="mt-8 grid gap-5 border-y border-border py-5 sm:grid-cols-2">
              {cocktail.region && (
                <div>
                  <dt className="text-label uppercase text-accent">{dict.region}</dt>
                  <dd className="mt-1 text-ui">
                    {cocktail.region.name}, {dict.areas[cocktail.region.area]}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-label uppercase text-accent">{dict.inspiredBy}</dt>
                <dd className="mt-1 text-ui">{cocktail.inspiredBy}</dd>
              </div>
            </dl>

            <div className="mt-8 space-y-5 text-body">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            {cocktail.ingredients.length > 0 && (
              <section className="mt-12" aria-labelledby="ingredients-heading">
                <h2 id="ingredients-heading" className="text-label uppercase text-accent">
                  {dict.ingredients}
                </h2>
                {/* role="list" keeps list semantics in Safari despite list-style: none. */}
                <ol role="list" className="mt-4 border-t border-border">
                  {cocktail.ingredients.map((ingredient, index) => (
                    <li key={ingredient.id} className="flex items-center gap-4 border-b border-border py-3">
                      <span aria-hidden="true" className="w-7 font-serif text-lg lining-nums tabular-nums text-accent">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        aria-hidden="true"
                        // The hairline ring keeps pale colors (vodka, cream) visible on the light theme.
                        className="size-2.5 shrink-0 rounded-full ring-1 ring-border"
                        style={{ background: ingredientColor(ingredient) }}
                      />
                      <span className="text-ui">{ingredient.name}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        </article>

        <section aria-labelledby="playground-heading" className="mt-20 border-t border-border pt-12">
          <h2 id="playground-heading" className="font-serif text-title font-medium">
            {dict.playground.heading}
          </h2>
          <p className="mt-2 max-w-[60ch] font-serif text-lead italic text-muted">{dict.playground.intro}</p>
          <PosterPlayground
            input={playgroundInput}
            strings={dict.playground}
            posterStrings={dict.poster}
            ingredientNames={ingredientNames}
          />
        </section>
      </main>
    </>
  );
}
