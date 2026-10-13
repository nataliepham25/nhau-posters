// App-facing content types. These mirror the content model in /migrations but
// contain no Contentful-specific shapes, so components never see raw entries.

export type Locale = "en-US" | "vi";

export type Area = "North" | "Central" | "South";

export type IngredientCategory =
  | "base spirit"
  | "wine"
  | "savory"
  | "sour"
  | "sweet and creamy"
  | "fruit"
  | "herb and aromatic"
  | "spice"
  | "bitter"
  | "floral"
  | "technique";

export type Region = {
  id: string;
  name: string;
  area: Area;
};

export type Ingredient = {
  id: string;
  name: string;
  category: IngredientCategory;
  /** Hex color such as "#A3C14B", or null when not set. */
  colorHint: string | null;
};

/** Each value is an integer from 0 to 10. */
export type FlavorProfile = {
  sweet: number;
  sour: number;
  bitter: number;
  umami: number;
  herbal: number;
  spicy: number;
};

export type Photo = {
  url: string;
  width: number | null;
  height: number | null;
  alt: string;
};

export type Cocktail = {
  id: string;
  /** The Vietnamese name, used in every language. */
  name: string;
  slug: string;
  subtitle: string;
  story: string;
  inspiredBy: string;
  region: Region | null;
  /** In the order editors set in Contentful. */
  ingredients: Ingredient[];
  flavor: FlavorProfile;
  photo: Photo | null;
};
