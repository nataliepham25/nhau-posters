import type { IngredientCategory } from "@/lib/types";
import { isHex } from "./color";
import { FLAVORS, type Flavor, type PaletteColor, type PosterInput } from "./types";

/** How strongly each flavor score raises each ingredient category. */
export const FLAVOR_AFFINITY: Record<Flavor, Partial<Record<IngredientCategory, number>>> = {
  sweet: { "sweet and creamy": 1, fruit: 1 },
  sour: { sour: 1, fruit: 0.5 },
  bitter: { bitter: 1 },
  umami: { savory: 1 },
  herbal: { "herb and aromatic": 1, floral: 1 },
  spicy: { spice: 1 },
};

/**
 * Categories that support the drink rather than define it. They start at a
 * lower weight and never lead the palette, so pale spirits like vodka and gin
 * don't dominate every poster.
 */
export const SUPPORTING_CATEGORIES: ReadonlySet<IngredientCategory> = new Set([
  "base spirit",
  "technique",
]);

/** Used when an ingredient has no colorHint. */
export const CATEGORY_FALLBACK_COLORS: Record<IngredientCategory, string> = {
  "base spirit": "#E3DED3",
  wine: "#C9B98A",
  savory: "#8A4B2A",
  sour: "#B7C944",
  "sweet and creamy": "#F1E6D0",
  fruit: "#F0A04B",
  "herb and aromatic": "#5E9A4A",
  spice: "#A0522D",
  bitter: "#4A2C1D",
  floral: "#C46BA0",
  technique: "#DDEFF5",
};

export const PALETTE_SIZE = 6;
export const LEAD_COLOR_COUNT = 3;

export function ingredientWeight(
  category: IngredientCategory,
  flavor: PosterInput["flavor"],
): number {
  let weight = SUPPORTING_CATEGORIES.has(category) ? 0.5 : 1;
  for (const name of FLAVORS) {
    weight += (flavor[name] * (FLAVOR_AFFINITY[name][category] ?? 0)) / 10;
  }
  return weight;
}

export function ingredientColor(ingredient: PosterInput["ingredients"][number]): string {
  return ingredient.colorHint && isHex(ingredient.colorHint)
    ? ingredient.colorHint.toUpperCase()
    : CATEGORY_FALLBACK_COLORS[ingredient.category];
}

/** Every ingredient's color and weight, heaviest first (ties keep recipe order). */
export function weighIngredients(input: PosterInput): PaletteColor[] {
  return input.ingredients
    .map((ingredient, index) => ({
      index,
      entry: {
        color: ingredientColor(ingredient),
        weight: ingredientWeight(ingredient.category, input.flavor),
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        category: ingredient.category,
      },
    }))
    .sort((a, b) => b.entry.weight - a.entry.weight || a.index - b.index)
    .map(({ entry }) => entry);
}

export function buildPalette(input: PosterInput): PaletteColor[] {
  return weighIngredients(input).slice(0, PALETTE_SIZE);
}

/** The strongest characteristic colors, skipping supporting categories. */
export function leadColors(palette: PaletteColor[]): PaletteColor[] {
  const characteristic = palette.filter((entry) => !SUPPORTING_CATEGORIES.has(entry.category));
  return (characteristic.length > 0 ? characteristic : palette).slice(0, LEAD_COLOR_COUNT);
}
