/**
 * Values fixed when the page bundle is built (`scripts/page-bundle.mjs` defines them), so the page
 * does not carry the libraries that compute them.
 */

declare const STUDIO_HIGHLIGHT_LANGUAGES: readonly string[];

/** The code languages the preview highlights (`src/core/render/highlight.ts`), for the palette. */
export const HIGHLIGHT_LANGUAGES: readonly string[] = STUDIO_HIGHLIGHT_LANGUAGES;
