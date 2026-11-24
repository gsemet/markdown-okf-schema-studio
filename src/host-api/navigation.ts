/**
 * The `Navigation` port: opening documents and external links the reader follows from the
 * preview. Revealing a line in a paired text editor is not part of it: only hosts with a text
 * editor beside the preview have that.
 */

import type { TextRange } from "./documentStore";

/** What opened for a {@link ShowDocumentOptions.fromStudioTab} request. */
export type ShowDocumentOutcome =
  /** A new Studio tab of the target opened (it took the line handed with the request). */
  | "studio-created"
  /** A Studio tab of the target was already open: it was revealed in its own group and received the line. */
  | "studio-existing"
  /** A text editor, or anything else: the handed line is dropped. */
  | "other";

/** What a Studio tab asks of {@link Navigation.showDocument} besides the document. */
export interface ShowDocumentOptions {
  /** The request comes from a Studio tab: the host hands `line` to a Studio tab of the target and reports what opened. */
  fromStudioTab: true;
  /** The 1-based line a Studio tab of the target reveals and marks; none: it opens at the top. */
  line?: number;
}

/** Opens what the reader navigates to. */
export interface Navigation {
  /**
   * Shows the document `documentId` (a URI string) to the reader, with `selection` selected and
   * revealed when given. VS Code: in the editor group that already shows it, else the first group.
   * With `options.fromStudioTab` the host also reveals a Studio tab of the target that is open in
   * any group, hands it `options.line`, and resolves with what opened; without it the result is
   * not read.
   */
  showDocument(documentId: string, selection?: TextRange, options?: ShowDocumentOptions): PromiseLike<ShowDocumentOutcome | void>;
  /** Opens an external URL (`https:`, `mailto:`) outside the host. */
  openExternal(url: string): PromiseLike<boolean>;
}
