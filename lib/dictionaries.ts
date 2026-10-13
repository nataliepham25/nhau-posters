import type { Area, Locale } from "./types";

// UI strings. Vietnamese values marked TODO fall back to English at runtime,
// matching how Contentful content falls back.

const TODO = "TODO";

const en = {
  siteTitle: "NHAU",
  siteDescription: "Vietnamese cocktails from NHAU, each with its own flavor poster.",
  cocktailsHeading: "Cocktails",
  allCocktails: "All cocktails",
  region: "Region",
  ingredients: "Ingredients",
  inspiredBy: "Inspired by",
  posterPlaceholder: "Flavor poster coming soon",
  languageSwitcherLabel: "Language",
  notFoundHeading: "Page not found",
  notFoundBody: "We couldn't find the page you were looking for.",
  areas: {
    North: "Northern Vietnam",
    Central: "Central Vietnam",
    South: "Southern Vietnam",
  } satisfies Record<Area, string>,
};

export type Dictionary = typeof en;

const vi: Dictionary = {
  siteTitle: TODO,
  siteDescription: TODO,
  cocktailsHeading: TODO,
  allCocktails: TODO,
  region: TODO,
  ingredients: TODO,
  inspiredBy: TODO,
  posterPlaceholder: TODO,
  languageSwitcherLabel: TODO,
  notFoundHeading: TODO,
  notFoundBody: TODO,
  areas: {
    North: TODO,
    Central: TODO,
    South: TODO,
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
