/**
 * The `DocumentStore` port: the documents the host holds, their revisions, and the only way the
 * core changes their text (text edits). Edit operations never write files: they return
 * {@link TextEdit}s, and the store applies them, with the host's own undo, dirty state and save.
 */

import type { TextEdit } from "../core/edits/textEdit";
import type { Revision } from "../protocol/revision";
import type { HostEvent } from "./events";

export type { TextEdit } from "../core/edits/textEdit";

/** The line break a document uses. */
export type EndOfLine = "\n" | "\r\n";

/** A position in a document: zero-based line and UTF-16 character in that line. */
export interface TextPosition {
  line: number;
  character: number;
}

/** A range of a document between two positions. */
export interface TextRange {
  start: TextPosition;
  end: TextPosition;
}

/**
 * A document the host holds, as it is now: reads see the latest text. It is the store's view of
 * the document, not a copy; keep the store's object rather than its text when the revision matters.
 */
export interface HostDocument {
  /** The identity of the document: its URI as a string (`file:///…` for a file). */
  readonly id: string;
  /** The file system path of a file document; undefined for any other document (untitled, virtual). */
  readonly path: string | undefined;
  /**
   * The revision of the current text (see `src/protocol/revision.ts`). The store is the only source
   * of revisions: every revision the host compares or sends comes from here.
   */
  readonly revision: Revision;
  /** The line break the document uses. */
  readonly eol: EndOfLine;
  /** True while the text differs from what was last saved. */
  readonly isDirty: boolean;
  /** Number of lines, as an editor counts them (a final line break starts one more, empty, line). */
  readonly lineCount: number;
  /** The whole text. */
  getText(): string;
  /** The text of the zero-based line `index`, without its line break. */
  lineText(index: number): string;
}

/** How a store applies an edit. */
export interface ApplyEditOptions {
  /**
   * True: the edit is its own undo step in the editor that shows the document, when the host has
   * one (VS Code: `TextEditor.edit` with an undo stop before and after). False or absent: a plain
   * edit of the document, merged into undo steps as the host decides.
   */
  ownUndoStep?: boolean;
}

/** One change of a document's text, in the coordinates of the text before it. */
export interface DocumentContentChange {
  /** Offset of the replaced text. */
  start: number;
  /** Length of the replaced text. */
  length: number;
  /** Zero-based line where the replaced text starts. */
  startLine: number;
  /** Zero-based line where the replaced text ends. */
  endLine: number;
  /** The new text. */
  text: string;
}

/** A change of a document's text: the document after it, and what changed. */
export interface DocumentChange {
  document: HostDocument;
  changes: readonly DocumentContentChange[];
  /** Set when the change is an undo or a redo of the host's editor; undefined for any other change. */
  reason?: "undo" | "redo";
}

/** The documents the host holds and how their text changes. */
export interface DocumentStore {
  /** The document with this id when the host holds it now; undefined otherwise. */
  get(id: string): HostDocument | undefined;
  /** The document with this id, loaded when the host does not hold it yet. Rejects when it cannot be read. */
  open(id: string): PromiseLike<HostDocument>;
  /** The id of the document stored at a file system path. */
  idOf(path: string): string;
  /** The file system path of a document id (for an id that is not a file, the path part of it). */
  pathOf(id: string): string;
  /**
   * Applies `edits`, all planned on the document's current text, as one change. Resolves to false
   * when the host refused the edit; the document then keeps its text. The revision moves on success.
   */
  applyEdits(document: HostDocument, edits: readonly TextEdit[], options?: ApplyEditOptions): PromiseLike<boolean>;
  /**
   * True while an `applyEdits` of this document has not settled. A host that reports the change of
   * an edit before the edit's promise settles lets the core tell its own edits from the others.
   */
  isApplying(id: string): boolean;
  /** Writes the document to its file. Resolves to false when it was not saved. */
  save(document: HostDocument): PromiseLike<boolean>;
  /** Fires after every change of a document's text, the store's own edits included. */
  readonly onDidChange: HostEvent<DocumentChange>;
}
