import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/dictionaries";
import { describePoster, nameColor } from "./describe";
import { cocktailInput, cocktailInputs } from "./fixtures";
import { generatePoster } from "./generate";

const strings = getDictionary("en-US").poster;

describe("nameColor", () => {
  it.each([
    ["#4A2C1D", "brown", "deep"], // coffee
    ["#F3E9D2", "cream", undefined], // condensed milk
    ["#D9432B", "red", undefined], // tomato
    ["#3C4FB4", "blue", undefined], // butterfly pea
    ["#F4C6C8", "pink", "pale"], // lychee
    ["#9BC53D", "yellowGreen", undefined], // lime
  ])("names %s as %s", (hex, color, shade) => {
    expect(nameColor(hex)).toEqual(shade ? { color, shade } : { color });
  });
});

describe("describePoster", () => {
  it("mentions the dominant colors and their ingredients", () => {
    const text = describePoster(generatePoster(cocktailInput("ca-phe-muoi")), strings);
    expect(text).toContain("the deep brown of Vietnamese arabica & robusta coffee and cacao");
    expect(text).toContain("a deep, layered body of color filling the lower part");
    expect(text).toContain("a crisp pale layer of foam");
  });

  it("always mentions signature details", () => {
    expect(describePoster(generatePoster(cocktailInput("canh-chua")), strings)).toContain(
      "small rising bubbles",
    );
    expect(describePoster(generatePoster(cocktailInput("anh-yeu-em")), strings)).toContain(
      "petals shifting from blue to pink",
    );
  });

  it("uses localized ingredient names when given", () => {
    const spec = generatePoster(cocktailInput("ca-phe-muoi"));
    const names = new Map([["cacao", "ca cao"]]);
    expect(describePoster(spec, strings, names)).toContain("ca cao");
  });

  it("is the same every time and different for each cocktail", () => {
    const texts = cocktailInputs.map((input) => describePoster(generatePoster(input), strings));
    expect(new Set(texts).size).toBe(cocktailInputs.length);
    expect(describePoster(generatePoster(cocktailInputs[0]), strings)).toBe(texts[0]);
  });

  it("joins lists in the dictionary's language while Vietnamese falls back to English", () => {
    const text = describePoster(generatePoster(cocktailInput("canh-chua")), getDictionary("vi").poster);
    expect(text).toContain(", and ");
    expect(text).not.toContain(" và ");
  });

  it("never leaves a placeholder unfilled", () => {
    for (const input of cocktailInputs) {
      expect(describePoster(generatePoster(input), strings)).not.toMatch(/[{}]/);
    }
  });
});
