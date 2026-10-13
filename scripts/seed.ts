import { readFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { createClient, type EntryProps } from "contentful-management";
import { describeError, loadContentfulEnv } from "./lib/contentful";

// Field IDs and content type IDs match the migrations in /migrations.

const DEFAULT_LOCALE = "en-US";
const TODO = "TODO";
const FLAVORS = ["sweet", "sour", "bitter", "umami", "herbal", "spicy"] as const;

type Localized = Record<string, string>;
type Flavor = (typeof FLAVORS)[number];

type SeedData = {
  regions: { name: Localized; area: string }[];
  ingredients: { name: Localized; category: string; colorHint?: string }[];
  cocktails: {
    name: string;
    slug: string;
    subtitle: Localized;
    story: Localized;
    inspiredBy: Localized;
    region: string; // en-US region name
    ingredients: string[]; // en-US ingredient names, in order
    flavor: Record<Flavor, number>;
  }[];
};

type Fields = EntryProps["fields"];

const { spaceId, environmentId, accessToken } = loadContentfulEnv();
const client = createClient({ accessToken }, { defaults: { spaceId, environmentId } });

// Names contain Vietnamese diacritics, which can be composed differently.
const key = (value: string) => value.normalize("NFC");

function localized(values: Localized) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== TODO));
}

function unlocalized<T>(value: T) {
  return { [DEFAULT_LOCALE]: value };
}

function link(id: string) {
  return { sys: { type: "Link", linkType: "Entry", id } };
}

function validate(data: SeedData) {
  const errors: string[] = [];
  const regionNames = new Set(data.regions.map((r) => key(r.name[DEFAULT_LOCALE])));
  const ingredientNames = new Set<string>();
  for (const ingredient of data.ingredients) {
    const name = key(ingredient.name[DEFAULT_LOCALE]);
    if (ingredientNames.has(name)) errors.push(`Duplicate ingredient: ${name}`);
    ingredientNames.add(name);
  }
  const slugs = new Set<string>();
  for (const cocktail of data.cocktails) {
    if (slugs.has(cocktail.slug)) errors.push(`Duplicate slug: ${cocktail.slug}`);
    slugs.add(cocktail.slug);
    if (!regionNames.has(key(cocktail.region))) {
      errors.push(`${cocktail.slug}: unknown region "${cocktail.region}"`);
    }
    for (const name of cocktail.ingredients) {
      if (!ingredientNames.has(key(name))) {
        errors.push(`${cocktail.slug}: unknown ingredient "${name}"`);
      }
    }
    for (const flavor of FLAVORS) {
      const value = cocktail.flavor[flavor];
      if (!Number.isInteger(value) || value < 0 || value > 10) {
        errors.push(`${cocktail.slug}: ${flavor} must be an integer from 0 to 10`);
      }
    }
  }
  return errors;
}

function localesUsed(data: SeedData) {
  const locales = new Set<string>();
  const add = (values: Localized) => Object.keys(values).forEach((l) => locales.add(l));
  data.regions.forEach((r) => add(r.name));
  data.ingredients.forEach((i) => add(i.name));
  data.cocktails.forEach((c) => [c.subtitle, c.story, c.inspiredBy].forEach(add));
  return locales;
}

// Required localized fields left as TODO can only be published if the locale
// allows empty fields, so check before writing anything.
async function checkLocales(data: SeedData) {
  const { items } = await client.locale.getMany({ query: {} });
  const defaultLocale = items.find((locale) => locale.default);
  if (defaultLocale?.code !== DEFAULT_LOCALE) {
    throw new Error(`Expected default locale ${DEFAULT_LOCALE}, found ${defaultLocale?.code}`);
  }
  for (const code of localesUsed(data)) {
    const locale = items.find((l) => l.code === code);
    if (!locale) {
      throw new Error(`Locale "${code}" is used in data/cocktails.json but not set up in Contentful`);
    }
    if (code !== DEFAULT_LOCALE && !locale.optional) {
      throw new Error(
        `Locale "${code}" does not allow empty fields, so entries with TODO values can't be published. ` +
          `Enable "Allow empty fields for this locale" in Contentful's locale settings.`,
      );
    }
  }
}

async function fetchAll(contentType: string) {
  const entries: EntryProps[] = [];
  for (let skip = 0; ; skip += 1000) {
    const page = await client.entry.getMany({
      query: { content_type: contentType, limit: 1000, skip },
    });
    entries.push(...page.items);
    if (entries.length >= page.total) return entries;
  }
}

function indexBy(entries: EntryProps[], fieldId: string, locale = DEFAULT_LOCALE) {
  const map = new Map<string, EntryProps>();
  for (const entry of entries) {
    const value = entry.fields[fieldId]?.[locale];
    if (typeof value !== "string") continue;
    if (map.has(key(value))) {
      console.warn(`  ! Multiple ${entry.sys.contentType.sys.id} entries match "${value}"; using the first`);
      continue;
    }
    map.set(key(value), entry);
  }
  return map;
}

function needsPublish(entry: EntryProps) {
  const { publishedVersion, version } = entry.sys;
  return !publishedVersion || version > publishedVersion + 1;
}

// Merges new values into existing ones per locale, so skipped TODO values and
// fields not in the JSON (such as photo) keep whatever is already in Contentful.
async function upsert(contentType: string, label: string, existing: EntryProps | undefined, fields: Fields) {
  let entry: EntryProps;
  let action: string;

  if (!existing) {
    entry = await client.entry.create({ contentTypeId: contentType }, { fields });
    action = "created";
  } else {
    if (existing.sys.archivedVersion) {
      throw new Error(`${contentType} "${label}" is archived; unarchive it in Contentful first`);
    }
    const merged: Fields = { ...existing.fields };
    for (const [fieldId, values] of Object.entries(fields)) {
      merged[fieldId] = { ...existing.fields[fieldId], ...values };
    }
    if (isDeepStrictEqual(merged, existing.fields)) {
      entry = existing;
      action = "unchanged";
    } else {
      entry = await client.entry.update({ entryId: existing.sys.id }, { ...existing, fields: merged });
      action = "updated";
    }
  }

  if (needsPublish(entry)) {
    entry = await client.entry.publish({ entryId: entry.sys.id }, entry);
    action += ", published";
  }
  console.log(`  ${contentType} "${label}": ${action}`);
  return entry;
}

async function main() {
  const dataPath = path.resolve("data/cocktails.json");
  const data = JSON.parse(await readFile(dataPath, "utf8")) as SeedData;

  const errors = validate(data);
  if (errors.length > 0) {
    console.error(`data/cocktails.json has problems:\n  ${errors.join("\n  ")}`);
    process.exit(1);
  }

  console.log(`Seeding space ${spaceId}, environment ${environmentId}`);
  await checkLocales(data);

  const regionIds = new Map<string, string>();
  const existingRegions = indexBy(await fetchAll("region"), "name");
  console.log("Regions");
  for (const region of data.regions) {
    const name = region.name[DEFAULT_LOCALE];
    const entry = await upsert("region", name, existingRegions.get(key(name)), {
      name: localized(region.name),
      area: unlocalized(region.area),
    });
    regionIds.set(key(name), entry.sys.id);
  }

  const ingredientIds = new Map<string, string>();
  const existingIngredients = indexBy(await fetchAll("ingredient"), "name");
  console.log("Ingredients");
  for (const ingredient of data.ingredients) {
    const name = ingredient.name[DEFAULT_LOCALE];
    const fields: Fields = {
      name: localized(ingredient.name),
      category: unlocalized(ingredient.category),
    };
    if (ingredient.colorHint) fields.colorHint = unlocalized(ingredient.colorHint);
    const entry = await upsert("ingredient", name, existingIngredients.get(key(name)), fields);
    ingredientIds.set(key(name), entry.sys.id);
  }

  const existingCocktails = indexBy(await fetchAll("cocktail"), "slug");
  console.log("Cocktails");
  for (const cocktail of data.cocktails) {
    const fields: Fields = {
      name: unlocalized(cocktail.name),
      slug: unlocalized(cocktail.slug),
      subtitle: localized(cocktail.subtitle),
      story: localized(cocktail.story),
      inspiredBy: localized(cocktail.inspiredBy),
      region: unlocalized(link(regionIds.get(key(cocktail.region))!)),
      ingredients: unlocalized(
        cocktail.ingredients.map((name) => link(ingredientIds.get(key(name))!)),
      ),
    };
    for (const flavor of FLAVORS) fields[flavor] = unlocalized(cocktail.flavor[flavor]);
    await upsert("cocktail", cocktail.slug, existingCocktails.get(key(cocktail.slug)), fields);
  }

  console.log("Done.");
}

main().catch((error: unknown) => {
  console.error(`Seed failed (${describeError(error)})`);
  process.exit(1);
});
