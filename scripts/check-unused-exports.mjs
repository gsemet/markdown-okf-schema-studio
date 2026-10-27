/**
 * Unused-exports check (`just check-exports`).
 *
 * Every runtime value (function, class, const, enum) exported by a module of `src/` must be referenced, as a whole word, by at least one
 * other `.ts` file of `src/` or `test/`, or `.mjs` build script of `scripts/`. An export that only its own file mentions is dead: make it
 * module-private or delete it. The check is name based (no type information: the project builds
 * with the native TypeScript compiler, which has no compiler API). Exported types and interfaces
 * are not checked: they are part of the signatures of the exports that use them), so a name shared by two modules
 * counts as used in both; that can hide a dead export but never reports a live one as dead.
 *
 * Intentional exceptions (entry points the host or the bundler loads by name, exports kept for a
 * documented reason) live in `scripts/unused-exports-allowlist.json` as
 * `{ "<repo-relative file>": { "<export name>": "<reason>" } }`. An allow-list entry that is no
 * longer needed (the file or export is gone, or the export is used) is itself an error, so the
 * list cannot rot.
 *
 * `node scripts/check-unused-exports.mjs` checks the repository; the exported `findUnusedExports`
 * is the testable core.
 */
import { readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Runtime names a TypeScript source exports (declarations, `export { a, b as c }`, `export default` is ignored). */
export function exportedNames(source) {
  const names = new Set();
  const declaration =
    /^export\s+(?:declare\s+)?(?:async\s+)?(?:abstract\s+)?(?:const\s+enum|function\*?|class|enum|const|let|var)\s+([A-Za-z_$][\w$]*)/gmu;
  for (const match of source.matchAll(declaration)) names.add(match[1]);
  const lists = /^export\s+\{([^}]*)\}(?!\s*from)/gmu;
  for (const match of source.matchAll(lists)) {
    for (const item of match[1].split(",")) {
      if (/^\s*type\s/u.test(item)) continue;
      const name = item.trim().split(/\s+as\s+/u).pop().trim();
      if (name) names.add(name);
    }
  }
  return names;
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

/**
 * `files` maps repo-relative paths to source text; only paths under `src/` are checked, every path
 * counts as a consumer. Returns `{ problems, used }`, the problem lines and the allow-list entries
 * that were needed.
 */
export function findUnusedExports(files, allowlist = {}) {
  const problems = [];
  const needed = new Set();
  for (const [file, source] of Object.entries(files)) {
    if (!file.startsWith("src/")) continue;
    for (const name of exportedNames(source)) {
      const word = new RegExp(`(?<![\\w$])${escapeRegExp(name)}(?![\\w$])`, "u");
      const used = Object.entries(files).some(([other, text]) => other !== file && word.test(text));
      const reason = allowlist[file]?.[name];
      if (reason !== undefined) {
        if (used) problems.push(`${file}: allow-list entry "${name}" is not needed (the export is used); remove it`);
        else needed.add(`${file}#${name}`);
      } else if (!used) {
        problems.push(`${file}: export "${name}" is not used by any other module of src/, test/ or scripts/ (make it private or delete it)`);
      }
    }
  }
  for (const [file, entries] of Object.entries(allowlist)) {
    for (const name of Object.keys(entries)) {
      if (!(file in files) || !exportedNames(files[file]).has(name)) {
        problems.push(`${file}: allow-list entry "${name}" names an export that does not exist; remove it`);
      }
    }
  }
  return { problems, needed };
}

function typescriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && /\.(?:ts|mjs)$/u.test(entry.name) && !entry.name.endsWith(".d.ts"))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = {};
  for (const top of ["src", "test", "scripts"]) {
    for (const file of typescriptFiles(path.join(root, top))) {
      files[path.relative(root, file).split(path.sep).join("/")] = readFileSync(file, "utf8");
    }
  }
  files["esbuild.mjs"] = readFileSync(path.join(root, "esbuild.mjs"), "utf8");
  const allowlist = JSON.parse(readFileSync(path.join(root, "scripts", "unused-exports-allowlist.json"), "utf8"));
  const { problems } = findUnusedExports(files, allowlist);
  if (problems.length > 0) {
    console.error(`check-exports: ${problems.length} problem(s)\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`check-exports: no unused export in ${Object.keys(files).filter((f) => f.startsWith("src/")).length} module(s) of src/`);
}
