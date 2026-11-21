/** An empty quote line: only spaces, tabs and quote markers, nothing after the last marker. */
export interface EmptyQuoteLine {
  /** The number of quote markers. */
  depth: number;
  /** The column of each marker (CommonMark columns; a tab runs to the next stop of 4). */
  columns: number[];
  /** The text up to and including the last marker. */
  prefix: string;
}

/** The column after `character` is read at `column`. */
const advance = (character: string, column: number): number =>
  character === "\t" ? column + 4 - (column % 4) : column + 1;

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-266
/**
 * Reads an empty quote line (`>`, `> `, `>\t`, `> >`, `  >`): quote markers separated by spaces and
 * tabs, with only spaces and tabs after the last one. Undefined for any other line, a blank one
 * included.
 */
export function emptyQuoteLine(text: string): EmptyQuoteLine | undefined {
  const columns: number[] = [];
  let column = 0;
  let index = 0;
  let prefixEnd = 0;
  for (;;) {
    while (index < text.length && (text[index] === " " || text[index] === "\t")) {
      column = advance(text[index], column);
      index += 1;
    }
    if (text[index] !== ">") break;
    columns.push(column);
    column += 1;
    index += 1;
    prefixEnd = index;
  }
  if (columns.length === 0 || index < text.length) return undefined;
  return { depth: columns.length, columns, prefix: text.slice(0, prefixEnd) };
}

/** True when two empty quote lines have the same depth and marker columns. */
export function sameQuoteShape(first: EmptyQuoteLine, second: EmptyQuoteLine): boolean {
  return first.depth === second.depth && first.columns.every((column, index) => column === second.columns[index]);
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-268
/**
 * The text of a line inside the quote `shape`: the line must start with quote markers at the same
 * columns; they go with the one optional space after the last one, as CommonMark reads a quote's
 * content. A tab right after the last marker counts as that space for one column; the rest of its
 * width stays as leading spaces. Undefined when the markers differ.
 */
export function quoteContent(text: string, shape: EmptyQuoteLine): string | undefined {
  let column = 0;
  let index = 0;
  for (const markerColumn of shape.columns) {
    while (index < text.length && (text[index] === " " || text[index] === "\t")) {
      column = advance(text[index], column);
      index += 1;
    }
    if (text[index] !== ">" || column !== markerColumn) return undefined;
    column += 1;
    index += 1;
  }
  if (text[index] === " ") return text.slice(index + 1);
  if (text[index] === "\t") {
    const width = advance("\t", column) - column;
    return " ".repeat(width - 1) + text.slice(index + 1);
  }
  return text.slice(index);
}
