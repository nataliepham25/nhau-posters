import type { ColorName, ColorShade, PosterComposition } from "./poster/describe";
import type { Form } from "./poster/types";
import type { Area, Locale } from "./types";

// UI strings. Vietnamese values marked TODO fall back to English at runtime,
// matching how Contentful content falls back.

const TODO = "TODO";

const en = {
  siteTitle: "NHẬU",
  siteDescription: "Vietnamese cocktails from NHAU, each with its own flavor poster.",
  cocktailsHeading: "Cocktails",
  introLabel: "Vietnamese cocktails by NHẬU",
  introHeading: "Flavor, given shape",
  introBody:
    "Each cocktail begins with a place and a dish we grew up with. Its poster is drawn from its flavor (how sweet, sour, bitter, savory, herbal, and spicy it is), so no two look alike.",
  skipToContent: "Skip to content",
  footerCredit: "Cocktails and stories by NHẬU",
  footerPosters: "Posters are generated from each drink's flavor.",
  allCocktails: "All cocktails",
  region: "Region",
  ingredients: "Ingredients",
  inspiredBy: "Inspired by",
  languageSwitcherLabel: "Language",
  notFoundHeading: "Page not found",
  notFoundBody: "We couldn't find the page you were looking for.",
  areas: {
    North: "Northern Vietnam",
    Central: "Central Vietnam",
    South: "Southern Vietnam",
  } satisfies Record<Area, string>,
  // Poster alt text. {placeholders} are filled in by lib/poster/describe.ts.
  poster: {
    // Locale used to join lists ("a, b, and c"). Set to "vi" once the Vietnamese
    // poster strings are translated, so the joining words match the sentences.
    listLocale: "en-US",
    leadSentence: "Abstract poster on a deep teal background, led by {colors}.",
    colorOf: "the {color} of {ingredients}",
    shadedColor: "{shade} {color}",
    formsSentence: "It features {forms}.",
    composition: {
      calm: "The composition is calm and nearly symmetrical.",
      offCenter: "The composition is gently off-center.",
      tense: "The composition is asymmetrical and full of tension.",
    } satisfies Record<PosterComposition, string>,
    shades: {
      pale: "pale",
      deep: "deep",
    } satisfies Record<ColorShade, string>,
    colors: {
      cream: "cream",
      white: "white",
      gray: "gray",
      charcoal: "charcoal",
      brown: "brown",
      red: "red",
      orange: "orange",
      gold: "gold",
      yellow: "yellow",
      yellowGreen: "yellow-green",
      green: "green",
      teal: "teal",
      blue: "blue",
      purple: "purple",
      magenta: "magenta",
      pink: "pink",
    } satisfies Record<ColorName, string>,
    forms: {
      spiritBands: "faint wide bands",
      bitterWashes: "deep, dense washes of color",
      drinkBody: "a deep, layered body of color filling the lower part",
      creamLayer: "a thin cream layer at the base",
      wineWash: "a tall translucent wash",
      heavyBase: "a dark, gently curved horizon",
      circles: "bold circles",
      softBands: "soft layered bands",
      clusters: "clusters of rounded forms",
      petals: "petal shapes",
      colorShiftPetals: "petals shifting from blue to pink",
      leaves: "leaf-like curves",
      marks: "small scattered marks",
      foam: "a crisp pale layer of foam",
      bubbles: "small rising bubbles",
    } satisfies Record<Form, string>,
  },
};

export type Dictionary = typeof en;

const vi: Dictionary = {
  siteTitle: "NHẬU",
  siteDescription: TODO,
  cocktailsHeading: TODO,
  introLabel: "Cocktail Việt của NHẬU",
  introHeading: "Hương vị thành hình",
  introBody:
    "Mỗi ly cocktail bắt đầu từ một vùng đất và một món ăn đã gắn bó với chúng tôi từ nhỏ. Tấm poster của mỗi ly được vẽ từ chính hương vị của nó (ngọt, chua, đắng, đậm đà, thơm mùi thảo mộc và cay đến đâu), nên không có hai tấm nào giống nhau.",
  skipToContent: "Chuyển đến nội dung chính",
  footerCredit: "Cocktail và câu chuyện của NHẬU",
  footerPosters: "Mỗi tấm poster được tạo từ hương vị của từng ly.",
  allCocktails: TODO,
  region: TODO,
  ingredients: TODO,
  inspiredBy: TODO,
  languageSwitcherLabel: TODO,
  notFoundHeading: TODO,
  notFoundBody: TODO,
  areas: {
    North: TODO,
    Central: TODO,
    South: TODO,
  },
  poster: {
    listLocale: TODO,
    leadSentence: TODO,
    colorOf: TODO,
    shadedColor: TODO,
    formsSentence: TODO,
    composition: { calm: TODO, offCenter: TODO, tense: TODO },
    shades: { pale: TODO, deep: TODO },
    colors: {
      cream: TODO,
      white: TODO,
      gray: TODO,
      charcoal: TODO,
      brown: TODO,
      red: TODO,
      orange: TODO,
      gold: TODO,
      yellow: TODO,
      yellowGreen: TODO,
      green: TODO,
      teal: TODO,
      blue: TODO,
      purple: TODO,
      magenta: TODO,
      pink: TODO,
    },
    forms: {
      spiritBands: TODO,
      bitterWashes: TODO,
      drinkBody: TODO,
      creamLayer: TODO,
      wineWash: TODO,
      heavyBase: TODO,
      circles: TODO,
      softBands: TODO,
      clusters: TODO,
      petals: TODO,
      colorShiftPetals: TODO,
      leaves: TODO,
      marks: TODO,
      foam: TODO,
      bubbles: TODO,
    },
  },
};

function withFallback<T>(value: T, fallback: T): T {
  if (typeof value === "string") return (value === TODO ? fallback : value) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        withFallback(item, (fallback as Record<string, unknown>)[key]),
      ]),
    ) as T;
  }
  return value;
}

const dictionaries: Record<Locale, Dictionary> = {
  "en-US": en,
  vi: withFallback(vi, en),
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
