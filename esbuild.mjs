import { build } from "esbuild";
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";

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

await build({
  entryPoints: ["src/webview/mermaidPreview.ts"],
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
  entryPoints: ["src/webview/plantumlPreview.ts"],
  outfile: "out/bundle/plantumlPreview.js",
  bundle: true,
  platform: "browser",
  target: "es2020",
  format: "iife",
  minify: true,
  logLevel: "info",
});

const require = createRequire(import.meta.url);

// The preview runtime and its stylesheet are files the page loads (cacheable webview resources)
// instead of text inlined in every render. The runtime is assembled from the same minified
// modules the extension bundle used to serialise at render time.
const runtime = await build({
  entryPoints: ["src/webview/previewRuntimeEntry.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  minify: true,
  write: false,
  logLevel: "info",
});
const runtimeModule = { exports: {} };
new Function("module", "exports", "require", runtime.outputFiles[0].text)(runtimeModule, runtimeModule.exports, require);
mkdirSync("out/bundle", { recursive: true });
writeFileSync("out/bundle/preview.js", runtimeModule.exports.previewRuntimeScript(), "utf8");
writeFileSync("out/bundle/preview.css", runtimeModule.exports.previewStylesheet(), "utf8");

const katexDirectory = path.dirname(require.resolve("katex"));
const mathAssets = "out/bundle/katex";
mkdirSync(mathAssets, { recursive: true });
cpSync(path.join(katexDirectory, "katex.min.css"), path.join(mathAssets, "katex.min.css"));
cpSync(path.join(katexDirectory, "fonts"), path.join(mathAssets, "fonts"), { recursive: true });
cpSync(path.join(katexDirectory, "..", "LICENSE"), path.join(mathAssets, "LICENSE"));
const plantUmlDirectory = path.dirname(require.resolve("@plantuml/core/package.json"));
mkdirSync("out/bundle/plantuml", { recursive: true });
cpSync(path.join(plantUmlDirectory, "LICENSE"), "out/bundle/plantuml/LICENSE");
