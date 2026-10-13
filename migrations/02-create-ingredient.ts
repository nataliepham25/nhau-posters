import type { MigrationFunction } from "contentful-migration";

const CATEGORIES = [
  "base spirit",
  "wine",
  "savory",
  "sour",
  "sweet and creamy",
  "fruit",
  "herb and aromatic",
  "spice",
  "floral",
  "technique",
];

const migrate: MigrationFunction = (migration) => {
  const ingredient = migration
    .createContentType("ingredient")
    .name("Ingredient")
    .displayField("name");

  ingredient
    .createField("name")
    .name("Name")
    .type("Symbol")
    .required(true)
    .localized(true);

  ingredient
    .createField("category")
    .name("Category")
    .type("Symbol")
    .required(true)
    .validations([{ in: CATEGORIES }]);

  ingredient.changeFieldControl("category", "builtin", "dropdown");

  ingredient
    .createField("colorHint")
    .name("Color hint")
    .type("Symbol")
    .required(false)
    .validations([
      {
        regexp: { pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" },
        message: "Use a hex color like #A3C14B or #ABC.",
      },
    ]);
};

export default migrate;
