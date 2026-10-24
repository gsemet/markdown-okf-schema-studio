/**
 * The table directives (`{table}`, `{list-table}`, `{csv-table}`): the render pass (alignment,
 * list-table widths and header rows), the stylesheet of list-table cells and widths, and the
 * palette actions that write or convert them. Pure module: no host API, no DOM, no Node built-ins.
 */

import { parseFragment } from "parse5";

import {
  containsRawTable,
  findNode,
  type MystNode,
  normalizeTableAlignment,
  type RawHtmlNode,
} from "../render/mystNode";
import type { MystDirectiveDescriptor } from "./directive";

/** The number of leading rows of a table AST whose cells are marked as header cells. */
function leadingHeaderRows(table: MystNode): number {
  let count = 0;
  for (const row of table.children ?? []) {
    if (row.children?.[0]?.header !== true) break;
    count += 1;
  }
  return count;
}

/** The `:widths:` of a list-table as percentages that add up to 100; `auto`, `grid` or junk: none. */
function listTableWidths(value: unknown): number[] | undefined {
  const parts = Array.isArray(value)
    ? value.map(Number)
    : typeof value === "string" ? value.trim().split(/[\s,]+/u).map(Number) : [];
  if (parts.length === 0 || parts.some((part) => !Number.isFinite(part) || part <= 0)) return undefined;
  const total = parts.reduce((sum, part) => sum + part, 0);
  return parts.map((part) => Math.round((part / total) * 10000) / 100);
}

/**
 * A list-table's table spans the directive (one editable block) and records its widths and header
 * rows; the `:align:` option goes to the table, or to a raw HTML table beneath the directive.
 */
function renderTable(node: MystNode): void {
  const alignment = normalizeTableAlignment(node.options?.align);
  const table = findNode(node, "table");
  if (node.name === "list-table" && table) {
    // The parser gives the table no position: it spans the directive, so the table is one
    // editable block.
    table.position ??= node.position;
    table.data = {
      ...(table.data ?? {}),
      listTable: true,
      widths: listTableWidths(node.options?.widths),
      headerRows: leadingHeaderRows(table),
    };
  }
  if (alignment && table) {
    table.align = alignment;
  } else if (alignment) {
    const rawTable = findNode(node, "html");
    if (rawTable && containsRawTable(parseFragment(rawTable.value ?? "") as unknown as RawHtmlNode)) {
      rawTable.data = { ...(rawTable.data ?? {}), mystTableAlignment: alignment };
    }
  }
}

/** The table plug-in. */
export const TABLES_DIRECTIVE: MystDirectiveDescriptor = {
  id: "tables",
  names: ["table", "list-table", "csv-table"],
  render: renderTable,
  paletteActions: ["tableCaption", "listTable", "pipeTable"],
  style: `/* A {list-table} cell holds a paragraph: it adds no space of its own, so the rows are as tall as a pipe table's. */
#sphinx-myst-preview-content :where(th, td) > p:first-child { margin-top: 0; }
#sphinx-myst-preview-content :where(th, td) > p:last-child { margin-bottom: 0; }

/* A table with :widths: (a colgroup) fills the column and splits it by those widths. */
#sphinx-myst-preview-content table:has(> colgroup) {
  display: table;
  width: 100%;
}
`,
};
