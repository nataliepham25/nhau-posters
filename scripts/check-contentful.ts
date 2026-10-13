import path from "node:path";
import { config } from "dotenv";
import { createClient } from "contentful-management";

// TEMP diagnostics: dotenv does not override variables already set in the shell.
const tokenSetInShell = process.env.CONTENTFUL_MANAGEMENT_TOKEN !== undefined;
const envPath = path.resolve(".env.local");

config({ path: envPath, quiet: true });

console.log("[diag] token already set in shell:", tokenSetInShell);
console.log("[diag] loading env file:", envPath);
console.log(
  "[diag] token length:",
  process.env.CONTENTFUL_MANAGEMENT_TOKEN?.length ?? "(not set)",
);
// END TEMP diagnostics

const spaceId = process.env.CONTENTFUL_SPACE_ID;
const environmentId = process.env.CONTENTFUL_ENVIRONMENT ?? "master";
const accessToken = process.env.CONTENTFUL_MANAGEMENT_TOKEN;

if (!spaceId || !accessToken) {
  console.error(
    "Missing CONTENTFUL_SPACE_ID or CONTENTFUL_MANAGEMENT_TOKEN in .env.local",
  );
  process.exit(1);
}

const client = createClient({ accessToken });

async function main() {
  const space = await client.space.get({ spaceId });
  const locales = await client.locale.getMany({
    spaceId,
    environmentId,
    query: {},
  });

  console.log(`Space: ${space.name}`);
  console.log(`Environment: ${environmentId}`);
  console.log("Locales:");
  for (const locale of locales.items) {
    const fallback = locale.fallbackCode ? ` -> falls back to ${locale.fallbackCode}` : "";
    const marker = locale.default ? " (default)" : "";
    console.log(`  ${locale.code}  ${locale.name}${marker}${fallback}`);
  }
}

// The SDK's error message is JSON that includes request headers (with part of
// the token), so only print the status and the human-readable message.
function describeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  try {
    const parsed = JSON.parse(raw) as { status?: number; message?: string };
    return `${parsed.status ?? "unknown status"}: ${parsed.message ?? "unknown error"}`;
  } catch {
    return error instanceof Error ? error.name : "unknown error";
  }
}

main().catch((error: unknown) => {
  console.error(`Contentful check failed (${describeError(error)})`);
  process.exit(1);
});
