import type { MigrationFunction } from "contentful-migration";

const migrate: MigrationFunction = (migration) => {
  const region = migration
    .createContentType("region")
    .name("Region")
    .displayField("name");

  region
    .createField("name")
    .name("Name")
    .type("Symbol")
    .required(true)
    .localized(true);

  region
    .createField("area")
    .name("Area")
    .type("Symbol")
    .required(true)
    .validations([{ in: ["North", "Central", "South"] }]);

  region.changeFieldControl("area", "builtin", "dropdown");
};

export default migrate;
