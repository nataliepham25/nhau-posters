// Turns a cocktail's flavor data into a plain description of its poster.
// Pure: no React, no I/O, no Math.random. The same input always produces the
// same PosterSpec.

import { colors } from "@/lib/design-tokens";
import type { IngredientCategory } from "@/lib/types";
import { darken, lighten, mix } from "./color";
import {
  SUPPORTING_CATEGORIES,
  buildPalette,
  ingredientColor,
  ingredientWeight,
  leadColors,
  LEAD_COLOR_COUNT,
} from "./palette";
import { createRandom, type Random } from "./random";
import {
  FLAVORS,
  LAYERS,
  POSTER_HEIGHT as H,
  POSTER_WIDTH as W,
  type Flavor,
  type Form,
  type PaletteColor,
  type PosterInput,
  type PosterSpec,
  type Role,
  type Shape,
  type Surface,
  type Wave,
} from "./types";

const CX = W / 2;

/**
 * NHAU's deep teal, shared by every poster so they read as a series: the card
 * color at the top, fading to a slightly darker site background at the bottom.
 */
export const BACKGROUND = { top: colors.card, bottom: darken(colors.background, 0.2) };

/** Thin gold inset border on every poster. */
export const FRAME: PosterSpec["frame"] = {
  inset: 18,
  color: colors.accent,
  opacity: 0.45,
  strokeWidth: 1.5,
};

/** The same grain and paper mottling on every poster. */
export const TEXTURE: PosterSpec["texture"] = {
  seed: 7,
  grain: { frequency: 0.85, opacity: 0.4 },
  mottle: { frequency: 0.012, opacity: 0.22 },
};

/** Small details (marks, bubbles) stay this far inside the edges. */
export const SAFE_MARGIN = 48;

/** Herb leaves across all herb ingredients, so herbal drinks don't get crowded. */
export const MAX_LEAVES = 12;

/** Foreground forms are at least this opaque; translucency is for background layers. */
export const MIN_FOREGROUND_OPACITY = 0.85;

/** Layers allowed to be translucent. */
export const BACKGROUND_LAYERS: ReadonlySet<Shape["layer"]> = new Set(["spirit", "wash"]);

/** Butterfly pea turns from blue toward this pink as acidity rises. */
export const BUTTERFLY_PEA_PINK = "#C2569B";

type Ingredient = PosterInput["ingredients"][number];

type Signature = "co2" | "butterflyPea" | "saltedCreamFoam";

type Context = {
  flavor: PosterInput["flavor"];
  /** 0 = balanced and calm, 1 = one flavor dominates. */
  tension: number;
  /** Horizontal center of visual weight; drifts off-center as tension rises. */
  focusX: number;
  /** -1 or 1: the side the hero crops off when the layout is tense. */
  heroSide: -1 | 1;
  /** Rotation range in degrees. */
  maxRotation: number;
  /** Umami score from 0 to 1. */
  umami: number;
  /** Height of the umami horizon, 0 when umami is 0. */
  groundHeight: number;
  /**
   * Set when the hero is bitter (coffee, cacao): the poster becomes a layered
   * drink, with a body filling the lower half to two-thirds.
   */
  drink?: { height: number; tilt: number };
};

type Part = { shapes: Shape[]; forms: Form[] };

export type Plan = {
  role: Role;
  /** Position in the hierarchy (0 = hero); Infinity for spirits and techniques. */
  rank: number;
  /** Leaves to draw, for herb ingredients. */
  leaves: number;
};

const SIGNATURES: Record<string, Signature> = {
  "co₂": "co2",
  co2: "co2",
  "butterfly pea": "butterflyPea",
  "salted cream foam": "saltedCreamFoam",
};

const SIGNATURE_FORMS: Record<Signature, Form> = {
  co2: "bubbles",
  butterflyPea: "colorShiftPetals",
  saltedCreamFoam: "foam",
};

const BASE_LEAVES: Record<Role, number> = { hero: 6, secondary: 4, support: 3, detail: 2 };

export function signatureOf(name: string): Signature | undefined {
  return SIGNATURES[name.normalize("NFC").trim().toLowerCase()];
}

export function analyzeFlavor(flavor: PosterInput["flavor"]): {
  dominantFlavor: Flavor;
  tension: number;
} {
  const ranked = [...FLAVORS].sort((a, b) => flavor[b] - flavor[a]);
  const top = flavor[ranked[0]];
  const second = flavor[ranked[1]];
  const mean = FLAVORS.reduce((sum, name) => sum + flavor[name], 0) / FLAVORS.length;

  // How far the top flavor stands above the rest, and above its runner-up.
  const spread = (top - mean) / 10;
  const dominance = (top - second) / 10;
  const tension = clamp((spread + dominance) / 1.2, 0, 1);

  return { dominantFlavor: ranked[0], tension: round(tension, 1000) };
}

/**
 * The hierarchy.
 *
 * 1. The hero family is the ingredient category with the most total weight,
 *    so a drink with three herbs is herb-led even if one savory ingredient
 *    weighs a little more on its own.
 * 2. The hero is that family's heaviest ingredient. Signature ingredients
 *    (CO₂, foam, butterfly pea) count toward their family but keep their
 *    signature treatment instead of becoming the hero.
 * 3. The rest of the hero's family comes next, then everything else by
 *    weight. Rank 1 is the secondary form, the next one or two support, and
 *    the rest are details.
 *
 * Spirits and techniques never take part. Ties keep recipe order.
 */
export function planIngredients(input: PosterInput): {
  plans: Plan[];
  heroCategory?: IngredientCategory;
} {
  const entries = input.ingredients.map((ingredient, index) => ({
    index,
    category: ingredient.category,
    weight: ingredientWeight(ingredient.category, input.flavor),
    signature: signatureOf(ingredient.name) !== undefined,
  }));
  const characteristic = entries.filter((entry) => !SUPPORTING_CATEGORIES.has(entry.category));
  const byWeight = (a: (typeof entries)[number], b: (typeof entries)[number]) =>
    b.weight - a.weight || a.index - b.index;

  // Total and strongest single weight per family; ties on total go to the
  // family with the strongest single ingredient, then to recipe order.
  const families = new Map<IngredientCategory, { total: number; top: number }>();
  for (const entry of characteristic) {
    const family = families.get(entry.category) ?? { total: 0, top: 0 };
    families.set(entry.category, {
      total: family.total + entry.weight,
      top: Math.max(family.top, entry.weight),
    });
  }
  let heroCategory: IngredientCategory | undefined;
  let best = { total: -Infinity, top: -Infinity };
  for (const [category, family] of families) {
    const beats =
      family.total > best.total + 1e-9 ||
      (Math.abs(family.total - best.total) <= 1e-9 && family.top > best.top + 1e-9);
    if (beats) {
      best = family;
      heroCategory = category;
    }
  }

  const family = characteristic.filter((entry) => entry.category === heroCategory).sort(byWeight);
  const hero = family.find((entry) => !entry.signature) ?? family[0];
  const sameFamily = family.filter((entry) => entry !== hero && !entry.signature);
  const others = characteristic.filter((entry) => entry !== hero && !sameFamily.includes(entry)).sort(byWeight);
  const ranked = hero ? [hero, ...sameFamily, ...others] : [];

  const supportCount = ranked.length >= 5 ? 3 : 2;
  const plans: Plan[] = input.ingredients.map(() => ({ role: "detail", rank: Infinity, leaves: 0 }));
  ranked.forEach((entry, rank) => {
    const role: Role =
      rank === 0 ? "hero" : rank === 1 ? "secondary" : rank <= supportCount ? "support" : "detail";
    plans[entry.index] = { role, rank, leaves: 0 };
  });

  // Share the leaf budget between herbs, trimming the least important first.
  const herbs = entries
    .filter((entry) => entry.category === "herb and aromatic")
    .sort((a, b) => plans[a.index].rank - plans[b.index].rank || a.index - b.index);
  for (const { index } of herbs) plans[index].leaves = BASE_LEAVES[plans[index].role];
  let total = herbs.reduce((sum, { index }) => sum + plans[index].leaves, 0);
  for (let i = herbs.length - 1; total > MAX_LEAVES && i >= 0; ) {
    const plan = plans[herbs[i].index];
    if (plan.leaves > 1) {
      plan.leaves--;
      total--;
    } else {
      i--;
    }
  }

  return { plans, heroCategory };
}

export function generatePoster(input: PosterInput): PosterSpec {
  const { dominantFlavor, tension } = analyzeFlavor(input.flavor);
  const palette = buildPalette(input);
  const { plans, heroCategory } = planIngredients(input);
  const leads = rankedLeadColors(input, plans, palette);
  const layout = createRandom(`${input.slug}:layout`);
  const umami = input.flavor.umami / 10;

  const focusSign = layout.sign();
  const ctx: Context = {
    flavor: input.flavor,
    tension,
    focusX: CX + focusSign * tension * 100,
    heroSide: focusSign,
    maxRotation: 3 + tension * 11,
    umami,
    groundHeight: umami > 0 ? Math.round(60 + 220 * umami) : 0,
  };
  if (heroCategory === "bitter") {
    ctx.drink = {
      height: Math.round(H * (0.5 + 0.16 * (input.flavor.bitter / 10))),
      // The liquid leans more as the flavor balance gets more tense.
      tilt: layout.sign() * (1.5 + tension * 6),
    };
  }

  const background = {
    top: BACKGROUND.top,
    bottom: darken(BACKGROUND.bottom, umami * 0.6),
  };

  const lead = leads[0]?.color ?? BACKGROUND.top;
  const parts: { part: Part; weight: number }[] = [];

  if (ctx.groundHeight > 0) {
    parts.push({ part: umamiGround(layout, ctx, lead), weight: 0.5 + umami });
  }

  const seen = new Map<string, number>();
  input.ingredients.forEach((ingredient, index) => {
    // Each ingredient gets its own random stream, so adding or removing one
    // ingredient doesn't reshuffle the others.
    const occurrence = seen.get(ingredient.name) ?? 0;
    seen.set(ingredient.name, occurrence + 1);
    const rng = createRandom(`${input.slug}:${ingredient.name}:${occurrence}`);
    const plan = plans[index];

    const part = drawIngredient(rng, ctx, ingredient, plan, lead);
    parts.push({
      part: {
        ...part,
        shapes: part.shapes.map((shape) => ({ ...shape, ingredientId: ingredient.id, role: plan.role })),
      },
      // The hierarchy decides which forms the alt text mentions first.
      weight: Number.isFinite(plan.rank) ? 10 - plan.rank : 0,
    });
  });

  const shapes = parts
    .flatMap(({ part }) => part.shapes)
    .map(finalizeShape)
    .sort((a, b) => LAYERS.indexOf(a.layer) - LAYERS.indexOf(b.layer));

  const hero = input.ingredients[plans.findIndex((plan) => plan.role === "hero")];

  return {
    id: `poster-${input.slug.replace(/[^a-z0-9-]/gi, "")}`,
    width: W,
    height: H,
    background,
    palette,
    shapes,
    frame: FRAME,
    texture: TEXTURE,
    summary: {
      dominantFlavor,
      ...(hero && { hero: { ingredientId: hero.id, ingredientName: hero.name } }),
      tension,
      leadColors: leads,
      forms: rankForms(parts),
    },
  };
}

/** Lead colors follow the hierarchy: hero first, then secondary and support. */
function rankedLeadColors(input: PosterInput, plans: Plan[], palette: PaletteColor[]): PaletteColor[] {
  const ranked = input.ingredients
    .map((ingredient, index) => ({ ingredient, plan: plans[index] }))
    .filter(({ plan }) => Number.isFinite(plan.rank))
    .sort((a, b) => a.plan.rank - b.plan.rank)
    .slice(0, LEAD_COLOR_COUNT)
    .map(({ ingredient }) => ({
      color: ingredientColor(ingredient),
      weight: ingredientWeight(ingredient.category, input.flavor),
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      category: ingredient.category,
    }));
  return ranked.length > 0 ? ranked : leadColors(palette);
}

function drawIngredient(rng: Random, ctx: Context, ingredient: Ingredient, plan: Plan, lead: string): Part {
  const color = ingredientColor(ingredient);
  const signature = signatureOf(ingredient.name);
  const { role } = plan;

  if (signature === "co2") return bubbles(rng, ctx, color);
  if (signature === "saltedCreamFoam") return foam(rng, ctx, color);

  switch (ingredient.category) {
    case "base spirit":
      return spiritBands(rng, ctx, color, lead);
    case "wine":
      return wineWash(rng, ctx, color, role);
    case "bitter":
      return bitter(rng, ctx, color, role);
    case "savory":
      return savoryHorizon(rng, ctx, color, role);
    case "sour":
      return sourCircles(rng, ctx, color, role);
    case "sweet and creamy":
      return sweet(rng, ctx, color, role);
    case "fruit":
      return fruitCluster(rng, ctx, color, role);
    case "herb and aromatic":
      return leaves(rng, ctx, color, role, plan.leaves);
    case "floral":
      return flower(rng, ctx, color, role, signature === "butterflyPea");
    case "spice":
      return spiceMarks(rng, ctx, color, role);
    case "technique":
      return { shapes: [], forms: [] };
  }
}

// --- Background layers (may be translucent) ------------------------------

/**
 * Subtle: tinted toward the lead color, then sunk toward the background, so
 * pale spirits like vodka and gin never outshine the characteristic ingredients.
 */
function spiritBands(rng: Random, ctx: Context, color: string, lead: string): Part {
  const count = rng.chance(0.4) ? 3 : 2;
  const fill = mix(mix(color, lead, 0.6), BACKGROUND.top, 0.45);
  const shapes: Shape[] = [];
  for (let i = 0; i < count; i++) {
    const y = lowerBias(150 + (i + 0.5) * (500 / count) + rng.range(-40, 40), ctx);
    shapes.push({
      type: "band",
      layer: "spirit",
      x: CX + rng.range(-30, 30),
      y,
      width: 900,
      height: rng.range(90, 170),
      rotation: tilt(rng, ctx),
      fill,
      opacity: rng.range(0.06, 0.12),
    });
  }
  return { shapes, forms: ["spiritBands"] };
}

/** A faint column running off the top and bottom edges, sunk toward the background. */
function wineWash(rng: Random, ctx: Context, color: string, role: Role): Part {
  const size = {
    hero: { w: [300, 380], opacity: 0.14 },
    secondary: { w: [220, 280], opacity: 0.08 },
    support: { w: [200, 260], opacity: 0.07 },
    detail: { w: [120, 160], opacity: 0.05 },
  }[role];
  return {
    shapes: [
      {
        type: "wash",
        layer: "wash",
        x: ctx.focusX + rng.range(-80, 80),
        y: H / 2,
        width: rng.range(size.w[0], size.w[1]),
        height: H + 300,
        // Angled away from the hero so it never reads as a vertical spotlight.
        rotation: -ctx.heroSide * rng.range(14, 22),
        fill: mix(color, BACKGROUND.top, 0.3),
        opacity: size.opacity,
      },
    ],
    forms: ["wineWash"],
  };
}

/** A dark horizon along the bottom edge whose height follows the umami score. */
function umamiGround(rng: Random, ctx: Context, lead: string): Part {
  // Fully hidden behind a drink body: skip it rather than draw an invisible shape.
  if (ctx.drink && ctx.groundHeight <= ctx.drink.height) return { shapes: [], forms: [] };
  const fill = darken(mix(lead, BACKGROUND.bottom, 0.6), 0.35);
  return {
    shapes: [horizon(ctx.groundHeight, fill, 0.9, rng, ctx)],
    forms: ctx.umami >= 0.3 ? ["heavyBase"] : [],
  };
}

// --- Foreground forms (opaque) --------------------------------------------

/**
 * Bitter ingredients. As hero, the poster becomes a layered drink: an opaque
 * body filling the lower half to two-thirds. Other bitter ingredients become
 * darker layers inside it. Without a drink, they're opaque washes.
 */
function bitter(rng: Random, ctx: Context, color: string, role: Role): Part {
  if (ctx.drink) {
    const { height, tilt } = ctx.drink;
    if (role === "hero") {
      // The body has a meniscus where it meets the foam; its darker depths
      // below have an irregular, wavering boundary.
      const depth = Math.round(height * rng.range(0.38, 0.5));
      return {
        shapes: [
          drinkLayer(height, color, "drink", {
            tilt,
            meniscus: rng.range(12, 20),
            waves: [wave(rng, 2, 4, 2, 3.5)],
          }),
          drinkLayer(depth, darken(color, 0.35), "drinkAccent", {
            tilt,
            meniscus: 0,
            waves: [wave(rng, 8, 16, 1, 2), wave(rng, 4, 8, 2.5, 4), wave(rng, 3, 5, 5, 7)],
          }),
        ],
        forms: ["drinkBody"],
      };
    }
    // Other bitter ingredients swirl through the coffee as a darker ribbon.
    const scale = role === "secondary" ? 1 : 0.6;
    const amplitude = rng.range(18, 34) * scale;
    const thickness: [number, number] = [rng.range(14, 22) * scale, rng.range(40, 56) * scale];
    return {
      shapes: [
        {
          type: "ribbon",
          layer: "drinkAccent",
          x: CX,
          y: H - height * rng.range(0.42, 0.58),
          width: W + 40,
          height: 2 * amplitude + thickness[1],
          rotation: 0,
          fill: darken(color, 0.5),
          opacity: 1,
          ribbon: {
            tilt: round(tilt, 100),
            wave: roundWave({ ...wave(rng, 0, 0, 1.2, 2.2), amplitude }),
            thickness: [round(thickness[0]), round(thickness[1])],
          },
        },
      ],
      forms: [],
    };
  }

  const scale = { hero: 1.6, secondary: 1.2, support: 1, detail: 0.65 }[role];
  const count = role === "detail" ? 1 : 2;
  const shapes = pairedPositions(rng, ctx, count, 300, 560, 140).map(
    ({ x, y }): Shape => ({
      type: "wash",
      layer: "wash",
      x,
      y,
      width: rng.range(240, 320) * scale,
      height: rng.range(220, 300) * scale,
      rotation: tilt(rng, ctx),
      fill: color,
      opacity: rng.range(0.88, 0.95),
    }),
  );
  return { shapes, forms: ["bitterWashes"] };
}

/** Savory ingredients as horizons in front of the umami ground. */
function savoryHorizon(rng: Random, ctx: Context, color: string, role: Role): Part {
  const base = 140 + 260 * ctx.umami;
  const factor = {
    hero: rng.range(0.95, 1.05),
    secondary: rng.range(0.45, 0.55),
    support: rng.range(0.3, 0.38),
    detail: rng.range(0.2, 0.26),
  }[role];
  const height = Math.round(base * factor);
  if (ctx.drink && height <= ctx.drink.height) return { shapes: [], forms: [] };
  // Less important horizons sink darker, so only the hero's color reads strongly.
  const shade = { hero: 0.15, secondary: 0.3, support: 0.4, detail: 0.5 }[role] + ctx.umami * 0.2;
  return {
    shapes: [horizon(height, darken(color, shade), 0.95, rng, ctx)],
    forms: ["heavyBase"],
  };
}

/** One big opaque circle as hero; smaller circles and rings otherwise. */
function sourCircles(rng: Random, ctx: Context, color: string, role: Role): Part {
  const sour = ctx.flavor.sour / 10;

  if (role === "hero") {
    const diameter = rng.range(440, 520) + sour * 60;
    const { x, y } = heroCenter(rng, ctx, diameter, diameter, 260, 420);
    return { shapes: [circle(x, y, diameter, color, 0.95)], forms: ["circles"] };
  }

  const shapes: Shape[] = [];
  if (role === "detail") {
    const [{ x, y }] = pairedPositions(rng, ctx, 1, 200, 560, 180);
    shapes.push(ring(x, y, rng.range(70, 110), color, rng));
  } else {
    const count = sour >= 0.6 ? 2 : 1;
    pairedPositions(rng, ctx, count, 200, 520, 160).forEach(({ x, y }, i) => {
      const diameter = rng.range(110, 160) + sour * 30;
      shapes.push(
        i === 0 ? circle(x, y, diameter, color, rng.range(0.9, 0.97)) : ring(x, y, diameter * 0.8, color, rng),
      );
    });
  }
  return { shapes, forms: ["circles"] };
}

/**
 * Sweet and creamy ingredients. In a layered drink they sit as a thin pale
 * layer at the bottom (like condensed milk in cà phê sữa); otherwise they're
 * opaque bands running off both sides.
 */
function sweet(rng: Random, ctx: Context, color: string, role: Role): Part {
  if (ctx.drink) {
    const height = Math.round(ctx.drink.height * rng.range(0.07, 0.1));
    const surface = { tilt: ctx.drink.tilt, meniscus: 0, waves: [wave(rng, 2, 4, 2, 4)] };
    return { shapes: [drinkLayer(height, color, "drinkAccent", surface)], forms: ["creamLayer"] };
  }

  // Below hero level, an opaque full-width bar reads as a glitch, so lesser
  // sweet ingredients become a faint background haze instead.
  if (role !== "hero") {
    return {
      shapes: [
        {
          type: "softBand",
          layer: "wash",
          x: CX,
          y: rng.range(360, 520),
          width: 900,
          height: rng.range(70, 120) * (role === "detail" ? 0.7 : 1),
          rotation: tilt(rng, ctx) * 0.4,
          fill: color,
          opacity: rng.range(0.05, 0.08),
        },
      ],
      forms: [],
    };
  }

  let y = rng.range(330, 480);
  const shapes: Shape[] = [];
  for (let i = 0; i < 3; i++) {
    shapes.push({
      type: "softBand",
      layer: "sweet",
      x: CX + (ctx.focusX - CX) * 0.5 + rng.range(-40, 40),
      y,
      // Always wider than the poster, so the bands read as layers, not pills.
      width: 900,
      height: rng.range(90, 130),
      rotation: tilt(rng, ctx) * 0.4,
      fill: i % 2 === 0 ? color : lighten(color, 0.08),
      opacity: rng.range(0.88, 0.95),
    });
    y += rng.range(80, 110);
  }
  return { shapes, forms: ["softBands"] };
}

/** A cluster of rounded forms; as hero, large and cropped by an edge. */
function fruitCluster(rng: Random, ctx: Context, color: string, role: Role): Part {
  const size = {
    hero: { count: [6, 9], r: [45, 85], spread: 150 },
    secondary: { count: [6, 8], r: [28, 46], spread: 75 },
    support: { count: [5, 8], r: [16, 30], spread: 45 },
    detail: { count: [3, 4], r: [10, 18], spread: 25 },
  }[role];

  const shapes: Shape[] = [];
  let center: { x: number; y: number };
  if (role === "hero") {
    // The largest fruit anchors the cluster and is the one cropped by the edge.
    const diameter = 2 * size.r[1] * rng.range(1, 1.2);
    center = heroCenter(rng, ctx, diameter, diameter, 260, 460);
    shapes.push(circle(center.x, center.y, diameter, color, 0.95, "fruit"));
  } else {
    center = role === "secondary" ? opposingPosition(rng, ctx) : pairedPositions(rng, ctx, 1, 240, 560, 150)[0];
  }

  // A hero cluster grows inward from its cropped anchor, so it stays on the poster.
  const inward = Math.atan2(H / 2 - center.y, CX - center.x);
  const count = rng.int(size.count[0], size.count[1]);
  for (let i = 0; i < count; i++) {
    const angle = role === "hero" ? inward + rng.range(-1.1, 1.1) : rng.range(0, Math.PI * 2);
    const distance = rng.range(role === "hero" ? 0.35 : 0, 1) * size.spread;
    shapes.push(
      circle(
        center.x + Math.cos(angle) * distance,
        center.y + Math.sin(angle) * distance,
        2 * rng.range(size.r[0], size.r[1]),
        i % 2 === 0 ? color : lighten(color, 0.15),
        0.95,
        "fruit",
      ),
    );
  }
  return { shapes, forms: ["clusters"] };
}

/**
 * Leaves along an invisible, gently bending stem. Count comes from the leaf
 * budget. A hero stem rises from below the bottom edge into the upper half.
 */
function leaves(rng: Random, ctx: Context, color: string, role: Role, count: number): Part {
  if (count === 0) return { shapes: [], forms: [] };
  const size = {
    hero: { length: [150, 240], stem: [560, 680] },
    secondary: { length: [110, 180], stem: [420, 520] },
    support: { length: [95, 165], stem: [300, 400] },
    detail: { length: [65, 105], stem: [180, 240] },
  }[role];

  const base =
    role === "hero"
      ? { x: ctx.focusX + rng.range(-60, 60), y: H + rng.range(10, 30) }
      : pairedPositions(rng, ctx, 1, role === "secondary" ? 660 : 560, 760, 190)[0];
  const stemAngle = -90 + rng.range(-1, 1) * (10 + ctx.tension * 25);
  const stemLength = rng.range(size.stem[0], size.stem[1]);
  const bend = rng.range(-40, 40);
  const dir = toRadians(stemAngle);

  const shapes: Shape[] = [];
  for (let i = 0; i < count; i++) {
    // The hero's first leaf starts right at the base, so it crosses the bottom edge.
    const t = role === "hero" ? i / count : (i + 1) / (count + 1);
    const side = i % 2 === 0 ? 1 : -1;
    const rotation = stemAngle + side * rng.range(30, 60);
    // Wide size variation, tapering toward the tip of the stem.
    const length = rng.range(size.length[0], size.length[1]) * rng.range(0.7, 1.3) * (1 - t * 0.35);
    // Point on the stem, bowed sideways by `bend`.
    const sx = base.x + Math.cos(dir) * stemLength * t - Math.sin(dir) * Math.sin(t * Math.PI) * bend;
    const sy = base.y + Math.sin(dir) * stemLength * t + Math.cos(dir) * Math.sin(t * Math.PI) * bend;
    // Shift the leaf so its base, not its center, sits on the stem.
    const r = toRadians(rotation);
    shapes.push({
      type: "leaf",
      layer: "herb",
      x: sx + (Math.cos(r) * length) / 2,
      y: sy + (Math.sin(r) * length) / 2,
      width: length,
      height: length * rng.range(0.22, 0.32),
      rotation,
      curvature: rng.range(-0.6, 0.6),
      fill: i % 3 === 0 ? lighten(color, 0.12) : color,
      opacity: 0.94,
      animation: {
        kind: "sway",
        angle: 3 + ctx.tension * 3,
        duration: rng.range(4, 7),
        delay: rng.range(0, 2),
      },
    });
  }
  return { shapes, forms: ["leaves"] };
}

function flower(
  rng: Random,
  ctx: Context,
  color: string,
  role: Role,
  isButterflyPea: boolean,
): Part {
  const [min, max] = { hero: [150, 210], secondary: [100, 140], support: [60, 90], detail: [35, 50] }[role];
  const length = rng.range(min, max);
  const center =
    role === "hero"
      ? heroCenter(rng, ctx, length * 2, length * 2, 240, 420)
      : role === "secondary"
        ? opposingPosition(rng, ctx)
        : pairedPositions(rng, ctx, 1, 200, 500, 150)[0];

  // Butterfly pea shifts from blue toward pink as the drink gets more acidic.
  const fill = isButterflyPea
    ? { type: "gradient" as const, from: color, to: mix(color, BUTTERFLY_PEA_PINK, ctx.flavor.sour / 10) }
    : color;
  const animation = isButterflyPea
    ? { kind: "colorShift" as const, from: color, to: BUTTERFLY_PEA_PINK, duration: 8 }
    : undefined;

  const count = rng.int(5, 8);
  const width = length * rng.range(0.38, 0.5);
  const start = rng.range(0, 360);
  const shapes: Shape[] = [];
  for (let i = 0; i < count; i++) {
    const angle = start + (i * 360) / count;
    const a = toRadians(angle);
    shapes.push({
      type: "petal",
      layer: "floral",
      x: center.x + (Math.cos(a) * length) / 2,
      y: center.y + (Math.sin(a) * length) / 2,
      width,
      height: length,
      // Petals are drawn vertically; turn each to point away from the center.
      rotation: angle + 90,
      fill,
      opacity: 0.95,
      ...(animation && { animation }),
    });
  }
  shapes.push(
    circle(center.x, center.y, length * 0.22, lighten(isButterflyPea ? BUTTERFLY_PEA_PINK : color, 0.35), 0.95, "floral"),
  );
  return { shapes, forms: [isButterflyPea ? "colorShiftPetals" : "petals"] };
}

/** Marks grouped loosely in two or three clusters near the focus. */
function spiceMarks(rng: Random, ctx: Context, color: string, role: Role): Part {
  const spicy = ctx.flavor.spicy;
  const count = Math.round(
    { hero: 16 + spicy * 2, secondary: 12 + spicy * 1.5, support: 10 + spicy * 1.5, detail: 6 + spicy }[role],
  );
  const scale = { hero: 1.3, secondary: 1.1, support: 1, detail: 0.85 }[role];
  const groups = Array.from({ length: role === "detail" ? rng.int(1, 2) : rng.int(2, 3) }, () => ({
    x: clamp(ctx.focusX + rng.range(-1, 1) * 200, SAFE_MARGIN + 60, W - SAFE_MARGIN - 60),
    y: rng.range(140, 620),
    spread: rng.range(45, 90),
  }));

  const shapes: Shape[] = [];
  for (let i = 0; i < count; i++) {
    const group = groups[i % groups.length];
    const angle = rng.range(0, Math.PI * 2);
    // Most marks sit near the group center, a few drift farther out.
    const distance = Math.sqrt(rng.next()) * group.spread;
    const isDot = rng.chance(0.5);
    const size = rng.range(6, 11) * scale;
    shapes.push({
      type: isDot ? "dot" : "stroke",
      layer: "spice",
      x: insideSafe(group.x + Math.cos(angle) * distance, W),
      y: insideSafe(group.y + Math.sin(angle) * distance, H),
      width: isDot ? size : rng.range(14, 24) * scale,
      height: isDot ? size : rng.range(3, 5) * scale,
      rotation: isDot ? 0 : rng.range(0, 180),
      fill: rng.chance(0.3) ? lighten(color, 0.2) : color,
      opacity: rng.range(0.88, 1),
    });
  }
  return { shapes, forms: ["marks"] };
}

// --- Signature details ------------------------------------------------------

/** CO₂: small bubbles that grow as they rise. */
function bubbles(rng: Random, ctx: Context, color: string): Part {
  const count = rng.int(12, 20);
  const shapes: Shape[] = [];
  for (let i = 0; i < count; i++) {
    const y = rng.range(120, 700);
    const diameter = 2 * (3 + (1 - y / H) * 9 + rng.range(0, 2));
    shapes.push({
      type: "bubble",
      layer: "bubbles",
      x: insideSafe(rng.range(SAFE_MARGIN, W - SAFE_MARGIN) * 0.8 + ctx.focusX * 0.2, W),
      y,
      width: diameter,
      height: diameter,
      rotation: 0,
      fill: lighten(color, 0.2),
      opacity: rng.range(0.88, 0.96),
      strokeWidth: 1.4,
      animation: {
        kind: "rise",
        distance: rng.range(80, 200),
        duration: rng.range(5, 10),
        delay: rng.range(0, 5),
      },
    });
  }
  return { shapes, forms: [SIGNATURE_FORMS.co2] };
}

/**
 * Salted cream foam: a crisp pale layer. On a drink it rests on the surface
 * (drawn behind the body, so only its top shows); otherwise it's a band near
 * the top of the poster.
 */
function foam(rng: Random, ctx: Context, color: string): Part {
  const fill = lighten(color, 0.1);
  if (ctx.drink) {
    const height = ctx.drink.height + Math.round(rng.range(40, 56));
    // A soft, uneven top: one slow swell plus a smaller, quicker ripple.
    const surface = { tilt: ctx.drink.tilt, meniscus: 0, waves: [wave(rng, 5, 9, 1.5, 2.5), wave(rng, 2, 4, 5, 8)] };
    return { shapes: [drinkLayer(height, fill, "drinkFoam", surface)], forms: [SIGNATURE_FORMS.saltedCreamFoam] };
  }
  return {
    shapes: [
      {
        type: "softBand",
        layer: "foam",
        x: CX,
        y: rng.range(90, 110),
        width: 900,
        height: rng.range(50, 64),
        rotation: 0,
        fill,
        opacity: 0.92,
      },
    ],
    forms: [SIGNATURE_FORMS.saltedCreamFoam],
  };
}

// --- Composition helpers ----------------------------------------------------

function horizon(height: number, fill: string, opacity: number, rng: Random, ctx: Context): Shape {
  return {
    type: "horizon",
    layer: "ground",
    x: CX,
    // Anchored: the bottom of the shape sits exactly on the bottom edge.
    y: H - height / 2,
    width: W,
    height,
    rotation: 0,
    curvature: rng.range(-1, 1) * (0.3 + ctx.tension * 0.7),
    fill,
    opacity,
  };
}

/** A full-width drink layer anchored to the bottom edge, with an organic top edge. */
function drinkLayer(height: number, fill: string, layer: Shape["layer"], surface: Surface): Shape {
  return {
    type: "layer",
    layer,
    x: CX,
    y: H - height / 2,
    width: W,
    height,
    rotation: 0,
    fill,
    opacity: 1,
    surface: roundSurface(surface),
  };
}

function wave(rng: Random, minAmplitude: number, maxAmplitude: number, minFrequency: number, maxFrequency: number): Wave {
  return {
    amplitude: rng.range(minAmplitude, maxAmplitude),
    frequency: rng.range(minFrequency, maxFrequency),
    phase: rng.range(0, Math.PI * 2),
  };
}

function roundSurface(surface: Surface): Surface {
  return {
    tilt: round(surface.tilt, 100),
    meniscus: round(surface.meniscus),
    waves: surface.waves.map(roundWave),
  };
}

function roundWave(w: Wave): Wave {
  return { amplitude: round(w.amplitude), frequency: round(w.frequency, 100), phase: round(w.phase, 100) };
}

function circle(
  x: number,
  y: number,
  diameter: number,
  fill: string,
  opacity: number,
  layer: Shape["layer"] = "sour",
): Shape {
  return { type: "circle", layer, x, y, width: diameter, height: diameter, rotation: 0, fill, opacity };
}

function ring(x: number, y: number, diameter: number, fill: string, rng: Random): Shape {
  return {
    type: "ring",
    layer: "sour",
    x,
    y,
    width: diameter,
    height: diameter,
    rotation: 0,
    fill,
    opacity: 0.92,
    strokeWidth: rng.range(5, 10),
  };
}

/**
 * Where the hero sits. Calm layouts center it and let it crop off the top;
 * tense layouts push it off the focus side.
 */
function heroCenter(
  rng: Random,
  ctx: Context,
  width: number,
  height: number,
  yMin: number,
  yMax: number,
): { x: number; y: number } {
  if (ctx.tension < 0.35) {
    return { x: CX + rng.range(-20, 20), y: height / 2 - height * rng.range(0.12, 0.22) };
  }
  const crop = width * rng.range(0.15, 0.28);
  const x = ctx.heroSide < 0 ? width / 2 - crop : W - width / 2 + crop;
  return { x, y: rng.range(yMin, yMax) };
}

/**
 * Where the secondary form sits: across from the hero, lower down, so the two
 * main forms balance each other instead of overlapping.
 */
function opposingPosition(rng: Random, ctx: Context): { x: number; y: number } {
  return { x: CX - ctx.heroSide * rng.range(80, 150), y: rng.range(440, 580) };
}

/**
 * Positions in mirrored pairs around the vertical center. Tension breaks the
 * mirror (jitter) and pulls everything toward the focus.
 */
function pairedPositions(
  rng: Random,
  ctx: Context,
  count: number,
  yMin: number,
  yMax: number,
  spreadX: number,
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const shift = ctx.focusX - CX;

  while (positions.length < count) {
    const y = rng.range(yMin, yMax);
    if (count - positions.length === 1) {
      positions.push({ x: CX + rng.range(-1, 1) * spreadX * Math.max(ctx.tension, 0.5) + shift, y });
    } else {
      const dx = rng.range(spreadX * 0.25, spreadX);
      positions.push({ x: CX - dx + shift, y });
      positions.push({
        x: CX + dx + shift + rng.range(-1, 1) * ctx.tension * 140,
        y: y + rng.range(-1, 1) * ctx.tension * 110,
      });
    }
  }
  return positions;
}

/** Random tilt within the composition's rotation range. */
function tilt(rng: Random, ctx: Context): number {
  return rng.range(-1, 1) * ctx.maxRotation;
}

/** Umami pulls forms toward the lower part of the poster. */
function lowerBias(y: number, ctx: Context): number {
  return y + (H * 0.75 - y) * ctx.umami * 0.5;
}

function insideSafe(value: number, max: number): number {
  return clamp(value, SAFE_MARGIN, max - SAFE_MARGIN);
}

function rankForms(parts: { part: Part; weight: number }[]): Form[] {
  const best = new Map<Form, number>();
  for (const { part, weight } of parts) {
    for (const form of part.forms) {
      best.set(form, Math.max(best.get(form) ?? 0, weight));
    }
  }
  return [...best.entries()].sort((a, b) => b[1] - a[1]).map(([form]) => form);
}

function finalizeShape(shape: Shape): Shape {
  return {
    ...shape,
    x: round(clamp(shape.x, 0, W)),
    y: round(clamp(shape.y, 0, H)),
    width: round(shape.width),
    height: round(shape.height),
    rotation: round(shape.rotation),
    opacity: round(clamp(shape.opacity, 0, 1), 100),
    ...(shape.strokeWidth !== undefined && { strokeWidth: round(shape.strokeWidth) }),
    ...(shape.curvature !== undefined && { curvature: round(shape.curvature, 100) }),
    ...(shape.animation && { animation: roundAnimation(shape.animation) }),
  };
}

function roundAnimation(hint: NonNullable<Shape["animation"]>): NonNullable<Shape["animation"]> {
  switch (hint.kind) {
    case "rise":
      return { ...hint, distance: round(hint.distance), duration: round(hint.duration), delay: round(hint.delay) };
    case "sway":
      return { ...hint, angle: round(hint.angle), duration: round(hint.duration), delay: round(hint.delay) };
    case "colorShift":
      return hint;
  }
}

function round(value: number, precision = 10): number {
  return Math.round(value * precision) / precision;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
