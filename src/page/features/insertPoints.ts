/**
 * Block insertion points of edit mode: zero-height bars after each top-level block (and after the
 * properties section) whose "+" opens an editor for a new block, with the move buttons of the block
 * above (see `./blockMoves.ts`). An empty body gets one "Start writing" entry. They are never mapped
 * blocks (no source attributes). A refresh keeps the bar of a block that still has the same
 * neighbours (the content patch keeps the bars of kept blocks in place) and only moves its line
 * number; it creates the bars that are new and removes those that no longer fit.
 */

import { MAPPINGS_SELECTOR, type InsertMove, type InsertPoints, type PageRuntime } from "./pageRuntime";

/** The insertion points of a page. */
export function installInsertPoints(rt: PageRuntime): InsertPoints {
  const { document, state } = rt;
  let insertPoints: HTMLElement[] = [];
  const insertMoves = new Map<Element, InsertMove>();
  // What each bar was made for, to tell whether a refresh can keep it as it is.
  const made = new WeakMap<Element, { anchor: Element; label: string; standalone: boolean; move?: InsertMove }>();

  function removeInsertPoints(): void {
    insertPoints.forEach((point) => point.remove());
    insertPoints = [];
    insertMoves.clear();
  }

  // The bar already after `anchor` that was made for the same block and neighbours, or undefined.
  function reusablePoint(
    anchor: Element,
    label: string,
    standalone: boolean,
    move: InsertMove | undefined,
    candidates: Set<HTMLElement>,
  ): HTMLElement | undefined {
    const point = anchor.nextElementSibling as HTMLElement | null;
    if (!point || !candidates.has(point)) return undefined;
    const previous = made.get(point);
    if (!previous || previous.anchor !== anchor || previous.label !== label || previous.standalone !== standalone) {
      return undefined;
    }
    const before = previous.move;
    if (Boolean(before) !== Boolean(move)) return undefined;
    if (before && move && (before.block !== move.block || before.previous !== move.previous || before.next !== move.next)) {
      return undefined;
    }
    return point;
  }

  function openInsertPoint(point: HTMLElement, afterLine: number): void {
    rt.blockEditor.openBlockEditor(
      point,
      undefined,
      { line: Math.max(1, afterLine), endLine: Math.max(1, afterLine), insertAfterLine: afterLine },
      "end",
    );
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-109
  function createInsertPoint(afterLine: number, label: string, standalone: boolean, move?: InsertMove): HTMLElement {
    const point = document.createElement("div");
    point.className = "sphinx-preview-insert-point"
      + (standalone ? " sphinx-preview-insert-point--start" : "")
      + (standalone && !rt.blocks.propertiesSection() ? " sphinx-preview-insert-point--first" : "");
    point.setAttribute("data-sphinx-insert-after-line", String(afterLine));
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute("aria-label", standalone ? label : "Insert a block here");
    button.textContent = label;
    button.addEventListener("click", (event) => {
      event.preventDefault?.();
      event.stopPropagation?.();
      // Read when clicked: a bar kept across a content patch gets its new line number.
      const line = Number(point.getAttribute("data-sphinx-insert-after-line"));
      openInsertPoint(point, Number.isSafeInteger(line) ? line : afterLine);
    });
    point.appendChild(button);
    if (move) rt.blockMoves.addMoveButtons(point, move);
    return point;
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-087
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-102
  // @implements_req SwRS-MDOKFSTUDIO-LIFE-069
  function refreshInsertPoints(): void {
    if (!state.editMode) {
      removeInsertPoints();
      return;
    }
    const isProperties = (block: Element): boolean => block.getAttribute("data-okf-properties") !== null;
    const blocks = rt.blocks.topLevelMappedBlocks();
    const properties = blocks.find(isProperties) ?? document.querySelector?.("[data-okf-properties]");
    const body = blocks.filter((block) => !isProperties(block));
    const previousPoints = new Set<HTMLElement>(insertPoints);
    const nextPoints: HTMLElement[] = [];
    const nextMoves = new Map<Element, InsertMove>();
    // Puts the bar for `anchor` after it: the bar it already has when nothing it depends on
    // changed (only its line number), else a new one.
    const place = (
      anchor: Element,
      afterLine: number,
      label: string,
      standalone: boolean,
      move?: InsertMove,
    ): void => {
      let point = reusablePoint(anchor, label, standalone, move, previousPoints);
      if (point) {
        previousPoints.delete(point);
        if (point.getAttribute("data-sphinx-insert-after-line") !== String(afterLine)) {
          point.setAttribute("data-sphinx-insert-after-line", String(afterLine));
        }
        // A bar made again would start without these.
        point.removeAttribute("data-sphinx-move-pending");
        const kept = made.get(point)?.move;
        if (kept) nextMoves.set(point, kept);
      } else {
        point = createInsertPoint(afterLine, label, standalone, move);
        if (move) {
          nextMoves.set(point, move);
        }
        anchor.insertAdjacentElement("afterend", point);
        made.set(point, { anchor, label, standalone, ...(move ? { move } : {}) });
      }
      nextPoints.push(point);
    };
    const finish = (): void => {
      previousPoints.forEach((point) => point.remove());
      insertMoves.clear();
      nextMoves.forEach((move, point) => insertMoves.set(point, move));
      insertPoints = nextPoints;
    };
    if (body.length === 0) {
      // An empty or frontmatter-only body: one visible entry point, but never on a failed render.
      if (!rt.blocks.hasRenderedPreview()) {
        finish();
        return;
      }
      if (properties) {
        place(properties, 0, "Start writing", true);
        finish();
        return;
      }
      const content = document.getElementById?.("sphinx-myst-preview-content");
      if (content) {
        const point = createInsertPoint(0, "Start writing", true);
        content.appendChild(point);
        nextPoints.push(point);
      }
      finish();
      return;
    }
    if (properties) place(properties, 0, "+", false);
    body.forEach((block, index) => {
      const line = Number(block.getAttribute("data-sphinx-source-line"));
      const endLine = Number(block.getAttribute("data-sphinx-source-end-line") || line);
      if (!Number.isSafeInteger(endLine) || endLine < line) return;
      place(block.closest?.("pre") || block, endLine, "+", false, {
        block,
        previous: body[index - 1],
        next: body[index + 1],
      });
    });
    finish();
  }

  // The top-level block a focused or clicked node belongs to (the block of an insertion bar's
  // buttons too), or undefined.
  function blockOfTarget(target: Element): HTMLElement | undefined {
    const bar = target.closest(".sphinx-preview-insert-point");
    const fromBar = bar ? insertMoves.get(bar)?.block : undefined;
    if (fromBar) return fromBar;
    const blocks = rt.blocks.topLevelMappedBlocks();
    for (let element = target.closest<HTMLElement>(MAPPINGS_SELECTOR); element; element = element.parentElement) {
      if (blocks.includes(element)) return element;
    }
    return undefined;
  }

  return {
    points: () => insertPoints,
    moves: insertMoves,
    refreshInsertPoints,
    blockOfTarget,
    // @implements_req SwRS-MDOKFSTUDIO-BLOCK-041
    bindKeys() {
      // Enter on an empty document opens the "Start writing" editor, like clicking the button.
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" || !state.editMode || state.activeBlockEdit || state.activeFrontmatterEdit) return;
        if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey || event.isComposing) return;
        const target = event.target;
        if (target instanceof Element
          && (["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(target.tagName)
            || (target as HTMLElement).isContentEditable
            || target.closest("[data-okf-properties], [data-sphinx-preview-block-editor]"))) return;
        const start = insertPoints.find((point) =>
          point.className.split(" ").includes("sphinx-preview-insert-point--start"));
        if (!start) return;
        event.preventDefault?.();
        openInsertPoint(start, 0);
      });
    },
  };
}
