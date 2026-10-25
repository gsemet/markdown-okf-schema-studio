/**
 * Renaming a MyST label from its anchor icon: pure helpers for the host. Only the `(name)=` line
 * changes; the `{ref}` uses of the old name are counted, never rewritten. This module must not
 * import `vscode`.
 */

export const MAX_LABEL_LENGTH = 100;

/**
 * The one label name pattern: the renderer (anchor icon), the page (rename field) and the host
 * (message validator and rename) all use it, so every label with an icon can be renamed.
 */
export const LABEL_NAME = /^[A-Za-z0-9_.:-]+$/u;

// @implements_req SwRS-MDOKFSTUDIO-MYST-038
export function isValidLabelName(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_LABEL_LENGTH && LABEL_NAME.test(value);
}

export interface LabelLineEdit {
  /** UTF-16 offsets of the whole `(oldName)=` text in the document (line ending excluded). */
  start: number;
  end: number;
  text: string;
}

// @implements_req SwRS-MDOKFSTUDIO-MYST-045
/**
 * The edit that renames the label on 1-based `line`, or `undefined` when that line is not exactly
 * `(oldName)=` (surrounding whitespace aside) or a name is invalid. Never guesses another line.
 */
export function renameLabelLine(
  text: string,
  line: number,
  oldName: string,
  newName: string,
): LabelLineEdit | undefined {
  if (!Number.isSafeInteger(line) || line < 1 || !isValidLabelName(oldName) || !isValidLabelName(newName)) {
    return undefined;
  }
  let start = 0;
  for (let current = 1; current < line; current += 1) {
    const next = text.indexOf("\n", start);
    if (next === -1) return undefined;
    start = next + 1;
  }
  let end = text.indexOf("\n", start);
  end = end === -1 ? text.length : end;
  if (end > start && text[end - 1] === "\r") end -= 1;
  const content = text.slice(start, end);
  if (content.trim() !== `(${oldName})=`) return undefined;
  const leading = content.length - content.trimStart().length;
  const trailing = content.length - content.trimEnd().length;
  return { start: start + leading, end: end - trailing, text: `(${newName})=` };
}

/** Number of `` {ref}`name` `` and `` {ref}`text <name>` `` uses of `name`. */
export function countRefUses(text: string, name: string): number {
  if (!isValidLabelName(name)) return 0;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(
    "\\{ref\\}`(?:\\s*" + escaped + "\\s*|[^`<]*<\\s*" + escaped + "\\s*>\\s*)`", "gu");
  return text.match(pattern)?.length ?? 0;
}
