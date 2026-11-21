/**
 * The `Navigation` port: opening documents and external links the reader follows from the
 * preview. Revealing a line in a paired text editor is not part of it: only hosts with a text
 * editor beside the preview have that.
 */

import type { TextRange } from "./documentStore";

/** Opens what the reader navigates to. */
export interface Navigation {
  /**
   * Shows the document `documentId` (a URI string) to the reader, with `selection` selected and
   * revealed when given. VS Code: in the editor group that already shows it, else the first group.
   */
  showDocument(documentId: string, selection?: TextRange): PromiseLike<void>;
  /**
   * Shows the document `documentId` (a URI string) in the host's Studio editor tab, at the 1-based
   * `line` when given. VS Code: an open Studio tab of the document is revealed, else a new one
   * opens in the group `showDocument` would pick; no text editor is opened.
   */
  showDocumentInStudio(documentId: string, line?: number): PromiseLike<void>;
  /** Opens an external URL (`https:`, `mailto:`) outside the host. */
  openExternal(url: string): PromiseLike<boolean>;
}
