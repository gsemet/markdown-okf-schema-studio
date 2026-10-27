import { build } from "esbuild";
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";

import { pageBundleOptions } from "./scripts/page-bundle.mjs";

// The MyST engine is ESM-only and pulls in the whole unified ecosystem; bundling keeps the
// VSIX to a handful of files and avoids paying module resolution on activation.
await build({
  entryPoints: ["src/extension.ts"],
  outfile: "out/bundle/extension.js",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  sourcemap: true,
  minify: true,
  external: ["vscode"],
  logLevel: "info",
});

// The render worker (src/node-services/renderWorker.ts) is its own entry: the extension starts it
// as a worker thread from out/bundle/renderWorker.js, next to extension.js.
await build({
  entryPoints: ["src/node-services/renderWorker.ts"],
  outfile: "out/bundle/renderWorker.js",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  sourcemap: true,
  minify: true,
  logLevel: "info",
});

await build({
  entryPoints: ["src/page/modules/mermaidPreview.ts"],
  outfile: "out/bundle/mermaidPreview.js",
  bundle: true,
  platform: "browser",
  target: "es2020",
  format: "iife",
  minify: true,
  logLevel: "info",
});

// The PlantUML engine (@plantuml/core, MIT) needs a DOM, so it runs in the webview. Smetana layout
// only: viz-global.js (Graphviz as WebAssembly) would need 'wasm-unsafe-eval' in the CSP.
await build({
  entryPoints: ["src/page/modules/plantumlPreview.ts"],
  outfile: "out/bundle/plantumlPreview.js",
  bundle: true,
  platform: "browser",
  target: "es2020",
  format: "iife",
  minify: true,
  logLevel: "info",
});

const require = createRequire(import.meta.url);

// The page stylesheet and the build-time values of the page come from TypeScript modules that run
// once here, in Node (src/core/preview/pageBuildEntry.ts).
const pageAssets = await build({
  entryPoints: ["src/core/preview/pageBuildEntry.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  minify: true,
  write: false,
  logLevel: "info",
});
const pageAssetsModule = { exports: {} };
new Function("module", "exports", "require", pageAssets.outputFiles[0].text)(pageAssetsModule, pageAssetsModule.exports, require);
mkdirSync("out/bundle", { recursive: true });
writeFileSync("out/bundle/preview.css", pageAssetsModule.exports.previewStylesheet(), "utf8");

// The preview runtime is a browser bundle with normal imports (src/page/main.ts), loaded by the page
// as a cacheable file next to the JSON element that carries its boot context (PERF-11).
await build({
  ...pageBundleOptions({ highlightLanguages: pageAssetsModule.exports.highlightLanguages(), minify: true }),
  outfile: "out/bundle/preview.js",
});

const katexDirectory = path.dirname(require.resolve("katex"));
const mathAssets = "out/bundle/katex";
mkdirSync(mathAssets, { recursive: true });
cpSync(path.join(katexDirectory, "katex.min.css"), path.join(mathAssets, "katex.min.css"));
cpSync(path.join(katexDirectory, "fonts"), path.join(mathAssets, "fonts"), { recursive: true });
cpSync(path.join(katexDirectory, "..", "LICENSE"), path.join(mathAssets, "LICENSE"));
const plantUmlDirectory = path.dirname(require.resolve("@plantuml/core/package.json"));
mkdirSync("out/bundle/plantuml", { recursive: true });
cpSync(path.join(plantUmlDirectory, "LICENSE"), "out/bundle/plantuml/LICENSE");
