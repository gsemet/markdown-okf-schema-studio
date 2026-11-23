/**
 * The blank-line blocks of edit mode: one reachable block for each shown blank line (CommonMark blank
 * lines, or the empty `>` lines of a quote; the separator Markdown needs stays hidden). The host finds
 * the ranges of shown lines and appends them as the last element of the content
 * (`<div hidden data-okf-blank-runs="L-E L-L">`); the page reads the list only there, so authored
 * content cannot forge one. A range is located once, and its blocks (`{ line: n, endLine: n }`, one
 * per line, in line order) all go at that spot. The blocks are the page's own
 * elements (never mapped to a source line, so no other feature takes them for a block of the
 * document): they are made here and tracked here. Where a block goes, and which runs show nothing
 * (a fence, a table, a closed dropdown, a folded section), is decided in `blankRunHosts.ts`: a run
 * inside a container shows inside it, and keeps the line the host reads the container's indent from
 * (`itemLine` for a list item, `containerLine` for any other container).
 */

import { createDeleteBlockButton } from "../modules/deleteBlockButton";
import { type BlankLines, type PageRuntime } from "./pageRuntime";
import { hasClass, locateRun, placeInHost, type Host, type RunLines } from "./blankRunHosts";

const CONTENT_ID = "sphinx-myst-preview-content";
const RUNS_ATTRIBUTE = "data-okf-blank-runs";
const BLOCK_CLASS = "sphinx-preview-blank-lines";
const INSERT_POINT_CLASS = "sphinx-preview-insert-point";
const SELECTED_ATTRIBUTE = "data-sphinx-preview-block-selected";
const RUN_PATTERN = /^([1-9][0-9]{0,8})-([1-9][0-9]{0,8})$/u;

interface Run extends RunLines {
  /** The first line of the range this block came from (its run, for the selection after a delete). */
  first: number;
  /** A run inside a list: the first line of the list item that holds its block. */
  itemLine?: number;
  /** A run inside another container: the line the host reads its indent from. */
  containerLine?: number;
  /** The top-level block that holds the run, for a run inside a container it holds. */
  holder?: HTMLElement;
  /** True for a run shown inside a container (a footnote included). */
  inside?: true;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-266
/** The ranges of the host's list, in order; a malformed or overlapping entry is dropped (a range may be one line). */
function parseRuns(value: string | null): RunLines[] {
  const runs: RunLines[] = [];
  for (const entry of (value ?? "").split(" ")) {
    const match = RUN_PATTERN.exec(entry);
    if (!match) continue;
    const run = { line: Number(match[1]), endLine: Number(match[2]) };
    const last = runs[runs.length - 1];
    if (run.endLine >= run.line && (!last || run.line > last.endLine)) runs.push(run);
  }
  return runs;
}

/** The blank-line blocks of a page. */
export function installBlankLines(rt: PageRuntime): BlankLines {
  const { document, state } = rt;
  const runs = new Map<HTMLElement, Run>();
  let selectedBlock: HTMLElement | undefined;

  // The list of the host: the last element of the content that the page did not make itself.
  function readRuns(): RunLines[] {
    const content = document.getElementById?.(CONTENT_ID);
    const children = Array.from(content?.children ?? []) as HTMLElement[];
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index];
      if (runs.has(child) || hasClass(child, INSERT_POINT_CLASS)) continue;
      return parseRuns(child.getAttribute(RUNS_ATTRIBUTE));
    }
    return [];
  }

  function remove(block: HTMLElement): void {
    if (selectedBlock === block) selectedBlock = undefined;
    runs.delete(block);
    block.remove();
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-268
  function open(block: HTMLElement): void {
    const run = runs.get(block);
    if (!run || !state.editMode || state.activeFrontmatterEdit) return;
    rt.blockEditor.openBlockEditor(
      block,
      undefined,
      {
        line: run.line,
        endLine: run.line,
        insertAfterLine: run.line - 1,
        replaceBlankRun: {
          line: run.line,
          endLine: run.line,
          ...(run.itemLine !== undefined ? { itemLine: run.itemLine } : {}),
          ...(run.containerLine !== undefined ? { containerLine: run.containerLine } : {}),
        },
      },
      "end",
    );
  }

  function create(): HTMLElement {
    const block = document.createElement("div");
    block.className = BLOCK_CLASS;
    block.setAttribute("role", "button");
    block.setAttribute("tabindex", "0");
    block.setAttribute("aria-label", "Blank line. Press Enter to write a block here.");
    block.setAttribute("data-okf-blank-label", "Blank line");
    block.appendChild(createDeleteBlockButton(document, () => {
      rt.selection.requestDeleteBlankLines(block);
    }));
    block.addEventListener("click", (event) => {
      event.preventDefault?.();
      event.stopPropagation?.();
      // Shift+click extends a block selection; a blank-line block never joins it.
      if ((event as MouseEvent).shiftKey) return;
      open(block);
    });
    return block;
  }

  // Puts `block` where its run is: after the insertion bar that follows the block above it, before
  // the "Start writing" entry of an empty body, or first in the content.
  function place(block: HTMLElement, above: HTMLElement | undefined): void {
    const content = document.getElementById?.(CONTENT_ID);
    const points = rt.insertPoints.points();
    const start = points.find((point) => hasClass(point, `${INSERT_POINT_CLASS}--start`));
    const isProperties = above?.getAttribute("data-okf-properties") !== null && above !== undefined;
    if (!above) {
      if (start && start.getAttribute("data-sphinx-insert-after-line") === "0" && !rt.blocks.propertiesSection()) {
        start.insertAdjacentElement("beforebegin", block);
      } else if (rt.blocks.propertiesSection()) {
        const afterProperties = points.find((point) => point.getAttribute("data-sphinx-insert-after-line") === "0");
        if (afterProperties) afterProperties.insertAdjacentElement("afterend", block);
        else content?.insertBefore(block, content.firstChild);
      } else {
        content?.insertBefore(block, content.firstChild);
      }
      return;
    }
    const afterLine = isProperties ? 0 : rt.blocks.blockRange(above).endLine;
    const point = points.find((candidate) => candidate.getAttribute("data-sphinx-insert-after-line") === String(afterLine));
    if (point && start === point) {
      point.insertAdjacentElement("beforebegin", block);
      return;
    }
    (point ?? above.closest?.("pre") ?? above).insertAdjacentElement("afterend", block);
  }

  // True while the block is in the content: a content swap detaches the list that held a block
  // inside a list item, but the block keeps its parent, so the chain of parents is followed.
  function inContent(block: HTMLElement): boolean {
    const content = document.getElementById?.(CONTENT_ID);
    for (let parent = block.parentNode as Node | null; parent; parent = parent.parentNode) {
      if (parent === content) return true;
    }
    return false;
  }

  // The children of a container that are not the page's own: blank-line blocks, editor frame, insertion bars.
  const skipOwn = (child: HTMLElement): boolean =>
    runs.has(child) || child === state.activeBlockEdit?.element || hasClass(child, INSERT_POINT_CLASS);

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-266
  function refresh(): void {
    const editing = state.activeBlockEdit?.replaceBlankRun ? state.activeBlockEdit.target : undefined;
    if (!state.editMode) {
      Array.from(runs.keys()).filter((block) => block !== editing).forEach(remove);
      return;
    }
    const blocks = rt.blocks.topLevelMappedBlocks();
    const kept = new Set<HTMLElement>();
    const put = (block: HTMLElement, spot: NonNullable<ReturnType<typeof locateRun>>, run: RunLines): void => {
      if ("host" in spot) placeInHost(rt, block, spot.host, run, skipOwn);
      else place(block, spot.above);
    };
    // A run shown inside a container is attached while the block is in the document: a content swap
    // detaches the old container, and the block keeps its parent.
    const attached = (block: HTMLElement, run: Run): boolean =>
      run.inside ? inContent(block) : Boolean(block.parentNode);
    const runOfHost = (found: Run, host: Host): Run => ({
      ...found,
      inside: true,
      ...(host.itemLine !== undefined ? { itemLine: host.itemLine } : {}),
      ...(host.containerLine !== undefined ? { containerLine: host.containerLine } : {}),
      ...(host.holder ? { holder: host.holder } : {}),
    });
    if (editing) {
      kept.add(editing as HTMLElement);
      // A swap of the content dropped the block and its editor frame: they go back where the run was.
      const held = runs.get(editing as HTMLElement);
      const frame = state.activeBlockEdit?.element;
      if (held && !attached(editing as HTMLElement, held)) {
        const spot = locateRun(rt, held, blocks);
        if (spot) put(editing as HTMLElement, spot, held);
        if (frame) (editing as HTMLElement).insertAdjacentElement("afterend", frame);
      }
    }
    const existing = new Map<string, HTMLElement>();
    const keyOf = (run: Run): string => `${run.line}-${run.itemLine ?? ""}-${run.containerLine ?? ""}`;
    runs.forEach((run, block) => {
      if (attached(block, run)) existing.set(keyOf(run), block);
    });
    // A block goes right after the previous one of its range (after its editor frame, when it has one).
    const putAfter = (block: HTMLElement, previous: HTMLElement): void => {
      const frame = state.activeBlockEdit?.element;
      const anchor = previous === editing && frame && previous.nextElementSibling === frame ? frame : previous;
      if (anchor.nextElementSibling !== block) anchor.insertAdjacentElement("afterend", block);
    };
    for (const found of readRuns()) {
      const spot = locateRun(rt, found, blocks);
      if (!spot) continue;
      const base: Run = "host" in spot ? runOfHost({ ...found, first: found.line }, spot.host) : { ...found, first: found.line };
      let previous: HTMLElement | undefined;
      for (let line = found.line; line <= found.endLine; line += 1) {
        const run: Run = { ...base, line, endLine: line };
        let block = existing.get(keyOf(run));
        const known = block !== undefined;
        if (!block) {
          block = create();
          existing.set(keyOf(run), block);
        }
        runs.set(block, run);
        kept.add(block);
        if (!known || block !== editing) {
          if (previous) putAfter(block, previous);
          else put(block, spot, found);
        }
        previous = block;
      }
    }
    Array.from(runs.keys()).filter((block) => !kept.has(block)).forEach(remove);
  }

  function select(block: HTMLElement | undefined, scroll = true): void {
    if (selectedBlock && selectedBlock !== block) selectedBlock.removeAttribute(SELECTED_ATTRIBUTE);
    selectedBlock = block;
    if (!block) return;
    block.setAttribute(SELECTED_ATTRIBUTE, "true");
    if (scroll) block.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    block.focus?.({ preventScroll: true });
  }

  // A dropdown that opens or closes shows or hides the blocks inside it. `toggle` does not bubble, so
  // the listener is in the capture phase on the content.
  document.getElementById?.(CONTENT_ID)?.addEventListener("toggle", () => refresh(), true);

  return {
    refresh,
    blocks: () => Array.from(runs.keys()),
    runOf: (block) => runs.get(block as HTMLElement),
    blockOfTarget(target) {
      for (let element = target as HTMLElement | null; element; element = element.parentElement) {
        if (runs.has(element)) return element;
      }
      return undefined;
    },
    selected: () => selectedBlock,
    select,
    open,
  };
}
