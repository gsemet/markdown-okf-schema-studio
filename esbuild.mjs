import { build } from "esbuild";
import { cpSync, mkdirSync } from "node:fs";
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

const require = createRequire(import.meta.url);
const katexDirectory = path.dirname(require.resolve("katex"));
const mathAssets = "out/bundle/katex";
mkdirSync(mathAssets, { recursive: true });
cpSync(path.join(katexDirectory, "katex.min.css"), path.join(mathAssets, "katex.min.css"));
cpSync(path.join(katexDirectory, "fonts"), path.join(mathAssets, "fonts"), { recursive: true });
cpSync(path.join(katexDirectory, "..", "LICENSE"), path.join(mathAssets, "LICENSE"));
