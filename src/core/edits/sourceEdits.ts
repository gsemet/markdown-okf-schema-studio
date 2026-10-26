/**
 * The document edits the preview asks for on the source text: checkbox toggle, label rename,
 * inline thread reply and delete, block move, copy, cut and paste of blocks, and the text of an
 * open block editor. Each operation reads the current document text, refuses with the reason the
 * page shows, or returns the {@link TextEdit} to apply. Nothing here applies an edit, reads a file
 * or talks to a host: the host checks its own preconditions (trust, an open block edit, a stale
 * revision), calls the operation, and applies the edit through its document store.
 *
 * The page's line numbers are never trusted: every operation re-reads the lines it changes.
 */

import { isThreadSource, threadDeleteRange, threadReplyEdit } from "../comments/inlineThread";
import { opensIncludeDirective, planBlockMove, type BlockLines } from "../mapping/blockMove";
import { planCut, planPaste, spanText } from "../mapping/blockRange";
import { STALE_REQUEST } from "../protocol/staleRequest";
import { countRefUses, renameLabelLine } from "../mapping/labelRename";
import { minimalReplacement } from "../mapping/textDiff";
import { checkboxToggleEdit } from "../render/checkboxMarkers";
import { sourceLines, type EditRefusal, type SourceLines, type TextEdit } from "./textEdit";

/** Refusal of a checkbox whose marker is gone. */
export const CHECKBOX_GONE = "The checkbox is no longer in the source. Refresh the preview.";
/** Refusal of a label rename whose `(name)=` line is gone. */
export const LABEL_GONE = "The label is no longer on that line. Refresh the preview.";

/** Why a preview is read-only when the workspace is not trusted. */
export const READ_ONLY_UNTRUSTED = "Editing requires a trusted workspace.";
/** Why a preview is read-only when the file is outside every workspace folder. */
export const READ_ONLY_NO_FOLDER = "Editing needs the file's folder opened as a workspace folder in VS Code.";
/** Refusal of a checkbox toggle whose message is malformed. */
export const MALFORMED_TOGGLE = "The checkbox request was not understood. Refresh the preview.";

/** The reason a read-only preview refuses an edit: the missing folder, else the missing trust. */
export function readOnlyReason(hasWorkspaceFolder: boolean): string {
  return hasWorkspaceFolder ? READ_ONLY_UNTRUSTED : READ_ONLY_NO_FOLDER;
}

export { STALE_REQUEST };
/** Refusal of a thread change whose `<!-- THREAD` comment is gone. */
export const THREAD_GONE = "The thread is no longer in the source. Refresh the preview.";
/** Refusal of a reply that cannot be added (empty, too long, or no closing `-->`). */
export const THREAD_REPLY_REFUSED = "The reply could not be added to this thread.";
/** Refusal of a block move that touches a block coming from an `{include}`. */
export const MOVE_INCLUDED = "A block that comes from an included file cannot be moved.";
/** Refusal of a copy or cut that touches a block coming from an `{include}`. */
export const COPY_INCLUDED = "A block that comes from an included file cannot be copied or cut.";
/** Refusal of a paste next to a block coming from an `{include}`. */
export const PASTE_NEXT_TO_INCLUDED = "Text cannot be pasted next to a block that comes from an included file.";

/** The one-character edit of a checkbox, or no edit when the marker already has the state. */
export type CheckboxTogglePlan = EditRefusal | { unchanged: true } | { edit: TextEdit };

// @implements_req SwRS-MDOKFSTUDIO-GFM-021
/**
 * Gives the task-list marker at 1-based `line`, zero-based `column` (its opening bracket) the
 * state `checked`: a one-character edit between the brackets.
 */
export function planCheckboxToggle(text: string, line: number, column: number, checked: boolean): CheckboxTogglePlan {
  const lines = sourceLines(text);
  const toggle = Number.isSafeInteger(line) && line >= 1 && line <= lines.count
    ? checkboxToggleEdit(lines.text(line - 1), column, checked)
    : undefined;
  if (!toggle) return { refused: CHECKBOX_GONE };
  if (!toggle.changed) return { unchanged: true };
  const start = lines.start(line - 1) + toggle.column;
  return { edit: { start, end: start + 1, text: toggle.replacement } };
}

// @implements_req SwRS-MDOKFSTUDIO-MYST-045
/**
 * Renames the MyST label on 1-based `line`: only the `(oldName)=` text changes. A line that is not
 * exactly `(oldName)=` is refused, never searched for elsewhere. `remainingRefs` counts the
 * `{ref}` uses of the old name, which the rename leaves as they are.
 */
export function planLabelRename(
  text: string,
  line: number,
  oldName: string,
  newName: string,
): EditRefusal | { edit: TextEdit; remainingRefs: number } {
  const rename = renameLabelLine(text, line, oldName, newName);
  if (!rename) return { refused: LABEL_GONE };
  return { edit: { start: rename.start, end: rename.end, text: rename.text }, remainingRefs: countRefUses(text, oldName) };
}

/**
 * The source lines `line` to `endLine` (1-based, inclusive) when they are exactly one inline thread
 * comment (`<!-- THREAD … -->`), without their line breaks.
 */
export function readThreadLines(text: string, line: number, endLine: number): EditRefusal | { lines: string[] } {
  const lines = sourceLines(text);
  if (!Number.isSafeInteger(line) || !Number.isSafeInteger(endLine) || line < 1 || endLine > lines.count) {
    return { refused: THREAD_GONE };
  }
  const threadLines: string[] = [];
  for (let index = line - 1; index <= endLine - 1; index += 1) threadLines.push(lines.text(index));
  return isThreadSource(threadLines) ? { lines: threadLines } : { refused: THREAD_GONE };
}

/**
 * Deletes the inline thread at `line` to `endLine`: whole lines go, and one surrounding blank line
 * with them when both neighbours are blank or missing, so no double gap is left.
 */
export function planThreadDelete(text: string, line: number, endLine: number): EditRefusal | { edit: TextEdit } {
  const thread = readThreadLines(text, line, endLine);
  if ("refused" in thread) return thread;
  const lines = sourceLines(text);
  const before = line >= 2 ? lines.text(line - 2) : undefined;
  const after = endLine < lines.count ? lines.text(endLine) : undefined;
  const removal = threadDeleteRange(thread.lines.length, before, after);
  const startLine = line - 1 + removal.fromOffset;
  const lastLine = startLine + removal.count - 1;
  // Whole lines: through the start of the line after, or from the end of the line before to the
  // end of the file.
  const edit = lastLine + 1 < lines.count
    ? { start: lines.start(startLine), end: lines.start(lastLine + 1), text: "" }
    : { start: startLine > 0 ? lines.end(startLine - 1) : 0, end: lines.end(lastLine), text: "" };
  return { edit };
}

/** A reply to an inline thread: who writes it, when, and its text. */
export interface ThreadReply {
  author: string;
  /** The date as the thread shows it (see `formatThreadDate`). */
  date: string;
  body: string;
}

/**
 * Appends `reply` to the inline thread at `line` to `endLine`: the line that closes the comment is
 * replaced by the reply lines and the close, joined with the document's line break `eol`.
 */
export function planThreadReply(
  text: string,
  line: number,
  endLine: number,
  reply: ThreadReply,
  eol: string,
): EditRefusal | { edit: TextEdit } {
  const thread = readThreadLines(text, line, endLine);
  if ("refused" in thread) return thread;
  const change = threadReplyEdit(thread.lines, reply.author, reply.date, reply.body);
  if (!change) return { refused: THREAD_REPLY_REFUSED };
  const lines = sourceLines(text);
  const lineIndex = line - 1 + change.fromLine;
  return { edit: { start: lines.start(lineIndex), end: lines.end(lineIndex), text: change.lines.join(eol) } };
}

/** A block move as the page asks for it: the moving block range, its neighbour and the direction. */
export interface BlockMoveRequest {
  line: number;
  endLine: number;
  neighbourLine: number;
  neighbourEndLine: number;
  direction: "up" | "down";
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-117
/**
 * The range without the blank lines at its end. The renderer maps a list that is followed by a
 * blank line up to that blank line, so the page sends such a range as it is mapped; the block
 * itself ends on its last non-blank line. A range that is out of bounds is left to the planner.
 */
function withoutTrailingBlankLines(text: string, block: BlockLines): BlockLines {
  const lines = sourceLines(text);
  let endLine = block.endLine;
  if (!Number.isSafeInteger(endLine) || !Number.isSafeInteger(block.line) || endLine > lines.count) return block;
  while (endLine > block.line && lines.text(endLine - 1).trim() === "") endLine -= 1;
  return { line: block.line, endLine };
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-117
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-127
/**
 * Swaps a block range with its neighbour in one edit. `line` is the new first line of the moved
 * range. Refused: what the block move planner refuses, and a block that opens an `{include}`.
 */
export function planBlockMoveEdit(text: string, request: BlockMoveRequest): EditRefusal | { edit: TextEdit; line: number } {
  const moving = withoutTrailingBlankLines(text, { line: request.line, endLine: request.endLine });
  const neighbour = withoutTrailingBlankLines(text, { line: request.neighbourLine, endLine: request.neighbourEndLine });
  const movesDown = request.direction === "down";
  const first = movesDown ? moving : neighbour;
  const second = movesDown ? neighbour : moving;
  const plan = planBlockMove(text, first, second);
  if ("refused" in plan) return { refused: plan.refused };
  const lines = sourceLines(text);
  if ([first, second].some((block) => opensIncludeDirective(lines.text(block.line - 1)))) {
    return { refused: MOVE_INCLUDED };
  }
  return {
    edit: { start: plan.start, end: plan.end, text: plan.text },
    line: movesDown ? plan.newStartLine : plan.newSecondStartLine,
  };
}

function linesOpenInclude(lines: SourceLines, line: number, endLine: number): boolean {
  for (let current = line; current <= Math.min(endLine, lines.count); current += 1) {
    if (opensIncludeDirective(lines.text(current - 1))) return true;
  }
  return false;
}

/**
 * Copy (and for `cut`, removal) of the blocks at `line` to `endLine`: `copied` is their exact
 * Markdown; `cut` deletes them with one blank separator. `followingLine` is set when a block
 * follows the cut one and moves up into its place.
 */
export function planBlocksCopyCut(
  text: string,
  line: number,
  endLine: number,
  op: "copy" | "cut",
): EditRefusal | { copied: string; cut?: { edit: TextEdit; followingLine?: number } } {
  const copied = spanText(text, line, endLine);
  if (typeof copied !== "string") return { refused: copied.refused };
  if (linesOpenInclude(sourceLines(text), line, endLine)) return { refused: COPY_INCLUDED };
  if (op === "copy") return { copied };
  const plan = planCut(text, line, endLine);
  if ("refused" in plan) return { refused: plan.refused };
  return { copied, cut: { edit: { start: plan.start, end: plan.end, text: "" }, followingLine: plan.followingLine } };
}

/**
 * True when `afterLine` lies in an `{include}` directive: on its opening line, inside it or on its
 * closing fence line (the insert point of an included block sits after that closing fence).
 */
function insideIncludeDirective(lines: SourceLines, afterLine: number): boolean {
  for (let open = 1; open <= Math.min(afterLine, lines.count); open += 1) {
    const opening = lines.text(open - 1);
    if (!opensIncludeDirective(opening)) continue;
    const fence = /^\s*(:{3,}|`{3,}|~{3,})/u.exec(opening)![1];
    let close = open;
    while (close < lines.count) {
      close += 1;
      const candidate = lines.text(close - 1).trim();
      if (candidate.length >= fence.length && candidate === fence[0].repeat(candidate.length)
        && candidate[0] === fence[0]) break;
    }
    if (afterLine <= close) return true;
    open = close;
  }
  return false;
}

/** Refuses a paste after `afterLine` (0: start of the body) in or at the end of an `{include}`. */
export function checkBlocksPaste(text: string, afterLine: number): EditRefusal | undefined {
  const lines = sourceLines(text);
  return afterLine > 0 && afterLine <= lines.count && insideIncludeDirective(lines, afterLine)
    ? { refused: PASTE_NEXT_TO_INCLUDED }
    : undefined;
}

/** Inserts the clipboard text `clipboard` as new blocks after `afterLine` (0: start of the body). */
export function planBlocksPaste(text: string, afterLine: number, clipboard: string): EditRefusal | { edit: TextEdit } {
  const plan = planPaste(text, afterLine, clipboard);
  if ("refused" in plan) return { refused: plan.refused };
  return { edit: { start: plan.offset, end: plan.offset, text: plan.text } };
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-234
/**
 * `editedText` with every line break turned into the one line ending that `reference` (the block
 * text) uses throughout; a `reference` with no line break takes the one line ending of
 * `documentText`. A text box returns LF for every break, the document may use CR LF or CR. Mixed
 * line endings leave `editedText` as it is.
 */
export function withLineEndingOf(editedText: string, reference: string, documentText = ""): string {
  let endings = new Set(reference.match(/\r\n|\n|\r/gu));
  if (endings.size === 0) endings = new Set(documentText.match(/\r\n|\n|\r/gu));
  if (endings.size !== 1) return editedText;
  const [ending] = endings;
  return editedText.replace(/\r\n|\n|\r/gu, ending);
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-042
/**
 * The smallest edit that turns the block text last written to the document (`lastSavedText`,
 * starting at offset `blockStart`) into `editedText`; undefined when they are the same.
 */
export function planBlockTextEdit(blockStart: number, lastSavedText: string, editedText: string): TextEdit | undefined {
  const replacement = minimalReplacement(lastSavedText, editedText);
  if (replacement.start === replacement.end && replacement.text === "") return undefined;
  return { start: blockStart + replacement.start, end: blockStart + replacement.end, text: replacement.text };
}
