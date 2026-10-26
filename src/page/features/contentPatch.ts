/**
 * The rendered content's life cycle: everything that binds to it at startup and again after an
 * in-place content patch (T34), the patch itself, and `previewReady`. The host sends the sanitized
 * inner HTML of the content container instead of loading a new document; the runtime keeps running
 * and moves to the new render. The status region is rebuilt from plain text and never goes through
 * innerHTML. The patch was validated by the host message filter (src/core/protocol/hostToPage.ts)
 * before it got here.
 */

import { applyFigureSizes } from "../modules/figureSizes";
import { applyLinkHint } from "../modules/linkNavigation";
import { applySpanColors, isSafeOkfColor } from "../modules/spanColors";
import type { ContentPatch, PageRuntime } from "./pageRuntime";

/** The content life cycle of a page. */
export function installContentPatch(rt: PageRuntime): ContentPatch {
  const { document, window, context, host, state } = rt;
  const { editorTrace } = rt.diagnostics;
  // Elements the content initialization has already bound listeners to, so that running it again
  // on content that was partly kept does not register a second listener.
  const initializedImages = new WeakSet<Element>();
  const initializedDetails = new WeakSet<Element>();

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-193
  // @implements_req SwRS-MDOKFSTUDIO-GFM-021
  // @implements_req SwRS-MDOKFSTUDIO-LIFE-069
  const applyContentPatch: ContentPatch["applyContentPatch"] = (message) => {
    const main = document.getElementById?.("sphinx-myst-preview-content");
    if (!main) return;
    const parts = rt.parts;
    const next = message.next;
    // Carried over because the new content starts with everything closed: the open disclosures.
    const openDisclosures = Array.from(document.querySelectorAll("details"))
      .map((element, index) => element.open ? index : undefined)
      .filter((index): index is number => index !== undefined);
    // Target hints the host already gave for links; the new link elements start without them.
    const linkHints = new Map<string, { state: string; title: string | null }>();
    Array.from(document.querySelectorAll("a[data-sphinx-preview-navigation]")).forEach((link) => {
      const request = link.getAttribute("data-sphinx-preview-navigation");
      const linkState = link.getAttribute("data-sphinx-preview-link-state");
      if (request && linkState) linkHints.set(request, { state: linkState, title: link.getAttribute("title") });
    });
    // Editors are closed without cancelling: the document keeps whatever was already saved.
    editorTrace.record("content patch", "request " + context.requestId + " -> " + next.requestId);
    // Whatever the patch closes or restores appears at once; only the updated blocks glow.
    parts.motion.hold();
    state.deferredPropertiesMarkup = undefined;
    rt.frontmatter.closeFrontmatterEditor("content patch");
    state.applyingContentPatch = true;
    rt.blockEditor.closeBlockEdit(false);
    state.applyingContentPatch = false;
    parts.linkTooltip.close();
    // @implements_req SwRS-MDOKFSTUDIO-CODE-017
    parts.codeCopy.hide();
    rt.editMode.setEditHover(undefined);
    parts.checkboxes.clearPending();
    rt.selection.clearBlockSelection(true);
    parts.statusRegion.applyPendingOverlay({ visible: false, label: "", message: "" });
    // Blocks whose HTML did not change stay in place with what the page did to them (PERF-05).
    parts.contentMorph.replace(main, message.contentHtml);
    parts.codeCopy.refresh();
    context.revision = next.revision;
    context.requestId = next.requestId;
    if (next.initialAnchor !== undefined) context.initialAnchor = next.initialAnchor;
    else delete context.initialAnchor;
    if (next.initialPin !== undefined) {
      context.initialPin = { line: next.initialPin.line, viewportTop: next.initialPin.viewportTop };
    } else {
      delete context.initialPin;
    }
    if (openDisclosures.length > 0) context.initialState = { openDisclosures };
    else delete context.initialState;
    document.documentElement.setAttribute("data-sphinx-preview-document-version", String(context.revision));
    document.documentElement.setAttribute("data-sphinx-preview-request-id", String(context.requestId));
    parts.statusRegion.applyStatusRegion(message);
    if (linkHints.size > 0) {
      Array.from(document.querySelectorAll("a[data-sphinx-preview-navigation]")).forEach((link) => {
        const hint = linkHints.get(link.getAttribute("data-sphinx-preview-navigation") as string);
        if (!hint) return;
        applyLinkHint(document, link, hint.state, hint.title ?? "");
      });
    }
    state.pinApplied = false;
    initializeContent({ restore: true });
    parts.linkNavigation.rescan();
    rt.bus.emit("contentReplaced", undefined);
    postPreviewReady();
    rt.selection.applyPendingBlockSelection();
    // Set by the host only when the change came from outside the preview or was an undo / redo.
    parts.motion.glow(message.updatedRanges);
  };

  // Everything that binds to elements of the rendered content. Startup runs it once with
  // restore: true; replacing the content in place runs it again with restore: false. The caller
  // posts previewReady; this function never does.
  function initializeContent(options: { restore: boolean }): void {
    const parts = rt.parts;
    rt.editMode.applyEditMode(state.editMode);
    parts.warningBanner.update();
    parts.checkboxes.initialize();
    parts.stickyBand.updateStickyHeadings();
    rt.input.applyDescriptionVisibility();
    applyFigureSizes(document);
    applySpanColors(document, isSafeOkfColor);
    document.querySelectorAll("img").forEach((image) => {
      if (initializedImages.has(image)) return;
      initializedImages.add(image);
      image.addEventListener("load", rt.scroll.stabilizeLayout, { once: true });
      image.decode?.().then(rt.scroll.stabilizeLayout).catch(() => undefined);
    });
    rt.scroll.markWideTables();
    parts.widthMode.update();
    parts.firstClearance.update();
    parts.tocColumn.refresh();
    parts.chipToggle.apply();
    parts.inlineThreads.apply();
    parts.incomingChanges.apply();
    // Idempotent: puts the last threads back on replaced content; skips blocks being edited.
    parts.commentThreads.apply();
    rt.scroll.measure();
    if (options.restore) {
      rt.scroll.restoreState();
    } else {
      // The startup scan of the link navigation already covered the first content.
      parts.linkNavigation.rescan();
    }
    if (rt.blocks.hasRenderedPreview()) {
      rt.editMode.resumePendingBlockNavigation();
      rt.blockMoves.resumeBlockMove();
      rt.blockMoves.resumeMoveSelection();
    }
    rt.frontmatter.resumePendingFrontmatterEdit();
    document.querySelectorAll("details").forEach((element) => {
      if (initializedDetails.has(element)) return;
      initializedDetails.add(element);
      element.addEventListener("toggle", () => rt.scroll.stateSnapshot(state.anchor?.line ?? rt.scroll.lineAtScroll(window.scrollY)));
    });
  }

  // Reports the page as ready for the current identifiers: at startup and after a content patch.
  function postPreviewReady(): void {
    const readyState = rt.scroll.stateSnapshot(state.anchor?.line ?? rt.scroll.lineAtScroll(window.scrollY));
    host.postMessage({
      type: "previewReady",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      sourceLine: readyState.sourceLine,
      scrollTop: readyState.scrollTop,
      ...(state.pinApplied ? rt.scroll.anchorField() : {}),
      ...(readyState.focusedBlockId ? { focusedBlockId: readyState.focusedBlockId } : {}),
      ...(readyState.selectedText ? { selectedText: readyState.selectedText } : {}),
      ...(readyState.openDisclosures ? { openDisclosures: readyState.openDisclosures } : {}),
      descriptionsCollapsed: state.descriptionsCollapsed,
      // The host holds its edit lock only while this page has an editor open.
      blockEditOpen: state.activeBlockEdit !== undefined,
    });
  }

  return { applyContentPatch, initializeContent, postPreviewReady };
}
