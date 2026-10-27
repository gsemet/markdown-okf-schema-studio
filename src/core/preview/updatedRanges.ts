import { changedLineRanges, type LineRange } from "../mapping/lineDiff";

/** Most line ranges one content patch carries for the update glow; more means no glow. */
export const MAX_UPDATED_RANGES = 50;

/** `vscode.TextDocumentChangeReason`: 1 is Undo, 2 is Redo, undefined is any other edit. */
export type ChangeReason = 1 | 2 | undefined;

/** How long after a keystroke a change of the text still counts as typing, in milliseconds. */
export const KEYSTROKE_WINDOW_MS = 500;

/** A change of the text: `text` replaced the zero-based lines `startLine` to `endLine`, as they were. */
export interface ChangedSpan {
  startLine: number;
  endLine: number;
  text: string;
}

/** A selection (or a caret, when both lines are the same), by zero-based lines. */
export interface SelectedSpan {
  startLine: number;
  endLine: number;
}

/** Lines a cursor may be away from a change and still touch it: VS Code moves the cursor after the change. */
const CURSOR_LAG_LINES = 1;

// @implements_req SwRS-MDOKFSTUDIO-LIFE-094
/**
 * Whether a change of the document is the writer typing (CR 139). VS Code does not say who made a
 * change, so the rule is: a change is typing only when a keystroke reached the text editor in the
 * last {@link KEYSTROKE_WINDOW_MS} and every changed span touches a cursor or a selection. Any
 * other change is foreign, whichever document is in the active editor.
 */
export function isTypingChange(
  changes: readonly ChangedSpan[],
  selections: readonly SelectedSpan[],
  msSinceKeystroke: number | undefined,
): boolean {
  return msSinceKeystroke !== undefined && msSinceKeystroke <= KEYSTROKE_WINDOW_MS && touchesSelection(changes, selections);
}

/**
 * Whether every changed span touches a cursor or a selection, before or after the change and within
 * {@link CURSOR_LAG_LINES} line (the host reports the cursor after the change); false without a
 * change or a selection.
 */
export function touchesSelection(changes: readonly ChangedSpan[], selections: readonly SelectedSpan[]): boolean {
  return changes.length > 0 && selections.length > 0 && changes.every((change) => {
    const first = change.startLine - CURSOR_LAG_LINES;
    const last = Math.max(change.endLine, change.startLine + change.text.split("\n").length - 1) + CURSOR_LAG_LINES;
    return selections.some((selection) => selection.startLine <= last && selection.endLine >= first);
  });
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-094
/**
 * Whether a change of the previewed document makes the updated blocks glow (CR 046): an undo or a
 * redo always does. Any other change glows only when it comes from elsewhere: another extension or
 * an agent, a file changed on disk, a checkout. Two kinds of change never glow:
 * - the preview's own edit (`previewEditing`: an edit the preview asked for is being applied to
 *   that document);
 * - the writer typing in a text editor (`typing`, see {@link isTypingChange}).
 */
export function isOutsideChange(
  reason: ChangeReason | number,
  previewEditing: boolean,
  typing: boolean,
): boolean {
  return reason === 1 || reason === 2 || (!previewEditing && !typing);
}

/**
 * The source line ranges (1-based, in the next text) a content patch asks the page to light up.
 * Empty unless the last outside change (`outsideChangeVersion`) happened after the shown render
 * and is part of the next one, and unless the change is small enough to point at blocks.
 */
export function updatedRangesForPatch(
  previous: { sourceText: string; version: number },
  next: { sourceText: string; version: number },
  outsideChangeVersion: number | undefined,
): LineRange[] {
  if (outsideChangeVersion === undefined
    || outsideChangeVersion <= previous.version || outsideChangeVersion > next.version) {
    return [];
  }
  const ranges = changedLineRanges(previous.sourceText, next.sourceText);
  return ranges.length > MAX_UPDATED_RANGES ? [] : ranges;
}
