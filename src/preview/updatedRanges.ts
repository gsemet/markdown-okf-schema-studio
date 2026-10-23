import { changedLineRanges, type LineRange } from "../mapping/lineDiff";

/** Most line ranges one content patch carries for the update glow; more means no glow. */
export const MAX_UPDATED_RANGES = 50;

/** `vscode.TextDocumentChangeReason`: 1 is Undo, 2 is Redo, undefined is any other edit. */
export type ChangeReason = 1 | 2 | undefined;

/**
 * Whether a change of the previewed document makes the updated blocks glow (CR 046): an undo or a
 * redo always does. Any other change glows only when it comes from elsewhere: another extension or
 * an agent, a file changed on disk, a checkout. Two kinds of change never glow:
 * - the preview's own edit (`previewEditing`: an edit the preview asked for is being applied to
 *   that document);
 * - the user typing in the text editor (`inActiveEditor`: the document is the one of the active
 *   text editor). VS Code does not say where a change comes from, so a change of the document the
 *   user is working in counts as typing.
 */
export function isOutsideChange(
  reason: ChangeReason | number,
  previewEditing: boolean,
  inActiveEditor: boolean,
): boolean {
  return reason === 1 || reason === 2 || (!previewEditing && !inActiveEditor);
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
