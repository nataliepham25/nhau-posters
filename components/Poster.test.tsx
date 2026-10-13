import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { cocktailInputs } from "@/lib/poster/fixtures";
import { generatePoster } from "@/lib/poster/generate";
import { Poster } from "./Poster";

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
});
