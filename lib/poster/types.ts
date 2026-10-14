import type { FlavorProfile, Ingredient, IngredientCategory } from "@/lib/types";

export const POSTER_WIDTH = 600;
export const POSTER_HEIGHT = 800;

export type Flavor = keyof FlavorProfile;

export const FLAVORS: readonly Flavor[] = ["sweet", "sour", "bitter", "umami", "herbal", "spicy"];

/** The parts of a cocktail the generator reads. A full `Cocktail` satisfies this. */
export type PosterInput = {
  slug: string;
  flavor: FlavorProfile;
  ingredients: Pick<Ingredient, "id" | "name" | "category" | "colorHint">[];
};

/** A solid hex color, or a vertical gradient from top to bottom. */
export type Paint = string | { type: "gradient"; from: string; to: string };

/** Ambient motion, drawn only by the live renderer (`<Poster live>`). */
export type AnimationHint =
  | { kind: "rise"; distance: number; duration: number; delay: number }
  | { kind: "sway"; angle: number; duration: number; delay: number }
  | { kind: "colorShift"; from: string; to: string; duration: number };

/** Draw order, back to front. */
export const LAYERS = [
  "ground",
  "spirit",
  "wash",
  "drinkFoam", // foam resting on a drink body, drawn behind it so only its top shows
  "drink",
  "drinkAccent", // darker or creamier layers inside a drink body
  "sweet",
  "sour",
  "fruit",
  "floral",
  "herb",
  "spice",
  "foam",
  "bubbles",
] as const;

export type Layer = (typeof LAYERS)[number];

export type ShapeType =
  | "band" // straight bar with slightly rounded corners
  | "softBand" // fully rounded bar, kept soft with low opacity
  | "wash" // translucent ellipse, often layered
  | "horizon" // full-width form anchored to the bottom edge with a curved top
  | "layer" // full-width drink layer anchored to the bottom edge; top edge from `surface`
  | "ribbon" // full-width wavy ribbon of varying thickness, from `ribbon`
  | "circle"
  | "ring" // circle outline
  | "leaf" // pointed leaf; `curvature` makes it asymmetric
  | "petal" // lens-shaped petal
  | "dot" // small spice mark
  | "stroke" // small spice mark
  | "bubble"; // outlined circle with a faint fill

/**
 * Every shape is drawn centered on (x, y), sized width × height, then
 * rotated by `rotation` degrees around its center.
 */
export type Shape = {
  type: ShapeType;
  layer: Layer;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: Paint;
  opacity: number;
  /** Outline width for rings and bubbles. */
  strokeWidth?: number;
  /**
   * From -1 to 1. Leaves: asymmetry. Horizons: tilt and where the peak sits
   * (negative = higher on the left).
   */
  curvature?: number;
  /** Top edge of a "layer": tilt plus a meniscus and soft waves. */
  surface?: Surface;
  /** Centerline and thickness of a "ribbon". */
  ribbon?: Ribbon;
  /** ID of the ingredient that produced this shape. */
  ingredientId?: string;
  /** Prominence of that ingredient on the poster. */
  role?: Role;
  animation?: AnimationHint;
};

export type PaletteColor = {
  color: string;
  weight: number;
  ingredientId: string;
  ingredientName: string;
  category: IngredientCategory;
};

/** One sine component of an uneven edge. `frequency` is in half-waves across the width. */
export type Wave = { amplitude: number; frequency: number; phase: number };

export type Surface = {
  /** Degrees; the whole edge leans like a tilted liquid level. */
  tilt: number;
  /** How far the edge lifts at the sides, in px. */
  meniscus: number;
  waves: Wave[];
};

export type Ribbon = {
  /** Degrees, matching the drink's tilt. */
  tilt: number;
  /** The centerline's sway. */
  wave: Wave;
  /** Thickness varies between these, in px. */
  thickness: [number, number];
};

/** How prominent an ingredient is on its poster. */
export type Role = "hero" | "secondary" | "support" | "detail";

/** Visual forms the alt text can mention, in the generator's own terms. */
export type Form =
  | "spiritBands"
  | "bitterWashes"
  | "drinkBody"
  | "creamLayer"
  | "wineWash"
  | "heavyBase"
  | "circles"
  | "softBands"
  | "clusters"
  | "petals"
  | "colorShiftPetals"
  | "leaves"
  | "marks"
  | "foam"
  | "bubbles";

export type PosterSummary = {
  dominantFlavor: Flavor;
  /** The ingredient drawn as the dominant form, if any characteristic one exists. */
  hero?: { ingredientId: string; ingredientName: string };
  /** 0 = balanced and symmetrical, 1 = one flavor dominates. */
  tension: number;
  /** The characteristic colors that lead the poster, strongest first. */
  leadColors: PaletteColor[];
  /** Forms on the poster, most prominent first. */
  forms: Form[];
};

export type PosterSpec = {
  /** Safe to use as an SVG id prefix. */
  id: string;
  width: typeof POSTER_WIDTH;
  height: typeof POSTER_HEIGHT;
  background: { top: string; bottom: string };
  palette: PaletteColor[];
  shapes: Shape[];
  /** Thin inset border, identical on every poster. */
  frame: { inset: number; color: string; opacity: number; strokeWidth: number };
  /** Printed-paper texture over the whole poster, identical on every poster. */
  texture: {
    seed: number;
    grain: { frequency: number; opacity: number };
    mottle: { frequency: number; opacity: number };
  };
  summary: PosterSummary;
};
