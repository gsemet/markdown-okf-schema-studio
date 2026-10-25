/**
 * The toolbar anchor button: whether the page and the text editor scroll together, and whether a
 * text editor shows the previewed file at all (`previewPairing`).
 */

import type { PreviewRuntimeContext } from "../../core/protocol/bootContext";
import type { HostMessageRouter } from "../hostMessages";
import type { PageHostApi, PageSavedState } from "../pageHost";
import type { PageSettings } from "../pageSettings";

/** What the anchor feature needs from the page. */
export interface AnchorModeDeps {
  readonly host: PageHostApi;
  readonly context: PreviewRuntimeContext;
  /** The page settings; the anchor mode is `scrollPreviewWithEditor`. */
  readonly settings: PageSettings;
  /** The saved state the page started with. */
  readonly savedState: PageSavedState | undefined;
}

/** The anchor feature of a page. */
export interface AnchorMode {
  /** True while the page and the text editor scroll together. */
  anchored(): boolean;
  /** Sets the anchor mode and shows it on the button. */
  applyAnchorMode(enabled: boolean): void;
  /** Enables the button when a text editor shows the file; disabled, it never looks pressed. */
  applyPairing(paired: boolean): void;
  /**
   * Lets the button toggle the mode, and tells the host when the saved state's mode differs from
   * the setting (the host keeps its copy).
   */
  start(): void;
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-170
/**
 * The anchor feature. The first mode is the saved state's, else the setting. Handles
 * `previewPairing`.
 */
export function installAnchorMode(document: Document, router: HostMessageRouter, deps: AnchorModeDeps): AnchorMode {
  const { host, context, settings, savedState } = deps;
  const anchorButton = document.querySelector?.<HTMLButtonElement>("[data-sphinx-preview-anchor]");
  let anchorToEditor: boolean = typeof savedState?.anchorToEditor === "boolean"
    ? savedState.anchorToEditor
    : settings.scrollPreviewWithEditor;

  function applyAnchorMode(enabled: boolean): void {
    anchorToEditor = enabled;
    settings.scrollPreviewWithEditor = enabled;
    anchorButton?.setAttribute?.("data-anchor-mode", enabled ? "on" : "off");
    anchorButton?.setAttribute?.("aria-pressed", String(enabled));
    const tooltip = enabled
      ? "Preview and text editor scroll together"
      : "Preview and text editor scroll independently";
    anchorButton?.setAttribute?.("title", tooltip);
    anchorButton?.setAttribute?.("data-tooltip", tooltip);
  }

  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-120
  function applyPairing(paired: boolean): void {
    if (!anchorButton) return;
    anchorButton.disabled = !paired;
    if (!paired) {
      const tooltip = "No text editor shows this file";
      anchorButton.setAttribute?.("title", tooltip);
      anchorButton.setAttribute?.("data-tooltip", tooltip);
      anchorButton.setAttribute?.("aria-label", tooltip);
      // A disabled button must not look active: the pressed colour applies to aria-pressed="true".
      anchorButton.setAttribute?.("aria-pressed", "false");
      return;
    }
    anchorButton.setAttribute?.("aria-label", "Anchor preview to text editor");
    applyAnchorMode(anchorToEditor);
  }

  function postAnchorModeChanged(): void {
    host.postMessage({
      type: "previewAnchorModeChanged",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      anchorToEditor,
    });
  }

  router.on("previewPairing", (message) => {
    applyPairing(message.pairedTextEditor !== false);
  });
  return {
    anchored: () => anchorToEditor,
    applyAnchorMode,
    applyPairing,
    // @implements_req SwRS-MDOKFSTUDIO-LIFE-169
    start() {
      anchorButton?.addEventListener?.("click", () => {
        applyAnchorMode(!anchorToEditor);
        const state = host.getState?.();
        host.setState?.({
          ...(state && typeof state === "object" ? state : {}),
          anchorToEditor,
        });
        postAnchorModeChanged();
      });
      if (
        typeof savedState?.anchorToEditor === "boolean"
        && savedState.anchorToEditor !== (context.scrollPreviewWithEditor !== false)
      ) {
        postAnchorModeChanged();
      }
    },
  };
}
