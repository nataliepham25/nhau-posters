import type { MigrationFunction } from "contentful-migration";

// Adds "bitter" (coffee, cacao) to the ingredient category dropdown.
// Contentful replaces the whole validation list, so every existing value is
// repeated here unchanged.
const CATEGORIES = [
  "base spirit",
  "wine",
  "savory",
  "sour",
  "sweet and creamy",
  "fruit",
  "herb and aromatic",
  "spice",
  "bitter",
  "floral",
  "technique",
];

const migrate: MigrationFunction = (migration) => {
  const ingredient = migration.editContentType("ingredient");

  ingredient.editField("category").validations([{ in: CATEGORIES }]);
};

export default migrate;
