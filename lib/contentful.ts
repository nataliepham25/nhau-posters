import "server-only";

import {
  createClient,
  type Asset,
  type ContentfulClientApi,
  type Entry,
  type EntryFieldTypes,
  type EntrySkeletonType,
} from "contentful";
import { cacheLife, cacheTag } from "next/cache";
import type {
  Area,
  Cocktail,
  Ingredient,
  IngredientCategory,
  Locale,
  Photo,
  Region,
} from "./types";

// Contentful shapes, matching the field IDs in /migrations. Kept private to
// this file: everything exported returns the clean types from ./types.

type RegionSkeleton = EntrySkeletonType<
  {
    name: EntryFieldTypes.Symbol;
    area: EntryFieldTypes.Symbol<Area>;
  },
  "region"
>;

type IngredientSkeleton = EntrySkeletonType<
  {
    name: EntryFieldTypes.Symbol;
    category: EntryFieldTypes.Symbol<IngredientCategory>;
    colorHint?: EntryFieldTypes.Symbol;
  },
  "ingredient"
>;

type CocktailSkeleton = EntrySkeletonType<
  {
    name: EntryFieldTypes.Symbol;
    slug: EntryFieldTypes.Symbol;
    subtitle: EntryFieldTypes.Symbol;
    story: EntryFieldTypes.Text;
    inspiredBy: EntryFieldTypes.Symbol;
    region?: EntryFieldTypes.EntryLink<RegionSkeleton>;
    ingredients?: EntryFieldTypes.Array<EntryFieldTypes.EntryLink<IngredientSkeleton>>;
    sweet: EntryFieldTypes.Integer;
    sour: EntryFieldTypes.Integer;
    bitter: EntryFieldTypes.Integer;
    umami: EntryFieldTypes.Integer;
    herbal: EntryFieldTypes.Integer;
    spicy: EntryFieldTypes.Integer;
    photo?: EntryFieldTypes.AssetLink;
  },
  "cocktail"
>;

type Modifiers = "WITHOUT_UNRESOLVABLE_LINKS";
type ResolvedEntry<S extends EntrySkeletonType> = Entry<S, Modifiers, Locale>;

// Created lazily so `next build` can load this module without credentials.
let client: ContentfulClientApi<Modifiers> | undefined;

function getClient() {
  if (client) return client;

  const space = process.env.CONTENTFUL_SPACE_ID;
  const accessToken = process.env.CONTENTFUL_DELIVERY_TOKEN;
  if (!space || !accessToken) {
    throw new Error("Missing CONTENTFUL_SPACE_ID or CONTENTFUL_DELIVERY_TOKEN");
  }

  // Unresolvable links (for example, unpublished ingredients) are dropped
  // instead of showing up as raw link objects.
  client = createClient({
    space,
    accessToken,
    environment: process.env.CONTENTFUL_ENVIRONMENT ?? "master",
  }).withoutUnresolvableLinks;
  return client;
}

function toRegion(entry: ResolvedEntry<RegionSkeleton>): Region {
  return {
    id: entry.sys.id,
    name: entry.fields.name,
    area: entry.fields.area,
  };
}

function toIngredient(entry: ResolvedEntry<IngredientSkeleton>): Ingredient {
  return {
    id: entry.sys.id,
    name: entry.fields.name,
    category: entry.fields.category,
    colorHint: entry.fields.colorHint ?? null,
  };
}

function toPhoto(asset: Asset<Modifiers, Locale> | undefined, fallbackAlt: string): Photo | null {
  const file = asset?.fields.file;
  if (!asset || !file?.url) return null;
  return {
    // Contentful returns protocol-relative URLs ("//images.ctfassets.net/...").
    url: file.url.startsWith("//") ? `https:${file.url}` : file.url,
    width: file.details.image?.width ?? null,
    height: file.details.image?.height ?? null,
    alt: asset.fields.description || asset.fields.title || fallbackAlt,
  };
}

function toCocktail(entry: ResolvedEntry<CocktailSkeleton>): Cocktail {
  const { fields } = entry;
  return {
    id: entry.sys.id,
    name: fields.name,
    slug: fields.slug,
    subtitle: fields.subtitle,
    story: fields.story,
    inspiredBy: fields.inspiredBy,
    region: fields.region ? toRegion(fields.region) : null,
    ingredients: (fields.ingredients ?? [])
      .filter((ingredient) => ingredient !== undefined)
      .map(toIngredient),
    flavor: {
      sweet: fields.sweet,
      sour: fields.sour,
      bitter: fields.bitter,
      umami: fields.umami,
      herbal: fields.herbal,
      spicy: fields.spicy,
    },
    photo: toPhoto(fields.photo, fields.name),
  };
}

/** All published cocktails, alphabetical by name, with region and ingredients resolved. */
export async function getCocktails(locale: Locale): Promise<Cocktail[]> {
  "use cache";
  cacheTag("contentful");
  cacheLife("hours");

  const { items } = await getClient().getEntries<CocktailSkeleton, Locale>({
    content_type: "cocktail",
    locale,
    include: 2,
    order: ["fields.name"],
    limit: 1000,
  });
  return items.map(toCocktail);
}

/** One published cocktail by slug, or null if none matches. */
export async function getCocktailBySlug(slug: string, locale: Locale): Promise<Cocktail | null> {
  "use cache";
  cacheTag("contentful");
  cacheLife("hours");

  const { items } = await getClient().getEntries<CocktailSkeleton, Locale>({
    content_type: "cocktail",
    "fields.slug": slug,
    locale,
    include: 2,
    limit: 1,
  });
  return items[0] ? toCocktail(items[0]) : null;
}
