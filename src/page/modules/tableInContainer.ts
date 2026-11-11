/**
 * A pipe table inside a quote or an admonition: finds its lines in the source of the container,
 * hands the cell editor the table without the container prefix (`> `, `> > `, `>`), and writes a
 * new table text back with the same prefix on every line, the other lines of the container kept
 * byte for byte. Pure text and a small helper to rank the rendered tables of a block.
 */

/** The text of a container with the lines of one table located in it. */
export interface ContainedTable {
  /** The lines of the table without the container prefix, line endings kept. */
  tableText: string;
  /** The container text with `tableText` replaced by `text`, every line given the container prefix. */
  write(text: string): string;
}

interface SourceLine {
  text: string;
  eol: string;
}

/** One or more quote markers, each with up to three leading spaces and an optional space after it. */
const QUOTE_PREFIX = /^(?:[ ]{0,3}>[ ]?)+/u;
/** A delimiter row, outer pipes optional: `| --- | :-: |`, `--- | ---`. */
const DELIMITER_ROW = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/u;

function splitLines(text: string): SourceLine[] {
  const lines: SourceLine[] = [];
  const pattern = /([^\r\n]*)(\r\n|\r|\n|$)/gu;
  for (let match = pattern.exec(text); match && (match[1] !== "" || match[2] !== ""); match = pattern.exec(text)) {
    lines.push({ text: match[1]!, eol: match[2]! });
  }
  return lines;
}

function prefixOf(text: string): string {
  return QUOTE_PREFIX.exec(text)?.[0] ?? "";
}

function joinLines(lines: SourceLine[]): string {
  return lines.map((line) => line.text + line.eol).join("");
}

interface Run {
  /** Index of the header line. */
  start: number;
  /** Index after the last line of the table. */
  end: number;
  prefix: string;
  /** False when the lines of the run do not all carry the prefix of the header. */
  uniform: boolean;
}

/** The pipe tables of the text: a header line with a pipe, a delimiter row, then rows up to a line without a pipe. */
function findRuns(lines: SourceLine[]): Run[] {
  const runs: Run[] = [];
  let index = 0;
  while (index < lines.length - 1) {
    const head = lines[index]!.text;
    const headPrefix = prefixOf(head);
    const headRest = head.slice(headPrefix.length);
    const delimiter = lines[index + 1]!.text;
    const delimiterPrefix = prefixOf(delimiter);
    const delimiterRest = delimiter.slice(delimiterPrefix.length);
    if (!headRest.includes("|") || !DELIMITER_ROW.test(delimiterRest) || !delimiterRest.includes("|")) {
      index += 1;
      continue;
    }
    let uniform = headPrefix === delimiterPrefix;
    let end = index + 2;
    while (end < lines.length) {
      const row = lines[end]!.text;
      const rowPrefix = prefixOf(row);
      const rowRest = row.slice(rowPrefix.length);
      // A line without a pipe ends the table: a blank line, a paragraph, the closing fence of a directive.
      if (!rowRest.includes("|")) break;
      // A row without the prefix (a lazy line, mixed `>` and `> `) cannot be written back safely.
      if (rowPrefix !== headPrefix) uniform = false;
      end += 1;
    }
    runs.push({ start: index, end, prefix: headPrefix, uniform });
    index = end;
  }
  return runs;
}

// @implements_req SwRS-MDOKFSTUDIO-TABLE-121
/**
 * The table of rank `tableRank` (zero based, in source order) among the pipe tables of
 * `sourceText`, the source of a quote, an alert, an admonition or a table of those. `undefined`
 * when the table cannot be located safely: the rank is out of range, `tableCount` (the tables
 * rendered in the same block) differs from the pipe tables found, or the lines of the table do
 * not all share one prefix.
 */
export function containedTable(sourceText: string, tableRank: number, tableCount?: number): ContainedTable | undefined {
  const lines = splitLines(sourceText);
  const runs = findRuns(lines);
  if (tableCount !== undefined && runs.length !== tableCount) return undefined;
  const run = Number.isSafeInteger(tableRank) ? runs[tableRank] : undefined;
  if (!run || !run.uniform) return undefined;
  const { prefix } = run;
  const tableLines = lines.slice(run.start, run.end);
  return {
    tableText: joinLines(tableLines.map((line) => ({ text: line.text.slice(prefix.length), eol: line.eol }))),
    write(text: string): string {
      const written = splitLines(text).map((line) => ({ text: prefix + line.text, eol: line.eol }));
      const after = lines.slice(run.end);
      // A table that lost its closing line break keeps the container's own line break before what follows.
      const last = written.at(-1);
      if (last && last.eol === "" && after.length > 0) last.eol = tableLines.at(-1)!.eol;
      return joinLines(lines.slice(0, run.start)) + joinLines(written) + joinLines(after);
    },
  };
}

/** The rendered tables of a mapped block: the block itself when it is a table, else those inside it. */
export function tablesIn(block: Element): Element[] {
  return block.tagName === "TABLE" ? [block] : Array.from(block.querySelectorAll("table"));
}

/** The rank of `table` among the rendered tables of `block`, 0 when `block` is the table. */
export function tableRankIn(block: Element, table: Element | null | undefined): number {
  return Math.max(0, tablesIn(block).indexOf(table as Element));
}
