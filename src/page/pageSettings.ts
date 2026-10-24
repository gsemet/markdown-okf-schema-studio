/**
 * The settings a page reads from its boot context, normalized once at startup (the host sends them
 * as they are configured; the page applies the defaults and bounds).
 */

import type { PreviewRuntimeContext } from "../core/protocol/bootContext";

/** The scroll and reveal settings of a page; the anchor button changes `scrollPreviewWithEditor`. */
export interface PageSettings {
  /** The page follows the text editor's scroll position (default on). */
  scrollPreviewWithEditor: boolean;
  /** The text editor follows the page's scroll position (default on). */
  scrollEditorWithPreview: boolean;
  /** The page marks the block of the editor selection (default off). */
  markEditorSelection: boolean;
  /** A double click outside edit mode reveals the source line (default off). */
  doubleClickToSwitchToEditor: boolean;
}

/** Delay between the last keystroke in a block editor and its autosave. */
export const AUTOSAVE_DELAY_MS = 400;

/** The scroll and reveal settings of a boot context, with their defaults. */
export function pageSettings(context: PreviewRuntimeContext): PageSettings {
  return {
    scrollPreviewWithEditor: context.scrollPreviewWithEditor !== false,
    scrollEditorWithPreview: context.scrollEditorWithPreview !== false,
    markEditorSelection: context.markEditorSelection === true,
    doubleClickToSwitchToEditor: context.doubleClickToSwitchToEditor === true,
  };
}

/** How many heading levels the sticky band shows: the setting rounded and clamped to 1..6, else 3. */
export function stickyHeadingDepthOf(context: PreviewRuntimeContext): number {
  const requestedStickyHeadingDepth = context.stickyHeadingDepth;
  return typeof requestedStickyHeadingDepth === "number"
      && Number.isFinite(requestedStickyHeadingDepth)
    ? Math.max(1, Math.min(6, Math.round(requestedStickyHeadingDepth)))
    : 3;
}

/** True on macOS and iOS (Cmd instead of Ctrl); false when the platform cannot be read. */
export function isApplePlatform(): boolean {
  try {
    const browser = typeof navigator === "undefined"
      ? undefined
      : navigator as Navigator & { userAgentData?: { platform?: string } };
    const platform = browser === undefined
      ? ""
      : String((browser.userAgentData && browser.userAgentData.platform) || browser.platform || "");
    return /mac|iphone|ipad/iu.test(platform);
  } catch {
    return false;
  }
}
