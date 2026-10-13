import type { MigrationFunction } from "contentful-migration";

const FLAVORS = [
  ["sweet", "Sweet"],
  ["sour", "Sour"],
  ["bitter", "Bitter"],
  ["umami", "Umami"],
  ["herbal", "Herbal"],
  ["spicy", "Spicy"],
] as const;

const migrate: MigrationFunction = (migration) => {
  const cocktail = migration
    .createContentType("cocktail")
    .name("Cocktail")
    .displayField("name");

  // The Vietnamese name is the drink's name in every language.
  cocktail
    .createField("name")
    .name("Name")
    .type("Symbol")
    .required(true)
    .localized(false);

  cocktail
    .createField("slug")
    .name("Slug")
    .type("Symbol")
    .required(true)
    .localized(false)
    .validations([{ unique: true }]);

  cocktail.changeFieldControl("slug", "builtin", "slugEditor");

  cocktail
    .createField("subtitle")
    .name("Subtitle")
    .type("Symbol")
    .required(true)
    .localized(true);

  cocktail
    .createField("story")
    .name("Story")
    .type("Text")
    .required(true)
    .localized(true);

  cocktail
    .createField("inspiredBy")
    .name("Inspired by")
    .type("Symbol")
    .required(true)
    .localized(true);

  cocktail
    .createField("region")
    .name("Region")
    .type("Link")
    .linkType("Entry")
    .validations([{ linkContentType: ["region"] }]);

  // Array order is preserved, so editors control ingredient order.
  cocktail
    .createField("ingredients")
    .name("Ingredients")
    .type("Array")
    .items({
      type: "Link",
      linkType: "Entry",
      validations: [{ linkContentType: ["ingredient"] }],
    });

  for (const [id, name] of FLAVORS) {
    cocktail
      .createField(id)
      .name(name)
      .type("Integer")
      .required(true)
      .validations([{ range: { min: 0, max: 10 } }]);
  }

  cocktail
    .createField("photo")
    .name("Photo")
    .type("Link")
    .linkType("Asset")
    .required(false)
    .validations([{ linkMimetypeGroup: ["image"] }]);
};

export default migrate;
