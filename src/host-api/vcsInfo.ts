/**
 * The `VcsInfo` port: what version control knows about a document (the text at HEAD, the user
 * name). Every answer is optional: a host without version control answers undefined.
 */

import type { Disposable } from "./events";

/** The text of a file at the HEAD commit. */
export interface HeadText {
  commit: string;
  text: string;
}

/** Version control information, by document id (a URI string). */
export interface VcsInfo {
  /**
   * The file at HEAD; undefined when there is nothing to compare (no repository, untracked file, or
   * a document of `currentLength` characters too large to compare).
   */
  headText(documentId: string, currentLength: number): Promise<HeadText | undefined>;
  /** The user name configured for the document's repository; undefined when unknown. */
  userName(documentId: string): Promise<string | undefined>;
  /** Calls `listener` when the HEAD commit of the document's repository changes; undefined without one. */
  watchHead(documentId: string, listener: (commit: string | undefined) => void): Disposable | undefined;
}
