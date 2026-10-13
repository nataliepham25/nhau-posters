import path from "node:path";
import { config } from "dotenv";

export function loadContentfulEnv() {
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

  return { spaceId, environmentId, accessToken };
}

// Contentful SDK error messages can be JSON that includes request headers (with
// part of the token), so only print the status and the human-readable message.
export function describeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  try {
    const parsed = JSON.parse(raw) as {
      status?: number;
      message?: string;
      details?: { errors?: unknown[] };
    };
    const details = parsed.details?.errors?.length
      ? ` ${JSON.stringify(parsed.details.errors)}`
      : "";
    return `${parsed.status ?? "unknown status"}: ${parsed.message ?? "unknown error"}${details}`;
  } catch {
    return raw.includes("Authorization") ? "request failed (details hidden)" : raw;
  }
}
