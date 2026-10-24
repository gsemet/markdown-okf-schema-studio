/**
 * Build-time entry of the page assets (PERF-11). esbuild bundles it for Node and the bundle step
 * (`esbuild.mjs`) calls these functions once: it writes `out/bundle/preview.css` and passes the
 * values the page bundle needs as constants (see `src/page/buildConstants.ts`).
 */

import { highlightLanguageNames } from "../render/highlight";
import { PREVIEW_ACCESSIBILITY_CSS, PREVIEW_THEME_CSS } from "./previewStyles";

/** The static stylesheet of a rendered page (the per-render width rule stays in the page). */
export function previewStylesheet(): string {
  return `${PREVIEW_ACCESSIBILITY_CSS}${PREVIEW_THEME_CSS}`;
}

/** The code languages the preview highlights, for the page's palette. */
export function highlightLanguages(): string[] {
  return highlightLanguageNames();
}
