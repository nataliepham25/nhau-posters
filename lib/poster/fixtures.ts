// Test fixtures built from the seed data, so tests use the real cocktails.

import data from "@/data/cocktails.json";
import type { FlavorProfile, IngredientCategory } from "@/lib/types";
import type { PosterInput } from "./types";

const ingredientsByName = new Map(
  data.ingredients.map((ingredient) => [ingredient.name["en-US"], ingredient]),
);

export const cocktailInputs: PosterInput[] = data.cocktails.map((cocktail) => ({
  slug: cocktail.slug,
  flavor: cocktail.flavor as FlavorProfile,
  ingredients: cocktail.ingredients.map((name) => {
    const ingredient = ingredientsByName.get(name);
    if (!ingredient) throw new Error(`Unknown ingredient in fixture: ${name}`);
    return {
      id: name,
      name,
      category: ingredient.category as IngredientCategory,
      colorHint: ingredient.colorHint,
    };
  }),
}));

export function cocktailInput(slug: string): PosterInput {
  const input = cocktailInputs.find((cocktail) => cocktail.slug === slug);
  if (!input) throw new Error(`Unknown cocktail in fixture: ${slug}`);
  return input;
}

export function withFlavor(input: PosterInput, flavor: FlavorProfile): PosterInput {
  return { ...input, flavor };
}
