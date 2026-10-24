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
