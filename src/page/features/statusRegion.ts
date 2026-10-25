/**
 * The status of a rendered page: the floating "Preview pending" overlay (D-22) and the status region
 * a content patch rebuilds (T34). Both are built from plain text (textContent), never from markup.
 */

import type { PreviewContentPatchMessage, PreviewPendingOverlayMessage } from "../../core/protocol/hostToPage";
import type { HostMessageRouter } from "../hostMessages";

/** What the overlay shows: hidden, or a label and a message. */
export type PendingOverlayState = Pick<PreviewPendingOverlayMessage, "visible" | "label" | "message">;

/** The status region fields of a content patch. */
export type StatusRegionState = Pick<PreviewContentPatchMessage, "status" | "label" | "message" | "diagnostics">;

/** The page's status overlay and region. */
export interface StatusRegion {
  /** Shows, updates or removes the pending overlay; a malformed state changes nothing. */
  applyPendingOverlay(state: PendingOverlayState): void;
  /** Replaces the status region at the top of the page. */
  applyStatusRegion(state: StatusRegionState): void;
}

/** Installs the status overlay and region, and handles `previewPendingOverlay`. */
export function installStatusRegion(document: Document, router: HostMessageRouter): StatusRegion {
  // Fixed-position and pointer-transparent, so it never changes layout; the next ready render
  // replaces the whole document, which removes it.
  let pendingOverlay: HTMLElement | null = null;

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-049
  // @implements_req SwRS-MDOKFSTUDIO-LIFE-055
  function applyPendingOverlay(message: PendingOverlayState): void {
    if (typeof message.visible !== "boolean"
      || typeof message.label !== "string" || message.label.length > 500
      || typeof message.message !== "string" || message.message.length > 500) {
      return;
    }
    if (!message.visible) {
      if (pendingOverlay) pendingOverlay.remove();
      pendingOverlay = null;
      return;
    }
    if (!pendingOverlay) {
      pendingOverlay = document.createElement("aside");
      pendingOverlay.setAttribute("data-sphinx-preview-pending-overlay", "");
      pendingOverlay.setAttribute("role", "status");
      pendingOverlay.setAttribute("aria-live", "polite");
      pendingOverlay.appendChild(document.createElement("strong"));
      pendingOverlay.appendChild(document.createElement("span"));
      document.body.appendChild(pendingOverlay);
    }
    pendingOverlay.childNodes[0]!.textContent = message.label;
    pendingOverlay.childNodes[1]!.textContent = message.message;
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-059
  // The status region of a rendered page: label, optional message, optional diagnostics list. Every
  // field is set with textContent.
  function applyStatusRegion(message: StatusRegionState): void {
    const region = document.createElement("aside");
    region.setAttribute("data-sphinx-preview-status", message.status);
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    const label = document.createElement("strong");
    label.textContent = message.label;
    region.appendChild(label);
    if (message.message) {
      const detail = document.createElement("span");
      detail.setAttribute("data-sphinx-preview-status-message", "");
      detail.textContent = message.message;
      region.appendChild(detail);
    }
    if (message.diagnostics.length > 0) {
      const list = document.createElement("ul");
      list.setAttribute("data-sphinx-preview-diagnostics", "");
      message.diagnostics.forEach((entry) => {
        const item = document.createElement("li");
        item.setAttribute("data-sphinx-preview-diagnostic-severity", entry.severity);
        if (entry.code !== undefined) item.setAttribute("data-sphinx-preview-diagnostic-code", entry.code);
        item.textContent = entry.text;
        list.appendChild(item);
      });
      region.appendChild(list);
    }
    document.querySelector("[data-sphinx-preview-status]")?.remove?.();
    document.body.insertBefore(region, document.body.firstChild || null);
  }

  router.on("previewPendingOverlay", (message) => {
    applyPendingOverlay(message);
  });
  return { applyPendingOverlay, applyStatusRegion };
}
