/**
 * A final block save on a CR LF or mixed document: the page's text box gives LF, the host writes
 * the document's own line endings, and it always answers a final save, even when nothing is
 * written (a text equal to the source but for its line endings), so the editor never stays on
 * "Saving Markdown…".
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import { test } from "node:test";

import { closeHost, openPreview, type HostSession } from "./hostHarness";

const CRLF = "# Title\r\n\r\n- alpha\r\n- beta\r\n  - nested\r\n\r\nPara one\r\nPara two\r\n";
const MIXED = "# Title\r\n\r\nline a\r\nline b\nline c\r\n\r\nEnd\r\n";

async function open(t: { mock: { timers: Parameters<typeof openPreview>[0] } }, markdown: string): Promise<HostSession> {
  const host = await openPreview(t.mock.timers, markdown);
  host.enableHostEdits();
  await host.ready();
  await host.settle();
  return host;
}

/** Opens the block at `line`-`endLine`, then saves `editOf(source)` as the final save of the page. */
async function finalSave(
  host: HostSession,
  line: number,
  endLine: number,
  editOf: (source: string) => string,
): Promise<{ from: number; editedText: string }> {
  const loaded = host.loadedIdentity();
  const from = host.posted.length;
  await host.fromPage({ type: "previewEditOpen", ...loaded, editId: "e1", line, endLine });
  const source = host.postedSince(from, "previewEditSource")[0]!;
  const originalText = String(source.originalText);
  const editedText = editOf(originalText);
  await host.fromPage({
    type: "previewEditSave", ...loaded, editId: "e1", line, endLine, originalText, editedText, final: true,
  });
  await host.settle();
  host.tick(10_000);
  await host.settle();
  return { from, editedText };
}

/** What the page's text box returns for `source`: every line break an LF, the last one kept apart. */
function textBox(source: string, change = (text: string) => text): string {
  const ending = /\r\n$|\n$|\r$/u.exec(source)?.[0] ?? "";
  return change(source.slice(0, source.length - ending.length).replace(/\r\n|\r/gu, "\n")) + ending.replace(/\r\n|\r/gu, "\n");
}

/** What the host answered to the final save: the `done` messages, the patches and the errors. */
function answered(host: HostSession, from: number): { done: Array<Record<string, unknown>>; patches: number; errors: number } {
  const sources = host.postedSince(from, "previewEditSource");
  return {
    done: sources.filter((message) => message.done === true),
    patches: host.postedSince(from, "previewContentPatch").length,
    errors: sources.filter((message) => message.error !== undefined).length,
  };
}

/** The one `done` answer, for the edit "e1", and nothing else. */
function assertOnlyDone(host: HostSession, from: number): void {
  const { done, patches, errors } = answered(host, from);
  assert.equal(done.length, 1, "exactly one done");
  assert.equal(done[0]!.editId, "e1");
  assert.equal(patches, 0, "no patch");
  assert.equal(errors, 0, "no error");
}

for (const [label, line, endLine] of [
  ["a hard-wrapped paragraph", 7, 8],
  ["a list item with a nested item", 4, 5],
  ["a list's last item", 3, 6],
] as const) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-263
  test(`a final save of ${label} of a CR LF file, with no change but LF, is answered and writes nothing`, async (t) => {
    const host = await open(t, CRLF);
    t.after(() => closeHost(t.mock.timers));
    const version = host.document.version;
    const { from, editedText } = await finalSave(host, line, endLine, (source) => textBox(source));
    assert.equal(editedText.includes("\r"), false, "the text is the one the text box returns");
    assert.equal(host.document.getText(), CRLF, "no byte of the file changed");
    assert.equal(host.document.version, version, "nothing was written");
    assertOnlyDone(host, from);
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-263
test("a final save equal to the source is answered, on an LF file too", async (t) => {
  const host = await open(t, "# Title\n\nPara one\nPara two\n");
  t.after(() => closeHost(t.mock.timers));
  const { from } = await finalSave(host, 3, 4, (source) => source);
  assert.equal(host.document.getText(), "# Title\n\nPara one\nPara two\n");
  assertOnlyDone(host, from);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234
test("a final save with a real change in a CR LF file keeps every other byte and the CR LF", async (t) => {
  const host = await open(t, CRLF);
  t.after(() => closeHost(t.mock.timers));
  const { from } = await finalSave(host, 7, 8, (source) => textBox(source, (text) => text.replace("two", "2")));
  assert.equal(host.document.getText(), CRLF.replace("Para two", "Para 2"));
  const { done, patches, errors } = answered(host, from);
  assert.deepEqual([done.length, patches, errors], [0, 1, 0], "the patch is the answer: one patch, no done, no error");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234
test("a final save with no change in a mixed-ending file leaves every byte, with an answer", async (t) => {
  const host = await open(t, MIXED);
  t.after(() => closeHost(t.mock.timers));
  const { from } = await finalSave(host, 3, 5, (source) => textBox(source));
  assert.equal(host.document.getText(), MIXED);
  assertOnlyDone(host, from);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234
test("a final save with a real change in a mixed-ending file keeps the endings of the other lines", async (t) => {
  const host = await open(t, MIXED);
  t.after(() => closeHost(t.mock.timers));
  await finalSave(host, 3, 5, (source) => textBox(source, (text) => text.replace("line b", "line B")));
  assert.equal(host.document.getText(), MIXED.replace("line b", "line B"));
});

/** Opens the block, posts an autosave of `change(source)`, then the final save of the same text. */
async function autosaveThenFinal(
  host: HostSession,
  line: number,
  endLine: number,
  beforeFinal: () => void,
): Promise<number> {
  const loaded = host.loadedIdentity();
  await host.fromPage({ type: "previewEditOpen", ...loaded, editId: "e1", line, endLine });
  const originalText = String(host.postedSince(0, "previewEditSource").at(-1)!.originalText);
  const editedText = originalText.replace("two", "2");
  await host.fromPage({ type: "previewEditSave", ...loaded, editId: "e1", line, endLine, originalText, editedText, final: false });
  await host.settle();
  assert.equal(host.document.getText().includes("Para 2"), true, "the autosave was written");
  beforeFinal();
  const from = host.posted.length;
  await host.fromPage({ type: "previewEditSave", ...loaded, editId: "e1", line, endLine, originalText, editedText, final: true });
  await host.settle();
  host.tick(10_000);
  await host.settle();
  return from;
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-263
test("an autosave then a final save that writes nothing more is answered by done, the change being rendered already", async (t) => {
  const host = await open(t, CRLF);
  t.after(() => closeHost(t.mock.timers));
  const from = await autosaveThenFinal(host, 7, 8, () => undefined);
  assert.equal(host.document.getText(), CRLF.replace("Para two", "Para 2"));
  const { done, patches, errors } = answered(host, from);
  assert.equal(errors, 0);
  assert.equal(done.length + patches, 1, "one answer, the patch that shows the change or the done");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-263
test("an autosave then a final save with the source file gone is answered by done only", async (t) => {
  const host = await open(t, CRLF);
  t.after(() => closeHost(t.mock.timers));
  const from = await autosaveThenFinal(host, 7, 8, () => fs.rmSync(host.document.uri.fsPath));
  assertOnlyDone(host, from);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-263
test("a final save with nothing to write and the source file gone is answered by done only", async (t) => {
  const host = await open(t, CRLF);
  t.after(() => closeHost(t.mock.timers));
  const loaded = host.loadedIdentity();
  const from = host.posted.length;
  await host.fromPage({ type: "previewEditOpen", ...loaded, editId: "e1", line: 7, endLine: 8 });
  const originalText = String(host.postedSince(from, "previewEditSource").at(-1)!.originalText);
  fs.rmSync(host.document.uri.fsPath);
  const sent = host.posted.length;
  await host.fromPage({ type: "previewEditSave", ...loaded, editId: "e1", line: 7, endLine: 8, originalText, editedText: originalText, final: true });
  await host.settle();
  host.tick(10_000);
  await host.settle();
  assertOnlyDone(host, sent);
});
