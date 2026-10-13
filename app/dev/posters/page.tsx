import { notFound } from "next/navigation";
import { Poster } from "@/components/Poster";
import { getCocktails } from "@/lib/contentful";
import { colors } from "@/lib/design-tokens";
import { getDictionary } from "@/lib/dictionaries";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { describePoster } from "@/lib/poster/describe";
import { generatePoster } from "@/lib/poster/generate";

// Development only: every poster side by side, large, to judge them as a series.
export default async function DevPostersPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const cocktails = await getCocktails(DEFAULT_LOCALE);
  const strings = getDictionary(DEFAULT_LOCALE).poster;

  return (
    <main style={{ background: colors.background, color: colors.text }} className="min-h-screen p-8">
      <h1 className="mb-6 text-2xl font-semibold">Poster series ({cocktails.length})</h1>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(380px,1fr))] gap-8">
        {cocktails.map((cocktail) => {
          const spec = generatePoster(cocktail);
          const alt = describePoster(spec, strings);
          return (
            <li key={cocktail.id}>
              <Poster spec={spec} label={alt} className="block h-auto w-full" />
              <h2 lang="vi" className="mt-3 text-lg font-semibold">
                {cocktail.name}
              </h2>
              <p className="text-sm opacity-80">
                Hero: {spec.summary.hero?.ingredientName ?? "none"} · dominant flavor:{" "}
                {spec.summary.dominantFlavor} · tension: {spec.summary.tension} · shapes:{" "}
                {spec.shapes.length}
              </p>
              <p className="mt-2 text-sm opacity-70">{alt}</p>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
