/**
 * The blank-lines blocks of edit mode: one reachable block for each run of two or more blank lines.
 * The host finds the runs and appends them as the last element of the content
 * (`<div hidden data-okf-blank-runs="L-E L-E">`); the page reads the list only there, so authored
 * content cannot forge a run. The blocks are the page's own elements (never mapped to a source line,
 * so no other feature takes them for a block of the document): they are made here and tracked here.
 * A run inside a block that is not a list, or next to a folded section, gets no block; a run inside
 * a top-level list shows inside the list item that holds it, and keeps that item's first line
 * (`itemLine`) so the host can indent a block typed there.
 */

import { createDeleteBlockButton } from "../modules/deleteBlockButton";
import { MAPPINGS_SELECTOR, type BlankLines, type PageRuntime } from "./pageRuntime";

const CONTENT_ID = "sphinx-myst-preview-content";
const RUNS_ATTRIBUTE = "data-okf-blank-runs";
const BLOCK_CLASS = "sphinx-preview-blank-lines";
const INSERT_POINT_CLASS = "sphinx-preview-insert-point";
const SELECTED_ATTRIBUTE = "data-sphinx-preview-block-selected";
const RUN_PATTERN = /^([1-9][0-9]{0,8})-([1-9][0-9]{0,8})$/u;

interface Run {
  line: number;
  endLine: number;
  /** A run inside a list: the first line of the list item that holds its block. */
  itemLine?: number;
}

/** Where the block of a run goes: inside a list item, after the block above, or nowhere. */
type Spot = { item: HTMLElement } | { above: HTMLElement | undefined } | undefined;

const holds = (range: Run, run: Run): boolean => range.line < run.line && run.endLine < range.endLine;

const hasClass = (element: Element, name: string): boolean =>
  String(element.className ?? "").split(" ").includes(name);

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-266
/** The runs of the host's list, in order; a malformed or overlapping entry is dropped. */
function parseRuns(value: string | null): Run[] {
  const runs: Run[] = [];
  for (const entry of (value ?? "").split(" ")) {
    const match = RUN_PATTERN.exec(entry);
    if (!match) continue;
    const run = { line: Number(match[1]), endLine: Number(match[2]) };
    const last = runs[runs.length - 1];
    if (run.endLine > run.line && (!last || run.line > last.endLine + 1)) runs.push(run);
  }
  return runs;
}

/** The blank-lines blocks of a page. */
export function installBlankLines(rt: PageRuntime): BlankLines {
  const { document, state } = rt;
  const runs = new Map<HTMLElement, Run>();
  let selectedBlock: HTMLElement | undefined;

  // The list of the host: the last element of the content that the page did not make itself.
  function readRuns(): Run[] {
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
        endLine: run.endLine,
        insertAfterLine: run.line - 1,
        replaceBlankRun: {
          line: run.line,
          endLine: run.endLine,
          ...(run.itemLine !== undefined ? { itemLine: run.itemLine } : {}),
        },
      },
      "end",
    );
  }

  function create(run: Run): HTMLElement {
    const block = document.createElement("div");
    block.className = BLOCK_CLASS;
    block.setAttribute("role", "button");
    block.setAttribute("tabindex", "0");
    const count = run.endLine - run.line + 1;
    block.setAttribute("aria-label", `Blank lines, ${count} lines. Press Enter to write a block here.`);
    block.setAttribute("data-okf-blank-label", `Blank lines (${count})`);
    block.appendChild(createDeleteBlockButton(document, () => {
      rt.selection.requestDeleteBlankLines(block);
    }));
    block.addEventListener("click", (event) => {
      event.preventDefault?.();
      event.stopPropagation?.();
      // Shift+click extends a block selection; a blank-lines block never joins it.
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

  const lineOf = (element: Element): number => {
    const own = element.getAttribute("data-sphinx-source-line");
    const line = Number(own ?? element.querySelectorAll(MAPPINGS_SELECTOR)[0]?.getAttribute("data-sphinx-source-line"));
    return Number.isSafeInteger(line) && line >= 1 ? line : Number.NaN;
  };

  // True while the block is in the content: a content swap detaches the list that held a block
  // inside a list item, but the block keeps its parent, so the chain of parents is followed.
  function inContent(block: HTMLElement): boolean {
    const content = document.getElementById?.(CONTENT_ID);
    for (let parent = block.parentNode as Node | null; parent; parent = parent.parentNode) {
      if (parent === content) return true;
    }
    return false;
  }

  // The list item that gets the block of `run`, inside the top-level `list` that holds it: the deepest
  // holder among the mapped elements of the list, which must all be lists and items.
  function hostItemOf(list: HTMLElement, run: Run): HTMLElement | undefined {
    const holders: HTMLElement[] = [list];
    const walk = (parent: HTMLElement): void => {
      for (const child of rt.blocks.mappedChildren(parent)) {
        if (!holds(rt.blocks.blockRange(child), run)) continue;
        holders.push(child);
        walk(child);
      }
    };
    walk(list);
    if (holders.some((holder) => rt.blocks.isIncludedBlock(holder) || !["UL", "OL", "LI"].includes(holder.tagName))) {
      return undefined;
    }
    const deepest = holders[holders.length - 1];
    if (deepest.tagName === "LI") return deepest;
    return rt.blocks.mappedChildren(deepest).filter((child) =>
      child.tagName === "LI" && rt.blocks.blockRange(child).line < run.line).pop();
  }

  // Puts `block` inside `item`, right after the last child that starts before the run (before the
  // first one that starts after it when none does, at the end when the item has no mapped child).
  function placeInItem(block: HTMLElement, item: HTMLElement, run: Run): void {
    const frame = state.activeBlockEdit?.element;
    const children = (Array.from(item.children) as HTMLElement[])
      .filter((child) => !runs.has(child) && child !== frame && !hasClass(child, INSERT_POINT_CLASS));
    const anchor = children.filter((child) => lineOf(child) < run.line).pop();
    if (anchor) {
      if (anchor.nextElementSibling !== block) anchor.insertAdjacentElement("afterend", block);
      return;
    }
    const after = children.find((child) => lineOf(child) > run.endLine);
    if (after) after.insertAdjacentElement("beforebegin", block);
    else item.appendChild(block);
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-266
  function refresh(): void {
    const editing = state.activeBlockEdit?.replaceBlankRun ? state.activeBlockEdit.target : undefined;
    if (!state.editMode) {
      Array.from(runs.keys()).filter((block) => block !== editing).forEach(remove);
      return;
    }
    const blocks = rt.blocks.topLevelMappedBlocks();
    const isProperties = (block: HTMLElement): boolean => block.getAttribute("data-okf-properties") !== null;
    const body = blocks.filter((block) => !isProperties(block));
    const range = (block: HTMLElement): Run => rt.blocks.blockRange(block);
    const kept = new Set<HTMLElement>();
    const aboveOf = (run: Run): HTMLElement | undefined =>
      [...body].reverse().find((block) => range(block).line < run.line) ?? blocks.find(isProperties);
    // Where the block of a run goes. A run held by a top-level list goes into its host item; one held
    // by any other block, or by a folded list, shows nothing.
    const spotOf = (run: Run): Spot => {
      const holder = body.find((block) => holds(range(block), run));
      if (holder) {
        if (!["UL", "OL"].includes(holder.tagName) || rt.blocks.isIncludedBlock(holder)
          || holder.getAttribute("data-okf-folded") != null) return undefined;
        const item = hostItemOf(holder, run);
        return item && lineOf(item) < run.line ? { item } : undefined;
      }
      const above = aboveOf(run);
      const below = body.find((block) => range(block).line > run.endLine);
      return [above, below].some((block) => block?.getAttribute("data-okf-folded") != null) ? undefined : { above };
    };
    const put = (block: HTMLElement, spot: NonNullable<Spot>, run: Run): void => {
      if ("item" in spot) placeInItem(block, spot.item, run);
      else place(block, spot.above);
    };
    const attached = (block: HTMLElement, run: Run): boolean =>
      run.itemLine === undefined ? Boolean(block.parentNode) : inContent(block);
    if (editing) {
      kept.add(editing as HTMLElement);
      // A swap of the content dropped the block and its editor frame: they go back where the run was.
      const held = runs.get(editing as HTMLElement);
      const frame = state.activeBlockEdit?.element;
      if (held && !attached(editing as HTMLElement, held)) {
        const spot = spotOf(held);
        if (spot && "item" in spot) placeInItem(editing as HTMLElement, spot.item, held);
        else place(editing as HTMLElement, aboveOf(held));
        if (frame) (editing as HTMLElement).insertAdjacentElement("afterend", frame);
      }
    }
    const existing = new Map<string, HTMLElement>();
    const keyOf = (run: Run): string => `${run.line}-${run.endLine}-${run.itemLine ?? ""}`;
    runs.forEach((run, block) => {
      if (attached(block, run)) existing.set(keyOf(run), block);
    });
    for (const found of readRuns()) {
      const spot = spotOf(found);
      if (!spot) continue;
      const run: Run = "item" in spot ? { ...found, itemLine: lineOf(spot.item) } : found;
      const known = existing.get(keyOf(run));
      if (known) {
        kept.add(known);
        if (known !== editing) put(known, spot, run);
        continue;
      }
      const block = create(run);
      runs.set(block, run);
      put(block, spot, run);
      kept.add(block);
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
