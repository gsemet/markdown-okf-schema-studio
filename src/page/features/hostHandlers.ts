/**
 * The handlers of the host messages the runtime's own features answer (the other features register
 * theirs when they are installed: theme, anchor, status region, checkboxes). One handler per type
 * (see `../hostMessages.ts`); a handler that returns `false` leaves the message unhandled.
 */

import type { PageRuntime } from "./pageRuntime";

/** Registers the runtime's host message handlers on its router. */
export function registerHostHandlers(rt: PageRuntime): void {
  const { hostMessages, host, context, state, bus } = rt;
  const parts = rt.parts;
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-191
  hostMessages.on("previewEditorWatch", (message) => {
    // The host holds page updates back until this editor closes (STAB-03): report the close. The
    // editor id is the match; the document id may already be the next document the host follows.
    if (state.activeBlockEdit && state.activeBlockEdit.editId === message.editId) state.activeBlockEdit.reportClose = true;
    else rt.blockEditor.postEditClosed(message.editId);
  });
  hostMessages.on("previewContentPatch", (message) => {
    rt.contentPatch.applyContentPatch(message);
  });
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-193
  // @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-043
  hostMessages.on("previewPropertiesTable", (message) => {
    if (state.activeFrontmatterEdit) {
      rt.diagnostics.editorTrace.record("properties table deferred", "seq " + message.seq);
      state.deferredPropertiesMarkup = message.markup;
      state.deferredPropertiesSeq = message.seq;
      return;
    }
    rt.frontmatter.applyPropertiesMarkup(message.markup, message.seq);
  });
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-003
  hostMessages.on("previewEditCommand", (message) => rt.textControls.runEditCommand(message.command));
  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-156
  hostMessages.on("previewShowComments", (message) => {
    parts.chipToggle.setShowComments(message.showComments !== false);
  });
  hostMessages.on("previewCommentResult", (message) => {
    // The answer to a create or a reply: the compose box and the reply box keep the text until ok.
    if (!parts.commentCompose?.result(message)) parts.commentThreads.result(message);
  });
  hostMessages.on("previewComments", (message) => {
    parts.commentThreads.setThreads(message.threads);
    rt.scroll.measure();
  });
  hostMessages.on("previewIncomingChanges", (message) => {
    parts.incomingChanges.setEnabled(message.enabled !== false);
    parts.incomingChanges.setRanges(message.ranges);
  });
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-205
  hostMessages.on("previewFlushEdit", (message) => {
    // The host is about to switch document: post the final saves, then the answer, in that order.
    const flushId = message.flushId;
    rt.blockEditor.flushOpenEditorsThen((flushed) => host.postMessage({
      type: "previewEditFlushed",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      flushId,
      flushed,
    }));
  });
  hostMessages.on("previewHistoryState", (message) => {
    parts.historyControls.apply(message);
  });
  hostMessages.on("navigateAnchor", (message) => {
    rt.scroll.navigateToAnchor(message);
  });
  // A label rename and a PlantUML include read are matched by edit id; an answer they do not
  // recognise is left to the host round trips (see the `pageHostMessages.listen` call in ../runtime.ts).
  hostMessages.on("previewLabelRenameResult", (message) => parts.labelRename.receive(message));
  // Target hints for the links the page asked about (link discovery, see linkNavigation.ts).
  hostMessages.on("previewLinkTargets", (message) => {
    parts.linkNavigation.applyTargets(message);
  });
  // @implements_req SwRS-MDOKFSTUDIO-TRUST-090
  hostMessages.on("previewPlantUmlIncludeResult", (message) => parts.plantUmlFileRequests.receive(message));
  hostMessages.on("previewPlantUmlIncludesChanged", () => bus.emit("plantUmlIncludesChanged", undefined));
  hostMessages.on("previewBlocksResult", (message) => {
    rt.selection.receiveBlocksResult(message);
  });
  hostMessages.on("previewBlockMoveResult", (message) => {
    rt.blockMoves.receiveBlockMoveResult(message);
  });
  hostMessages.on("previewEditSource", (message) => {
    rt.blockSourceEditor.receiveBlockEditSource(message);
  });
  hostMessages.on("previewFrontmatterResult", (message) => {
    rt.frontmatter.receiveFrontmatterResult(message);
  });
  hostMessages.on("sourceScroll", (message) => {
    rt.scroll.followSourceScroll(message);
  });
}
