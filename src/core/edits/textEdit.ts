/**
 * Text edits: the only output of the core edit operations. An edit operation reads the document
 * text and returns the replacements to make; the host applies them through its document store
 * (`src/host-api/documentStore.ts`). Pure module: no host API, no DOM, no Node built-ins.
 */

/**
 * One replacement in a document text: the UTF-16 offsets `start` to `end` of the text the edit was
 * planned on are replaced by `text`. `start === end` inserts, an empty `text` deletes.
 */
export interface TextEdit {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

/** The answer of an edit operation that cannot run: the reason, as the page shows it. */
export interface EditRefusal {
  readonly refused: string;
}

/** True when an edit operation refused to run. */
export function isRefusal(value: object): value is EditRefusal {
  return "refused" in value;
}

/**
 * The text after `edits`, all planned on `text`. The edits must not overlap; their order does not
 * matter. Throws a RangeError for an edit outside the text or edits that overlap.
 */
export function applyTextEdits(text: string, edits: readonly TextEdit[]): string {
  const sorted = [...edits].sort((left, right) => left.start - right.start || left.end - right.end);
  let result = "";
  let offset = 0;
  for (const edit of sorted) {
    if (!Number.isSafeInteger(edit.start) || !Number.isSafeInteger(edit.end)
      || edit.start < offset || edit.end < edit.start || edit.end > text.length) {
      throw new RangeError(`The text edit ${edit.start}-${edit.end} is outside the text or overlaps another one.`);
    }
    result += text.slice(offset, edit.start) + edit.text;
    offset = edit.end;
  }
  return result + text.slice(offset);
}

/**
 * The lines of a text as an editor counts them: `\r\n`, `\n` and a lone `\r` each end a line, and a
 * text that ends with a line break has one more, empty, line. Indexes are zero-based.
 */
export interface SourceLines {
  /** Number of lines (at least 1: an empty text has one empty line). */
  readonly count: number;
  /** The text of a line, without its line break. */
  text(index: number): string;
  /** Offset of the first character of a line. */
  start(index: number): number;
  /** Offset just after the last character of a line, before its line break. */
  end(index: number): number;
}

/** Splits `text` into {@link SourceLines}. */
export function sourceLines(text: string): SourceLines {
  const starts = [0];
  const ends: number[] = [];
  for (const match of text.matchAll(/\r\n|\n|\r/gu)) {
    const index = match.index as number;
    ends.push(index);
    starts.push(index + match[0].length);
  }
  ends.push(text.length);
  const check = (index: number): void => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= starts.length) {
      throw new RangeError(`Line ${index} is outside the text (${starts.length} lines).`);
    }
  };
  return {
    count: starts.length,
    text: (index) => {
      check(index);
      return text.slice(starts[index], ends[index]);
    },
    start: (index) => {
      check(index);
      return starts[index];
    },
    end: (index) => {
      check(index);
      return ends[index];
    },
  };
}
