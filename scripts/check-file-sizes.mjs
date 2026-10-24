/**
 * Source limits (`just check-limits`):
 *
 * 1. File size ratchet. A source file of `src/` has at most 800 lines, a test file at most 1 500.
 *    The files that were already larger are listed in `scripts/file-size-baseline.json` with their
 *    size; they may only shrink. The check fails when a listed file grows, when a file that is not
 *    listed goes over its limit, and when the baseline is stale (a listed file shrank, went under
 *    its limit or is gone): `--update` lowers the stale entries, never raises one or adds a file.
 * 2. Type-check suppressions. No `@ts-nocheck` or `@ts-ignore` in `src/`, except in the files of
 *    SUPPRESSION_ALLOWLIST.
 *
 * Files are the ones git tracks or would track (`.gitignore` applies), so new files count too.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = path.join(root, "scripts", "file-size-baseline.json");
const relativeBaseline = path.relative(root, baselinePath);

/** Line limit per top folder. */
const LIMITS = { src: 800, test: 1500 };
/** Extensions of the files the ratchet measures (code and styles, not fixtures or data). */
const MEASURED = /\.(ts|mts|cts|js|mjs|cjs|py|css)$/u;
/**
 * Files that may still suppress type checking, each with the step that removes the suppression.
 * `src/page/runtime.ts`: the part of the page runtime not yet split into typed feature modules.
 */
const SUPPRESSION_ALLOWLIST = new Set(["src/page/runtime.ts"]);
const SUPPRESSION = /@ts-(nocheck|ignore)\b/u;

function sourceFiles() {
  const listed = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z", "src", "test"], {
    cwd: root,
    encoding: "utf8",
  });
  return [...new Set(listed.split("\0").filter(Boolean))].sort();
}

function lineCount(text) {
  if (text.length === 0) return 0;
  const lines = text.split("\n").length;
  return text.endsWith("\n") ? lines - 1 : lines;
}

function readBaseline() {
  const parsed = JSON.parse(readFileSync(baselinePath, "utf8"));
  return parsed.files ?? {};
}

function writeBaseline(files) {
  const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
  const document = {
    description: "Files above the line limit (src/ 800, test/ 1500) when the ratchet started, with their "
      + "current size. They may only shrink: lower an entry when its file shrinks "
      + "(node scripts/check-file-sizes.mjs --update), and remove it once the file is under the limit.",
    limits: LIMITS,
    files: sorted,
  };
  writeFileSync(baselinePath, JSON.stringify(document, null, 2) + "\n", "utf8");
}

const update = process.argv.includes("--update");
const files = sourceFiles();
const baseline = readBaseline();
const errors = [];
const stale = new Map();
const seen = new Set();

for (const file of files) {
  const top = file.split("/")[0];
  const limit = LIMITS[top];
  let text;
  try {
    text = readFileSync(path.join(root, file), "utf8");
  } catch {
    continue; // deleted in the working tree, not yet in the index
  }
  if (top === "src" && SUPPRESSION.test(text) && !SUPPRESSION_ALLOWLIST.has(file)) {
    errors.push(`${file}: type checking is suppressed (@ts-nocheck / @ts-ignore); type the code instead`);
  }
  if (!limit || !MEASURED.test(file)) continue;
  const lines = lineCount(text);
  const recorded = baseline[file];
  if (recorded !== undefined) seen.add(file);
  if (lines <= limit) {
    if (recorded !== undefined) stale.set(file, undefined);
    continue;
  }
  if (recorded === undefined) {
    errors.push(`${file}: ${lines} lines, over the ${limit}-line limit of ${top}/; split it`);
  } else if (lines > recorded) {
    errors.push(`${file}: grew to ${lines} lines (baseline ${recorded}); a listed file may only shrink`);
  } else if (lines < recorded) {
    stale.set(file, lines);
  }
}
for (const file of Object.keys(baseline)) {
  if (!seen.has(file)) stale.set(file, undefined);
}

if (update) {
  const next = { ...baseline };
  for (const [file, lines] of stale) {
    if (lines === undefined) delete next[file];
    else next[file] = lines;
  }
  writeBaseline(next);
  console.log(`check-limits: ${relativeBaseline} updated (${stale.size} entr${stale.size === 1 ? "y" : "ies"} lowered or removed)`);
} else {
  for (const [file, lines] of stale) {
    errors.push(lines === undefined
      ? `${file}: under its limit or gone; remove it from ${relativeBaseline} (node scripts/check-file-sizes.mjs --update)`
      : `${file}: shrank to ${lines} lines (baseline ${baseline[file]}); lower the baseline (node scripts/check-file-sizes.mjs --update)`);
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`  ${error}`);
  console.error(`check-limits: FAILED (${errors.length} problem${errors.length === 1 ? "" : "s"})`);
  process.exit(1);
}
console.log(`check-limits: passed (${files.length} files, ${Object.keys(update ? readBaseline() : baseline).length} on the size baseline)`);
