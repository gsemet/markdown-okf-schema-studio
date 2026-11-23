/**
 * The types of a detached save and the question every edit gesture asks (CR 475). Kept apart from
 * `pageRuntime.ts` (at its size limit) and from the module that runs a detached save.
 */

import type { PreviewEditSourceMessage } from "../../core/protocol/hostToPage";
import type { PageIdentity } from "../../core/protocol/envelope";
import type { BlockEdit, CaretPosition, PageRuntimeState, PendingBlockNavigation } from "./pageRuntime";

/**
 * A final save that goes on after Cancel or Escape closed its editor. It ends only on the host's
 * answer naming its `editId` (`done`, or an error that gives the writer's text back).
 */
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-041
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-053
export interface DetachedSave {
  editId: string;
  /** The identity of the saves of this edit: the host matches them against the edit it holds. */
  identity: PageIdentity;
  /** Finds the block again (a paragraph, a cell), to reopen an editor on it when the save fails. */
  navigation?: PendingBlockNavigation;
  /** The source lines of the save: the reopened editor posts the same ones. */
  line: number;
  endLine: number;
  /** The text the block held when the editor opened, and the text of the final save. */
  originalText: string;
  editedText: string;
  /** An insertion editor (the bar is found again by its line) and a blank-line block's editor. */
  insertAfterLine?: number;
  replaceBlankRun?: { line: number; endLine: number; itemLine?: number; containerLine?: number };
  /** The editor's own state, put back on a reopened editor. */
  deleteWhenEmpty?: true;
  singleLine?: boolean;
  trailingLineEnding?: string;
  convertedText?: string;
  cellTextAtOpen?: string;
  keptCellChange?: boolean;
  tabAddedRow?: number;
  tableRowIndex?: number;
  tableColumnIndex?: number;
  /** The host answered `done` and a render follows: the save is over when that render is applied. */
  renderFollows: boolean;
}

/** The detached saves of the page (`features/detachedSave.ts`). */
export interface DetachedSaves {
  /** Cancel or Escape during the final save: closes the editor and keeps the save in flight. */
  detach(edit: BlockEdit): void;
  /** Takes the answer of the host to the detached save; false when it names another edit. */
  receive(message: PreviewEditSourceMessage): boolean;
  /** An editor open asked while a save is in flight waits for its end; true when it was kept. */
  deferOpen(target: HTMLElement, selectedCell: HTMLTableCellElement | undefined, caret: CaretPosition): boolean;
  /** The edit id the editor being reopened takes over (it posts no `previewEditOpen`). */
  reopeningId(): string | undefined;
  /** A frontmatter field clicked during the save waits for its end (one, the last); false when no save is in flight. */
  deferField(open: () => void): boolean;
  /** A render was applied: a detached save the host said a render follows is over. */
  rendered(): void;
}

/** True while an editor is open or a detached save is not yet answered: no other edit gesture starts. */
export function editInFlight(state: Pick<PageRuntimeState, "activeBlockEdit" | "detachedSave">): boolean {
  return state.activeBlockEdit !== undefined || state.detachedSave !== undefined;
}
