/**
 * A {@link DocumentStore} that holds its documents in memory: the store of the unit tests and the
 * starting point of a host without an editor of its own (02-multi-host §3.4). It counts revisions
 * with {@link RevisionCounter}: a document starts at revision 1 and every applied edit moves it on.
 * Host-neutral: no host API, no DOM, no Node built-ins.
 */

import { applyTextEdits, sourceLines, type TextEdit } from "../core/edits/textEdit";
import type {
  ApplyEditOptions,
  DocumentChange,
  DocumentStore,
  EndOfLine,
  HostDocument,
} from "../host-api/documentStore";
import { EventSource } from "../host-api/events";
import { RevisionCounter, type Revision } from "../core/protocol/revision";

/** The zero-based line of `offset` in `text` (lines split as an editor does: LF, CRLF or CR). */
function lineAtOffset(text: string, offset: number): number {
  return (text.slice(0, offset).match(/\r\n|\n|\r/gu) ?? []).length;
}

/** One document of a {@link MemoryDocumentStore}. */
class MemoryDocument implements HostDocument {
  public isDirty = false;

  public constructor(
    public readonly id: string,
    public readonly path: string | undefined,
    public text: string,
    private readonly revisions: RevisionCounter,
  ) {}

  public get revision(): Revision {
    return this.revisions.current(this.id);
  }

  public get eol(): EndOfLine {
    return this.text.includes("\r\n") ? "\r\n" : "\n";
  }

  public get lineCount(): number {
    return sourceLines(this.text).count;
  }

  public getText(): string {
    return this.text;
  }

  public lineText(index: number): string {
    return sourceLines(this.text).text(index);
  }
}

/** Options of a {@link MemoryDocumentStore}. */
export interface MemoryDocumentStoreOptions {
  /** Reads a document the store does not hold yet; without it, `open` rejects for such a document. */
  load?: (id: string) => Promise<string>;
  /** Writes a document on `save`; without it, `save` only marks the document clean. */
  write?: (document: HostDocument) => Promise<void>;
}

/** An in-memory document store; `add` puts a document in it. */
export interface MemoryDocumentStore extends DocumentStore {
  /** Adds (or replaces) a document; `path` makes it a file document. */
  add(id: string, text: string, path?: string): HostDocument;
  /** The edits applied so far, oldest first: what a test checks. */
  readonly applied: ReadonlyArray<{ id: string; edits: readonly TextEdit[]; options?: ApplyEditOptions }>;
  /** Makes the next `applyEdits` calls resolve to false without changing anything (a refusing host). */
  refuseEdits(refuse: boolean): void;
}

/** Creates an empty in-memory document store. Ids of file documents are `file://` URIs. */
export function createMemoryDocumentStore(options: MemoryDocumentStoreOptions = {}): MemoryDocumentStore {
  const revisions = new RevisionCounter();
  const documents = new Map<string, MemoryDocument>();
  const changes = new EventSource<DocumentChange>();
  const applied: Array<{ id: string; edits: readonly TextEdit[]; options?: ApplyEditOptions }> = [];
  /** Edits being applied, per document id: the change event fires while its edit is in flight. */
  const applying = new Map<string, number>();
  let refusing = false;

  const add = (id: string, text: string, path?: string): MemoryDocument => {
    const document = new MemoryDocument(id, path, text, revisions);
    documents.set(id, document);
    return document;
  };

  return {
    add,
    applied,
    refuseEdits: (refuse) => {
      refusing = refuse;
    },
    get: (id) => documents.get(id),
    async open(id) {
      const existing = documents.get(id);
      if (existing) return existing;
      if (!options.load) throw new Error(`The document ${id} is not in the store.`);
      const text = await options.load(id);
      return documents.get(id) ?? add(id, text, id.startsWith("file://") ? decodeURIComponent(id.slice("file://".length)) : undefined);
    },
    // Each segment is escaped on its own, so `#`, `?` and `%` in a name survive the `open` decode.
    idOf: (path) => `file://${path.split("/").map(encodeURIComponent).join("/")}`,
    pathOf: (id) => decodeURIComponent(id.startsWith("file://") ? id.slice("file://".length) : id.replace(/^[a-z][\w+.-]*:/iu, "")),
    applyEdits(document, edits, editOptions) {
      const stored = documents.get(document.id);
      if (!stored || refusing) return Promise.resolve(false);
      let next: string;
      try {
        next = applyTextEdits(stored.text, edits);
      } catch (error) {
        return Promise.reject(error);
      }
      applied.push({ id: stored.id, edits, ...(editOptions ? { options: editOptions } : {}) });
      const previous = stored.text;
      stored.text = next;
      stored.isDirty = true;
      revisions.advance(stored.id);
      applying.set(stored.id, (applying.get(stored.id) ?? 0) + 1);
      try {
        changes.fire({
          document: stored,
          changes: [...edits].sort((left, right) => right.start - left.start).map((edit) => ({
            start: edit.start,
            length: edit.end - edit.start,
            startLine: lineAtOffset(previous, edit.start),
            endLine: lineAtOffset(previous, edit.end),
            text: edit.text,
          })),
        });
      } finally {
        const count = (applying.get(stored.id) ?? 1) - 1;
        if (count > 0) applying.set(stored.id, count);
        else applying.delete(stored.id);
      }
      return Promise.resolve(true);
    },
    isApplying: (id) => applying.has(id),
    async save(document) {
      const stored = documents.get(document.id);
      if (!stored) return false;
      if (options.write) await options.write(stored);
      stored.isDirty = false;
      return true;
    },
    onDidChange: changes.event,
  };
}
