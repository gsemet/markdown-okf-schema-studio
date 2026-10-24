/**
 * The `TextEditors` port: the text editors that show documents beside the preview (editor pairing:
 * scroll sync, reveal, selection marker). Only hosts with a text editor have them; a host without
 * one reports no editors and `HostCapabilities.editorPairing` false.
 */

import type { HostDocument } from "./documentStore";

/** Where a revealed line lands in an editor. */
export type RevealPosition = "top" | "center-if-outside";

/** A text editor that shows a document. */
export interface PairedEditor {
  /** The document the editor shows. */
  readonly document: HostDocument;
  /**
   * The file system path of the document's URI, also for an editor of another scheme that shows
   * the same file (a diff editor, for example).
   */
  readonly fsPath: string;
  /** The zero-based first visible line; undefined when the editor reports no visible range. */
  readonly firstVisibleLine: number | undefined;
  /** True when the zero-based `line` is inside the first visible range. */
  isLineVisible(line: number): boolean;
  /** The zero-based line of the caret. */
  readonly selectionLine: number;
  /** The column of the group that holds the editor. */
  readonly column: number | undefined;
  /** Scrolls the zero-based `line` into view. */
  revealLine(line: number, position: RevealPosition): void;
}

/** The host's text editors. */
export interface TextEditors {
  /** The editor that has the focus, if any. */
  active(): PairedEditor | undefined;
  /** The editors shown now. */
  visible(): PairedEditor[];
}
