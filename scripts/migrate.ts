import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { config } from "dotenv";
import { runMigration, type MigrationFunction } from "contentful-migration";

config({ path: path.resolve(".env.local"), quiet: true });

const spaceId = process.env.CONTENTFUL_SPACE_ID;
const environmentId = process.env.CONTENTFUL_ENVIRONMENT ?? "master";
const accessToken = process.env.CONTENTFUL_MANAGEMENT_TOKEN;

if (!spaceId || !accessToken) {
  console.error(
    "Missing CONTENTFUL_SPACE_ID or CONTENTFUL_MANAGEMENT_TOKEN in .env.local",
  );
  process.exit(1);
}

const migrationsDir = path.resolve("migrations");

async function loadMigration(filePath: string): Promise<MigrationFunction> {
  const mod: unknown = await import(pathToFileURL(filePath).href);
  // This package is CommonJS, so tsx can nest the default export one level deeper.
  let candidate = (mod as { default?: unknown }).default;
  if (typeof candidate === "object" && candidate !== null && "default" in candidate) {
    candidate = (candidate as { default: unknown }).default;
  }
  if (typeof candidate !== "function") {
    throw new Error(`${path.basename(filePath)} must default-export a migration function`);
  }
  return candidate as MigrationFunction;
}

// Usage:
//   npm run cf:migrate                          -> run every migration, in filename order
//   npm run cf:migrate -- 02-create-ingredient  -> run only the named migration(s)
async function main() {
  const requested = process.argv.slice(2).map((name) => name.replace(/\.ts$/, ""));
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".ts"))
    .sort()
    .filter((file) => requested.length === 0 || requested.includes(file.replace(/\.ts$/, "")));

  if (files.length === 0) {
    console.error("No matching migrations found in /migrations");
    process.exit(1);
  }

  for (const file of files) {
    console.log(`\n=== ${file} (environment: ${environmentId}) ===`);
    const migrationFunction = await loadMigration(path.join(migrationsDir, file));
    // Without `yes`, contentful-migration shows the plan and asks before applying.
    await runMigration({
      migrationFunction,
      spaceId,
      environmentId,
      accessToken,
    });
  }
}

// Contentful SDK error messages can be JSON that includes request headers (with
// part of the token), so only print the status and the human-readable message.
function describeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  try {
    const parsed = JSON.parse(raw) as { status?: number; message?: string };
    return `${parsed.status ?? "unknown status"}: ${parsed.message ?? "unknown error"}`;
  } catch {
    return raw.includes("Authorization") ? "request failed (details hidden)" : raw;
  }
}

main().catch((error: unknown) => {
  console.error(`Migration failed (${describeError(error)})`);
  process.exit(1);
});
