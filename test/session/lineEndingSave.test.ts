/**
 * The host saves a block of a document loaded from the real line-ending fixtures: the edited block
 * changes, every other byte is the one of the file.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { blockAt, LINE_ENDING_FIXTURE_NAMES, readLineEndingFixture } from "../shared/lineEndingFixtures";
import { fixture } from "./blockFixture";

/** Saves the block of lines `line` to `endLine` with `editedText` (LF, as the text box returns it). */
async function save(text: string, line: number, endLine: number, editedText: string): Promise<{ after: string; block: ReturnType<typeof blockAt> }> {
  const run = fixture({ text });
  const block = blockAt(text, line, endLine);
  await run.send("previewEditSave", { editId: "e1", line, endLine, originalText: block.text, editedText, final: false });
  assert.deepEqual(run.of("previewEditSource"), [], "the save is not refused");
  return { after: run.document.getText(), block };
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234
test("a saved block of a fixture document keeps every other byte and its own line endings", async () => {
  for (const name of LINE_ENDING_FIXTURE_NAMES) {
    const text = readLineEndingFixture(name);
    for (const [line, endLine, editedText] of [[8, 8, "First paragraph, edited.\n"], [10, 11, "- one\n- two\n- three\n"]] as const) {
      const { after, block } = await save(text, line, endLine, editedText);
      const tail = text.slice(block.start + block.text.length);
      assert.equal(after.slice(0, block.start), text.slice(0, block.start), `${name} line ${line}: bytes before`);
      assert.ok(after.endsWith(tail), `${name} line ${line}: bytes after`);
      const ending = block.text.endsWith("\r\n") ? "\r\n" : "\n";
      assert.equal(after.slice(block.start, after.length - tail.length), editedText.replace(/\n/gu, ending), `${name} line ${line}`);
      if (name.includes(".crlf.")) assert.equal(after.replace(/\r\n/gu, "").includes("\n"), false, `${name}: no bare LF`);
      if (name.includes(".lf.")) assert.equal(after.includes("\r"), false, `${name}: no CR`);
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234
test("the last block of a CRLF fixture takes CR LF, with or without a final line break", async () => {
  for (const [name, ending] of [["document.crlf.md", "\r\n"], ["no-final-newline.crlf.md", ""]] as const) {
    const text = readLineEndingFixture(name);
    const { after, block } = await save(text, 20, 20, `Last paragraph.\nmore${ending === "" ? "" : "\n"}`);
    assert.equal(after.slice(0, block.start), text.slice(0, block.start), `${name}: bytes before`);
    assert.equal(after.slice(block.start), `Last paragraph.\r\nmore${ending}`, name);
  }
});
