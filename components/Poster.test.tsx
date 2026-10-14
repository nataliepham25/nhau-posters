import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { cocktailInputs, withFlavor } from "@/lib/poster/fixtures";
import { generatePoster } from "@/lib/poster/generate";
import { Poster, shapeKeys } from "./Poster";

describe("Poster", () => {
  it.each(cocktailInputs.map((input) => [input.slug, input] as const))(
    "%s draws the inset border last, above every shape and texture",
    (_slug, input) => {
      const markup = renderToStaticMarkup(<Poster spec={generatePoster(input)} />);
      const frame = markup.indexOf("data-frame");
      expect(frame).toBeGreaterThan(-1);
      expect(markup.slice(frame)).not.toMatch(/<(g|path|circle|ellipse)\b/);
      expect(markup.slice(frame).match(/<rect\b/g)).toBeNull();
    },
  );

  it("uses no blur filters", () => {
    for (const input of cocktailInputs) {
      expect(renderToStaticMarkup(<Poster spec={generatePoster(input)} />)).not.toContain("feGaussianBlur");
    }
  });

  it("adds motion only when live", () => {
    const spec = generatePoster(cocktailInputs.find((input) => input.ingredients.some((i) => i.name === "CO₂"))!);
    const still = renderToStaticMarkup(<Poster spec={spec} />);
    const live = renderToStaticMarkup(<Poster spec={spec} live />);
    expect(still).not.toMatch(/poster-(rise|sway|shift)/);
    expect(live).toContain("poster-rise");
  });

  it("keys each shape by its ingredient, uniquely, so React can transition it", () => {
    for (const input of cocktailInputs) {
      for (const sweet of [0, 5, 10]) {
        const shapes = generatePoster(withFlavor(input, { ...input.flavor, sweet })).shapes;
        const keys = shapeKeys(shapes);
        expect(new Set(keys).size).toBe(keys.length);
        keys.forEach((key, index) => expect(key.startsWith(`${shapes[index].ingredientId ?? shapes[index].layer}-`)).toBe(true));
      }
    }
  });
});

