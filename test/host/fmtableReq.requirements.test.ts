/**
 * Host answers to a frontmatter save from the properties table, through the public seams of the
 * extension host only (activation, the Open Preview command, webview messages): the refusals of an
 * untrusted workspace, of an older render and of VS Code, and the single document edit of a save.
 */
import * as assert from "node:assert/strict";
import { test, type TestContext } from "node:test";

import { closeHost, openPreview, type HostSession } from "./hostHarness";

// hostHarness has patched module loading: "vscode" is the fake of the harness.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fakeVscode = require("vscode") as {
  workspace: { isTrusted: boolean; applyEdit: (edit: { size: number }) => Promise<boolean> };
};

const MARKDOWN = "---\ntitle: Old\ncount: 3\n---\n\n# Title\n\nBody.\n";
const FRONTMATTER_ERRORS = "previewFrontmatterResult";

async function readyPreview(t: TestContext): Promise<HostSession> {
  const host = await openPreview(t.mock.timers, MARKDOWN);
  t.after(() => closeHost(t.mock.timers));
  await host.ready();
  await host.settle();
  return host;
}

/** A save message of the page that holds the render the host holds. */
function save(host: HostSession, extra: Record<string, unknown>): Record<string, unknown> {
  return { type: "previewFrontmatterSave", ...host.loadedIdentity(), editId: "e-1", ...extra };
}

/** The answers to frontmatter saves posted since index `from`. */
function results(host: HostSession, from: number): Array<Record<string, unknown>> {
  return host.postedSince(from, FRONTMATTER_ERRORS);
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-005
test("a frontmatter save in an untrusted workspace is refused with the trust message and changes nothing", async (t) => {
  fakeVscode.workspace.isTrusted = false;
  const applied: number[] = [];
  const originalApply = fakeVscode.workspace.applyEdit;
  fakeVscode.workspace.applyEdit = (edit) => { applied.push(edit.size); return Promise.resolve(true); };
  t.after(() => {
    fakeVscode.workspace.isTrusted = true;
    fakeVscode.workspace.applyEdit = originalApply;
  });
  const host = await readyPreview(t);
  const from = host.posted.length;
  await host.fromPage(save(host, { fieldName: "title", fieldValue: "New" }));
  await host.settle();
  const answers = results(host, from);
  assert.equal(answers.length, 1);
  assert.equal(answers[0]!.error, "Editing requires a trusted workspace.");
  assert.equal(answers[0]!.editId, "e-1");
  assert.deepEqual(applied, []);
  assert.equal(host.document.getText(), MARKDOWN);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-065
test("a frontmatter save from an older render is answered with a reopen hint; another document gets no answer", async (t) => {
  const host = await readyPreview(t);
  const identity = host.loadedIdentity();
  const from = host.posted.length;
  await host.fromPage(save(host, { requestId: identity.requestId - 1, fieldName: "title", fieldValue: "New" }));
  await host.settle();
  const answers = results(host, from);
  assert.equal(answers.length, 1);
  assert.equal(answers[0]!.error, "The preview changed while this field was being edited. Reopen the field.");
  assert.equal(host.document.getText(), MARKDOWN);

  const otherFrom = host.posted.length;
  await host.fromPage(save(host, {
    documentId: "file:///elsewhere.md", requestId: identity.requestId - 1, fieldName: "title", fieldValue: "New",
  }));
  await host.settle();
  assert.deepEqual(results(host, otherFrom), []);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-058
test("a frontmatter save that VS Code does not apply is answered with a message; a thrown error gives its text", async (t) => {
  const originalApply = fakeVscode.workspace.applyEdit;
  t.after(() => { fakeVscode.workspace.applyEdit = originalApply; });
  const host = await readyPreview(t);

  fakeVscode.workspace.applyEdit = () => Promise.resolve(false);
  const from = host.posted.length;
  await host.fromPage(save(host, { fieldName: "title", fieldValue: "New" }));
  await host.settle();
  const refused = results(host, from);
  assert.equal(refused.length, 1);
  assert.equal(refused[0]!.error, "VS Code could not apply the frontmatter edit.");
  assert.equal(refused[0]!.saved, undefined);

  fakeVscode.workspace.applyEdit = () => Promise.reject(new Error("The file is locked."));
  const thrownFrom = host.posted.length;
  await host.fromPage(save(host, { editId: "e-2", fieldName: "title", fieldValue: "New" }));
  await host.settle();
  const thrown = results(host, thrownFrom);
  assert.equal(thrown.length, 1);
  assert.equal(thrown[0]!.error, "The file is locked.");
  assert.equal(host.document.getText(), MARKDOWN);
});

test("a value save, an add, a rename and a remove are each one text edit of the document", async (t) => {
  const originalApply = fakeVscode.workspace.applyEdit;
  const sizes: number[] = [];
  fakeVscode.workspace.applyEdit = (edit) => { sizes.push(edit.size); return Promise.resolve(true); };
  t.after(() => { fakeVscode.workspace.applyEdit = originalApply; });
  const host = await readyPreview(t);
  const messages: Array<Record<string, unknown>> = [
    { fieldName: "title", newFieldName: "name", fieldValue: "Old" },
    { fieldName: "title", fieldValue: "New" },
    { fieldName: "owner", frontmatterAction: "add", fieldValue: "me" },
    { fieldName: "count", frontmatterAction: "remove" },
  ];
  for (const [index, message] of messages.entries()) {
    const from = host.posted.length;
    await host.fromPage(save(host, { editId: `e-${index}`, ...message }));
    await host.settle();
    const answers = results(host, from);
    assert.equal(answers.length, 1, JSON.stringify(message));
    assert.equal(answers[0]!.saved, true, JSON.stringify(answers[0]));
  }
  assert.deepEqual(sizes, [1, 1, 1, 1]);
});
