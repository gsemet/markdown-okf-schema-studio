/**
 * Files dragged from the VS Code Explorer onto the preview in edit mode (CR 146). While they are
 * over the page, the insertion bar nearest to the pointer shows a drop marker; dropped, their
 * `file:` addresses go to the host, which writes one relative link or image per file as a new block
 * after that bar's line. Nothing happens when a block editor is open (its text box keeps the
 * browser's own drop), outside edit mode, or for a drag that carries no files.
 */

import { carriesFiles, droppedFileUris, nearestPointIndex } from "../modules/dropFiles";
import type { FileDrop, PageRuntime } from "./pageRuntime";

const MARKER_CLASS = "sphinx-preview-insert-point--drop";

/** The file drop of a page. */
export function installFileDrop(rt: PageRuntime): FileDrop {
  const { document, state, host, context } = rt;
  let marked: HTMLElement | undefined;

  function clearMarker(): void {
    if (marked) marked.className = marked.className.split(" ").filter((name) => name !== MARKER_CLASS).join(" ");
    marked = undefined;
  }

  function accepts(event: DragEvent): boolean {
    return state.editMode && !state.activeBlockEdit && !state.activeFrontmatterEdit && carriesFiles(event.dataTransfer);
  }

  /** The insertion bar nearest to the pointer, or undefined when the page has none. */
  function nearestPoint(clientY: number): HTMLElement | undefined {
    const points = rt.insertPoints.points();
    const index = nearestPointIndex(points.map((point) => point.getBoundingClientRect().top), clientY);
    return points[index];
  }

  return {
    // @implements_req SwRS-MDOKFSTUDIO-PALETTE-004
    bindEvents() {
      const over = (event: DragEvent): void => {
        if (!accepts(event)) return;
        event.preventDefault?.();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
        const point = nearestPoint(event.clientY);
        if (point === marked) return;
        clearMarker();
        if (point) point.className += " " + MARKER_CLASS;
        marked = point;
      };
      document.addEventListener("dragenter", over);
      document.addEventListener("dragover", over);
      document.addEventListener("dragleave", (event) => {
        // Leaving the window (no element under the pointer) takes the marker away.
        if (event.relatedTarget === null || event.relatedTarget === undefined) clearMarker();
      });
      document.addEventListener("dragend", clearMarker);
      document.addEventListener("drop", (event) => {
        if (!accepts(event)) {
          clearMarker();
          return;
        }
        event.preventDefault?.();
        const point = nearestPoint(event.clientY);
        const uris = droppedFileUris(event.dataTransfer);
        clearMarker();
        if (!point || uris.length === 0) return;
        const afterLine = Number(point.getAttribute("data-sphinx-insert-after-line"));
        if (!Number.isSafeInteger(afterLine) || afterLine < 0) return;
        const move = rt.insertPoints.moves.get(point);
        const top = move?.block.getBoundingClientRect?.().top;
        host.postMessage({
          type: "previewDropFiles",
          documentId: context.documentId,
          revision: context.revision,
          requestId: context.requestId,
          insertAfterLine: afterLine,
          uris,
          ...(move ? { pinLine: rt.blocks.blockRange(move.block).line } : {}),
          ...(top !== undefined && Number.isFinite(top) && Math.abs(top) <= 100000 ? { pinViewportTop: top } : {}),
        });
      });
    },
  };
}
