// Builds alt text for a poster from its PosterSpec. Wording comes from the
// dictionary so it can be translated; this file only decides what to say.

import type { Dictionary } from "@/lib/dictionaries";
import { toHsl } from "./color";
import type { Form, PosterSpec } from "./types";

export type ColorName =
  | "cream"
  | "white"
  | "gray"
  | "charcoal"
  | "brown"
  | "red"
  | "orange"
  | "gold"
  | "yellow"
  | "yellowGreen"
  | "green"
  | "teal"
  | "blue"
  | "purple"
  | "magenta"
  | "pink";

export type ColorShade = "pale" | "deep";

export type PosterComposition = "calm" | "offCenter" | "tense";

/** Distinctive details are always mentioned, after the main forms. */
const SIGNATURE_FORMS: ReadonlySet<Form> = new Set(["foam", "bubbles", "colorShiftPetals"]);
const MAIN_FORM_COUNT = 3;
const LEAD_COLOR_GROUPS = 3;

/** A coarse, human name for a hex color. */
export function nameColor(hex: string): { color: ColorName; shade?: ColorShade } {
  const { h, s, l } = toHsl(hex);

  if (l > 0.82 && s < 0.6) return { color: h >= 20 && h <= 70 ? "cream" : "white" };
  if (s < 0.15) {
    if (l < 0.2) return { color: "charcoal" };
    return { color: "gray" };
  }

  const shade: ColorShade | undefined = l < 0.33 ? "deep" : l > 0.75 ? "pale" : undefined;
  const named = (color: ColorName) => (shade ? { color, shade } : { color });

  if (h >= 15 && h < 50 && l < 0.4) return { color: "brown", shade: l < 0.25 ? "deep" : undefined };
  if (h < 12 || h >= 345) return named(l > 0.7 ? "pink" : "red");
  if (h < 38) return named("orange");
  if (h < 50) return named("gold");
  if (h < 65) return named("yellow");
  if (h < 90) return named("yellowGreen");
  if (h < 160) return named("green");
  if (h < 200) return named("teal");
  if (h < 255) return named("blue");
  if (h < 300) return named("purple");
  return named(l > 0.7 ? "pink" : "magenta");
}

export function compositionOf(tension: number): PosterComposition {
  if (tension < 0.3) return "calm";
  if (tension < 0.5) return "offCenter";
  return "tense";
}

/**
 * @param ingredientNames Localized names by ingredient ID. Posters are generated
 *   from English data, so this lets the alt text use the page's language.
 */
export function describePoster(
  spec: PosterSpec,
  strings: Dictionary["poster"],
  ingredientNames?: ReadonlyMap<string, string>,
): string {
  // Join lists in the dictionary's language, not the page's, so untranslated
  // English sentences don't get Vietnamese joining words.
  const list = (items: string[]) =>
    new Intl.ListFormat(strings.listLocale, { style: "long", type: "conjunction" }).format(items);

  // Group lead ingredients that share a color name: "the deep brown of coffee and cacao".
  const groups = new Map<string, string[]>();
  for (const lead of spec.summary.leadColors) {
    const { color, shade } = nameColor(lead.color);
    const colorText = shade
      ? format(strings.shadedColor, { shade: strings.shades[shade], color: strings.colors[color] })
      : strings.colors[color];
    const name = ingredientNames?.get(lead.ingredientId) ?? lead.ingredientName;
    groups.set(colorText, [...(groups.get(colorText) ?? []), name]);
  }
  const colors = [...groups]
    .slice(0, LEAD_COLOR_GROUPS)
    .map(([color, ingredients]) => format(strings.colorOf, { color, ingredients: list(ingredients) }));

  const forms = spec.summary.forms;
  let main = forms.filter((form) => !SIGNATURE_FORMS.has(form) && form !== "spiritBands");
  if (main.length === 0) main = forms.filter((form) => form === "spiritBands");
  const mentioned = [
    ...main.slice(0, MAIN_FORM_COUNT),
    ...forms.filter((form) => SIGNATURE_FORMS.has(form)),
  ].map((form) => strings.forms[form]);

  const sentences = [];
  if (colors.length > 0) sentences.push(format(strings.leadSentence, { colors: list(colors) }));
  if (mentioned.length > 0) sentences.push(format(strings.formsSentence, { forms: list(mentioned) }));
  sentences.push(strings.composition[compositionOf(spec.summary.tension)]);
  return sentences.join(" ");
}

function format(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}
