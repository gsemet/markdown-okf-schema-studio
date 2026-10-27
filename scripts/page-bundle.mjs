import { fileURLToPath } from "node:url";

/**
 * The esbuild options of the preview page runtime (`out/bundle/preview.js`), shared by the bundle
 * step (`esbuild.mjs`) and the unit-test harness, which builds the same page without minifying it.
 * Paths are relative to esbuild's working directory (`absWorkingDir`, else the process directory).
 *
 * @param {{ highlightLanguages: readonly string[]; minify: boolean }} options
 * @returns {import("esbuild").BuildOptions}
 */
export function pageBundleOptions({ highlightLanguages, minify }) {
  return {
    entryPoints: ["src/page/main.ts"],
    bundle: true,
    platform: "browser",
    target: "es2022",
    format: "iife",
    minify,
    // The script is strict, like the "use strict" function the runtime used to be: esbuild emits the
    // directive because tsconfig.json sets "strict" (which implies alwaysStrict).
    // Build-time values the page reads as constants (see src/page/buildConstants.ts).
    define: { STUDIO_HIGHLIGHT_LANGUAGES: JSON.stringify(highlightLanguages) },
    logLevel: "info",
  };
}

// @implements_req SwRS-MDOKFSTUDIO-CODE-001
// @implements_req SwRS-MDOKFSTUDIO-MYST-024
/**
 * The extension host bundle (`out/bundle/extension.js`). Shiki and KaTeX load on first use from
 * `out/bundle/lazy/` (see {@link lazyModuleOptions}): the renderer reaches them through a `require`
 * call, which this plugin leaves as a runtime `require` of the lazy file instead of bundling it.
 * `js-yaml` (pulled in by the MyST engine only for `yaml.load`) is aliased to a shim on `yaml`.
 *
 * @param {{ minify?: boolean }} [options]
 * @returns {import("esbuild").BuildOptions}
 */
export function extensionBundleOptions({ minify = true } = {}) {
  /** @type {import("esbuild").Plugin} */
  const lazyRequires = {
    name: "lazy-requires",
    setup(build) {
      const lazyFiles = { "./highlight": "./lazy/highlight.js", katex: "./lazy/katex.js" };
      build.onResolve({ filter: /^(\.\/highlight|katex)$/ }, (args) => {
        const target = lazyFiles[args.path];
        return args.kind === "require-call" && target ? { path: target, external: true } : undefined;
      });
    },
  };
  return {
    entryPoints: ["src/extension.ts"],
    outfile: "out/bundle/extension.js",
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    sourcemap: true,
    minify,
    external: ["vscode"],
    alias: { "js-yaml": fileURLToPath(new URL("./js-yaml-shim.mjs", import.meta.url)) },
    plugins: [lazyRequires],
    logLevel: "info",
  };
}

/**
 * The modules the extension host loads on first use: the syntax highlighter (Shiki with its
 * grammars, about 2.3 MB) and KaTeX. Each is a CommonJS file next to `extension.js`.
 *
 * @param {{ katexEntry: string; minify?: boolean }} options `katexEntry` is the resolved KaTeX main file
 * @returns {import("esbuild").BuildOptions}
 */
export function lazyModuleOptions({ katexEntry, minify = true }) {
  return {
    entryPoints: { "lazy/highlight": "src/core/render/highlight.ts", "lazy/katex": katexEntry },
    outdir: "out/bundle",
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    sourcemap: true,
    minify,
    logLevel: "info",
  };
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-001
/**
 * The Mermaid renderer of the page: an ES module with code splitting, so the diagram types a
 * document does not use (and the ELK layout engine) are separate chunks fetched when needed
 * instead of one 5 MB script. Loaded with `<script type="module">`.
 *
 * @param {{ minify?: boolean }} [options]
 * @returns {import("esbuild").BuildOptions}
 */
export function mermaidBundleOptions({ minify = true } = {}) {
  return {
    entryPoints: ["src/page/modules/mermaidPreview.ts"],
    outdir: "out/bundle",
    chunkNames: "mermaid-chunks/[name]-[hash]",
    bundle: true,
    splitting: true,
    platform: "browser",
    target: "es2022",
    format: "esm",
    minify,
    logLevel: "info",
  };
}
