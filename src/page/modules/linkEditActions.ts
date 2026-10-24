/**
 * Links and images of the palette: the link panel's draft read back from the selection (inline
 * link, reference link or bare URL), the image around the caret, and the link edit.
 */

import type { EditActionContext, ImageDraft, LinkDraft } from "./editActions";
import type { TextEdit } from "./textEditing";

const LINK_PATTERN =
  /\[((?:\\.|[^\]\\\n])*)\]\(\s*(<[^>\n]*>|[^)\s\n]*)(?:\s+("[^"\n]*"))?\s*\)/gu;

const IMAGE_PATTERN =
  /!\[((?:\\.|[^\]\\\n])*)\]\(\s*(<[^>\n]*>|[^)\s\n]*)(?:\s+("[^"\n]*"))?\s*\)/gu;

const REFERENCE_LINK_PATTERN =
  /\[((?:\\.|[^\]\\\n])*)\](?:\[((?:\\.|[^\]\\\n])*)\])?(?![([:])/gu;

const DEFINITION_PATTERN =
  /^ {0,3}\[([^\]\n]+)\]:[ \t]*(<[^>\n]*>|\S+)(?:[ \t]+("[^"\n]*"|'[^'\n]*'|\([^)\n]*\)))?[ \t]*$/gmu;

const URL_SELECTION = /^(?:https?:\/\/|mailto:|www\.)\S+$/iu;

/**
 * Starting values of the link panel. A selection inside an existing `[text](url)` (or a caret
 * within it) reads that link back and replaces all of it; a selected URL becomes the target
 * with an empty text; any other selection becomes the text.
 */
export function linkDraft(ctx: EditActionContext): LinkDraft {
  const { value, selectionStart, selectionEnd } = ctx;
  const collapsed = selectionStart === selectionEnd;
  for (const match of value.matchAll(LINK_PATTERN)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (start > 0 && value.charAt(start - 1) === "!") continue;
    const inside = collapsed
      ? selectionStart > start && selectionStart < end
      : selectionStart >= start && selectionEnd <= end;
    if (!inside) continue;
    const target = match[2];
    const url = target.startsWith("<") ? target.slice(1, -1) : target;
    const text = match[1].replace(/\\([[\]])/gu, "$1");
    return match[3] === undefined ? { text, url, start, end } : { text, url, start, end, title: match[3] };
  }
  const reference = referenceDraft(ctx);
  if (reference) return reference;
  const selected = value.slice(selectionStart, selectionEnd);
  if (URL_SELECTION.test(selected)) {
    return { text: "", url: selected, start: selectionStart, end: selectionEnd };
  }
  return { text: selected, url: "", start: selectionStart, end: selectionEnd };
}

const normalLabel = (label: string): string => label.trim().replace(/\s+/gu, " ").toLowerCase();

/**
 * A `[text][ref]`, `[text][]` or `[ref]` link around the selection whose definition is in the
 * same text: the panel starts from the definition and saving writes an inline link (the
 * definition stays). Without a definition here, nothing is read back.
 */
function referenceDraft(ctx: EditActionContext): LinkDraft | undefined {
  const { value, selectionStart, selectionEnd } = ctx;
  const collapsed = selectionStart === selectionEnd;
  const definitions = new Map<string, { url: string; title?: string }>();
  for (const match of value.matchAll(DEFINITION_PATTERN)) {
    const key = normalLabel(match[1]);
    if (definitions.has(key)) continue;
    const target = match[2];
    const url = target.startsWith("<") ? target.slice(1, -1) : target;
    const title = match[3] === undefined ? undefined : "\"" + match[3].slice(1, -1).replace(/"/gu, "'") + "\"";
    definitions.set(key, title === undefined ? { url } : { url, title });
  }
  if (definitions.size === 0) return undefined;
  for (const match of value.matchAll(REFERENCE_LINK_PATTERN)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (start > 0 && value.charAt(start - 1) === "!") continue;
    const inside = collapsed
      ? selectionStart > start && selectionStart < end
      : selectionStart >= start && selectionEnd <= end;
    if (!inside) continue;
    const label = match[2] === undefined || match[2] === "" ? match[1] : match[2];
    const found = definitions.get(normalLabel(label));
    if (!found) continue;
    const text = match[1].replace(/\\([[\]])/gu, "$1");
    return found.title === undefined
      ? { text, url: found.url, start, end }
      : { text, url: found.url, start, end, title: found.title };
  }
  return undefined;
}

/** The image around the selection or caret (`![alt](path)`), or `undefined` outside any image. */
export function imageDraft(ctx: EditActionContext): ImageDraft | undefined {
  const { value, selectionStart, selectionEnd } = ctx;
  const collapsed = selectionStart === selectionEnd;
  for (const match of value.matchAll(IMAGE_PATTERN)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const inside = collapsed
      ? selectionStart > start && selectionStart < end
      : selectionStart >= start && selectionEnd <= end;
    if (!inside) continue;
    const target = match[2];
    const url = target.startsWith("<") ? target.slice(1, -1) : target;
    const alt = match[1].replace(/\\([[\]])/gu, "$1");
    return match[3] === undefined ? { alt, url, start, end } : { alt, url, start, end, title: match[3] };
  }
  return undefined;
}

/** The edit that writes `[text](url)` over the range of the selection's link draft. */
export function linkEdit(ctx: EditActionContext, text: string, url: string): TextEdit {
  const draft = linkDraft(ctx);
  // `<` and `>` cannot be written even inside `<...>`, so they are percent-encoded.
  const target = url.trim().replace(/</gu, "%3C").replace(/>/gu, "%3E");
  const label = (text.trim() === "" ? target : text.trim()).replace(/([[\]])/gu, "\\$1");
  let depth = 0;
  let balanced = true;
  for (const char of target) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (depth < 0) balanced = false;
  }
  const written = /\s/u.test(target) || !balanced || depth !== 0 ? "<" + target + ">" : target;
  const prefix = "[" + label + "](";
  // An empty target leaves the caret inside the parentheses to type it there.
  const caret = draft.start + prefix.length + (target === "" ? 0 : written.length + 1
    + (draft.title === undefined ? 0 : draft.title.length + 1));
  return {
    start: draft.start,
    end: draft.end,
    text: prefix + written + (draft.title === undefined ? "" : " " + draft.title) + ")",
    selectionStart: caret,
    selectionEnd: caret,
  };
}
