/**
 * Build-time entry of the preview runtime files (PERF-11). esbuild bundles it for Node, the build
 * script calls these functions once and writes `out/bundle/preview.js` and `out/bundle/preview.css`;
 * the page loads both as webview resources instead of inlining them in every render.
 */

import { PREVIEW_ACCESSIBILITY_CSS, PREVIEW_THEME_CSS } from "../preview/previewStyles";
import { createPreviewRuntimeScript } from "./scrollSync";

/** The runtime script, without a context: it reads the page's context element. */
export function previewRuntimeScript(): string {
  return createPreviewRuntimeScript();
}

/** The static stylesheet of a rendered page (the per-render width rule stays in the page). */
export function previewStylesheet(): string {
  return `${PREVIEW_ACCESSIBILITY_CSS}${PREVIEW_THEME_CSS}`;
}
