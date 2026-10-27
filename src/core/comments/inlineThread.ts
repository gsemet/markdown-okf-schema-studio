/**
 * Inline comment threads: a discussion anchored at one point of the Markdown, kept in the file as
 * one HTML comment.
 *
 *     <!-- THREAD
 *     Ada (2026-10-16 10:47):
 *       the text of the message
 *       that can span several lines
 *     Bob (2026-10-16 10:52):
 *       a reply
 *     -->
 *
 * A message starts with a header line `Author (YYYY-MM-DD HH:MM):` at the start of the line; the
 * lines that follow, indented by two spaces, are its text. Pure: no `vscode`, no DOM. Parsing is
 * tolerant of CRLF, trailing spaces and tabs; an edit replaces only the lines it must, so the rest
 * of the file stays byte for byte as it was.
 */

export interface ThreadMessage {
  author: string;
  /** `YYYY-MM-DD HH:MM`, as written in the file. */
  date: string;
  text: string;
}

export const MAX_THREAD_REPLY_LENGTH = 10000;

const THREAD_OPEN = /^<!--[ \t]*THREAD[ \t]*$/u;
const HEADER = /^(\S(?:.*?\S)?) \((\d{4}-\d{2}-\d{2} \d{2}:\d{2})\):$/u;
const BODY_START = /^THREAD[ \t]*(?:\r?\n|$)/u;
const INDENT = /^(?: {1,2}|\t)/u;

/** True when the text of a comment (without `<!--` and `-->`) opens with the word THREAD. */
 function isThreadBody(body: string): boolean {
  return BODY_START.test(body.trim());
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-167
/**
 * The messages of a thread comment body (the text between `<!--` and `-->`), or `undefined` when
 * it is not a thread: no THREAD opener, no valid message header, or text before the first header.
 */
export function parseThreadBody(body: string): ThreadMessage[] | undefined {
  const trimmed = body.trim();
  if (!BODY_START.test(trimmed)) return undefined;
  const lines = trimmed.split(/\r?\n/u).slice(1);
  const messages: Array<{ author: string; date: string; lines: string[] }> = [];
  for (const raw of lines) {
    const line = raw.replace(/[ \t]+$/u, "");
    const header = HEADER.exec(line);
    if (header) {
      messages.push({ author: header[1], date: header[2], lines: [] });
      continue;
    }
    const current = messages[messages.length - 1];
    if (!current) {
      if (line === "") continue;
      return undefined;
    }
    current.lines.push(line.replace(INDENT, ""));
  }
  if (messages.length === 0) return undefined;
  return messages.map((message) => ({
    author: message.author,
    date: message.date,
    text: message.lines.join("\n").replace(/^\n+/u, "").replace(/\n+$/u, ""),
  }));
}

/** Local date and time as `YYYY-MM-DD HH:MM`. */
export function formatThreadDate(date: Date): string {
  const two = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} `
    + `${two(date.getHours())}:${two(date.getMinutes())}`;
}

/** The author as it can be written in a header: one line, no control characters. */
 function cleanThreadAuthor(author: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = author.replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim();
  return cleaned === "" ? "Anonymous" : cleaned;
}

/** The message lines written for a reply; `-->` inside the text would end the comment. */
 function threadMessageLines(author: string, date: string, text: string): string[] {
  const body = text.replace(/\r\n?/gu, "\n").replace(/-->/gu, "-- >").trim();
  const lines = [`${cleanThreadAuthor(author)} (${date}):`];
  for (const line of body.split("\n")) {
    const trimmed = line.replace(/[ \t]+$/u, "");
    lines.push(trimmed === "" ? "" : `  ${trimmed}`);
  }
  return lines;
}

/** A new, empty thread for the palette: header with the caret line, closing marker. */
export function newThreadSnippet(author: string, date: string): { text: string; caret: number } {
  const head = `<!-- THREAD\n${cleanThreadAuthor(author)} (${date}):\n  `;
  return { text: `${head}\n-->`, caret: head.length };
}

export interface ThreadLineEdit {
  /** Zero-based index, within the given lines, of the first line replaced. */
  fromLine: number;
  /** Number of lines replaced. */
  lineCount: number;
  /** The replacement lines, without line ends. */
  lines: string[];
}

function threadSourceBody(lines: readonly string[]): string | undefined {
  const joined = lines.join("\n").trim();
  const match = /^<!--([\s\S]*?)-->$/u.exec(joined);
  if (!match || match[1].includes("-->") || !isThreadBody(match[1])) return undefined;
  return match[1];
}

/** True when exactly these source lines are one thread comment. */
export function isThreadSource(lines: readonly string[]): boolean {
  const body = threadSourceBody(lines);
  return body !== undefined && parseThreadBody(body) !== undefined && THREAD_OPEN.test(lines[0].trim().replace(/\r$/u, ""));
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-186
/**
 * The edit that appends a reply before the closing `-->`: it replaces the last source line only.
 * `lines` are the lines of the comment, without line ends. `undefined` when they are not a thread
 * or the reply is empty.
 */
export function threadReplyEdit(
  lines: readonly string[],
  author: string,
  date: string,
  text: string,
): ThreadLineEdit | undefined {
  if (!isThreadSource(lines) || text.trim() === "" || text.length > MAX_THREAD_REPLY_LENGTH) return undefined;
  const lastIndex = lines.length - 1;
  const last = lines[lastIndex].replace(/\r$/u, "");
  const close = last.lastIndexOf("-->");
  if (close < 0) return undefined;
  const before = last.slice(0, close);
  const after = last.slice(close);
  const indent = /^[ \t]*/u.exec(last)![0];
  const reply = threadMessageLines(author, date, text);
  if (before.trim() === "") {
    // The usual case: `-->` alone on its line. The new lines go above it.
    return { fromLine: lastIndex, lineCount: 1, lines: [...reply, indent + after] };
  }
  // The last message ends on the line that closes the comment: keep that text, close below it.
  return { fromLine: lastIndex, lineCount: 1, lines: [before.replace(/[ \t]+$/u, ""), ...reply, after] };
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-192
/**
 * The lines to remove to delete a thread. `before` and `after` are the neighbouring source lines
 * (undefined at the edges of the file). One surrounding blank line goes too when both neighbours
 * are blank or missing, so deleting does not leave a double gap.
 */
export function threadDeleteRange(
  lineCount: number,
  before: string | undefined,
  after: string | undefined,
): { fromOffset: number; count: number } {
  const blank = (line: string | undefined): boolean => line === undefined || line.trim() === "";
  if (blank(before) && blank(after) && after !== undefined) {
    return { fromOffset: 0, count: lineCount + 1 };
  }
  if (blank(before) && blank(after) && before !== undefined) {
    return { fromOffset: -1, count: lineCount + 1 };
  }
  return { fromOffset: 0, count: lineCount };
}
