// @implements_req SwRS-MDOKFSTUDIO-BLOCK-254
/**
 * Structural keyboard navigation in edit mode: ArrowRight goes down one level of the document
 * structure (a table to its first cell, a container to its first inner block, the whole page to its
 * first block), ArrowLeft and Escape go up, and inside a table the four arrows walk the cells. The
 * model is `modules/structuralCursor.ts`; this part describes the page to it (mapped blocks and
 * table cells), marks the cursor and announces it. The top-level block selection stays in
 * `blockSelectionView.ts`, which owns the keys and hands the structural ones to this view.
 */

import { structuralMove, type StructuralKey, type StructuralNode, type StructuralPosition } from "../modules/structuralCursor";
import type { PageRuntime } from "./pageRuntime";

const SELECTED = "data-sphinx-preview-block-selected";
const CELL_FOCUS = "data-sphinx-preview-cell-focus";
const KEYS: Readonly<Record<string, StructuralKey>> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  Escape: "escape",
};

/** What the block selection view gives this view. */
export interface StructuralNavigationHost {
  /** Selects the top-level block at `index` alone (focus, outline, announcement). */
  selectTopLevel(index: number): void;
  /** Replaces the announcement of the status region. */
  announce(text: string): void;
}

export interface StructuralNavigationView {
  /** Drops the cursor and its marks (the top-level selection moved or was cleared). */
  reset(): void;
  /**
   * Handles a plain key (arrows, Escape or Enter) when it is a structural one; true when it was
   * consumed. Keys that stay with the flat block-to-block selection return false.
   */
  handleKey(event: KeyboardEvent): boolean;
}

/** A block of the page as the model sees it, with the element behind it. */
interface ElementNode extends StructuralNode {
  readonly element: HTMLElement;
  readonly children: ElementNode[];
}

/** The structural navigation view of a page. */
export function installStructuralNavigationView(rt: PageRuntime, host: StructuralNavigationHost): StructuralNavigationView {
  const { blockSelection } = rt.tools;
  let cursor: StructuralPosition | undefined;
  let markedBlock: Element | undefined;
  let markedCell: Element | undefined;

  function tableOf(block: HTMLElement): HTMLElement | undefined {
    if (block.tagName === "TABLE") return block;
    if (rt.blocks.mappedChildren(block).length > 0) return undefined;
    return block.querySelector?.<HTMLElement>("table") ?? undefined;
  }

  function rowsOf(table: HTMLElement): HTMLTableCellElement[][] {
    const rows = (table as HTMLTableElement).rows;
    return Array.from(rows ?? []).map((row) => Array.from(row.cells ?? []));
  }

  // The children are read when the model first asks for them: a key press walks one path, not the
  // whole document.
  function describe(element: HTMLElement, skip: boolean): ElementNode {
    let children: ElementNode[] | undefined;
    const table = tableOf(element);
    return {
      element,
      ...(skip ? { skip: true } : {}),
      ...(table ? { grid: { columns: rowsOf(table).map((row) => row.length) } } : {}),
      get children(): ElementNode[] {
        children ??= table ? [] : rt.blocks.mappedChildren(element).map((child) => describe(child, skip));
        return children;
      },
    };
  }

  function documentNode(): ElementNode {
    const blocks = rt.blocks.selectableBlocks();
    return {
      element: rt.document.documentElement as HTMLElement,
      children: blocks.map((block) => describe(block, rt.blocks.isIncludedBlock(block))),
    };
  }

  function resolve(root: ElementNode, path: readonly number[]): ElementNode | undefined {
    let node: ElementNode | undefined = root;
    for (const index of path) node = node?.children[index];
    return node;
  }

  function reset(): void {
    markedBlock?.removeAttribute(SELECTED);
    markedCell?.removeAttribute(CELL_FOCUS);
    markedBlock = undefined;
    markedCell = undefined;
    cursor = undefined;
  }

  function current(root: ElementNode): StructuralPosition | undefined {
    if (!blockSelection.isActive()) {
      reset();
      return undefined;
    }
    if (cursor) return cursor;
    const free = blockSelection.startIndex === blockSelection.anchorIndex ? blockSelection.endIndex : blockSelection.startIndex;
    return free !== undefined && root.children[free] ? { path: [free] } : undefined;
  }

  function takeFocus(element: HTMLElement): void {
    element.setAttribute("tabindex", "-1");
    element.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    element.focus?.({ preventScroll: true });
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-254
  function apply(root: ElementNode, position: StructuralPosition): void {
    const top = root.children[position.path[0]]?.element;
    if (!top) return;
    host.selectTopLevel(position.path[0]);
    const node = resolve(root, position.path);
    if (!node) return;
    cursor = position;
    if (position.path.length === 1 && !position.cell) return;
    // Below the top level the outline moves from the top-level block to the selected block or cell.
    (top.closest?.("pre") || top).removeAttribute(SELECTED);
    if (position.cell) {
      const table = tableOf(node.element);
      const cell = table ? rowsOf(table)[position.cell.row]?.[position.cell.column] : undefined;
      if (!cell) return;
      cell.setAttribute(CELL_FOCUS, "true");
      markedCell = cell;
      host.announce("Table cell row " + (position.cell.row + 1) + ", column " + (position.cell.column + 1) + " selected");
      takeFocus(cell);
      return;
    }
    markedBlock = node.element.closest?.("pre") || node.element;
    markedBlock.setAttribute(SELECTED, "true");
    takeFocus(node.element);
  }

  return {
    reset,
    handleKey(event) {
      const root = documentNode();
      const from = current(root);
      if (event.key === "Enter") {
        // Enter on a cell or an inner block opens its editor the way a click on it does; on a
        // top-level block it stays with the flat selection.
        if (!from || (from.path.length === 1 && !from.cell)) return false;
        const node = resolve(root, from.path);
        if (!node) return false;
        const cell = from.cell ? rowsOf(tableOf(node.element) ?? node.element)[from.cell.row]?.[from.cell.column] : undefined;
        rt.editMode.openMappedEditor(node.element, cell ?? node.element);
        return true;
      }
      const key = KEYS[event.key];
      if (!key) return false;
      const result = structuralMove(root, from, key);
      if (result.kind === "top") return false;
      if (result.kind === "move") apply(root, result.to);
      return from !== undefined || result.kind === "move";
    },
  };
}
