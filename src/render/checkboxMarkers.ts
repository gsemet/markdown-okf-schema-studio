/**
 * Checkbox markers (`[ ]`, `[x]`, `[X]`) anywhere in prose: list items, paragraphs, table cells.
 *
 * The parser only reports line positions, so markers are swapped for private-use placeholders
 * before parsing. Each placeholder carries the marker's index, which maps back to the exact
 * source line and column; the host toggles that single character in the buffer.
 */

export interface CheckboxMarker {
  /** One-based line in the full document, frontmatter included. */
  line: number;
  /** Zero-based UTF-16 column of the opening bracket, as VS Code positions count it. */
  column: number;
  checked: boolean;
  /** The literal marker text, restored wherever the marker is not rendered as a checkbox. */
  text: string;
}

export interface PreparedCheckboxSource {
  text: string;
  markers: CheckboxMarker[];
}

export type CheckboxSegment = { text: string } | { marker: number };

const PLACEHOLDER_START = "";
const PLACEHOLDER_END = "";
// Hexadecimal digits encoded in the private-use area, so a placeholder contains no character
// that Markdown could interpret (no digits, punctuation, or whitespace).
const DIGIT_BASE = 0xe010;
const PLACEHOLDER_PATTERN = /([-]+)/gu;
const MARKER_PATTERN = /\[([ xX])\]/gu;
const ATX_HEADING = /^ {0,3}#{1,6}(?:[ \t]|$)/u;
const LINE_SPLIT = /(\r\n|\n|\r)/u;

function encodeIndex(index: number): string {
  return [...index.toString(16)]
    .map((digit) => String.fromCharCode(DIGIT_BASE + Number.parseInt(digit, 16)))
    .join("");
}

function decodeIndex(encoded: string): number {
  return Number.parseInt(
    [...encoded].map((character) => (character.charCodeAt(0) - DIGIT_BASE).toString(16)).join(""),
    16,
  );
}

function placeholder(index: number): string {
  return `${PLACEHOLDER_START}${encodeIndex(index)}${PLACEHOLDER_END}`;
}

/** Labels defined as `[x]: target`; such a marker is a shortcut reference link, not a checkbox. */
function definedLabels(markdown: string): Set<string> {
  const labels = new Set<string>();
  for (const match of markdown.matchAll(/^ {0,3}\[([xX])\]:/gmu)) {
    labels.add(match[1].toLowerCase());
  }
  return labels;
}

function isCheckboxMarker(line: string, index: number, value: string, labels: ReadonlySet<string>): boolean {
  const before = line[index - 1];
  const after = line[index + 3];
  // `\[ ]` is escaped, `[[x]]` is a wikilink, `![x]` an image, and `][x]` a reference link.
  if (before === "\\" || before === "[" || before === "]" || before === "!") return false;
  // `[x](url)`, `[x][ref]`, and `[x]]` are link syntax.
  if (after === "(" || after === "[" || after === "]") return false;
  // `[x]: url` at the start of a line is a link reference definition.
  if (after === ":" && /^ {0,3}$/u.test(line.slice(0, index))) return false;
  return value === " " || !labels.has(value.toLowerCase());
}

/**
 * Replaces checkbox markers with placeholders, keeping every line break so parser line numbers
 * stay valid. `firstLine` is the one-based document line of the first line of `markdown`.
 */
export function prepareCheckboxMarkers(markdown: string, firstLine = 1): PreparedCheckboxSource {
  const labels = definedLabels(markdown);
  const markers: CheckboxMarker[] = [];
  const parts = markdown.split(LINE_SPLIT);
  for (let part = 0; part < parts.length; part += 2) {
    const line = parts[part];
    if (!line.includes("[") || ATX_HEADING.test(line)) continue;
    const lineNumber = firstLine + part / 2;
    parts[part] = line.replace(MARKER_PATTERN, (text: string, value: string, index: number) => {
      if (!isCheckboxMarker(line, index, value, labels)) return text;
      markers.push({ line: lineNumber, column: index, checked: value !== " ", text });
      return placeholder(markers.length - 1);
    });
  }
  return { text: parts.join(""), markers };
}

export function hasCheckboxPlaceholder(value: string): boolean {
  return value.includes(PLACEHOLDER_START);
}

/** Puts the original marker text back, for contexts where a checkbox must not render. */
export function restoreCheckboxPlaceholders(value: string, markers: readonly CheckboxMarker[]): string {
  if (!hasCheckboxPlaceholder(value)) return value;
  return value.replace(PLACEHOLDER_PATTERN, (match: string, encoded: string) =>
    markers[decodeIndex(encoded)]?.text ?? match);
}

/** Splits text into literal runs and marker references, in source order. */
export function splitCheckboxPlaceholders(value: string, markers: readonly CheckboxMarker[]): CheckboxSegment[] {
  const segments: CheckboxSegment[] = [];
  let offset = 0;
  for (const match of value.matchAll(PLACEHOLDER_PATTERN)) {
    const index = decodeIndex(match[1]);
    if (!markers[index] || match.index === undefined) continue;
    if (match.index > offset) segments.push({ text: value.slice(offset, match.index) });
    segments.push({ marker: index });
    offset = match.index + match[0].length;
  }
  if (offset < value.length) segments.push({ text: value.slice(offset) });
  return segments;
}

export interface CheckboxToggle {
  /** Column of the character between the brackets. */
  column: number;
  replacement: "x" | " ";
  /** False when the marker already has the requested state. */
  changed: boolean;
}

/**
 * Computes the one-character edit that gives the marker at `column` the requested state.
 * Returns undefined when the line no longer has a marker there.
 */
export function checkboxToggleEdit(lineText: string, column: number, checked: boolean): CheckboxToggle | undefined {
  if (!Number.isSafeInteger(column) || column < 0) return undefined;
  const marker = /^\[([ xX])\]/u.exec(lineText.slice(column, column + 3));
  if (!marker) return undefined;
  return {
    column: column + 1,
    replacement: checked ? "x" : " ",
    changed: (marker[1] !== " ") !== checked,
  };
}
