/**
 * Host side of an emptied block and of Delete block (CR-439): the final save of an erased editor
 * deletes the block in one edit, and previewBlocksDelete deletes a span in one edit.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { fixture } from "./blockFixture";

const EOLS = [["LF", "\n"], ["CRLF", "\r\n"], ["lone CR", "\r"]] as const;
const first = (eol: string) => ({ editId: "e1", line: 3, endLine: 3, originalText: `First paragraph.${eol}` });

for (const [name, eol] of EOLS) {
  const text = ["# Title", "", "First paragraph.", "", "Second paragraph.", ""].join(eol);
  const expected = ["# Title", "", "Second paragraph.", ""].join(eol);

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-264
  test(`${name}: an erased editor committed before any autosave deletes the block in one edit`, async () => {
    const run = fixture({ text });
    await run.send("previewEditSave", { ...first(eol), editedText: "", final: true, deleteWhenEmpty: true });
    assert.equal(run.document.getText(), expected);
    assert.equal(run.applyCalls.length, 1);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-264
  test(`${name}: an erased editor committed after an autosave deletes the block in a second edit`, async () => {
    const run = fixture({ text });
    await run.send("previewEditSave", { ...first(eol), editedText: "", final: false });
    assert.ok(!run.document.getText().includes("First"), "the autosave wrote the placeholder");
    await run.send("previewEditSave", { ...first(eol), editedText: "", final: true, deleteWhenEmpty: true });
    assert.equal(run.document.getText(), expected);
    assert.equal(run.applyCalls.length, 2);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-264
  test(`${name}: without deleteWhenEmpty the placeholder line is written`, async () => {
    const run = fixture({ text });
    await run.send("previewEditSave", { ...first(eol), editedText: "", final: true });
    assert.equal(run.document.getText(), ["# Title", "", "", "Second paragraph.", ""].join(eol));
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-265
  test(`${name}: previewBlocksDelete deletes the span in one edit and answers op delete`, async () => {
    const run = fixture({ text });
    await run.send("previewBlocksDelete", { line: 3, endLine: 3, pinViewportTop: 120 });
    assert.equal(run.document.getText(), expected);
    assert.equal(run.applyCalls.length, 1);
    const [result] = run.of("previewBlocksResult");
    assert.equal(result!.op, "delete");
    assert.equal(result!.ok, true);
    assert.equal(run.preview.scroll.pendingPin?.line, 3);
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265
test("previewBlocksDelete of the last block pins nothing, and refusals change nothing", async () => {
  const last = fixture();
  await last.send("previewBlocksDelete", { line: 5, endLine: 5, pinViewportTop: 120 });
  assert.equal(last.of("previewBlocksResult")[0]!.ok, true);
  assert.equal(last.preview.scroll.pendingPin, undefined);

  const included = fixture({ text: ":::{include} other.md\n:::\n\nPara\n" });
  await included.send("previewBlocksDelete", { line: 1, endLine: 2 });
  assert.deepEqual(included.of("previewBlocksResult").map(({ op, ok, reason }) => ({ op, ok, reason })), [
    { op: "delete", ok: false, reason: "A block that comes from an included file cannot be deleted." },
  ]);
  assert.equal(included.applyCalls.length, 0);

  const stale = fixture();
  await stale.send("previewBlocksDelete", { line: 40, endLine: 41 });
  assert.equal(stale.of("previewBlocksResult")[0]!.ok, false);
  assert.equal(stale.applyCalls.length, 0);

  const failing = fixture();
  failing.store.refuseEdits(true);
  await failing.send("previewBlocksDelete", { line: 3, endLine: 3 });
  assert.equal(failing.of("previewBlocksResult")[0]!.ok, false);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265
test("previewBlocksDelete is refused while a block edit is held", async () => {
  const held = fixture();
  await held.send("previewEditSave", { editId: "e1", line: 5, endLine: 5, originalText: "Second paragraph.\n", editedText: "Second A.\n", final: false });
  const before = held.document.getText();
  await held.send("previewBlocksDelete", { line: 3, endLine: 3 });
  assert.deepEqual(held.of("previewBlocksResult").map(({ op, ok, reason }) => ({ op, ok, reason })), [
    { op: "delete", ok: false, reason: "Save or cancel the open Markdown edit first." },
  ]);
  assert.equal(held.document.getText(), before);
});
