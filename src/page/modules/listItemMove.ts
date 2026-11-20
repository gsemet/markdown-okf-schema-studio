/**
 * Moves an item of a list on the list's source text: the lines of one whole list, as the page opens
 * them, the quote prefix of a list inside a quote or a GitHub alert included. The item moves with
 * all its lines (sub-items, paragraphs, blocks, the blank lines inside it); the blank lines between
 * items and after the last one stay where they are, so a tight list stays tight and a loose one
 * loose. An ordered list keeps its numbers in order. Pure text, no DOM.
 */

import { quotePrefixOf } from "./tableInContainer";

/** A list marker: a bullet or a number with `.` or `)`, then a space, a tab or the end of the line. */
const MARKER = /^([ \t]*)([-*+]|(\d{1,9})([.)]))([ \t]+|$)/u;

/** One line of the source, split around the quote prefix it carries. */
interface Line {
  /** The prefix written back on the line: the list's prefix, or the whole text of a blank quote line. */
  prefix: string;
  /** The text after the prefix ("" for a blank line). */
  rest: string;
  eol: string;
}

function splitLines(source: string): Array<{ text: string; eol: string }> {
  return (source.match(/[^\r\n]*(?:\r\n|\r|\n)|[^\r\n]+$/gu) ?? []).map((line) => {
    const eol = /(?:\r\n|\r|\n)$/u.exec(line)?.[0] ?? "";
    return { text: line.slice(0, line.length - eol.length), eol };
  });
}

/** The number of quote markers in a prefix. */
const depth = (prefix: string): number => prefix.split(">").length - 1;

/**
 * The lines of `source` without the list's quote prefix, or undefined when a line carries another
 * prefix. A blank quote line (`>` alone) counts as carrying the prefix and is written back as it was.
 */
function stripPrefix(source: string): Line[] | undefined {
  const raw = splitLines(source);
  const first = raw.find((line) => line.text.trim() !== "" && !/^[ \t>]*$/u.test(line.text));
  if (!first) return undefined;
  const prefix = quotePrefixOf(first.text);
  const lines: Line[] = [];
  for (const { text, eol } of raw) {
    if (text.startsWith(prefix)) {
      const rest = text.slice(prefix.length);
      lines.push(rest.trim() === "" ? { prefix: text, rest: "", eol } : { prefix, rest, eol });
    } else if (prefix !== "" && /^[ \t>]*$/u.test(text) && depth(text) === depth(prefix)) {
      lines.push({ prefix: text, rest: "", eol });
    } else {
      return undefined;
    }
  }
  return lines;
}

const indentOf = (text: string): number => text.length - text.trimStart().length;

/** The items of the list and the blank lines after each one, or undefined when it does not read as a list. */
function readItems(lines: Line[]): { items: Line[][]; gaps: Line[][] } | undefined {
  const start = lines.findIndex((line) => line.rest !== "");
  const opener = start < 0 ? null : MARKER.exec(lines[start]!.rest);
  // Text before the first item: the source is not one list.
  if (!opener || lines.slice(0, start).some((line) => line.rest !== "")) return undefined;
  const indent = opener[1]!.length;
  const items: Line[][] = [];
  const gaps: Line[][] = [];
  // Blank lines before the first item stay in front of it.
  const lead = lines.slice(0, start);
  for (const line of lines.slice(start)) {
    const marker = MARKER.exec(line.rest);
    if (marker && marker[1]!.length === indent) {
      items.push([line]);
      gaps.push([]);
    } else if (line.rest === "") {
      gaps[gaps.length - 1]!.push(line);
    } else if (indentOf(line.rest) > indent) {
      // A line of the item: the blank lines before it belong to the item too.
      items[items.length - 1]!.push(...gaps[gaps.length - 1]!, line);
      gaps[gaps.length - 1] = [];
    } else {
      return undefined;
    }
  }
  if (lead.length > 0) gaps.unshift(lead);
  else gaps.unshift([]);
  return { items, gaps };
}

/** The item with its marker number set to `value` and its content column kept (rule A.9). */
function renumber(item: Line[], value: number): Line[] {
  const head = item[0]!;
  const marker = MARKER.exec(head.rest)!;
  const number = marker[3];
  if (number === undefined || Number(number) === value) return item;
  const written = String(value);
  const grow = written.length - number.length;
  const indent = marker[1]!;
  const space = marker[5]!;
  const after = head.rest.slice(marker[0].length);
  // A shorter marker written with one space after it keeps its content column.
  const spacing = grow < 0 && space === " " ? " ".repeat(1 - grow) : space;
  const first: Line = { ...head, rest: indent + written + marker[4]! + spacing + after };
  const others = item.slice(1).map((line) => (grow > 0 && line.rest !== ""
    ? { ...line, rest: " ".repeat(grow) + line.rest }
    : line));
  return [first, ...others];
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-262
/**
 * Moves the item at index `from` of the list `source` (the text of one whole list, the lines the
 * page opened, container prefix included) to index `to`, or undefined when the source cannot be
 * read as `itemCount` items.
 */
export function moveListItem(source: string, itemCount: number, from: number, to: number): string | undefined {
  if (![itemCount, from, to].every(Number.isSafeInteger) || from === to) return undefined;
  if (from < 0 || to < 0 || from >= itemCount || to >= itemCount) return undefined;
  const lines = stripPrefix(source);
  const read = lines && readItems(lines);
  if (!read || read.items.length !== itemCount) return undefined;
  const { items, gaps } = read;
  const numbers = items.map((item) => MARKER.exec(item[0]!.rest)![3]);
  const ordered = numbers.every((number) => number !== undefined);
  const moved = [...items];
  const [item] = moved.splice(from, 1);
  moved.splice(to, 0, item!);
  let result = moved;
  if (ordered) {
    const first = Number(numbers[0]);
    const same = numbers.every((number) => Number(number) === first);
    result = moved.map((entry, index) => renumber(entry, same ? first : first + index));
  }
  const ending = /\r\n|\r|\n/u.exec(source)?.[0] ?? "\n";
  const body = [...gaps[0]!, ...result.flatMap((entry, index) => [...entry, ...gaps[index + 1]!])];
  const text = body.map((line, index) => {
    // A line that moved off the end of the source gets a line ending; the new last line keeps none.
    const eol = index === body.length - 1 ? lines!.at(-1)!.eol : (line.eol || ending);
    return line.prefix + line.rest + eol;
  });
  return text.join("");
}
