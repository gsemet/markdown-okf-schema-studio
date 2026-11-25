/**
 * Host side of the blank-line block (CR-444): a block written in place of a blank run, a paste in
 * its place, and previewBlankRunDelete, in LF and CR LF documents.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { fixture } from "./blockFixture";

const EOLS = [["LF", "\n"], ["CRLF", "\r\n"]] as const;
const lines = (eol: string, ...entries: string[]): string => entries.join(eol);
const run = { line: 5, endLine: 5 };
const open = (eol: string) => ({
  editId: "e1", line: 5, endLine: 5, insertAfterLine: 4, replaceBlankRun: run, originalText: "", eol,
});
const result = (host: ReturnType<typeof fixture>) =>
  host.of("previewBlocksResult").map(({ op, ok, reason }) => ({ op, ok, reason }));

for (const [name, eol] of EOLS) {
  const text = lines(eol, "# Title", "", "A", "", "", "", "B", "");
  const withX = lines(eol, "# Title", "", "A", "", "X", "", "B", "");

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S1
  test(`${name}: a block written in a blank line takes its place in one block, and typing on keeps one block`, async () => {
    const host = fixture({ text });
    await host.send("previewEditSave", { ...open(eol), editedText: "X", final: false });
    assert.equal(host.document.getText(), withX);
    await host.send("previewEditSave", { ...open(eol), editedText: "XY", final: false });
    assert.equal(host.document.getText(), lines(eol, "# Title", "", "A", "", "XY", "", "B", ""));
    assert.deepEqual(host.of("previewEditSource"), []);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S4
  test(`${name}: an editor emptied before any autosave changes nothing`, async () => {
    const host = fixture({ text });
    await host.send("previewEditSave", { ...open(eol), editedText: "", final: true });
    assert.equal(host.document.getText(), text);
    assert.equal(host.applyCalls.length, 0);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S4
  test(`${name}: a final save that writes text asks for a render and posts no done: the patch closes the editor`, async () => {
    const host = fixture({ text });
    host.manager.sourceAvailable = () => true;
    let renders = 0;
    host.manager.rendering.refreshPreviewDocument = () => {
      renders += 1;
      return Promise.resolve() as never;
    };
    await host.send("previewEditSave", { ...open(eol), editedText: "X", final: true });
    assert.equal(host.document.getText(), withX);
    assert.equal(host.preview.edits.active, undefined, "the host edit ended");
    assert.equal(renders, 1, "a render was asked for");
    assert.deepEqual(host.of("previewEditSource").filter((entry) => entry.done === true), [], "no done answer");
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S6
  test(`${name}: a block erased after an autosave puts the run back`, async () => {
    const host = fixture({ text });
    await host.send("previewEditSave", { ...open(eol), editedText: "X", final: false });
    await host.send("previewEditSave", { ...open(eol), editedText: "", final: true });
    assert.equal(host.document.getText(), text);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S3
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S6
  test(`${name}: a cancel after an autosave puts the run back`, async () => {
    const host = fixture({ text });
    await host.send("previewEditSave", { ...open(eol), editedText: "X", final: false });
    assert.equal(host.document.getText(), withX);
    await host.send("previewEditCancel", {
      editId: "e1", line: 5, endLine: 5, insertAfterLine: 4, replaceBlankRun: run,
    });
    assert.equal(host.document.getText(), text);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S1
  test(`${name}: a paste in place of a blank line leaves a blank line on each side`, async () => {
    const host = fixture({ text });
    await host.send("previewBlocksPaste", { insertAfterLine: 4, replaceBlankRun: run });
    assert.equal(host.document.getText(), lines(eol, "# Title", "", "A", "", "Pasted block.", "", "B", ""));
    assert.deepEqual(result(host), [{ op: "paste", ok: true, reason: undefined }]);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-269#S1
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-269#S2
  test(`${name}: previewBlankRunDelete removes that one line, answers op delete-blank-lines and pins the run`, async () => {
    const host = fixture({ text });
    await host.send("previewBlankRunDelete", { line: 5, endLine: 5, pinViewportTop: 120 });
    assert.equal(host.document.getText(), lines(eol, "# Title", "", "A", "", "", "B", ""));
    assert.equal(host.applyCalls.length, 1);
    assert.deepEqual(result(host), [{ op: "delete-blank-lines", ok: true, reason: undefined }]);
    assert.equal(host.preview.scroll.pendingPin?.line, 5);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-269#S1
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-269#S2
  test(`${name}: previewBlankRunDelete of the last blank line at the end of the body removes that line`, async () => {
    const host = fixture({ text: lines(eol, "A", "", "", "", "") });
    await host.send("previewBlankRunDelete", { line: 4, endLine: 4 });
    assert.equal(host.document.getText(), lines(eol, "A", "", "", ""));
    assert.equal(host.preview.scroll.pendingPin, undefined);
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-269#S2
test("previewBlankRunDelete is refused for a separator or a line the text no longer has, a failed edit and a held edit", async () => {
  const text = "# Title\n\nA\n\n\n\nB\n";
  const stale = fixture({ text });
  await stale.send("previewBlankRunDelete", { line: 4, endLine: 4 });
  assert.equal(result(stale)[0]!.ok, false);
  assert.equal(result(stale)[0]!.op, "delete-blank-lines");
  assert.equal(stale.applyCalls.length, 0);

  const failing = fixture({ text });
  failing.store.refuseEdits(true);
  await failing.send("previewBlankRunDelete", { line: 5, endLine: 5 });
  assert.equal(result(failing)[0]!.ok, false);

  const held = fixture({ text });
  await held.send("previewEditSave", {
    editId: "e1", line: 3, endLine: 3, originalText: "A\n", editedText: "A2\n", final: false,
  });
  const before = held.document.getText();
  await held.send("previewBlankRunDelete", { line: 5, endLine: 5 });
  assert.equal(result(held)[0]!.ok, false);
  assert.equal(held.document.getText(), before);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S6
test("an editor of a line that is the separator, or that is not the line of its run, is refused as stale", async () => {
  const text = "# Title\n\nA\n\n\n\nB\n";
  const partial = fixture({ text });
  await partial.send("previewEditOpen", {
    editId: "e1", line: 4, endLine: 4, insertAfterLine: 3, replaceBlankRun: { line: 4, endLine: 4 },
  });
  assert.equal(partial.of("previewEditSource").length, 1);
  assert.ok(partial.of("previewEditSource")[0]!.error);

  const mismatch = fixture({ text });
  await mismatch.send("previewEditOpen", {
    editId: "e1", line: 6, endLine: 6, insertAfterLine: 4, replaceBlankRun: run,
  });
  assert.ok(mismatch.of("previewEditSource")[0]!.error);

  const save = fixture({ text });
  await save.send("previewEditSave", {
    editId: "e1", line: 4, endLine: 4, insertAfterLine: 3, replaceBlankRun: { line: 4, endLine: 4 },
    originalText: "", editedText: "X", final: false,
  });
  assert.ok(save.of("previewEditSource")[0]!.error);
  assert.equal(save.document.getText(), text);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S6
test("a save or cancel whose blank run differs from the held edit's is refused as stale", async () => {
  const text = "# Title\n\nA\n\n\n\nB\n";
  const host = fixture({ text });
  await host.send("previewEditSave", { ...open("\n"), editedText: "X", final: false });
  const written = host.document.getText();
  const applied = host.applyCalls.length;
  const other = { line: 6, endLine: 6 };
  await host.send("previewEditSave", {
    ...open("\n"), line: 6, endLine: 6, insertAfterLine: 5, replaceBlankRun: other, editedText: "XY", final: false,
  });
  await host.send("previewEditSave", { ...open("\n"), replaceBlankRun: undefined, editedText: "XY", final: false });
  await host.send("previewEditCancel", {
    editId: "e1", line: 6, endLine: 6, insertAfterLine: 5, replaceBlankRun: other,
  });
  const errors = host.of("previewEditSource").filter((message) => message.error);
  assert.equal(errors.length, 3);
  assert.match(String(errors[0]!.error), /stale/u);
  assert.equal(host.document.getText(), written, "nothing is written or restored");
  assert.equal(host.applyCalls.length, applied);
  await host.send("previewEditCancel", {
    editId: "e1", line: 5, endLine: 5, insertAfterLine: 4, replaceBlankRun: run,
  });
  assert.equal(host.document.getText(), text, "the matching cancel still restores the run");
});
