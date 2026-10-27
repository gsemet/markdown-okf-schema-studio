/**
 * The state the rendering controller keeps per page: loads, content patches and their
 * acknowledgements, the pending overlay, and the toolbar state a page starts with. The session
 * owns one of each (`src/session/previewSession.ts`); `rendering.ts` works on them.
 */

import type { PaletteMode } from "../../core/configuration/editingConfiguration";
import type { RuntimeContextSettings } from "../../core/preview/contentPatch";

/** Loads, patches and acknowledgements of one page (owned by the rendering controller). */
export interface PageLoadState {
  /** requestId of the stage whose rendered document reported ready in the current webview document. */
  readyRequestId?: number;
  /** requestId of the stage the html of the last document assignment was built for. */
  assignedRequestId?: number;
  /**
   * requestId the page has once it has handled every message sent so far: set when a content patch
   * is posted, cleared when a new document is assigned. The webview handles messages in order, and a
   * patch changes its identifiers synchronously, so a further patch can be addressed to it before
   * the page acknowledged the previous one.
   */
  patchedRequestId?: number;
  /** The record carries the nonce of the loaded document, not one of its own (see freshNonceRecord). */
  recordKeepsLoadedNonce: boolean;
  /** Settings the loaded runtime read at startup; a content patch needs the same ones (T34). */
  loadedContext?: RuntimeContextSettings;
  /** Armed after a content patch: loads the full document when the page never reports ready. */
  contentPatchTimer?: NodeJS.Timeout;
  /** Sequence number of the last properties-table message posted to the loaded page. */
  propertiesTableSeq: number;
  /**
   * Seq of a properties-table message the page may not have applied yet (it echoes the last one it
   * applied on `<html data-okf-properties-seq>`). Cleared by a new document or a content patch,
   * which carry the latest table themselves.
   */
  propertiesTableAwaited?: number;
  /** The folders the page may load files from, as last set on the panel. */
  resourceRoots: readonly string[];
  /** Generation of the deferred work of the current render (link enrichment, PlantUML). */
  enrichmentGeneration: number;
  /**
   * Document revision after the last change made outside the preview, or an undo / redo (CR 046):
   * the content patch that first shows it makes the updated blocks glow.
   */
  outsideChangeVersion?: number;
  /**
   * A change that touched a cursor before any keystroke was seen (CR 139): typing, when the
   * keystroke arrives right after it, an outside change otherwise. Settled by the next patch.
   */
  pendingOutsideChange?: { version: number; at: number };
}

/** The floating pending overlay of one page (D-22). */
export interface OverlayState {
  /** Armed while a render is pending over a rendered page; shows the overlay after the delay. */
  timer?: NodeJS.Timeout;
  /** The delay elapsed while the page was still loading; post the overlay on the next ready report. */
  due: boolean;
  /** The loaded page shows the floating pending overlay. */
  visible: boolean;
  /** Message the overlay shows (the latest pending queue message). */
  message: string;
}

/** A fresh {@link PageLoadState}. */
export function createPageLoadState(): PageLoadState {
  return { recordKeepsLoadedNonce: false, propertiesTableSeq: 0, resourceRoots: [], enrichmentGeneration: 0 };
}

/** A fresh {@link OverlayState}. */
export function createOverlayState(): OverlayState {
  return { due: false, visible: false, message: "" };
}

/** How long a render may stay pending over a rendered page before the overlay appears (D-22). */
export const PENDING_OVERLAY_DELAY_MS = 1_500;

/** How long a patched page may take to report ready before the full document is loaded instead. */
export const CONTENT_PATCH_ACK_TIMEOUT_MS = 2_000;

/** The toolbar state a page starts with. */
export interface ToolbarState {
  pairedTextEditor: boolean;
  initialEditMode: boolean;
  initialPaletteMode: PaletteMode;
  /** False in read-only previews: the page offers no Comment button and no reply box. */
  commentsEnabled: boolean;
  /** Set in read-only previews: why the page offers no editing (the tooltip of a disabled checkbox). */
  readOnlyReason?: string;
}
