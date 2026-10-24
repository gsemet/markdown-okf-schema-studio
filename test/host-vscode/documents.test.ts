/**
 * The VS Code document store (`src/host-vscode/documents.ts`) on the fake `vscode` module of the
 * host harness: which VS Code API an edit goes through, the count of edits in flight (CR 046), and
 * the change events it reports.
 */

import * as assert from "node:assert/strict";
import * as os from "node:os";
import { test } from "node:test";

import { createFakeVscode, FakeTextDocument, Position, Range, Uri } from "../host/fakeVscode";

const fake = createFakeVscode({ workspaceRoot: os.tmpdir() });
// The store imports "vscode" at load time: this process gets the fake for good.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeModule = require("node:module") as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = nodeModule._load;
nodeModule._load = function load(request: string, ...rest: unknown[]): unknown {
  return request === "vscode" ? fake.vscode : originalLoad.call(this, request, ...rest);
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createVscodeDocumentStore } = require("../../src/host-vscode/documents") as typeof import("../../src/host-vscode/documents");

interface RecordedReplace {
  range: Range;
  text: string;
}

/** A fresh document, held by the fake workspace, and the store under test. */
function setup(text = "one\ntwo\nthree\n") {
  const document = new FakeTextDocument(Uri.file(`${os.tmpdir()}/store-${Math.random().toString(36).slice(2)}.md`), text);
  const workspace = fake.vscode.workspace as unknown as {
    textDocuments: FakeTextDocument[];
    applyEdit: (edit: { entries(): Array<[Uri, Array<{ range: Range; newText: string }>]> }) => PromiseLike<boolean>;
  };
  const window = fake.vscode.window as unknown as { visibleTextEditors: unknown[] };
  workspace.textDocuments.push(document);
  window.visibleTextEditors = [];
  const workspaceEdits: Array<Array<{ range: Range; newText: string }>> = [];
  workspace.applyEdit = (edit) => {
    workspaceEdits.push(...edit.entries().map(([, edits]) => edits));
    return Promise.resolve(true);
  };
  const editorEdits: Array<{ replaces: RecordedReplace[]; options: unknown }> = [];
  const editor = {
    document,
    edit(callback: (builder: { replace(range: Range, text: string): void }) => void, options: unknown) {
      const replaces: RecordedReplace[] = [];
      callback({ replace: (range, replacement) => replaces.push({ range, text: replacement }) });
      editorEdits.push({ replaces, options });
      return Promise.resolve(true);
    },
  };
  return { store: createVscodeDocumentStore(), document, workspace, window, editor, workspaceEdits, editorEdits };
}

function lines(range: Range): [number, number, number, number] {
  return [range.start.line, range.start.character, range.end.line, range.end.character];
}

test("an edit that is its own undo step goes through the visible editor, with undo stops around it", async () => {
  const { store, document, window, editor, workspaceEdits, editorEdits } = setup();
  window.visibleTextEditors = [editor];
  const applied = await store.applyEdits(store.of(document as never), [{ start: 4, end: 7, text: "TWO" }], { ownUndoStep: true });
  assert.equal(applied, true);
  assert.equal(workspaceEdits.length, 0);
  assert.equal(editorEdits.length, 1);
  assert.deepEqual(editorEdits[0]!.options, { undoStopBefore: true, undoStopAfter: true });
  assert.deepEqual(editorEdits[0]!.replaces.map((replace) => [lines(replace.range), replace.text]), [[[1, 0, 1, 3], "TWO"]]);
});

test("an own undo step without a visible editor, and a plain edit, go through a workspace edit", async () => {
  const { store, document, window, editor, workspaceEdits, editorEdits } = setup();
  const view = store.of(document as never);
  assert.equal(await store.applyEdits(view, [{ start: 0, end: 3, text: "ONE" }], { ownUndoStep: true }), true);
  window.visibleTextEditors = [editor];
  assert.equal(await store.applyEdits(view, [{ start: 8, end: 13, text: "3" }, { start: 13, end: 14, text: "" }]), true);
  assert.equal(editorEdits.length, 0);
  assert.deepEqual(workspaceEdits.map((edits) => edits.map((edit) => [lines(edit.range), edit.newText])), [
    [[[0, 0, 0, 3], "ONE"]],
    [[[2, 0, 2, 5], "3"]],
    [[[2, 5, 3, 0], ""]],
  ]);
});

test("a document has an edit in flight until every edit on it settled, rejected ones included", async () => {
  const { store, document, workspace } = setup();
  const view = store.of(document as never);
  const pending: Array<{ resolve: (value: boolean) => void; reject: (error: Error) => void }> = [];
  workspace.applyEdit = () => new Promise<boolean>((resolve, reject) => pending.push({ resolve, reject }));
  assert.equal(store.isApplying(view.id), false);
  const first = store.applyEdits(view, [{ start: 0, end: 0, text: "a" }]);
  const second = store.applyEdits(view, [{ start: 0, end: 0, text: "b" }]);
  assert.equal(store.isApplying(view.id), true);
  pending[0]!.resolve(true);
  assert.equal(await first, true);
  assert.equal(store.isApplying(view.id), true, "the second edit is still in flight");
  pending[1]!.reject(new Error("refused"));
  await assert.rejects(Promise.resolve(second), /refused/u);
  assert.equal(store.isApplying(view.id), false);
});

test("an edit of a document the workspace no longer holds is refused without an edit", async () => {
  const { store, workspaceEdits } = setup();
  const stranger = { id: "file:///gone.md", path: "/gone.md", revision: 1, eol: "\n" as const, isDirty: false, lineCount: 1, getText: () => "", lineText: () => "" };
  assert.equal(await store.applyEdits(stranger, [{ start: 0, end: 0, text: "x" }]), false);
  assert.equal(store.isApplying(stranger.id), false);
  assert.equal(workspaceEdits.length, 0);
});

test("a change event names the document view, the offsets and lines replaced, and undo or redo", () => {
  const { store, document } = setup();
  const seen: unknown[] = [];
  const subscription = store.onDidChange((change) => seen.push({
    same: change.document === store.of(document as never),
    revision: change.document.revision,
    changes: change.changes,
    reason: change.reason,
  }));
  const change = (reason: number | undefined) => fake.controls.events.changeTextDocument.fire({
    document,
    contentChanges: [{ range: new Range(new Position(1, 0), new Position(2, 2)), rangeOffset: 4, rangeLength: 6, text: "x" }],
    reason,
  });
  change(undefined);
  change(1);
  change(2);
  subscription.dispose();
  const expected = [{ start: 4, length: 6, startLine: 1, endLine: 2, text: "x" }];
  assert.deepEqual(seen, [
    { same: true, revision: document.version, changes: expected, reason: undefined },
    { same: true, revision: document.version, changes: expected, reason: "undo" },
    { same: true, revision: document.version, changes: expected, reason: "redo" },
  ]);
});

test("the store reads ids, paths and revisions from VS Code's documents", () => {
  const { store, document } = setup("a\r\nb");
  const view = store.of(document as never);
  assert.equal(store.of(document as never), view, "one view per document");
  assert.equal(view.id, document.uri.toString());
  assert.equal(view.path, document.uri.fsPath);
  assert.equal(store.get(view.id), view);
  assert.equal(store.idOf(document.uri.fsPath), view.id);
  assert.equal(store.pathOf(view.id), document.uri.fsPath);
  document.version = 9;
  assert.equal(view.revision, 9);
  assert.equal(store.revisionOf(document as never), 9);
});
