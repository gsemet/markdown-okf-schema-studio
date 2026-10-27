// In-memory source patches of three MyST dependencies. Nothing is written to node_modules: the
// esbuild bundle applies them through `mystPatchPlugin`, and Node-run code (unit tests, the visual
// and site scripts) through the load hook registered by scripts/register-myst-patches.mjs. A package
// whose version or content is not the reviewed one fails loudly instead of being patched blindly.
import { readFileSync } from "node:fs";
import * as path from "node:path";

const IMPORT_ORIGINAL = "markdown-it/lib/common/utils.js";
const IMPORT_CORRECTED = "markdown-it/lib/common/utils.mjs";

// markdown-it-myst 1.0.18 splits the whole source into lines for every directive fence to find out
// whether blank lines surround it, which makes a parse O(directives x size). The patch splits the
// source once per parse state and reuses the lines for every fence of that parse.
const TIGHTNESS_MARKER = "const blockLinesByState = new WeakMap();";
const TIGHTNESS_HEAD = "function computeBlockTightness(src, map) {\n    const lines = src.split('\\n');\n";
const TIGHTNESS_PATCHED_HEAD = [
  TIGHTNESS_MARKER,
  "function computeBlockTightness(state, map) {",
  "    let cached = blockLinesByState.get(state);",
  "    if (!cached || cached.src !== state.src) {",
  "        cached = { src: state.src, lines: state.src.split('\\n') };",
  "        blockLinesByState.set(state, cached);",
  "    }",
  "    const lines = cached.lines;",
  "",
].join("\n");
const TIGHTNESS_CALL = "tight: computeBlockTightness(state.src, token.map),";
const TIGHTNESS_PATCHED_CALL = "tight: computeBlockTightness(state, token.map),";

/** @type {readonly { name: string; version: string; file: string; apply: (source: string) => string | undefined }[]} */
export const MYST_PATCHES = [
  { name: "markdown-it-dollarmath", version: "0.5.0", file: "dist/index.js", apply: patchImport },
  { name: "myst-to-html", version: "1.7.4", file: "dist/utils.js", apply: patchImport },
  { name: "markdown-it-myst", version: "1.0.18", file: "dist/directives.js", apply: patchTightness },
];

/** @returns {string | undefined} the patched source, or undefined when the content is unknown */
function patchImport(source) {
  if (source.includes(IMPORT_ORIGINAL)) return source.replace(IMPORT_ORIGINAL, IMPORT_CORRECTED);
  return source.includes(IMPORT_CORRECTED) ? source : undefined;
}

function patchTightness(source) {
  if (source.includes(TIGHTNESS_HEAD) && source.includes(TIGHTNESS_CALL)) {
    return source.replace(TIGHTNESS_HEAD, TIGHTNESS_PATCHED_HEAD).replace(TIGHTNESS_CALL, TIGHTNESS_PATCHED_CALL);
  }
  return source.includes(TIGHTNESS_MARKER) ? source : undefined;
}

const TARGET = /(?:^|[\\/])node_modules[\\/](markdown-it-dollarmath|myst-to-html|markdown-it-myst)[\\/](dist[\\/][^\\/]+\.js)$/;

/**
 * The patched source of a file, or undefined when the file is not one of the patched ones. Throws
 * when the package is not the reviewed version or the file does not have the expected content.
 *
 * @param {string} filePath absolute path of the file
 * @param {string} source its content
 * @returns {string | undefined}
 */
export function patchMystSource(filePath, source) {
  const match = TARGET.exec(filePath);
  if (!match) return undefined;
  const patch = MYST_PATCHES.find((entry) => entry.name === match[1] && entry.file === match[2].replaceAll("\\", "/"));
  if (!patch) return undefined;
  const manifest = JSON.parse(readFileSync(path.join(filePath.slice(0, match.index + match[0].length - match[2].length), "package.json"), "utf8"));
  if (manifest.version !== patch.version) {
    throw new Error(`Review the MyST source patch for ${patch.name}@${manifest.version} (reviewed: ${patch.version})`);
  }
  const patched = patch.apply(source);
  if (patched === undefined) {
    throw new Error(`Review the MyST source patch for ${patch.name}@${patch.version}: ${patch.file} has unexpected content`);
  }
  return patched;
}

/** esbuild plugin: bundles the three packages with the patches applied in memory. */
export const mystPatchPlugin = {
  name: "myst-source-patches",
  setup(build) {
    build.onLoad({ filter: /[\\/]node_modules[\\/](?:markdown-it-dollarmath|myst-to-html|markdown-it-myst)[\\/]dist[\\/][^\\/]+\.js$/ }, (args) => {
      const patched = patchMystSource(args.path, readFileSync(args.path, "utf8"));
      return patched === undefined ? undefined : { contents: patched, loader: "js" };
    });
  },
};
