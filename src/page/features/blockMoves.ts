/**
 * Moves of blocks in edit mode (backlog move-block-up-down): the two move buttons of a body block's
 * insertion bar, Alt+Up/Down on a focused block, the move chord of the block text box, and moves of
 * a whole block selection. The host swaps the block with its neighbour (`previewBlockMove`) and
 * re-checks every range it is sent; the page then focuses, edits or selects the moved blocks at
 * their new place.
 */

import { STALE_REQUEST } from "../../core/protocol/staleRequest";
import { isApplePlatform } from "../pageSettings";
import type { BlockMoves, InsertMove, PageRuntime, PendingMoveSelection } from "./pageRuntime";

/** How long a moved selection waits for the render of its move. */
const MOVE_SELECTION_MAX_AGE = 5000;

/** The labels of the two move buttons of an insertion bar. */
const MOVE_BUTTON_SPECS = [
  { direction: "up", label: "Move the block above up", text: "↑" },
  { direction: "down", label: "Move the block above down", text: "↓" },
] as const;

/** A keyboard move waiting for its result and render. */
interface BlockMoveFlight {
  mode: "edit" | "focus" | "select";
  caretOffset: number | undefined;
  line: number;
  version: number;
  timer: number;
  newLine?: number;
}

/** The last single-block move sent, to send it once more when the host held an older render. */
interface SentMove {
  line: number;
  direction: "up" | "down";
  revision: number;
  retried: boolean;
}

/** A refused-as-stale move waiting for the next render. */
interface StaleRetry {
  move: SentMove;
  timer: number;
}

/** The block moves of a page. */
export function installBlockMoves(rt: PageRuntime): BlockMoves {
  const { document, window, context, host, state } = rt;
  const { blockSelection } = rt.tools;
  let moveStatusTimer: number | undefined;
  // The keyboard path (Alt+Up/Down, and the text-box chord): one move at a time. The page keeps
  // the old block ranges until the render of the move arrives, so a second request in between
  // (key repeat) would be stale; it is dropped until the result and the render are in.
  let blockMoveInFlight: BlockMoveFlight | undefined;
  // A move the host refused as stale is sent once more after the next render, before any message.
  let lastMove: SentMove | undefined;
  let staleRetry: StaleRetry | undefined;

  let retrying = false;

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-041
  function postBlockMove(block: HTMLElement, neighbour: HTMLElement, direction: "up" | "down",
    span?: { line: number; endLine: number }): boolean {
    if (!state.editMode || state.activeBlockEdit || state.activeFrontmatterEdit) return false;
    const own = span || rt.blocks.blockRange(block);
    const other = rt.blocks.blockRange(neighbour);
    const top = (block.closest?.("pre") || block).getBoundingClientRect?.().top;
    if (!span) {
      lastMove = { line: own.line, direction, revision: context.revision, retried: retrying };
    } else {
      lastMove = undefined;
    }
    host.postMessage({
      type: "previewBlockMove",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      line: own.line,
      endLine: own.endLine,
      neighbourLine: other.line,
      neighbourEndLine: other.endLine,
      direction,
      ...(top !== undefined && Number.isFinite(top) && Math.abs(top) <= 100000 ? { pinViewportTop: top } : {}),
    });
    return true;
  }

  function dropStaleRetry(): void {
    if (!staleRetry) return;
    window.clearTimeout(staleRetry.timer);
    staleRetry = undefined;
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-129
  // The host held an older render than the one the move was made on. Send the move again, once,
  // from the blocks of the render that is in (now, or when it arrives).
  function scheduleStaleRetry(): boolean {
    if (!lastMove || lastMove.retried) return false;
    dropStaleRetry();
    const move = lastMove;
    staleRetry = {
      move,
      timer: window.setTimeout(() => {
        staleRetry = undefined;
        finishMoveRefusal(STALE_REQUEST);
      }, 5000),
    };
    if (context.revision !== move.revision) runStaleRetry();
    return true;
  }

  function runStaleRetry(): void {
    const pending = staleRetry;
    if (!pending) return;
    dropStaleRetry();
    const block = rt.blocks.bodyBlockAtLine(pending.move.line);
    const neighbour = block && bodyBlockNeighbour(block, pending.move.direction);
    retrying = true;
    let sent = false;
    try {
      sent = Boolean(block && neighbour && postBlockMove(block, neighbour, pending.move.direction));
    } finally {
      retrying = false;
    }
    if (sent) {
      if (lastMove) lastMove.retried = true;
      if (blockMoveInFlight) blockMoveInFlight.version = context.revision;
      return;
    }
    finishMoveRefusal(STALE_REQUEST);
  }

  function clearBlockMoveInFlight(): BlockMoveFlight | undefined {
    if (!blockMoveInFlight) return undefined;
    const flight = blockMoveInFlight;
    window.clearTimeout(flight.timer);
    blockMoveInFlight = undefined;
    return flight;
  }

  function bodyBlockNeighbour(block: HTMLElement, direction: "up" | "down"): HTMLElement | undefined {
    const body = rt.blocks.topLevelMappedBlocks().filter((candidate) =>
      candidate.getAttribute("data-okf-properties") === null);
    const index = body.indexOf(block);
    if (index < 0) return undefined;
    const neighbour = body[index + (direction === "up" ? -1 : 1)];
    if (!neighbour || rt.blocks.isIncludedBlock(block) || rt.blocks.isIncludedBlock(neighbour)) return undefined;
    return neighbour;
  }

  function requestBlockMove(block: HTMLElement, direction: "up" | "down", mode: "edit" | "focus",
    caretOffset?: number): boolean {
    if (blockMoveInFlight) return false;
    const neighbour = bodyBlockNeighbour(block, direction);
    if (!neighbour || !postBlockMove(block, neighbour, direction)) return false;
    startBlockMoveFlight(mode, caretOffset, rt.blocks.blockRange(block).line);
    return true;
  }

  function startBlockMoveFlight(mode: BlockMoveFlight["mode"], caretOffset: number | undefined, line: number): void {
    blockMoveInFlight = {
      mode,
      caretOffset,
      line,
      version: context.revision,
      timer: window.setTimeout(() => {
        blockMoveInFlight = undefined;
        setPendingMoveSelection(undefined);
      }, 5000),
    };
  }

  function setPendingMoveSelection(next: PendingMoveSelection | undefined): void {
    state.pendingMoveSelection = next;
    const saved = host.getState?.() ?? {};
    const { pendingMoveSelection: _previous, ...rest } = saved;
    host.setState?.(next ? { ...rest, pendingMoveSelection: next } : rest);
  }

  // Alt+Up/Down and the arrows of the last selected block move the whole selection past the
  // block beside it. The span goes to the host as one range; the selection is restored one block
  // up or down, by ordinal (the block count must be unchanged), once the render is in.
  // The keyboard takes the selection when focus is on one of its blocks (or a bar of one) or on
  // the page itself; a focused block outside the selection keeps the single-block move.
  function selectionMoveOwns(block: HTMLElement | undefined): boolean {
    if (!blockSelection.isActive()) return false;
    const blocks = rt.selection.syncSelectionModel();
    return !block || blockSelection.indices().some((index) => blocks[index] === block);
  }

  // The arrows of the bar under the selection's last block move the whole selection.
  function selectionEndsAt(block: HTMLElement): boolean {
    if (!blockSelection.isActive()) return false;
    return rt.selection.syncSelectionModel()[blockSelection.endIndex!] === block;
  }

  function updateMoveLabels(blocks: HTMLElement[]): void {
    rt.insertPoints.moves.forEach((move, point) => {
      const owns = blockSelection.isActive() && blocks[blockSelection.endIndex!] === move.block;
      Array.from((point.childNodes ?? (point as { childElements?: HTMLCollection }).childElements ?? []) as ArrayLike<Node>)
        .forEach((node) => {
          const button = node as Element;
          const direction = button.getAttribute?.("data-sphinx-move");
          if (!direction) return;
          const spec = MOVE_BUTTON_SPECS.find((candidate) => candidate.direction === direction)!;
          const label = owns ? "Move the selected blocks " + direction : spec.label;
          button.setAttribute("aria-label", label);
          if (owns) button.setAttribute("title", label);
          else button.removeAttribute("title");
        });
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-156
  function requestSelectionMove(direction: "up" | "down"): boolean {
    if (blockMoveInFlight) return false;
    const blocks = rt.selection.syncSelectionModel();
    if (!blockSelection.isActive()) return false;
    const start = blockSelection.startIndex!;
    const end = blockSelection.endIndex!;
    const step = direction === "up" ? -1 : 1;
    const neighbour = blocks[direction === "up" ? start - 1 : end + 1];
    if (!neighbour || rt.blocks.isIncludedBlock(neighbour)) return false;
    const anchorIndex = blockSelection.anchorIndex!;
    const freeIndex = start === anchorIndex ? end : start;
    const first = blocks[start]!;
    if (!postBlockMove(first, neighbour, direction, blockSelection.range())) return false;
    startBlockMoveFlight("select", undefined, rt.blocks.blockRange(first).line);
    setPendingMoveSelection({
      anchor: anchorIndex + step,
      target: freeIndex + step,
      count: blocks.length,
      documentId: context.documentId,
      version: context.revision,
      at: Date.now(),
    });
    return true;
  }

  // The move is rendered: select the same blocks at their new place. A different block count
  // means the ordinals no longer name the same blocks, so nothing is selected.
  function applyMoveSelection(): void {
    const pending = state.pendingMoveSelection;
    if (!pending) return;
    setPendingMoveSelection(undefined);
    if (!(Date.now() - pending.at < MOVE_SELECTION_MAX_AGE)) return;
    if (!state.editMode || state.activeBlockEdit || pending.documentId !== context.documentId) return;
    if (rt.blocks.selectableBlocks().length !== pending.count) return;
    rt.selection.selectBlocksNow({ index: pending.anchor, count: pending.count }, pending.target);
  }

  function settleBlockMove(block: HTMLElement | undefined, flight: BlockMoveFlight): void {
    if (flight.mode === "select") {
      applyMoveSelection();
      return;
    }
    if (!block) return;
    if (flight.mode === "edit") {
      rt.editMode.openMappedEditor(block, block, { offset: flight.caretOffset }, false);
      return;
    }
    block.setAttribute("tabindex", "-1");
    block.focus?.({ preventScroll: true });
  }

  // The move is done and its render is in: focus or edit the block at its new place.
  function resumeBlockMove(): void {
    if (staleRetry && context.revision !== staleRetry.move.revision) runStaleRetry();
    const flight = blockMoveInFlight;
    if (!flight || flight.newLine === undefined || context.revision === flight.version) return;
    if (!state.editMode) return;
    clearBlockMoveInFlight();
    settleBlockMove(rt.blocks.bodyBlockAtLine(flight.newLine), flight);
  }

  // A refused move says why next to the bar it came from.
  function finishMoveRefusal(reason: string | undefined): void {
    const flight = clearBlockMoveInFlight();
    if (flight?.mode === "select") setPendingMoveSelection(undefined);
    else if (flight) settleBlockMove(rt.blocks.bodyBlockAtLine(flight.line), flight);
    if (reason === undefined) return;
    const points = rt.insertPoints.points();
    let point = points.find((candidate) =>
      candidate.getAttribute("data-sphinx-move-pending") === "true");
    points.forEach((candidate) => candidate.removeAttribute("data-sphinx-move-pending"));
    // A key press marks no bar: the reason goes to the bar under the block (or selection) moved.
    const line = flight?.line ?? lastMove?.line;
    if (!point && (flight || line !== undefined)) {
      const moved = flight?.mode === "select"
        ? (blockSelection.isActive() ? rt.selection.syncSelectionModel()[blockSelection.endIndex!] : undefined)
        : (line === undefined ? undefined : rt.blocks.bodyBlockAtLine(line));
      point = points.find((candidate) => rt.insertPoints.moves.get(candidate)?.block === moved);
    }
    if (!point) return;
    point.querySelector?.(".sphinx-preview-move-status")?.remove?.();
    const status = document.createElement("span");
    status.className = "sphinx-preview-move-status";
    status.setAttribute("role", "status");
    status.textContent = reason;
    point.appendChild(status);
    window.clearTimeout(moveStatusTimer);
    moveStatusTimer = window.setTimeout(() => status.remove(), 6000);
  }

  function moveChordDirection(event: KeyboardEvent, inEditor: boolean): "up" | "down" | undefined {
    if (event.isComposing || event.shiftKey || !event.altKey) return undefined;
    // AltGr reports ctrlKey and altKey together on Windows and Linux layouts: it is no chord.
    if (event.getModifierState?.("AltGraph") === true) return undefined;
    const key = event.key === "ArrowUp" || event.key === "ArrowDown" ? event.key
      : (!event.key || event.key === "Unidentified" ? event.code : undefined);
    const direction = key === "ArrowUp" ? "up" : key === "ArrowDown" ? "down" : undefined;
    if (!direction) return undefined;
    if (!inEditor) return event.ctrlKey || event.metaKey ? undefined : direction;
    const apple = isApplePlatform();
    return (apple ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey)
      ? direction : undefined;
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-109
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-127
  function addMoveButtons(point: HTMLElement, move: InsertMove): void {
    rt.insertPoints.moves.set(point, move);
    MOVE_BUTTON_SPECS.forEach((spec) => {
      const neighbour = spec.direction === "up" ? move.previous : move.next;
      const button = document.createElement("button");
      button.className = "sphinx-preview-move sphinx-preview-move--" + spec.direction;
      button.setAttribute("type", "button");
      button.setAttribute("aria-label", spec.label);
      button.setAttribute("data-sphinx-move", spec.direction);
      button.textContent = spec.text;
      if (!neighbour || rt.blocks.isIncludedBlock(move.block) || rt.blocks.isIncludedBlock(neighbour)) {
        button.setAttribute("disabled", "");
      }
      button.addEventListener("click", (event) => {
        event.preventDefault?.();
        event.stopPropagation?.();
        if (selectionEndsAt(move.block)) {
          if (requestSelectionMove(spec.direction)) point.setAttribute("data-sphinx-move-pending", "true");
          return;
        }
        if (button.getAttribute("disabled") !== null || !neighbour) return;
        if (postBlockMove(move.block, neighbour, spec.direction)) {
          point.setAttribute("data-sphinx-move-pending", "true");
        }
      });
      point.appendChild(button);
    });
  }

  return {
    inFlight: () => Boolean(blockMoveInFlight),
    requestBlockMove,
    bodyBlockNeighbour,
    moveChordDirection,
    updateMoveLabels,
    addMoveButtons,
    resumeBlockMove,
    // A full reload has no move in flight any more; the saved state still names the selection.
    resumeMoveSelection() {
      const pending = state.pendingMoveSelection;
      if (!pending || blockMoveInFlight) return;
      // The same version after a reload means the move never landed (a lost flight cannot be
      // completed): forget it, so it cannot select blocks after some later edit.
      if (context.revision === pending.version) {
        setPendingMoveSelection(undefined);
        return;
      }
      applyMoveSelection();
    },
    // A refused move says why next to the bar it came from; a done move re-renders the page.
    receiveBlockMoveResult(message) {
      if (message.ok === true) {
        if (blockMoveInFlight && Number.isSafeInteger(message.line)) {
          blockMoveInFlight.newLine = message.line;
          resumeBlockMove();
        }
        return;
      }
      if (message.ok === false && message.reason === STALE_REQUEST && scheduleStaleRetry()) return;
      dropStaleRetry();
      finishMoveRefusal(message.ok === false && typeof message.reason === "string" ? message.reason : undefined);
    },
    // @implements_req SwRS-MDOKFSTUDIO-BLOCK-130
    bindKeys() {
      // Alt+Up/Down on a focused block or insertion bar moves the block like its arrow buttons.
      document.addEventListener("keydown", (event) => {
        const direction = moveChordDirection(event, false);
        if (!direction || !state.editMode || state.activeBlockEdit || state.activeFrontmatterEdit) return;
        const target = event.target;
        if (!(target instanceof Element)
          || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
          || (target as HTMLElement).isContentEditable
          || target.closest("[data-sphinx-preview-block-editor], [data-okf-properties]")) return;
        const block = rt.insertPoints.blockOfTarget(target);
        const owner = !block && (target === document.body || target === document.documentElement);
        if (!block && !(owner && blockSelection.isActive())) return;
        event.preventDefault?.();
        event.stopPropagation?.();
        if (event.repeat && blockMoveInFlight) return;
        if (selectionMoveOwns(block)) {
          requestSelectionMove(direction);
          return;
        }
        if (block) requestBlockMove(block, direction, "focus");
      });
    },
  };
}
