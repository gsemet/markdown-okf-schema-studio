/**
 * Block insertion points of edit mode: zero-height bars after each top-level block (and after the
 * properties section) whose "+" opens an editor for a new block, with the move buttons of the block
 * above (see `./blockMoves.ts`). An empty body gets one "Start writing" entry. They are never mapped
 * blocks (no source attributes) and are rebuilt, not patched, on every toggle.
 */

import { MAPPINGS_SELECTOR, type InsertMove, type InsertPoints, type PageRuntime } from "./pageRuntime";

/** The insertion points of a page. */
export function installInsertPoints(rt: PageRuntime): InsertPoints {
  const { document, state } = rt;
  let insertPoints: HTMLElement[] = [];
  const insertMoves = new Map<Element, InsertMove>();

  function removeInsertPoints(): void {
    insertPoints.forEach((point) => point.remove());
    insertPoints = [];
    insertMoves.clear();
  }

  function openInsertPoint(point: HTMLElement, afterLine: number): void {
    rt.blockEditor.openBlockEditor(
      point,
      undefined,
      { line: Math.max(1, afterLine), endLine: Math.max(1, afterLine), insertAfterLine: afterLine },
      "end",
    );
  }

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
      openInsertPoint(point, afterLine);
    });
    point.appendChild(button);
    if (move) rt.blockMoves.addMoveButtons(point, move);
    return point;
  }

  function refreshInsertPoints(): void {
    removeInsertPoints();
    if (!state.editMode) return;
    const isProperties = (block: Element): boolean => block.getAttribute("data-okf-properties") !== null;
    const blocks = rt.blocks.topLevelMappedBlocks();
    const properties = blocks.find(isProperties) ?? document.querySelector?.("[data-okf-properties]");
    const body = blocks.filter((block) => !isProperties(block));
    const place = (anchor: Element, point: HTMLElement): void => {
      anchor.insertAdjacentElement("afterend", point);
      insertPoints.push(point);
    };
    if (body.length === 0) {
      // An empty or frontmatter-only body: one visible entry point, but never on a failed render.
      if (!rt.blocks.hasRenderedPreview()) return;
      const point = createInsertPoint(0, "Start writing", true);
      if (properties) {
        place(properties, point);
        return;
      }
      const content = document.getElementById?.("sphinx-myst-preview-content");
      if (!content) return;
      content.appendChild(point);
      insertPoints.push(point);
      return;
    }
    if (properties) place(properties, createInsertPoint(0, "+", false));
    body.forEach((block, index) => {
      const line = Number(block.getAttribute("data-sphinx-source-line"));
      const endLine = Number(block.getAttribute("data-sphinx-source-end-line") || line);
      if (!Number.isSafeInteger(endLine) || endLine < line) return;
      place(block.closest?.("pre") || block, createInsertPoint(endLine, "+", false, {
        block,
        previous: body[index - 1],
        next: body[index + 1],
      }));
    });
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
