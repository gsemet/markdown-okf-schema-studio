/**
 * Import boundary check (`just check-boundaries`): runs dependency-cruiser with the layer rules of
 * `.dependency-cruiser.cjs` over every module of `src/`.
 *
 * dependency-cruiser reads TypeScript through the TypeScript compiler API, which TypeScript 7 (the
 * native compiler this project uses) no longer ships. So this script first transpiles each
 * `src/**\/*.ts` file on its own with esbuild into `out/boundaries/src/` (same paths, `.js`), keeping
 * every import, type-only imports included: `import type`, `export type ... from` and inline
 * `type` specifiers become plain imports, and `verbatimModuleSyntax` stops esbuild from dropping
 * imports used only as types. A type import crosses a boundary as much as a value import does.
 * Type-position `import("…")` references are kept too (see `keepTypeImports`).
 * dependency-cruiser then runs from `out/boundaries`, so the rules see the `src/...` paths.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { transformSync } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outRoot = path.join(root, "out", "boundaries");

/** Every `.ts` file under `directory` (declaration files hold no imports worth checking). */
function typescriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts"))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

/**
 * Turns type-only imports and re-exports into plain ones, so the transpiled file keeps them. A
 * type-position `import("…")` (`type X = import("./a").X`, `typeof import("node:os")`) is erased by
 * esbuild, so every `import("<literal>")` also gets a side-effect `import "<literal>";` appended:
 * the rules then see it. A real dynamic import is counted twice, which is harmless.
 */
function keepTypeImports(source) {
  const importCalls = [...source.matchAll(/\bimport\(\s*(["'])([^"'\n]+)\1\s*\)/gu)]
    .map((match) => `\nimport ${JSON.stringify(match[2])};`)
    .join("");
  return source
    .replace(/\bimport\s+type\s+/gu, "import ")
    .replace(/\bexport\s+type\s+(\{[^}]*\}\s*from)/gu, "export $1")
    .replace(/\bexport\s+type\s+(\*\s*from)/gu, "export $1")
    .replace(/([{,]\s*)type\s+(?=[A-Za-z_$][\w$]*\s*(?:as\s+[A-Za-z_$][\w$]*\s*)?[,}])/gu, "$1") + importCalls;
}

function transpile() {
  rmSync(outRoot, { recursive: true, force: true });
  const files = typescriptFiles(path.join(root, "src"));
  for (const file of files) {
    const relative = path.relative(root, file);
    const { code } = transformSync(keepTypeImports(readFileSync(file, "utf8")), {
      loader: "ts",
      format: "esm",
      sourcefile: relative,
      tsconfigRaw: { compilerOptions: { verbatimModuleSyntax: true } },
    });
    const target = path.join(outRoot, relative.replace(/\.ts$/u, ".js"));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, code, "utf8");
  }
  return files.length;
}

const count = transpile();
const cruiser = path.join(root, "node_modules", "dependency-cruiser", "bin", "dependency-cruiser.mjs");
const extra = process.argv.slice(2);
const result = spawnSync(
  process.execPath,
  [cruiser, "src", "--config", path.join(root, ".dependency-cruiser.cjs"), ...(extra.length ? extra : ["--output-type", "err"])],
  { cwd: outRoot, stdio: "inherit" },
);
if (result.status !== 0) {
  console.error(`check-boundaries: FAILED (${count} modules; rules in .dependency-cruiser.cjs, layers in CONTRIBUTING.md)`);
  process.exit(result.status ?? 1);
}
if (!extra.length) console.log(`check-boundaries: passed (${count} modules)`);
