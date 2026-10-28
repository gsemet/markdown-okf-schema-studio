/**
 * What changed in the front matter between two texts: the source lines of each field (they tie a
 * properties table row to the line ranges that differ from HEAD) and the fields added, modified and
 * removed. Pure: no host API.
 */

import { isMap, isScalar } from "yaml";

import { changedLineRanges, type LineRange } from "../mapping/lineDiff";
import { extractFrontmatterShared, matchFrontmatterBlock } from "./frontmatterParse";

/** The source lines of one front matter field (1-based, whole file, inclusive). */
export interface FieldLines {
  start: number;
  end: number;
}

/** The fields added, changed and removed between two texts. */
export interface FrontmatterFieldChanges {
  added: string[];
  modified: string[];
  removed: string[];
}

/** Line (1-based, in `text`) of the character at `offset`. */
function lineAt(text: string, offset: number): number {
  let line = 1;
  for (let index = text.indexOf("\n"); index !== -1 && index < offset; index = text.indexOf("\n", index + 1)) {
    line += 1;
  }
  return line;
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-215
/**
 * The source lines of each top-level field of the front matter of `source`, in YAML order: from the
 * line of its key to the last line of its value. Empty when there is no front matter or it is not a
 * valid mapping.
 */
export function frontmatterFieldLines(source: string): Map<string, FieldLines> {
  const lines = new Map<string, FieldLines>();
  const block = matchFrontmatterBlock(source);
  const extraction = extractFrontmatterShared(source);
  const contents = extraction.document?.contents;
  if (!block || extraction.error || !isMap(contents)) return lines;
  const body = extraction.text;
  for (const pair of contents.items) {
    if (!isScalar(pair.key) || !pair.key.range) continue;
    const name = String(pair.key.value);
    const startOffset = pair.key.range[0];
    const valueRange = (pair.value as { range?: [number, number, number] | null } | null)?.range;
    let endOffset = Math.max(valueRange?.[1] ?? 0, pair.key.range[1]);
    while (endOffset > startOffset + 1 && /\s/u.test(body[endOffset - 1] ?? "")) endOffset -= 1;
    // The body starts on the line after the opening fence.
    lines.set(name, {
      start: lineAt(body, startOffset) + 1,
      end: lineAt(body, Math.max(startOffset, endOffset - 1)) + 1,
    });
  }
  return lines;
}

function fieldValues(source: string): Map<string, string> | undefined {
  const extraction = extractFrontmatterShared(source);
  if (!extraction.present) return new Map();
  if (extraction.error || !extraction.frontmatter) return undefined;
  const values = new Map<string, string>();
  for (const [name, value] of Object.entries(extraction.frontmatter)) {
    values.set(name, JSON.stringify(value) ?? "undefined");
  }
  return values;
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-215
/**
 * The fields of the front matter added, modified (another value) and removed between `base` and
 * `current`. A reordered field is not a change. Nothing is reported when either front matter is not
 * a valid mapping.
 */
export function frontmatterFieldChanges(base: string, current: string): FrontmatterFieldChanges {
  const before = fieldValues(base);
  const after = fieldValues(current);
  const changes: FrontmatterFieldChanges = { added: [], modified: [], removed: [] };
  if (!before || !after) return changes;
  for (const [name, value] of after) {
    if (!before.has(name)) changes.added.push(name);
    else if (before.get(name) !== value) changes.modified.push(name);
  }
  for (const name of before.keys()) {
    if (!after.has(name)) changes.removed.push(name);
  }
  return changes;
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-215
/**
 * The line ranges the page marks as changed since HEAD: the lines that differ, and line 1 when a
 * front matter field was removed, so that a removed field still marks the properties table (a
 * removed line has no range of its own). The page puts the bar on the row of each changed field; the
 * table itself gets one only when no row carries one.
 */
export function incomingChangeRanges(base: string, current: string): LineRange[] {
  const ranges = changedLineRanges(base, current);
  if (frontmatterFieldChanges(base, current).removed.length === 0) return ranges;
  return ranges.length > 0 && ranges[0].start <= 1 ? ranges : [{ start: 1, end: 1 }, ...ranges];
}
