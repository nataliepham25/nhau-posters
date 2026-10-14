import { afterEach, describe, expect, it, vi } from "vitest";
import { isHex, toHsl } from "./color";
import { cocktailInput, cocktailInputs, withFlavor } from "./fixtures";
import {
  BACKGROUND_LAYERS,
  MAX_LEAVES,
  MIN_FOREGROUND_OPACITY,
  SAFE_MARGIN,
  analyzeFlavor,
  generatePoster,
  planIngredients,
} from "./generate";
import { POSTER_HEIGHT, POSTER_WIDTH, type Paint, type PosterSpec, type Shape } from "./types";

const paintColors = (paint: Paint) => (typeof paint === "string" ? [paint] : [paint.from, paint.to]);

/** Axis-aligned bounds of a shape after rotation. */
function bounds(shape: Shape) {
  const r = (shape.rotation * Math.PI) / 180;
  const ex = Math.abs((shape.width / 2) * Math.cos(r)) + Math.abs((shape.height / 2) * Math.sin(r));
  const ey = Math.abs((shape.width / 2) * Math.sin(r)) + Math.abs((shape.height / 2) * Math.cos(r));
  return { left: shape.x - ex, right: shape.x + ex, top: shape.y - ey, bottom: shape.y + ey };
}

/** Approximate visible area × opacity, clipped to the poster. */
function visualWeight(shape: Shape, spec: PosterSpec): number {
  const { width: w, opacity } = shape;
  let h = shape.height;
  // Foam on a drink is drawn behind the body; only the strip above it shows.
  if (shape.layer === "drinkFoam") {
    const body = spec.shapes.find((s) => s.layer === "drink");
    if (body) h -= body.height;
  }
  const left = Math.max(0, shape.x - w / 2);
  const right = Math.min(POSTER_WIDTH, shape.x + w / 2);
  const top = Math.max(0, shape.y - shape.height / 2);
  const bottom = Math.min(POSTER_HEIGHT, shape.y + shape.height / 2);
  const visible = (Math.max(0, right - left) * Math.max(0, bottom - top)) / (w * shape.height);
  const fill =
    {
      ring: (Math.PI * w * (shape.strokeWidth ?? 8)) / (w * h),
      circle: Math.PI / 4,
      dot: Math.PI / 4,
      wash: Math.PI / 4,
      bubble: Math.PI / 4,
      petal: 0.5,
      leaf: 0.5,
      ribbon: 0.5,
      horizon: 0.85,
    }[shape.type as string] ?? 1;
  return w * h * fill * visible * opacity;
}

/**
 * Visual weight per ingredient. Ground horizons span the full width as a base
 * layer, so they're left out of hierarchy comparisons.
 */
const weightByIngredient = (spec: PosterSpec) => {
  const totals = new Map<string, number>();
  for (const shape of spec.shapes) {
    if (!shape.ingredientId || shape.layer === "ground") continue;
    totals.set(shape.ingredientId, (totals.get(shape.ingredientId) ?? 0) + visualWeight(shape, spec));
  }
  return totals;
};

const shapesOf = (spec: PosterSpec, ingredientId: string) =>
  spec.shapes.filter((shape) => shape.ingredientId === ingredientId);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("determinism", () => {
  it.each(cocktailInputs.map((input) => [input.slug, input] as const))(
    "%s produces the same poster every time",
    (_slug, input) => {
      const first = generatePoster(input);
      const second = generatePoster(structuredClone(input));
      expect(second).toEqual(first);
    },
  );

  it("never uses Math.random", () => {
    const random = vi.spyOn(Math, "random");
    cocktailInputs.forEach((input) => generatePoster(input));
    expect(random).not.toHaveBeenCalled();
  });

  it("does not modify the input", () => {
    const input = structuredClone(cocktailInputs[0]);
    const before = structuredClone(input);
    generatePoster(input);
    expect(input).toEqual(before);
  });
});

describe("uniqueness", () => {
  it("gives every cocktail a different poster", () => {
    const posters = cocktailInputs.map((input) => JSON.stringify(generatePoster(input).shapes));
    expect(new Set(posters).size).toBe(cocktailInputs.length);
  });

  it("changes the poster when only the slug changes", () => {
    const input = cocktailInput("canh-chua");
    const renamed = { ...input, slug: "canh-chua-2" };
    expect(generatePoster(renamed).shapes).not.toEqual(generatePoster(input).shapes);
  });

  it("keeps other ingredients' shapes when one ingredient is added", () => {
    const input = cocktailInput("anh-yeu-em");
    const withMint = {
      ...input,
      ingredients: [
        ...input.ingredients,
        { id: "mint", name: "mint", category: "herb and aromatic" as const, colorHint: "#3FA34D" },
      ],
    };
    const before = generatePoster(input);
    const after = generatePoster(withMint);
    // Mint doesn't change the hierarchy or lead color, so every original shape is identical.
    for (const { id } of input.ingredients) {
      expect(shapesOf(after, id)).toEqual(shapesOf(before, id));
    }
    expect(shapesOf(after, "mint").length).toBeGreaterThan(0);
  });
});

describe("valid output", () => {
  it.each(cocktailInputs.map((input) => [input.slug, generatePoster(input)] as const))(
    "%s stays inside the poster with valid values",
    (_slug, spec) => {
      expect(spec.width).toBe(POSTER_WIDTH);
      expect(spec.height).toBe(POSTER_HEIGHT);
      expect(spec.shapes.length).toBeGreaterThan(0);
      for (const shape of spec.shapes) {
        expect(shape.x).toBeGreaterThanOrEqual(0);
        expect(shape.x).toBeLessThanOrEqual(POSTER_WIDTH);
        expect(shape.y).toBeGreaterThanOrEqual(0);
        expect(shape.y).toBeLessThanOrEqual(POSTER_HEIGHT);
        expect(shape.width).toBeGreaterThan(0);
        expect(shape.height).toBeGreaterThan(0);
        expect(shape.opacity).toBeGreaterThanOrEqual(0);
        expect(shape.opacity).toBeLessThanOrEqual(1);
        for (const color of paintColors(shape.fill)) expect(isHex(color)).toBe(true);
      }
      expect(isHex(spec.background.top)).toBe(true);
      expect(isHex(spec.background.bottom)).toBe(true);
    },
  );

  it("uses no blur: softness comes from opacity and color", () => {
    for (const input of cocktailInputs) {
      for (const shape of generatePoster(input).shapes) expect(shape).not.toHaveProperty("blur");
    }
  });

  it("keeps foreground forms opaque; only background layers are translucent", () => {
    for (const input of cocktailInputs) {
      for (const shape of generatePoster(input).shapes) {
        if (BACKGROUND_LAYERS.has(shape.layer)) continue;
        expect(shape.opacity).toBeGreaterThanOrEqual(MIN_FOREGROUND_OPACITY);
      }
    }
  });

  it("gives every poster the same frame and texture", () => {
    const [first, ...rest] = cocktailInputs.map(generatePoster);
    expect(first.frame.color).toBe("#C2B499");
    expect(first.frame.opacity).toBeLessThan(0.6);
    for (const spec of rest) {
      expect(spec.frame).toEqual(first.frame);
      expect(spec.texture).toEqual(first.texture);
    }
  });

  it("keeps small details inside the safe margin", () => {
    for (const input of cocktailInputs) {
      const details = generatePoster(input).shapes.filter((s) => ["dot", "stroke", "bubble"].includes(s.type));
      for (const shape of details) {
        expect(shape.x).toBeGreaterThanOrEqual(SAFE_MARGIN);
        expect(shape.x).toBeLessThanOrEqual(POSTER_WIDTH - SAFE_MARGIN);
        expect(shape.y).toBeGreaterThanOrEqual(SAFE_MARGIN);
        expect(shape.y).toBeLessThanOrEqual(POSTER_HEIGHT - SAFE_MARGIN);
      }
    }
  });
});

describe("hierarchy", () => {
  const heroOf = (slug: string) => generatePoster(cocktailInput(slug)).summary.hero?.ingredientName;
  const roleOf = (slug: string, name: string) => {
    const input = cocktailInput(slug);
    const index = input.ingredients.findIndex((ingredient) => ingredient.name === name);
    return planIngredients(input).plans[index].role;
  };

  it("takes the hero from the strongest ingredient family", () => {
    expect(heroOf("pho-sai-gon")).toBe("lemongrass"); // three herbs outweigh beef
    expect(heroOf("anh-yeu-em")).toBe("rose"); // rose and butterfly pea outweigh lychee
    expect(heroOf("ca-phe-muoi")).toBe("Vietnamese arabica & robusta coffee");
    expect(heroOf("canh-chua")).toBe("tamarind");
  });

  it("never makes a spirit or a signature ingredient the hero", () => {
    expect(roleOf("anh-yeu-em", "butterfly pea")).not.toBe("hero");
    expect(roleOf("canh-chua", "CO₂")).toBe("detail");
    for (const input of cocktailInputs) {
      const spec = generatePoster(input);
      const hero = input.ingredients.find((i) => i.id === spec.summary.hero?.ingredientId);
      expect(hero?.category).not.toBe("base spirit");
    }
  });

  it("follows the hero with the rest of its family, then the next strongest", () => {
    expect(roleOf("pho-sai-gon", "ginger")).toBe("secondary");
    expect(roleOf("ca-phe-muoi", "cacao")).toBe("secondary");
    expect(roleOf("anh-yeu-em", "lychee")).toBe("secondary");
    expect(roleOf("anh-yeu-em", "lime")).toBe("detail");
  });

  it("has one hero, one secondary form and one or two supporting forms", () => {
    for (const input of cocktailInputs) {
      const roles = planIngredients(input).plans.map((plan) => plan.role);
      expect(roles.filter((role) => role === "hero")).toHaveLength(1);
      expect(roles.filter((role) => role === "secondary")).toHaveLength(1);
      const support = roles.filter((role) => role === "support").length;
      expect(support).toBeGreaterThanOrEqual(1);
      expect(support).toBeLessThanOrEqual(2);
    }
  });

  it("breaks family ties in favor of the strongest single ingredient", () => {
    const sour = withFlavor(cocktailInput("anh-yeu-em"), { sweet: 0, sour: 10, bitter: 0, umami: 0, herbal: 0, spicy: 0 });
    expect(generatePoster(sour).summary.hero?.ingredientName).toBe("lime");
  });

  it.each(cocktailInputs.map((input) => [input.slug, input] as const))(
    "%s: no other ingredient outweighs the hero",
    (_slug, input) => {
      const spec = generatePoster(input);
      const weights = weightByIngredient(spec);
      const heroId = spec.summary.hero!.ingredientId;
      for (const [id, weight] of weights) {
        if (id !== heroId) expect(weights.get(heroId)!).toBeGreaterThan(weight);
      }
    },
  );

  it("lets the hero crop off an edge", () => {
    for (const input of cocktailInputs) {
      const spec = generatePoster(input);
      const crops = shapesOf(spec, spec.summary.hero!.ingredientId).some((shape) => {
        const b = bounds(shape);
        return b.left < 0 || b.right > POSTER_WIDTH || b.top < 0 || b.bottom >= POSTER_HEIGHT;
      });
      expect(crops).toBe(true);
    }
  });

  it("centers the hero and crops it off the top in calm layouts", () => {
    const calm = withFlavor(cocktailInput("canh-chua"), { sweet: 4, sour: 6, bitter: 4, umami: 4, herbal: 4, spicy: 4 });
    const spec = generatePoster(calm);
    expect(spec.summary.tension).toBeLessThan(0.35);
    const [hero] = shapesOf(spec, spec.summary.hero!.ingredientId);
    expect(Math.abs(hero.x - POSTER_WIDTH / 2)).toBeLessThanOrEqual(20);
    expect(hero.y - hero.height / 2).toBeLessThan(0);
  });
});

describe("mapping rules", () => {
  const base = cocktailInput("anh-yeu-em");

  it("scores a balanced profile calmer than a dominant one", () => {
    const balanced = analyzeFlavor({ sweet: 5, sour: 5, bitter: 5, umami: 5, herbal: 5, spicy: 5 });
    const dominant = analyzeFlavor({ sweet: 10, sour: 1, bitter: 1, umami: 1, herbal: 1, spicy: 1 });
    expect(balanced.tension).toBe(0);
    expect(dominant.tension).toBeGreaterThan(0.8);
    expect(dominant.dominantFlavor).toBe("sweet");
  });

  it("tilts shapes more as tension rises", () => {
    const maxTilt = (spec: PosterSpec) =>
      Math.max(...spec.shapes.filter((s) => s.type === "band").map((s) => Math.abs(s.rotation)));
    const calm = generatePoster(withFlavor(base, { sweet: 5, sour: 5, bitter: 5, umami: 5, herbal: 5, spicy: 5 }));
    const tense = generatePoster(withFlavor(base, { sweet: 10, sour: 0, bitter: 0, umami: 0, herbal: 0, spicy: 0 }));
    expect(maxTilt(calm)).toBeLessThanOrEqual(3);
    expect(maxTilt(tense)).toBeGreaterThan(maxTilt(calm));
  });

  it("leads with the hero's color, following the flavor emphasis", () => {
    const sour = generatePoster(withFlavor(base, { sweet: 0, sour: 10, bitter: 0, umami: 0, herbal: 0, spicy: 0 }));
    expect(sour.summary.leadColors[0].category).toBe("sour");
    const sweet = generatePoster(withFlavor(base, { sweet: 10, sour: 0, bitter: 0, umami: 0, herbal: 0, spicy: 0 }));
    expect(sweet.summary.leadColors[0].category).toBe("fruit");
    for (const input of cocktailInputs) {
      const spec = generatePoster(input);
      expect(spec.summary.leadColors[0].ingredientId).toBe(spec.summary.hero?.ingredientId);
    }
  });

  it("never lets a base spirit lead or dominate", () => {
    for (const input of cocktailInputs) {
      const spec = generatePoster(input);
      expect(spec.summary.leadColors.every((c) => c.category !== "base spirit")).toBe(true);
      for (const band of spec.shapes.filter((s) => s.layer === "spirit")) {
        expect(band.opacity).toBeLessThanOrEqual(0.12);
      }
    }
  });

  it("raises the umami horizon with the umami score", () => {
    const groundHeight = (umami: number) => {
      const spec = generatePoster(withFlavor(base, { ...base.flavor, umami }));
      const ground = spec.shapes.filter((s) => s.type === "horizon" && !s.ingredientId);
      return Math.max(0, ...ground.map((s) => s.height));
    };
    expect(groundHeight(0)).toBe(0);
    expect(groundHeight(8)).toBeGreaterThan(groundHeight(3));
  });

  it("anchors every ground form to the bottom edge across the full width", () => {
    for (const input of cocktailInputs) {
      for (const shape of generatePoster(input).shapes.filter((s) => s.layer === "ground")) {
        expect(shape.type).toBe("horizon");
        expect(shape.width).toBe(POSTER_WIDTH);
        expect(shape.y + shape.height / 2).toBe(POSTER_HEIGHT);
      }
    }
  });

  it("caps herb leaves and varies their size", () => {
    for (const input of cocktailInputs) {
      const leaves = generatePoster(input).shapes.filter((s) => s.type === "leaf");
      expect(leaves.length).toBeLessThanOrEqual(MAX_LEAVES);
    }
    const pho = generatePoster(cocktailInput("pho-sai-gon")).shapes.filter((s) => s.type === "leaf");
    expect(pho.length).toBeGreaterThanOrEqual(10);
    const lengths = pho.map((s) => s.width);
    expect(Math.max(...lengths) / Math.min(...lengths)).toBeGreaterThan(1.8);
  });

  it("lets hero herbs rise into the upper half of the poster", () => {
    const spec = generatePoster(cocktailInput("pho-sai-gon"));
    const hero = shapesOf(spec, spec.summary.hero!.ingredientId);
    expect(hero.every((s) => s.type === "leaf")).toBe(true);
    expect(Math.min(...hero.map((s) => bounds(s).top))).toBeLessThan(POSTER_HEIGHT / 2);
  });

  it("groups fewer, larger spice marks loosely", () => {
    for (const input of cocktailInputs) {
      const spec = generatePoster(input);
      const byIngredient = Map.groupBy(
        spec.shapes.filter((s) => s.layer === "spice"),
        (s) => s.ingredientId,
      );
      for (const marks of byIngredient.values()) {
        expect(marks.length).toBeLessThanOrEqual(30);
        for (const mark of marks) {
          expect(Math.max(mark.width, mark.height)).toBeGreaterThanOrEqual(5);
          const neighbors = marks.filter((m) => m !== mark && Math.hypot(m.x - mark.x, m.y - mark.y) < 120);
          expect(neighbors.length).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it("adds rising bubbles only for CO₂", () => {
    for (const input of cocktailInputs) {
      const hasCo2 = input.ingredients.some((i) => i.name === "CO₂");
      const bubbles = generatePoster(input).shapes.filter((s) => s.type === "bubble");
      expect(bubbles.length > 0).toBe(hasCo2);
      for (const bubble of bubbles) expect(bubble.animation?.kind).toBe("rise");
    }
  });

  it("never lets a rising bubble drift past the frame", () => {
    for (const input of cocktailInputs) {
      for (const bubble of generatePoster(input).shapes.filter((s) => s.type === "bubble")) {
        if (bubble.animation?.kind !== "rise") throw new Error("expected a rise hint");
        expect(bubble.y - bubble.animation.distance).toBeGreaterThanOrEqual(SAFE_MARGIN);
      }
    }
  });

  it("shifts butterfly pea toward pink as sour rises", () => {
    const pinkness = (sour: number) => {
      const spec = generatePoster(withFlavor(base, { ...base.flavor, sour }));
      const petal = spec.shapes.find((s) => s.type === "petal" && s.animation?.kind === "colorShift");
      if (!petal || typeof petal.fill === "string") throw new Error("expected a gradient petal");
      return petal.fill.to;
    };
    expect(pinkness(0)).toBe("#3C4FB4");
    expect(pinkness(10)).not.toBe(pinkness(4));
  });

  it("keeps a wine wash faint and angled so it never reads as a spotlight", () => {
    const wine = shapesOf(generatePoster(base), "sauvignon blanc");
    expect(wine.length).toBeGreaterThan(0);
    for (const shape of wine) {
      expect(shape.opacity).toBeLessThanOrEqual(0.08);
      expect(Math.abs(shape.rotation)).toBeGreaterThanOrEqual(14);
    }
  });

  it("never draws a thin opaque bar across the poster", () => {
    for (const input of cocktailInputs) {
      for (const shape of generatePoster(input).shapes) {
        const isBar = (shape.type === "band" || shape.type === "softBand") && shape.width >= POSTER_WIDTH;
        if (isBar && !BACKGROUND_LAYERS.has(shape.layer)) expect(shape.height).toBeGreaterThanOrEqual(50);
      }
    }
  });

  it("keeps the lime in Anh Yêu Em smaller than its rose and lychee", () => {
    const spec = generatePoster(base);
    const weights = weightByIngredient(spec);
    expect(weights.get("lime")!).toBeLessThan(weights.get("lychee")!);
    expect(weights.get("lime")!).toBeLessThan(weights.get("rose")!);
    expect(weights.get("lychee")!).toBeLessThan(weights.get("rose")!);
  });
});

describe("layered drink (bitter hero)", () => {
  const spec = generatePoster(cocktailInput("ca-phe-muoi"));
  const body = spec.shapes.find((s) => s.layer === "drink")!;
  const bodyTop = POSTER_HEIGHT - body.height;

  it("fills the lower half to two-thirds with an opaque coffee body", () => {
    expect(body.type).toBe("layer");
    expect(body.ingredientId).toBe("Vietnamese arabica & robusta coffee");
    expect(body.opacity).toBe(1);
    expect(body.width).toBe(POSTER_WIDTH);
    expect(body.y + body.height / 2).toBe(POSTER_HEIGHT);
    expect(body.height).toBeGreaterThanOrEqual(POSTER_HEIGHT / 2);
    expect(body.height).toBeLessThanOrEqual((POSTER_HEIGHT * 2) / 3);
  });

  it("rests a crisp, pale foam layer on top of the body", () => {
    const [foam] = shapesOf(spec, "salted cream foam");
    expect(foam.layer).toBe("drinkFoam");
    expect(foam.opacity).toBe(1);
    const thickness = foam.height - body.height;
    expect(thickness).toBeGreaterThanOrEqual(38);
    expect(thickness).toBeLessThanOrEqual(56);
    expect(toHsl(foam.fill as string).l).toBeGreaterThan(0.85);
  });

  it("swirls cacao through the coffee as a darker ribbon", () => {
    const [cacao] = shapesOf(spec, "cacao");
    expect(cacao.type).toBe("ribbon");
    expect(cacao.layer).toBe("drinkAccent");
    expect(cacao.y).toBeGreaterThan(bodyTop);
    expect(cacao.y).toBeLessThan(POSTER_HEIGHT);
    expect(cacao.ribbon!.wave.amplitude).toBeGreaterThan(0);
    expect(cacao.ribbon!.thickness[1]).toBeGreaterThan(cacao.ribbon!.thickness[0]);
    expect(toHsl(cacao.fill as string).l).toBeLessThan(toHsl(body.fill as string).l);
  });

  it("gives the layers organic edges: wavy foam, a meniscus and an irregular depth", () => {
    const [foam] = shapesOf(spec, "salted cream foam");
    expect(foam.surface!.waves.length).toBeGreaterThanOrEqual(2);
    expect(foam.surface!.waves.every((w) => w.amplitude > 0)).toBe(true);
    expect(body.surface!.meniscus).toBeGreaterThan(0);
    const depth = shapesOf(spec, body.ingredientId!).find((s) => s.layer === "drinkAccent")!;
    expect(depth.surface!.waves.length).toBeGreaterThanOrEqual(3);
    expect(depth.height).toBeLessThan(body.height);
  });

  it("tilts every drink layer together, more as tension rises", () => {
    const layers = spec.shapes.filter((s) => s.type === "layer");
    const tilts = new Set(layers.map((s) => s.surface!.tilt));
    expect(tilts.size).toBe(1);
    const tilt = Math.abs([...tilts][0]);
    expect(tilt).toBeGreaterThan(0);
    const tense = generatePoster(
      withFlavor(cocktailInput("ca-phe-muoi"), { sweet: 1, sour: 0, bitter: 10, umami: 0, herbal: 0, spicy: 0 }),
    );
    const tenseTilt = Math.abs(tense.shapes.find((s) => s.layer === "drink")!.surface!.tilt);
    expect(tenseTilt).toBeGreaterThan(tilt);
  });

  it("has no bands crossing the drink", () => {
    expect(spec.shapes.filter((s) => s.layer === "sweet")).toHaveLength(0);
    for (const shape of spec.shapes.filter((s) => s.type === "softBand")) {
      expect(shape.rotation).toBe(0);
    }
  });

  it("uses a crisp foam band near the top when there's no drink", () => {
    const noDrink = generatePoster(
      withFlavor(cocktailInput("ca-phe-muoi"), { sweet: 8, sour: 1, bitter: 0, umami: 2, herbal: 1, spicy: 3 }),
    );
    expect(noDrink.shapes.some((s) => s.layer === "drink")).toBe(false);
    const [foam] = shapesOf(noDrink, "salted cream foam");
    expect(foam.type).toBe("softBand");
    expect(foam.y).toBeLessThan(POSTER_HEIGHT / 4);
    expect(foam.opacity).toBeGreaterThanOrEqual(MIN_FOREGROUND_OPACITY);
  });
});
