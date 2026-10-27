/**
 * The settings a page reads from its boot context, normalized once at startup (the host sends them
 * as they are configured; the page applies the defaults and bounds).
 */

import { readPreviewBootSettings } from "../core/configuration/previewConfiguration";
import type { PreviewRuntimeContext } from "../core/protocol/bootContext";

/** The scroll and reveal settings of a page; the anchor button changes `scrollPreviewWithEditor`. */
export interface PageSettings {
  /** The page follows the text editor's scroll position (default on). */
  scrollPreviewWithEditor: boolean;
  /** The text editor follows the page's scroll position (default on). */
  scrollEditorWithPreview: boolean;
  /** The page marks the block of the editor selection (default off). */
  markEditorSelection: boolean;
}

/** Delay between the last keystroke in a block editor and its autosave. */
export const AUTOSAVE_DELAY_MS = 400;

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-128
/** The scroll and reveal settings of a boot context, read as the settings registry says. */
export function pageSettings(context: PreviewRuntimeContext): PageSettings {
  const boot = readPreviewBootSettings(context);
  return {
    scrollPreviewWithEditor: boot.scrollPreviewWithEditor,
    scrollEditorWithPreview: boot.scrollEditorWithPreview,
    markEditorSelection: boot.markEditorSelection,
  };
}

// @implements_req SwRS-MDOKFSTUDIO-CODE-039
// @implements_req SwRS-MDOKFSTUDIO-CODE-040
/**
 * Sets the code block settings of a boot context as attributes of the root element, where the
 * stylesheet reads them (`data-okf-code-dark-background`, `data-okf-code-line-numbers`).
 */
export function applyCodeBlockSettings(root: Element, context: PreviewRuntimeContext): void {
  const boot = readPreviewBootSettings(context);
  root.setAttribute("data-okf-code-dark-background", boot["codeBlocks.darkBackground"] ? "true" : "false");
  root.setAttribute("data-okf-code-line-numbers", boot["codeBlocks.lineNumbers"] ? "true" : "false");
}

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-022
/** How many heading levels the sticky band shows: the setting rounded and clamped to 1..6, else 3. */
export function stickyHeadingDepthOf(context: PreviewRuntimeContext): number {
  return readPreviewBootSettings(context).stickyHeadingDepth;
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
