#!/usr/bin/env node
/**
 * Works out which next-intl message paths each route needs on the client, so the layouts send
 * only those (perf decision: "send only needed translations").
 *
 * How: every `useTranslations("a.b")` call with a literal argument is a path the client reads.
 * For the root layout and each route area (a directory under app/[locale]) we follow
 * `@/`, relative and dynamic imports from its files and collect those paths. Layers:
 *   root base  -> group layouts ((app), (personal)) -> area layouts (settings, agents, ...).
 * Each layer carries only what the layers above it do not already cover.
 *
 * `useTranslations()` without a literal, `useMessages()` or `getMessages()` in client code would
 * defeat the scan, so they make this script throw. The output is committed as
 * i18n/route-messages.generated.json and __tests__/route-messages.test.ts fails when stale.
 *
 * Usage: node scripts/route-messages.mjs [--check]
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LOCALE_DIR = "app/[locale]";
export const OUT = "i18n/route-messages.generated.json";

const BASE_ROOTS = [
  `${LOCALE_DIR}/layout.tsx`,
  "app/providers.tsx",
  `${LOCALE_DIR}/error.tsx`,
  `${LOCALE_DIR}/not-found.tsx`,
];
const GROUPS = ["(app)", "(personal)"];

// The files that implement the per-route delivery itself.
const ALLOWED_RAW = /^(components\/manar\/i18n\/|app\/\[locale\]\/layout\.tsx$)/;

const exts = [".ts", ".tsx"];
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

function resolveImport(fromRel, spec) {
  let base;
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith(".")) base = relative(ROOT, resolve(ROOT, dirname(fromRel), spec));
  else return null;
  for (const c of [base, ...exts.map((e) => base + e), ...exts.map((e) => `${base}/index${e}`)]) {
    const abs = join(ROOT, c);
    if (existsSync(abs) && statSync(abs).isFile() && exts.some((e) => c.endsWith(e))) return c;
  }
  return null;
}

const IMPORT_RE =
  /(?:import|export)\s[^;]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|import\s*["']([^"']+)["']/g;

function filesUnder(rel) {
  const out = [];
  for (const name of readdirSync(join(ROOT, rel))) {
    const p = `${rel}/${name}`;
    if (statSync(join(ROOT, p)).isDirectory()) out.push(...filesUnder(p));
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

/** Message paths read by any file reachable from `roots`. */
function reach(roots) {
  const seen = new Set();
  const paths = new Set();
  const queue = [...roots];
  while (queue.length) {
    const f = queue.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    const src = read(f);
    for (const m of src.matchAll(/useTranslations\(([^)]*)\)/g)) {
      const lit = m[1].trim().match(/^["']([^"'$`]+)["']$/);
      if (!lit) throw new Error(`${f}: useTranslations needs a literal namespace, got (${m[1]})`);
      paths.add(lit[1]);
    }
    if (/\buseMessages\(|\bgetMessages\(/.test(src) && !ALLOWED_RAW.test(f))
      throw new Error(`${f}: useMessages/getMessages defeats the per-route message scan`);
    for (const m of src.matchAll(IMPORT_RE)) {
      const target = resolveImport(f, m[1] ?? m[2] ?? m[3]);
      if (target) queue.push(target);
    }
  }
  return paths;
}

const covers = (have, p) => [...have].some((h) => p === h || p.startsWith(`${h}.`));

function minus(need, have) {
  const rest = [...need].filter((p) => !covers(have, p)).sort();
  // keep only the shortest prefix of each family
  return rest.filter((p) => !rest.some((q) => q !== p && p.startsWith(`${q}.`)));
}

/** Area keys, relative to app/[locale]: "(app)/agents", "login", ... Group keys: "(app)". */
export function routeAreas() {
  const dir = join(ROOT, LOCALE_DIR);
  const areas = [];
  for (const name of readdirSync(dir)) {
    if (!statSync(join(dir, name)).isDirectory()) continue;
    if (GROUPS.includes(name)) {
      for (const child of readdirSync(join(dir, name)))
        if (statSync(join(dir, name, child)).isDirectory()) areas.push(`${name}/${child}`);
    } else areas.push(name);
  }
  return areas.sort();
}

/** Everything each root reads, before layers are subtracted: `{ base, groups, areas }` of path arrays. */
export function computeNeeds() {
  const needs = { base: [...reach(BASE_ROOTS)], groups: {}, areas: {} };
  for (const g of GROUPS) needs.groups[g] = [...reach([`${LOCALE_DIR}/${g}/layout.tsx`])];
  for (const area of routeAreas())
    needs.areas[area] = [...reach(filesUnder(`${LOCALE_DIR}/${area}`))];
  return needs;
}

export function computeRouteMessages() {
  const base = reach(BASE_ROOTS);
  const out = { base: minus(base, new Set()), groups: {}, areas: {} };
  const have = new Set(out.base);
  const groupHave = {};
  for (const g of GROUPS) {
    const need = reach([`${LOCALE_DIR}/${g}/layout.tsx`]);
    out.groups[g] = minus(need, have);
    groupHave[g] = new Set([...have, ...out.groups[g]]);
  }
  for (const area of routeAreas()) {
    const group = GROUPS.find((g) => area.startsWith(`${g}/`));
    const roots = filesUnder(`${LOCALE_DIR}/${area}`);
    out.areas[area] = minus(reach(roots), group ? groupHave[group] : have);
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const json = `${JSON.stringify(computeRouteMessages(), null, 2)}\n`;
  if (process.argv.includes("--check")) {
    // Compare parsed JSON: the committed file is formatted by prettier, the script's output is not.
    const committed = JSON.stringify(JSON.parse(readFileSync(join(ROOT, OUT), "utf8")));
    if (committed !== JSON.stringify(JSON.parse(json))) {
      console.error(`${OUT} is stale: run node scripts/route-messages.mjs`);
      process.exit(1);
    }
  } else writeFileSync(join(ROOT, OUT), json);
}
