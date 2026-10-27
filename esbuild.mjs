import { build } from "esbuild";
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";

import { mystPatchPlugin } from "./scripts/myst-patches.mjs";
import { extensionBundleOptions, lazyModuleOptions, mermaidBundleOptions, pageBundleOptions } from "./scripts/page-bundle.mjs";

// The MyST engine is ESM-only and pulls in the whole unified ecosystem; bundling keeps the
// VSIX to a handful of files and avoids paying module resolution on activation.
const extensionOptions = extensionBundleOptions();
await build({ ...extensionOptions, plugins: [mystPatchPlugin, ...extensionOptions.plugins] });

// The integration tests run in the VS Code extension host, which loads no Node hook: they get the
// renderer from this bundle (patched like the extension) and never import the MyST engine.
await build({
  entryPoints: ["src/core/render/mystRenderer.ts"],
  outfile: "out/test/bundle/mystRenderer.js",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  sourcemap: false,
  external: ["vscode"],
  plugins: [mystPatchPlugin],
  logLevel: "info",
});

// The render worker (src/node-services/renderWorker.ts) is its own entry: the extension starts it
// as a worker thread from out/bundle/renderWorker.js, next to extension.js.
// It shares the extension's lazy Shiki/KaTeX files and the YAML shim, so it carries no second copy.
await build({
  ...extensionOptions,
  entryPoints: ["src/node-services/renderWorker.ts"],
  outfile: "out/bundle/renderWorker.js",
});

// Shiki (with its grammars) and KaTeX are loaded by the extension host on first use only.
await build(lazyModuleOptions({ katexEntry: createRequire(import.meta.url).resolve("katex") }));

// Mermaid is an ES module with code splitting: diagram types load when a document uses them.
await build(mermaidBundleOptions());

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
