/**
 * Replacing the matches of the find bar in the source. The page names, for each match, the source
 * lines of its block, the matched text as the page shows it and which occurrence of that text it
 * is. The planner locates the same occurrence in the source lines and replaces that span only; a
 * match whose text does not map one-to-one to the source is skipped and counted. Pure module.
 */

import type { FindReplaceItem } from "../protocol/pageToHost";
import { sourceLines, type EditRefusal, type TextEdit } from "./textEdit";

/** The edits to apply, how many matches they replace and how many could not be mapped. */
export type FindReplacePlan = EditRefusal | { readonly edits: TextEdit[]; readonly replaced: number; readonly skipped: number };

/** Refusal of a request that names no replaceable match. */
export const FIND_REPLACE_NOTHING = "None of the matches can be replaced from the preview. Refresh the preview.";

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\/]/gu, "\\$&");

/**
 * The span of every occurrence of `find` in `text`, overlapping ones included. A white space in
 * `find` stands for any run of white space in the source: the page shows a line break of a wrapped
 * paragraph as one space.
 */
function sourceOccurrences(text: string, find: string): Array<{ start: number; end: number }> {
  const pattern = new RegExp(find.split(/\s+/u).map(escapeRegex).join("\\s+"), "uy");
  const spans: Array<{ start: number; end: number }> = [];
  for (let index = 0; index < text.length; index += 1) {
    pattern.lastIndex = index;
    const found = pattern.exec(text);
    if (found) spans.push({ start: index, end: index + found[0].length });
  }
  return spans;
}

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-012
/**
 * Plans the replacement of `items` in `text`. An item is skipped when its lines are gone, when the
 * block's source has another number of occurrences of the text than the page shows (a link target,
 * a formula, generated text or markup inside the match), or when it overlaps an earlier item.
 */
export function planFindReplace(text: string, items: readonly FindReplaceItem[]): FindReplacePlan {
  const lines = sourceLines(text);
  const cache = new Map<string, Array<{ start: number; end: number }>>();
  const planned: TextEdit[] = [];
  for (const item of items) {
    if (item.line < 1 || item.endLine < item.line || item.endLine > lines.count) continue;
    const base = lines.start(item.line - 1);
    const blockText = text.slice(base, lines.end(item.endLine - 1));
    const key = `${item.line}:${item.endLine}:${item.find}`;
    let spans = cache.get(key);
    if (!spans) {
      spans = sourceOccurrences(blockText, item.find);
      cache.set(key, spans);
    }
    if (spans.length !== item.occurrences || item.occurrence >= spans.length) continue;
    const span = spans[item.occurrence]!;
    planned.push({ start: base + span.start, end: base + span.end, text: item.replacement });
  }
  planned.sort((left, right) => left.start - right.start || left.end - right.end);
  const edits: TextEdit[] = [];
  let reach = -1;
  for (const edit of planned) {
    if (edit.start < reach) continue;
    edits.push(edit);
    reach = edit.end;
  }
  if (edits.length === 0) return { refused: FIND_REPLACE_NOTHING };
  return { edits, replaced: edits.length, skipped: items.length - edits.length };
}
