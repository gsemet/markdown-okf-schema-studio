/**
 * Block selection in edit mode: a contiguous run of top-level body blocks, built with Shift+click
 * and Shift+Arrow. The model is `modules/blockSelection.ts`; this part reads the blocks from the
 * page, marks them and announces the count. Copy, cut and paste of whole blocks as Markdown
 * (Cmd/Ctrl+C, +X, +V) send source lines to the host, which owns the clipboard and the edit.
 */

import { isApplePlatform } from "../pageSettings";
import type { BlockSelectionView, PageRuntime, SelectionAnchor } from "./pageRuntime";

/** The selection view of a page. */
export function installBlockSelectionView(rt: PageRuntime): BlockSelectionView {
  const { document, window, context, host, state } = rt;
  const { blockSelection } = rt.tools;
  let selectionElements: Element[] = [];
  // The anchor and a pending selection are remembered by position among the body blocks, with the
  // block count they were read at: a line number goes stale when an edit adds or removes lines,
  // and a different block count means the ordinal no longer names the same block.
  let selectionAnchor: SelectionAnchor | undefined;
  let selectionStatus: HTMLElement | undefined;
  let blocksFlight: { timer: number } | undefined;
  let selectionNoticeTimer: number | undefined;

  function syncSelectionModel(): HTMLElement[] {
    const blocks = rt.blocks.selectableBlocks();
    blockSelection.setBlocks(blocks.map((block) => ({
      ...rt.blocks.blockRange(block),
      included: rt.blocks.isIncludedBlock(block),
    })));
    return blocks;
  }

  function ensureSelectionStatus(): HTMLElement {
    if (!selectionStatus) {
      selectionStatus = document.createElement("div");
      selectionStatus.className = "sphinx-preview-selection-status";
      selectionStatus.setAttribute("role", "status");
      selectionStatus.setAttribute("aria-live", "polite");
      document.body?.appendChild(selectionStatus);
    }
    return selectionStatus;
  }

  function announceSelection(count: number): void {
    if (!selectionStatus && count === 0) return;
    ensureSelectionStatus().textContent = count === 0 ? "" : count + (count === 1 ? " block selected" : " blocks selected");
  }

  function renderBlockSelection(blocks: HTMLElement[]): void {
    selectionElements.forEach((element) => element.removeAttribute("data-sphinx-preview-block-selected"));
    selectionElements = blockSelection.indices()
      .map((index) => blocks[index])
      .filter((block): block is HTMLElement => Boolean(block))
      .map((block) => block.closest?.("pre") || block);
    selectionElements.forEach((element) => element.setAttribute("data-sphinx-preview-block-selected", "true"));
    announceSelection(selectionElements.length);
    rt.blockMoves.updateMoveLabels(blocks);
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-148
  // A selection that waits for a save (pendingBlockSelection) survives the patch that clears the
  // old one; every other reason to clear drops it too.
  function clearBlockSelection(keepPending = false): void {
    if (!keepPending) state.pendingBlockSelection = undefined;
    if (!blockSelection.isActive() && selectionElements.length === 0) return;
    blockSelection.clear();
    renderBlockSelection([]);
  }

  function rememberSelectionAnchor(block: Element | undefined): void {
    const blocks = rt.blocks.selectableBlocks();
    const element = block?.closest ? rt.insertPoints.blockOfTarget(block) : block;
    const index = blocks.indexOf(element as HTMLElement);
    selectionAnchor = index >= 0 ? { index, count: blocks.length } : undefined;
  }

  // The block the free end of the selection sits on: gets the focus so the keyboard (and a screen
  // reader) follows it.
  function focusSelectionEnd(blocks: HTMLElement[]): void {
    const anchorIndex = blockSelection.anchorIndex;
    const free = blockSelection.startIndex === anchorIndex ? blockSelection.endIndex : blockSelection.startIndex;
    const block = blocks[free!];
    if (!block) return;
    block.setAttribute("tabindex", "-1");
    block.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    block.focus?.({ preventScroll: true });
  }

  // Shift+click without an open editor: select from the anchor to the clicked block.
  function selectBlocksNow(anchor: SelectionAnchor | undefined, targetIndex: number): void {
    const blocks = syncSelectionModel();
    if (!(targetIndex >= 0 && targetIndex < blocks.length)) return;
    if (!blockSelection.isActive()) {
      const known = anchor && anchor.count === blocks.length && anchor.index < blocks.length;
      blockSelection.setAnchor(known ? anchor.index : targetIndex);
    }
    if (!blockSelection.extendTo(targetIndex)) {
      renderBlockSelection(blocks);
      return;
    }
    renderBlockSelection(blocks);
    window.getSelection?.()?.removeAllRanges?.();
    focusSelectionEnd(blocks);
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-140
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-041
  function selectBlocksTo(node: Element): void {
    const block = rt.insertPoints.blockOfTarget(node);
    if (!block || block.getAttribute("data-okf-properties") !== null) return;
    if (state.activeFrontmatterEdit) return;
    const blocks = rt.blocks.selectableBlocks();
    const targetIndex = blocks.indexOf(block);
    const anchor = blockSelection.isActive() ? undefined : selectionAnchor;
    const edit = state.activeBlockEdit;
    if (edit) {
      // The open editor is saved first; the blocks are selected once its patch is in. The edit
      // may add or remove lines, so the blocks are named by position, not by line.
      if (edit.finishing || rt.blockEditor.postBlockEditSave(true)) {
        state.pendingBlockSelection = { anchor, targetIndex, count: blocks.length };
        return;
      }
      if (state.activeBlockEdit) rt.blockEditor.closeBlockEdit(true);
    }
    selectBlocksNow(anchor, targetIndex);
  }

  // Applied on the first patch after the save. When the edit changed the number of blocks the
  // positions no longer name the same blocks: nothing is selected rather than something else.
  function applyPendingBlockSelection(): void {
    const pending = state.pendingBlockSelection;
    state.pendingBlockSelection = undefined;
    if (!pending || !state.editMode || state.activeBlockEdit) return;
    if (rt.blocks.selectableBlocks().length !== pending.count) return;
    selectBlocksNow(pending.anchor, pending.targetIndex);
  }

  function showSelectionNotice(text: string): void {
    ensureSelectionStatus().textContent = text;
    window.clearTimeout(selectionNoticeTimer);
    selectionNoticeTimer = window.setTimeout(() => announceSelection(selectionElements.length), 4000);
  }

  function clipboardKey(event: KeyboardEvent): "c" | "x" | "v" | undefined {
    if (event.isComposing || event.shiftKey || event.altKey) return undefined;
    const apple = isApplePlatform();
    if (!(apple ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey)) return undefined;
    const key = event.key && event.key !== "Unidentified" ? String(event.key).toLowerCase()
      : (event.code === "KeyC" ? "c" : event.code === "KeyX" ? "x" : event.code === "KeyV" ? "v" : "");
    return key === "c" || key === "x" || key === "v" ? key : undefined;
  }

  function postBlocksMessage(type: string, fields: Record<string, unknown>, element?: Element | null): void {
    const top = element?.getBoundingClientRect?.().top;
    host.postMessage({
      type,
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      ...fields,
      ...(type !== "previewBlocksCopy" && top !== undefined && Number.isFinite(top) && Math.abs(top) <= 100000
        ? { pinViewportTop: top } : {}),
    });
    blocksFlight = { timer: window.setTimeout(() => { blocksFlight = undefined; }, 5000) };
  }

  /** True for a key target that keeps its own keys (a text box, a field, an editor, the properties). */
  function ownsKeys(target: EventTarget | null, selector: string, contentEditable: boolean): boolean {
    return target instanceof Element
      && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
        || (contentEditable && (target as HTMLElement).isContentEditable)
        || Boolean(target.closest(selector)));
  }

  return {
    syncSelectionModel,
    renderBlockSelection,
    clearBlockSelection,
    rememberSelectionAnchor,
    selectBlocksNow,
    selectBlocksTo,
    applyPendingBlockSelection,
    // @implements_req SwRS-MDOKFSTUDIO-BLOCK-169
    receiveBlocksResult(message) {
      if (blocksFlight) window.clearTimeout(blocksFlight.timer);
      blocksFlight = undefined;
      if (message.ok === true) {
        if (message.op === "copy") showSelectionNotice("Copied as Markdown");
        else clearBlockSelection();
        return;
      }
      if (typeof message.reason === "string") showSelectionNotice(message.reason);
    },
    bindKeys() {
      // Shift+Arrow on a focused block or on a selection extends or shrinks it. Alt+Arrow (move) and
      // the Ctrl/Cmd chords are other gestures; the text box, fields and the property table keep
      // their own keys.
      document.addEventListener("keydown", (event) => {
        if (!state.editMode || event.isComposing || !event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        if (state.activeBlockEdit || state.activeFrontmatterEdit) return;
        const target = event.target;
        if (ownsKeys(target, "[data-sphinx-preview-block-editor], [data-okf-properties], [data-okf-frontmatter-editor]", true)) return;
        const focused = target instanceof Element ? rt.insertPoints.blockOfTarget(target) : undefined;
        // With a selection the keys are ours only on a block, an insertion bar or the page itself:
        // toolbar buttons and menus keep their arrow keys.
        if (!focused && target instanceof Element
          && target !== document.body && target !== document.documentElement
          && !target.closest(".sphinx-preview-insert-point")) return;
        const blocks = syncSelectionModel();
        if (!blockSelection.isActive() && (!focused || focused.getAttribute("data-okf-properties") !== null)) return;
        const index = focused ? blocks.indexOf(focused) : -1;
        if (!blockSelection.isActive() && index < 0) return;
        event.preventDefault?.();
        event.stopPropagation?.();
        blockSelection.extendBy(event.key === "ArrowUp" ? -1 : 1, index);
        renderBlockSelection(blocks);
        if (blockSelection.isActive()) {
          rememberSelectionAnchor(blocks[blockSelection.anchorIndex!]);
          focusSelectionEnd(blocks);
        }
      });

      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !blockSelection.isActive()) return;
        if (ownsKeys(event.target, "[data-sphinx-preview-block-editor], [data-okf-frontmatter-editor]", false)) return;
        event.preventDefault?.();
        clearBlockSelection();
      });

      // @implements_req SwRS-MDOKFSTUDIO-BLOCK-166
      // @implements_req SwRS-MDOKFSTUDIO-BLOCK-174
      // @implements_req SwRS-MDOKFSTUDIO-BLOCK-127
      // With a block selection Cmd/Ctrl+C and +X send its source lines to the host; Cmd/Ctrl+V
      // pastes after the selection or after the block of a focused "+" bar.
      document.addEventListener("keydown", (event) => {
        const key = clipboardKey(event);
        if (!key || !state.editMode || state.activeBlockEdit || state.activeFrontmatterEdit) return;
        const target = event.target;
        if (ownsKeys(target, "[data-sphinx-preview-block-editor], [data-okf-properties], [data-okf-frontmatter-editor]", true)) return;
        const blocks = syncSelectionModel();
        const range = blockSelection.isActive() ? blockSelection.range() : undefined;
        const point = target instanceof Element ? target.closest(".sphinx-preview-insert-point") : null;
        if (key !== "v" && !range) return;
        if (key === "v" && !range && !point) return;
        event.preventDefault?.();
        event.stopPropagation?.();
        if (blocksFlight) return;
        if (key === "c" && range) {
          postBlocksMessage("previewBlocksCopy", { line: range.line, endLine: range.endLine });
        } else if (key === "x" && range) {
          postBlocksMessage("previewBlocksCut", { line: range.line, endLine: range.endLine },
            blocks[blockSelection.startIndex!]?.closest?.("pre") || blocks[blockSelection.startIndex!]);
        } else if (key === "v") {
          const move = point ? rt.insertPoints.moves.get(point) : undefined;
          if (!range && move && rt.blocks.isIncludedBlock(move.block)) {
            showSelectionNotice("Text cannot be pasted next to a block that comes from an included file.");
            return;
          }
          const anchorBlock = range ? blocks[blockSelection.endIndex!] : move?.block;
          const afterLine = range ? range.endLine : Number(point!.getAttribute("data-sphinx-insert-after-line"));
          if (!Number.isSafeInteger(afterLine) || afterLine < 0) return;
          postBlocksMessage("previewBlocksPaste", {
            insertAfterLine: afterLine,
            ...(anchorBlock ? { pinLine: rt.blocks.blockRange(anchorBlock).line } : {}),
          }, anchorBlock?.closest?.("pre") || anchorBlock);
        }
      });

      // Shift+mousedown on a block would extend the browser's text selection under the block
      // selection; edit mode already turns a click into an edit, so the native range adds nothing.
      document.addEventListener("mousedown", (event) => {
        if (!state.editMode || !event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
        const target = event.target;
        if (!(target instanceof Element)
          || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)
          || target.closest("a")
          || target.closest("[data-okf-properties], [data-sphinx-preview-block-editor], .sphinx-preview-insert-point")) return;
        if (!rt.insertPoints.blockOfTarget(target)) return;
        event.preventDefault?.();
      });
    },
  };
}
