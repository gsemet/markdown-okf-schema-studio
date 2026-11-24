/**
 * Aligns the rendered text of a mapped element with the Markdown lines it comes from: every
 * rendered character gets the span of source it was written as. The alignment is deterministic and
 * strict: whitespace is ignored on both sides, a source character that equals the next rendered one
 * is that character, and a source character that is Markdown syntax (emphasis markers, backticks,
 * brackets and link targets, list, heading and quote markers, table pipes, fences, escapes,
 * entities) is skipped. Anything else, or any rendered character left over, makes the alignment
 * fail: no search, no guess. Pure module: no DOM, no host API.
 */

import { RAW_COPY_PLACEHOLDER } from "./rawCopyKinds";

/** The source characters `start..end` (UTF-16 offsets, end excluded) a rendered character was written as. */
export interface SourceSpan {
  start: number;
  end: number;
}

/** The offsets of every line: its first character, and its end before the line break. */
export interface LineTable {
  readonly starts: readonly number[];
  readonly ends: readonly number[];
}

/** The line table of a source text (line breaks LF, CR LF or CR). */
export function buildLineTable(source: string): LineTable {
  const starts = [0];
  const ends: number[] = [];
  for (const lineBreak of source.matchAll(/\r\n|\n|\r/gu)) {
    ends.push(lineBreak.index);
    starts.push(lineBreak.index + lineBreak[0].length);
  }
  ends.push(source.length);
  return { starts, ends };
}

/** The non-whitespace characters of a rendered text, one entry per code point. */
export function renderedCharacters(text: string): string[] {
  return Array.from(text.replace(/\s+/gu, ""));
}

interface Fence {
  readonly char: string;
  readonly length: number;
  readonly literal: boolean;
}

/** Directives whose content is code: copied character for character, not read as Markdown. */
const LITERAL_DIRECTIVES = new Set([
  "code-block", "code", "sourcecode", "code-cell", "literalinclude", "mermaid", "plantuml", "math", "raw",
]);

const THEMATIC_BREAK = /^[ \t]{0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$|^[ \t]{0,3}=+[ \t]*$/u;
const DELIMITER_ROW = /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/u;
const FENCE_OPEN = /^[ \t]*(`{3,}|~{3,}|:{3,})(.*)$/u;
const OPTION_LINE = /^[ \t]*:[\w-]+:(?:[ \t]|$)/u;
const ENTITY = /^&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/iu;
const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", copy: "©", hellip: "…",
  mdash: "—", ndash: "–",
};
const ATOMIC_INLINE_PATTERNS = [
  /^!\[[^\]]*\](?:\([^)]*\)|\[[^\]]*\])/u,
  /^\[\^[^\]\s]+\]/u,
  /^\$[^$\n]+\$/u,
  /^\{[\w:.+-]+\}(`+)(?:(?!\1)[^])+?\1(?!`)/u,
  /^\[-?@[^\]]+\]/u,
  /^@[\w:.-]+/u,
];

const isWhitespace = (char: string): boolean => /\s/u.test(char);
const isAsciiPunctuation = (char: string): boolean => /[!-/:-@[-`{-~]/u.test(char);

function decodeEntity(entity: string): string | undefined {
  if (entity[0] !== "#") return NAMED_ENTITIES[entity.toLowerCase()];
  const code = entity[1] === "x" || entity[1] === "X" ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
  return Number.isSafeInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : undefined;
}

/** The index just after the `)` that closes the `(` at `open`, or -1. */
function closingParenthesis(line: string, open: number): number {
  let depth = 0;
  for (let index = open; index < line.length; index += 1) {
    if (line[index] === "\\") index += 1;
    else if (line[index] === "(") depth += 1;
    else if (line[index] === ")" && --depth === 0) return index + 1;
  }
  return -1;
}

/** Where the Markdown of a line starts (block markers skipped) and ends, or `undefined` for a line that renders no text. */
function blockContent(line: string): { from: number; to: number } | undefined {
  if (THEMATIC_BREAK.test(line) || /^[ \t]*(?:\(\S+\)=|%.*|\+\+\+.*)$/u.test(line)) return undefined;
  if (/^[ \t]{0,3}\[[^\]\n]+\]:[ \t]*\S/u.test(line) && !/^[ \t]*\[\^/u.test(line)) return undefined;
  let from = 0;
  let to = line.length;
  const footnote = /^[ \t]*\[\^[^\]\n]+\]:[ \t]*/u.exec(line);
  if (footnote) from = footnote[0].length;
  for (let guard = 0; guard < 8; guard += 1) {
    const rest = line.slice(from);
    const quote = /^[ \t]{0,3}>[ \t]?/u.exec(rest);
    if (quote) {
      from += quote[0].length;
      if (/^\[![A-Za-z]+\][ \t]*$/u.test(line.slice(from))) return undefined;
      continue;
    }
    const list = /^[ \t]*(?:[-*+]|\d{1,9}[.)])(?:[ \t]+|$)(?:\[[ xX]\](?:[ \t]+|$))?/u.exec(rest);
    if (list) {
      from += list[0].length;
      continue;
    }
    const heading = /^[ \t]{0,3}#{1,6}(?:[ \t]+|$)/u.exec(rest);
    if (heading) {
      from += heading[0].length;
      to -= /[ \t]+#+[ \t]*$/u.exec(line)?.[0].length ?? 0;
      break;
    }
    const definition = /^[ \t]*:[ \t]+/u.exec(rest);
    if (definition) from += definition[0].length;
    break;
  }
  return { from, to: Math.max(from, to) };
}

/**
 * The span of source of every rendered character of `rendered` (see {@link renderedCharacters}),
 * read from the lines `firstLine..lastLine` (1-based, inclusive) of `source`; `undefined` when the
 * lines do not render exactly that text.
 */
export function alignRendered(
  source: string,
  table: LineTable,
  firstLine: number,
  lastLine: number,
  rendered: readonly string[],
): SourceSpan[] | undefined {
  if (firstLine < 1 || lastLine < firstLine || lastLine > table.starts.length) return undefined;
  const spans: SourceSpan[] = [];
  const fences: Fence[] = [];
  let inComment = false;
  let options: "none" | "lines" | "yaml" = "none";
  const lineAt = (number: number): string => source.slice(table.starts[number - 1], table.ends[number - 1]);

  const take = (offset: number, length: number): void => {
    spans.push({ start: offset, end: offset + length });
  };

  const literalLine = (line: string, offset: number): boolean => {
    for (let index = 0; index < line.length;) {
      const char = String.fromCodePoint(line.codePointAt(index)!);
      if (!isWhitespace(char)) {
        if (rendered[spans.length] !== char) return false;
        take(offset + index, char.length);
      }
      index += char.length;
    }
    return true;
  };

  const inlineLine = (line: string, offset: number, from: number, to: number, pipes: boolean): boolean => {
    let index = from;
    while (index < to) {
      const char = line[index]!;
      if (isWhitespace(char)) {
        index += 1;
        continue;
      }
      const want = rendered[spans.length];
      if (line.startsWith("<!--", index)) {
        const close = line.indexOf("-->", index + 4);
        if (close < 0) {
          inComment = true;
          return true;
        }
        index = close + 3;
        continue;
      }
      if (want === RAW_COPY_PLACEHOLDER) {
        const rest = line.slice(index, to);
        const construct = ATOMIC_INLINE_PATTERNS.map((pattern) => pattern.exec(rest)).find((match) => match !== null);
        if (construct) {
          take(offset + index, construct[0].length);
          index += construct[0].length;
        } else if ("*_~[]".includes(char) || char === "]") {
          index += 1;
        } else {
          return false;
        }
        continue;
      }
      if (char === "`") {
        let run = 1;
        while (line[index + run] === "`") run += 1;
        const closer = new RegExp("(?<!`)`{" + run + "}(?!`)", "u").exec(line.slice(index + run));
        if (closer) {
          const innerEnd = index + run + closer.index;
          if (!literalLine(line.slice(index + run, innerEnd), offset + index + run)) return false;
          index = innerEnd + run;
        } else {
          index += run;
        }
        continue;
      }
      if (char === "\\") {
        const escaped = line[index + 1];
        if (escaped === undefined) {
          index += 1;
        } else if (isAsciiPunctuation(escaped)) {
          if (want !== escaped) return false;
          take(offset + index, 2);
          index += 2;
        } else if (want === "\\") {
          take(offset + index, 1);
          index += 1;
        } else {
          return false;
        }
        continue;
      }
      if (char === "&") {
        const entity = ENTITY.exec(line.slice(index, to));
        const decoded = entity ? decodeEntity(entity[1]!) : undefined;
        if (entity && decoded !== undefined && (isWhitespace(decoded) || decoded === want)) {
          if (!isWhitespace(decoded)) take(offset + index, entity[0].length);
          index += entity[0].length;
          continue;
        }
      }
      if (want !== undefined && line.startsWith(want, index)) {
        take(offset + index, want.length);
        index += want.length;
        continue;
      }
      if (char === "]") {
        index += 1;
        if (line[index] === "(") {
          const close = closingParenthesis(line, index);
          if (close > 0) index = close;
        } else if (line[index] === "[") {
          const close = line.indexOf("]", index);
          if (close > 0) index = close + 1;
        }
        continue;
      }
      if (char === "<") {
        const rest = line.slice(index, to);
        if (/^<[A-Za-z][A-Za-z0-9+.-]*:[^\s>]*>/u.test(rest) || /^<[^\s<>@]+@[^\s<>]+>/u.test(rest)) {
          index += 1;
        } else {
          const tag = /^<\/?[A-Za-z][^>]*>/u.exec(rest);
          if (!tag) return false;
          index += tag[0].length;
        }
        continue;
      }
      if (char === "{") {
        const role = /^\{[\w:.+-]+\}(?=`)/u.exec(line.slice(index, to));
        if (!role) return false;
        index += role[0].length;
        continue;
      }
      if ("*_~[]>".includes(char) || (pipes && char === "|")) {
        index += 1;
        continue;
      }
      return false;
    }
    return true;
  };

  const markdownLine = (line: string, offset: number, pipes: boolean): boolean => {
    const content = blockContent(line);
    return content === undefined || inlineLine(line, offset, content.from, content.to, pipes);
  };

  for (let number = firstLine; number <= lastLine; number += 1) {
    const line = lineAt(number);
    const offset = table.starts[number - 1]!;
    let from = 0;
    if (inComment) {
      const close = line.indexOf("-->");
      if (close < 0) continue;
      inComment = false;
      from = close + 3;
      if (!inlineLine(line, offset, from, line.length, false)) return undefined;
      continue;
    }
    const top = fences[fences.length - 1];
    const closing = /^[ \t]*(`{3,}|~{3,}|:{3,})[ \t]*$/u.exec(line);
    if (top && closing && closing[1]![0] === top.char && closing[1]!.length >= top.length) {
      fences.pop();
      options = "none";
      continue;
    }
    if (options === "yaml") {
      if (/^[ \t]*(?:---|\.\.\.)[ \t]*$/u.test(line)) options = "none";
      continue;
    }
    if (options === "lines") {
      if (OPTION_LINE.test(line)) continue;
      if (/^[ \t]*---[ \t]*$/u.test(line)) {
        options = "yaml";
        continue;
      }
      options = "none";
    }
    if (top?.literal) {
      if (!literalLine(line, offset)) return undefined;
      continue;
    }
    const open = FENCE_OPEN.exec(line);
    if (open && !(open[1]![0] === "`" && open[2]!.includes("`"))) {
      const info = open[2]!.trim();
      const name = /^\{([^}]*)\}/u.exec(info)?.[1];
      const literal = open[1]![0] !== ":" && (name === undefined || LITERAL_DIRECTIVES.has(name));
      if (open[1]![0] === ":" && info === "") continue;
      fences.push({ char: open[1]![0]!, length: open[1]!.length, literal });
      options = name === undefined && open[1]![0] !== ":" ? "none" : "lines";
      continue;
    }
    const pipes = /^[ \t]*\|/u.test(line) || /\|[ \t]*$/u.test(line)
      || (number > firstLine && DELIMITER_ROW.test(lineAt(number - 1)) && lineAt(number - 1).includes("|"))
      || (number < lastLine && DELIMITER_ROW.test(lineAt(number + 1)) && lineAt(number + 1).includes("|"));
    if (pipes && DELIMITER_ROW.test(line) && line.includes("|")) continue;
    if (!markdownLine(line, offset, pipes)) return undefined;
  }
  return spans.length === rendered.length ? spans : undefined;
}
