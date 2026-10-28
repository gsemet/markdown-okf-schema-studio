// @implements_req SwRS-MDOKFSTUDIO-BLOCK-254
/**
 * The structural cursor of keyboard navigation: where the keyboard selection sits in the document
 * structure and where a key moves it. A pure model over a tree the page view describes (blocks,
 * their inner blocks, the cell grid of a table); it reads no DOM.
 */

/** One block of the structure. */
export interface StructuralNode {
  /** The blocks inside this one (an admonition's paragraphs, a list's items). */
  readonly children: readonly StructuralNode[];
  /** The cell grid when the block is a table: the number of cells of each row. */
  readonly grid?: { readonly columns: readonly number[] };
  /** True for a block that cannot be selected (it comes from an include). */
  readonly skip?: boolean;
}

/** A block named by its index path from the document (`[1, 0]` = first child of the second block). */
export interface StructuralPosition {
  readonly path: readonly number[];
  /** Set when a cell of the table at `path` is selected. */
  readonly cell?: { readonly row: number; readonly column: number };
}

export type StructuralKey = "left" | "right" | "up" | "down" | "escape";

/**
 * What a key does: `move` to a new position, `stay` (the key is ours but nothing changes) or `top`
 * (not a structural matter: the flat block-to-block keys, or Escape at the top level, apply).
 */
export type StructuralMove =
  | { readonly kind: "move"; readonly to: StructuralPosition }
  | { readonly kind: "stay" }
  | { readonly kind: "top" };

const STAY: StructuralMove = { kind: "stay" };
const TOP: StructuralMove = { kind: "top" };

function nodeAt(root: StructuralNode, path: readonly number[]): StructuralNode | undefined {
  let node: StructuralNode | undefined = root;
  for (const index of path) node = node?.children[index];
  return node;
}

function toBlock(path: readonly number[]): StructuralMove {
  return { kind: "move", to: { path } };
}

function firstSelectable(node: StructuralNode): number {
  return node.children.findIndex((child) => child.skip !== true);
}

function moveInGrid(
  columns: readonly number[],
  path: readonly number[],
  cell: { row: number; column: number },
  key: StructuralKey,
): StructuralMove {
  if (key === "escape") return toBlock(path);
  const rowCount = columns[cell.row];
  if (rowCount === undefined || cell.column < 0 || cell.column >= rowCount) return STAY;
  let { row, column } = cell;
  if (key === "left") column -= 1;
  else if (key === "right") column += 1;
  else row += key === "up" ? -1 : 1;
  if (row < 0 || row >= columns.length || column < 0) return STAY;
  column = Math.min(column, columns[row] - 1);
  if (column < 0 || column >= columns[row] || (row === cell.row && column === cell.column)) return STAY;
  return { kind: "move", to: { path, cell: { row, column } } };
}

/**
 * The result of `key` at `from`; `from` undefined is the whole document. Right goes down a level
 * (a table to its first cell, a block to its first selectable child, the document to its first
 * block); Left and Escape go up; inside a grid the four arrows walk the cells and stop at the
 * edges; among nested siblings Up and Down stop at the edges.
 */
export function structuralMove(
  root: StructuralNode,
  from: StructuralPosition | undefined,
  key: StructuralKey,
): StructuralMove {
  if (!from) {
    if (key === "escape") return TOP;
    if (key !== "right") return key === "left" ? STAY : TOP;
    const first = firstSelectable(root);
    return first < 0 ? STAY : toBlock([first]);
  }
  const node = nodeAt(root, from.path);
  if (!node || from.path.length === 0) return STAY;
  if (from.cell) return node.grid ? moveInGrid(node.grid.columns, from.path, from.cell, key) : STAY;
  const depth = from.path.length;
  const parentPath = from.path.slice(0, -1);
  switch (key) {
    case "right": {
      if (node.grid) return node.grid.columns[0] > 0 ? { kind: "move", to: { path: from.path, cell: { row: 0, column: 0 } } } : STAY;
      const first = firstSelectable(node);
      return first < 0 ? STAY : toBlock([...from.path, first]);
    }
    case "left":
      return depth > 1 ? toBlock(parentPath) : STAY;
    case "escape":
      return depth > 1 ? toBlock(parentPath) : TOP;
    default: {
      if (depth === 1) return TOP;
      const siblings = nodeAt(root, parentPath)!.children;
      const step = key === "up" ? -1 : 1;
      for (let next = from.path[depth - 1] + step; next >= 0 && next < siblings.length; next += step) {
        if (siblings[next].skip !== true) return toBlock([...parentPath, next]);
      }
      return STAY;
    }
  }
}
