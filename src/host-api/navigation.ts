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
  /** Opens an external URL (`https:`, `mailto:`) outside the host. */
  openExternal(url: string): PromiseLike<boolean>;
}
