#!/usr/bin/env node
/**
 * Generates `lib/api/schema.d.ts` — TypeScript types for manar-api's
 * live human-facing OpenAPI document — via `openapi-typescript`. This is
 * the "generated client" the Phase 11a design spec (Part 2, "Generated
 * API client + state") requires: nobody hand-types request/response
 * shapes that duplicate manar-api's DTOs. `lib/api/client.ts` is the only
 * hand-written file — a thin `openapi-fetch` wrapper typed against the
 * output of this script.
 *
 * Two modes:
 *   node scripts/generate-api-client.mjs          — regenerate and write
 *   node scripts/generate-api-client.mjs --check   — regenerate into a
 *     temp buffer and fail (exit 1) if it differs from what's committed,
 *     without touching the working tree. This is the drift check: it
 *     catches someone hand-editing schema.d.ts, and catches manar-api's
 *     API surface changing without manar-web regenerating against it —
 *     mirroring manar-api's own `test/openapi-docs.e2e-spec.ts` live-
 *     document drift suite.
 */
import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import openapiTS, { astToString } from "openapi-typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "lib", "api", "schema.d.ts");
const DOCS_JSON_URL = `${process.env.MANAR_API_BASE_URL ?? "http://localhost:3000"}/api/v1/docs-json`;

const HEADER = `/**
 * GENERATED FILE — do not hand-edit.
 *
 * Produced by \`pnpm api:codegen\` (scripts/generate-api-client.mjs) from
 * manar-api's live OpenAPI document at ${DOCS_JSON_URL.replace(/^https?:\/\/[^/]+/, "")}.
 * Regenerate instead of patching: \`pnpm api:codegen\`. CI/build fails via
 * \`pnpm api:codegen:check\` if this drifts from a fresh regeneration.
 */
`;

async function generate() {
  let response;
  try {
    response = await fetch(DOCS_JSON_URL);
  } catch (cause) {
    throw new Error(
      `Could not reach manar-api's OpenAPI document at ${DOCS_JSON_URL}. ` +
        `Is manar-api's dev server running (pnpm --filter manar-api start:dev, with pnpm infra:up first)? ` +
        `Set MANAR_API_BASE_URL to point elsewhere if needed.`,
      { cause },
    );
  }
  if (!response.ok) {
    throw new Error(`Fetching ${DOCS_JSON_URL} returned HTTP ${response.status}`);
  }
  const schema = await response.json();
  const ast = await openapiTS(schema);
  return HEADER + astToString(ast);
}

async function main() {
  const check = process.argv.includes("--check");
  const generated = await generate();

  if (!check) {
    await writeFile(OUT_PATH, generated, "utf8");
    console.log(`Wrote ${path.relative(process.cwd(), OUT_PATH)} (${generated.length} bytes).`);
    return;
  }

  let existing;
  try {
    existing = await readFile(OUT_PATH, "utf8");
  } catch {
    console.error(
      `${path.relative(process.cwd(), OUT_PATH)} does not exist. Run: pnpm api:codegen`,
    );
    process.exitCode = 1;
    return;
  }

  if (existing !== generated) {
    console.error(
      `lib/api/schema.d.ts is stale relative to manar-api's live OpenAPI document.\n` +
        `Run \`pnpm api:codegen\` and commit the result.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log("lib/api/schema.d.ts matches manar-api's live OpenAPI document. No drift.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
