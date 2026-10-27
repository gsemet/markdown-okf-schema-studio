/**
 * Tables of the MyST renderer: raw HTML tables rebuilt from an allow-list of tags and attributes,
 * and the alignment, header rows and column widths of directive tables, applied to the HTML the
 * writer emits.
 */

import { parseFragment, serialize } from "parse5";

import { sanitizeTableStyle } from "../security/html-sanitizer";
import {
  containsRawTable,
  type MystNode,
  normalizeTableAlignment,
  type RawHtmlNode,
  setHast,
  sourcePositionProperties,
} from "./mystNode";

const SAFE_HTML_TABLE_TAGS = new Set([
  "b", "br", "caption", "code", "col", "colgroup", "div", "em", "i", "li", "ol", "p",
  "span", "strong", "sub", "sup", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul",
]);
const BLOCKED_HTML_TABLE_TAGS = new Set([
  "embed", "form", "iframe", "object", "script", "style", "svg",
]);

/**
 * The alignment and layout a table directive asks for, matched to its table in the written HTML.
 */
export interface TableAlignmentSpec {
  table?: string;
  columns: Array<string | undefined>;
  sourceLine?: number;
  sourceEndLine?: number;
  /** `{list-table}`: the `:widths:` as percentages, one per column. */
  widths?: number[];
  /** `{list-table}`: the number of leading header rows (`:header-rows:`). */
  headerRows?: number;
  /** `{list-table}`: the cell paragraphs carry no source line, so a click edits the whole table. */
  listTable?: boolean;
  /** A table of a raw HTML block: it exists only in the written HTML, not in the syntax tree. */
  raw?: boolean;
}

function countRawTables(node: RawHtmlNode): number {
  return Number(node.tagName?.toLowerCase() === "table")
    + (node.childNodes ?? []).reduce((count, child) => count + countRawTables(child), 0);
}

// @implements_req SwRS-MDOKFSTUDIO-GFM-031
function rawHtmlChildren(node: RawHtmlNode): unknown[] {
  if (node.nodeName === "#text") {
    return [{ type: "text", value: node.value ?? "" }];
  }
  if (node.nodeName === "#comment") {
    return [];
  }

  const tagName = node.tagName?.toLowerCase();
  if (!tagName) {
    return (node.childNodes ?? []).flatMap(rawHtmlChildren);
  }
  if (BLOCKED_HTML_TABLE_TAGS.has(tagName)) {
    return [];
  }

  const children = (node.childNodes ?? []).flatMap(rawHtmlChildren);
  if (!SAFE_HTML_TABLE_TAGS.has(tagName)) {
    return children;
  }

  const properties: Record<string, unknown> = {};
  for (const attribute of node.attrs ?? []) {
    const name = attribute.name.toLowerCase();
    const value = attribute.value.trim();
    if ((name === "rowspan" || name === "colspan") && /^[1-9]\d{0,2}$/u.test(value)) {
      properties[name === "rowspan" ? "rowSpan" : "colSpan"] = Number(value);
    } else if (name === "align" && normalizeTableAlignment(value)) {
      properties.align = value.toLowerCase();
    } else if (name === "scope" && /^(?:row|col|rowgroup|colgroup)$/u.test(value)) {
      properties.scope = value;
    } else if (name === "class") {
      const classNames = value.split(/\s+/u).filter((className) => /^[-_a-zA-Z][-_a-zA-Z0-9]*$/u.test(className));
      if (classNames.length > 0) {
        properties.className = classNames;
      }
    } else if (name === "title") {
      properties.title = attribute.value;
    } else if (name === "style" && tagName === "span") {
      // A colour span is validated by the sanitizer, with the same grammar as outside a table.
      properties.style = attribute.value;
    } else if (name === "style") {
      const safeStyle = sanitizeTableStyle(tagName, attribute.value);
      if (safeStyle) {
        properties["data-myst-table-style"] = safeStyle;
      }
    }
  }

  return [{ type: "element", tagName, properties, children }];
}

/** Rebuilds a raw HTML block that holds a table from the allowed tags and attributes only. */
export function normalizeRawHtmlTable(node: MystNode, line?: number): void {
  const fragment = parseFragment(node.value ?? "") as unknown as RawHtmlNode;
  if (!containsRawTable(fragment)) {
    return;
  }
  setHast(node, "div", {
    class: "myst-raw-html-table",
    ...sourcePositionProperties(node, line),
  }, rawHtmlChildren(fragment));
  node.type = "rawHtmlTableBlock";
}

function tableAlignmentSpec(node: MystNode): TableAlignmentSpec {
  const headerCells = node.children?.[0]?.children ?? [];
  return {
    table: normalizeTableAlignment(node.align),
    columns: headerCells.map((cell) => normalizeTableAlignment(cell.align)),
    ...(node.position?.start?.line === undefined
      ? {}
      : { sourceLine: node.position.start.line }),
    ...(node.position?.end?.line === undefined
      ? {}
      : { sourceEndLine: node.position.end.line }),
    ...(node.data?.listTable === true
      ? {
        listTable: true,
        widths: node.data.widths as number[] | undefined,
        headerRows: node.data.headerRows as number | undefined,
      }
      : {}),
  };
}

/** Records, in document order, the alignment spec of every table (undefined for a plain one). */
export function collectTableAlignments(node: MystNode, output: Array<TableAlignmentSpec | undefined>): void {
  if (node.type === "rawHtmlTableBlock") {
    const fragment = parseFragment(node.value ?? "") as unknown as RawHtmlNode;
    const tableAlignment = normalizeTableAlignment(node.data?.mystTableAlignment);
    output.push(...Array.from(
      { length: countRawTables(fragment) },
      () => tableAlignment ? { table: tableAlignment, columns: [], raw: true } : undefined,
    ));
    return;
  }
  if (node.type === "table") {
    output.push(tableAlignmentSpec(node));
  }
  for (const child of node.children ?? []) {
    collectTableAlignments(child, output);
  }
}

function setHtmlAttribute(node: RawHtmlNode, name: string, value: string): void {
  const existing = node.attrs?.find((attribute) => attribute.name === name);
  if (existing) {
    existing.value = value;
    return;
  }
  node.attrs ??= [];
  node.attrs.push({ name, value });
}

// @implements_req SwRS-MDOKFSTUDIO-MYST-063
/** Removes the source lines of everything inside a list-table: a click anywhere edits the table. */
function stripSourceLines(table: RawHtmlNode): void {
  for (const child of table.childNodes ?? []) {
    if (child.attrs) {
      child.attrs = child.attrs.filter((attribute) =>
        attribute.name !== "data-line" && attribute.name !== "data-end-line");
    }
    stripSourceLines(child);
  }
}

const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";

function rawElement(tagName: string, children: RawHtmlNode[]): RawHtmlNode {
  return { nodeName: tagName, tagName, namespaceURI: HTML_NAMESPACE, attrs: [], childNodes: children };
}

/**
 * The MyST HTML writer makes the first row the header, whatever `:header-rows:` says. This lays the
 * rows out again: the first `headerRows` rows in `<thead>` with `<th>` cells, the others in
 * `<tbody>` with `<td>` cells.
 */
function setHeaderRows(table: RawHtmlNode, headerRows: number): void {
  const rows: RawHtmlNode[] = [];
  for (const section of table.childNodes ?? []) {
    if (section.tagName === "tr") rows.push(section);
    for (const row of section.childNodes ?? []) {
      if (row.tagName === "tr") rows.push(row);
    }
  }
  if (rows.length === 0) return;
  rows.forEach((row, index) => {
    const tag = index < headerRows ? "th" : "td";
    for (const cell of row.childNodes ?? []) {
      if (cell.tagName === "th" || cell.tagName === "td") {
        cell.tagName = tag;
        cell.nodeName = tag;
      }
    }
  });
  const sections: RawHtmlNode[] = [];
  if (headerRows > 0) sections.push(rawElement("thead", rows.slice(0, headerRows)));
  if (rows.length > headerRows) sections.push(rawElement("tbody", rows.slice(headerRows)));
  table.childNodes = sections;
}

/** `:widths:` as a `<colgroup>`; the sanitizer turns each width into a stylesheet rule. */
function addColumnWidths(table: RawHtmlNode, widths: number[] | undefined): void {
  if (!widths || widths.length === 0) return;
  const firstRow = findRawRow(table);
  const columns = (firstRow?.childNodes ?? []).filter((child) =>
    ["th", "td"].includes(child.tagName?.toLowerCase() ?? "")).length;
  if (columns !== widths.length) return;
  const cols = widths.map((width): RawHtmlNode => ({
    nodeName: "col",
    tagName: "col",
    namespaceURI: HTML_NAMESPACE,
    attrs: [{ name: "data-myst-table-style", value: `width: ${width}%` }],
    childNodes: [],
  }));
  const colgroup: RawHtmlNode = {
    nodeName: "colgroup",
    tagName: "colgroup",
    namespaceURI: HTML_NAMESPACE,
    attrs: [],
    childNodes: cols,
  };
  table.childNodes = [colgroup, ...(table.childNodes ?? [])];
}

function findRawRow(node: RawHtmlNode): RawHtmlNode | undefined {
  for (const child of node.childNodes ?? []) {
    if (child.tagName?.toLowerCase() === "tr") return child;
    const nested = child.tagName?.toLowerCase() === "table" ? undefined : findRawRow(child);
    if (nested) return nested;
  }
  return undefined;
}

/**
 * True when the specs need the written HTML: a list-table is laid out again after the writer, a
 * raw HTML table exists only in the HTML, and the writer ignores the alignment of a table's
 * cells. Pipe tables without aligned columns are handled in the syntax tree.
 */
export function needsHtmlTablePass(alignments: ReadonlyArray<TableAlignmentSpec | undefined>): boolean {
  return alignments.some((alignment) =>
    alignment?.listTable === true || alignment?.raw === true || alignment?.columns.some(Boolean) === true);
}

/**
 * Sets the alignment and the source lines of the pipe tables on the syntax tree, so the writer
 * emits them and the HTML needs no second parse. The writer's table handler replaces `data` of a
 * table node, so the properties are merged in when it does (the setter below).
 */
export function applyTableAlignmentsToTree(node: MystNode): void {
  if (node.type === "table") {
    const spec = tableAlignmentSpec(node);
    const properties: Record<string, unknown> = {
      ...(spec.table ? { align: spec.table } : {}),
      ...(spec.sourceLine !== undefined ? { "data-line": spec.sourceLine } : {}),
      ...(spec.sourceEndLine !== undefined ? { "data-end-line": spec.sourceEndLine } : {}),
    };
    if (Object.keys(properties).length > 0) {
      mergePropertiesAfterWriterReset(node, properties);
    }
  }
  for (const child of node.children ?? []) {
    applyTableAlignmentsToTree(child);
  }
}

function mergePropertiesAfterWriterReset(node: MystNode, properties: Record<string, unknown>): void {
  let data = node.data;
  Object.defineProperty(node, "data", {
    configurable: true,
    enumerable: true,
    get: () => data,
    set: (value: Record<string, unknown> | undefined) => {
      data = {
        ...(value ?? {}),
        hProperties: { ...(value?.hProperties as object ?? {}), ...properties },
      };
    },
  });
}

// @implements_req SwRS-MDOKFSTUDIO-GFM-008
/** Applies the recorded specs to the tables of the written HTML, in the same order. */
export function applyTableAlignments(
  html: string,
  alignments: Array<TableAlignmentSpec | undefined>,
): string {
  if (!alignments.some((alignment) =>
    alignment && (alignment.table || alignment.columns.some(Boolean) || alignment.sourceLine !== undefined
      || alignment.listTable === true))) {
    return html;
  }

  const fragment = parseFragment(html);
  let tableIndex = 0;

  const visit = (node: RawHtmlNode): void => {
    if (node.tagName?.toLowerCase() === "table") {
      const alignment = alignments[tableIndex];
      tableIndex += 1;
      if (alignment?.table) {
        setHtmlAttribute(node, "align", alignment.table);
      }
      if (alignment?.sourceLine !== undefined) {
        setHtmlAttribute(node, "data-line", String(alignment.sourceLine));
      }
      if (alignment?.sourceEndLine !== undefined) {
        setHtmlAttribute(node, "data-end-line", String(alignment.sourceEndLine));
      }
      if (alignment?.listTable === true) {
        stripSourceLines(node);
        if (alignment.headerRows !== undefined) setHeaderRows(node, alignment.headerRows);
        addColumnWidths(node, alignment.widths);
      }

      const rows: RawHtmlNode[] = [];
      const collectRows = (parent: RawHtmlNode): void => {
        for (const child of parent.childNodes ?? []) {
          if (child.tagName?.toLowerCase() === "tr") {
            rows.push(child);
          } else if (child.tagName?.toLowerCase() !== "table") {
            collectRows(child);
          }
        }
      };
      collectRows(node);
      for (const row of rows) {
        const cells = (row.childNodes ?? []).filter((child) =>
          ["th", "td"].includes(child.tagName?.toLowerCase() ?? ""));
        cells.forEach((cell, index) => {
          const cellAlignment = alignment?.columns[index];
          if (cellAlignment) {
            setHtmlAttribute(cell, "align", cellAlignment);
          }
        });
      }
    }
    for (const child of node.childNodes ?? []) {
      visit(child);
    }
  };

  visit(fragment as unknown as RawHtmlNode);
  return serialize(fragment);
}
