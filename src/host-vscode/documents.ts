/**
 * The {@link DocumentStore} port on VS Code's text documents. VS Code owns the text, the undo
 * history, the dirty state and the save; this store only views its documents and applies edits
 * through its API. The revision of a document is its `TextDocument.version`: VS Code already counts
 * the changes of each document, and this module is the only place that reads it.
 */

import * as vscode from "vscode";

import type { TextEdit } from "../core/edits/textEdit";
import type {
  ApplyEditOptions,
  DocumentChange,
  DocumentStore,
  EndOfLine,
  HostDocument,
} from "../host-api/documentStore";
import type { HostEvent } from "../host-api/events";
import type { Revision } from "../protocol/revision";

/** A VS Code text document as a {@link HostDocument}: every read goes to the live document. */
class VscodeHostDocument implements HostDocument {
  public constructor(public readonly textDocument: vscode.TextDocument) {}

  public get id(): string {
    return this.textDocument.uri.toString();
  }

  public get path(): string | undefined {
    return this.textDocument.uri.scheme === "file" ? this.textDocument.uri.fsPath : undefined;
  }

  public get revision(): Revision {
    return this.textDocument.version;
  }

  public get eol(): EndOfLine {
    return this.textDocument.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n";
  }

  public get isDirty(): boolean {
    return this.textDocument.isDirty;
  }

  public get lineCount(): number {
    return this.textDocument.lineCount;
  }

  public getText(): string {
    return this.textDocument.getText();
  }

  public lineText(index: number): string {
    return this.textDocument.lineAt(index).text;
  }
}

/** The VS Code document store, with the conversions the VS Code host needs. */
export interface VscodeDocumentStore extends DocumentStore {
  /** The store's view of a VS Code text document (the same object for the same document). */
  of(document: vscode.TextDocument): HostDocument;
  /** The revision of a VS Code text document (its `version`). */
  revisionOf(document: vscode.TextDocument): Revision;
}

/** Creates the document store of the VS Code host. */
export function createVscodeDocumentStore(): VscodeDocumentStore {
  const views = new WeakMap<vscode.TextDocument, VscodeHostDocument>();
  /**
   * Documents an `applyEdits` is running on, with the number of such edits. VS Code reports the
   * change of an edit before the edit's promise settles, so the change listener can tell the
   * preview's own edits from the others (CR 046).
   */
  const inFlight = new Map<string, number>();

  const of = (document: vscode.TextDocument): VscodeHostDocument => {
    let view = views.get(document);
    if (!view) {
      view = new VscodeHostDocument(document);
      views.set(document, view);
    }
    return view;
  };

  const textDocumentOf = (document: HostDocument): vscode.TextDocument | undefined => document instanceof VscodeHostDocument
    ? document.textDocument
    : vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === document.id);

  const track = <T>(id: string, run: () => Thenable<T>): Thenable<T> => {
    inFlight.set(id, (inFlight.get(id) ?? 0) + 1);
    const settle = (): void => {
      const left = (inFlight.get(id) ?? 1) - 1;
      if (left > 0) inFlight.set(id, left);
      else inFlight.delete(id);
    };
    let result: Thenable<T>;
    try {
      result = run();
    } catch (error) {
      settle();
      throw error;
    }
    return result.then((value) => {
      settle();
      return value;
    }, (error: unknown) => {
      settle();
      throw error;
    });
  };

  const onDidChange: HostEvent<DocumentChange> = (listener) =>
    vscode.workspace.onDidChangeTextDocument((event) => listener({
      document: of(event.document),
      changes: event.contentChanges.map((change) => ({
        start: change.rangeOffset,
        length: change.rangeLength,
        text: change.text,
      })),
    }));

  return {
    of,
    revisionOf: (document) => of(document).revision,
    get(id) {
      const document = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === id);
      return document ? of(document) : undefined;
    },
    open: (id) => vscode.workspace.openTextDocument(vscode.Uri.parse(id)).then(of),
    idOf: (path) => vscode.Uri.file(path).toString(),
    applyEdits(document: HostDocument, edits: readonly TextEdit[], options?: ApplyEditOptions): Thenable<boolean> {
      const textDocument = textDocumentOf(document);
      if (!textDocument) return Promise.resolve(false);
      const id = textDocument.uri.toString();
      const replacements = edits.map((edit) => ({
        range: new vscode.Range(textDocument.positionAt(edit.start), textDocument.positionAt(edit.end)),
        text: edit.text,
      }));
      const editor = options?.ownUndoStep === true
        ? vscode.window.visibleTextEditors.find((candidate) => candidate.document.uri.toString() === id)
        : undefined;
      if (editor) {
        return track(id, () => editor.edit((builder) => {
          for (const replacement of replacements) builder.replace(replacement.range, replacement.text);
        }, { undoStopBefore: true, undoStopAfter: true }));
      }
      const workspaceEdit = new vscode.WorkspaceEdit();
      for (const replacement of replacements) workspaceEdit.replace(textDocument.uri, replacement.range, replacement.text);
      return track(id, () => vscode.workspace.applyEdit(workspaceEdit));
    },
    isApplying: (id) => inFlight.has(id),
    save(document) {
      const textDocument = textDocumentOf(document);
      return textDocument ? textDocument.save() : Promise.resolve(false);
    },
    onDidChange,
  };
}
