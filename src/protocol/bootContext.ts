/**
 * The boot context of a preview page: what the host tells a page about its render and settings
 * before the page runtime starts. It travels as data, never as code: the host writes it as inert
 * JSON in a `<script type="application/json">` element marked with {@link RUNTIME_CONTEXT_ATTRIBUTE},
 * placed before the runtime script, and the runtime reads it first (see `src/page/main.ts`). Pure
 * module: no host API, no DOM, no Node built-ins.
 */

import type { ViewPreferences } from "../state/previewViewPreferences";
import type { PreviewThemeMode } from "../state/previewTheme";
import type { PreviewPanelState } from "../state/previewState";
import type { Revision } from "./revision";

/** The render a page shows: the identity every page message carries (see `./envelope.ts`). */
export interface ScrollContext {
  /** The document the render belongs to (the host's document key, a URI string). */
  documentId: string;
  /** The revision of the document text the render was made from (see src/protocol/revision.ts). */
  revision: Revision;
  /** The render request; a new render of the same revision has another one. */
  requestId: number;
}

/** The boot context of a page: its render identity, the source file and the settings it starts with. */
export interface PreviewRuntimeContext extends ScrollContext {
  /** The file system path of the previewed document. */
  activeSourceFile: string;
  /** The theme mode the page starts in (the toolbar theme button; saved state wins). */
  previewThemeMode?: PreviewThemeMode;
  /** The per-workspace view preferences; the webview's own saved state wins (zoom). */
  initialViewPreferences?: ViewPreferences;
  /** False: the page does not follow the text editor's scroll position. */
  scrollPreviewWithEditor?: boolean;
  /** False: the text editor does not follow the page's scroll position. */
  scrollEditorWithPreview?: boolean;
  /** True: the page marks the block of the editor selection. */
  markEditorSelection?: boolean;
  /** True: a double click in the page reveals the source line in the text editor. */
  doubleClickToSwitchToEditor?: boolean;
  /** How many heading levels the sticky heading bar shows (the page clamps it to 1..6, default 3). */
  stickyHeadingDepth?: number;
  /** True in writable previews: the page offers the Comment button and the reply box (T43). */
  commentsEnabled?: boolean;
  /** The name a new inline comment thread starts with (comments.authorName, else the Git user). */
  threadAuthor?: string;
  /** False hides the gray comment chips (preview.showComments). */
  showComments?: boolean;
  /** The host's color theme kind (VS Code `ColorThemeKind` numbering). */
  themeKind?: number;
  /** False when no visible text editor shows the previewed document. */
  pairedTextEditor?: boolean;
  /** The workspace-wide edit mode choice, used when the webview has no saved state. */
  initialEditMode?: boolean;
  /** The workspace's palette mode (stored choice, else the setting); saved state wins on load. */
  initialPaletteMode?: "strict" | "gfm" | "myst";
  /** Fractional source line to show at the preview reading line on load (see anchorPolicy). */
  initialAnchor?: number;
  /** Set after an inline save: the edited element's source line and viewport top (rule R7). */
  initialPin?: { line: number; viewportTop: number };
  /** CR 050: the key of the warning set whose banner the user closed for this document. */
  dismissedWarningBanner?: string;
  /** CR 050: false in Restricted Mode, where the Problems view does not list the conf.py warnings. */
  warningsInProblems?: boolean;
  /** The panel state the page restores (scroll, focus, selection, open disclosures). */
  initialState?: Pick<PreviewPanelState, "sourceLine" | "scrollTop" | "focusedBlockId" | "selectedText" | "openDisclosures" | "descriptionsCollapsed">;
}

/**
 * Marks the `<script type="application/json">` element that carries the boot context of a page
 * (PERF-11). The page runtime is one cacheable file; only this element changes between renders.
 */
export const RUNTIME_CONTEXT_ATTRIBUTE = "data-sphinx-preview-runtime-context";

/** JSON of a boot context that is safe inside a `<script>` element (no `</script>`). */
export function serializeRuntimeContext(context: PreviewRuntimeContext): string {
  return JSON.stringify(context).replace(/</gu, "\\u003c");
}
