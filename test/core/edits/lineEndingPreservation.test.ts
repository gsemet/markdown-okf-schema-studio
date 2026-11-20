/**
 * A block save on the real line-ending fixtures: the edited block changes, every other byte stays,
 * a CRLF file gets no bare LF and an LF file gets no CR.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { planBlockTextEdit, withLineEndingOf } from "../../../src/core/edits/sourceEdits";
import { applyTextEdits } from "../../../src/core/edits/textEdit";
import { blockAt, LINE_ENDING_FIXTURE_NAMES, readLineEndingFixture } from "../../shared/lineEndingFixtures";

/** The paragraph at line 8 and the list at lines 10-11 of every fixture. */
const PARAGRAPH = { line: 8, endLine: 8, editedText: "First paragraph, edited.\n" };
const LIST = { line: 10, endLine: 11, editedText: "- one\n- two\n- three\n" };

/** What the host writes for a save: the text box returns LF, the block keeps its own ending. */
function saved(text: string, block: { line: number; endLine: number; editedText: string }): { start: number; end: number; after: string } {
  const original = blockAt(text, block.line, block.endLine);
  const written = withLineEndingOf(block.editedText, original.text, text);
  const edit = planBlockTextEdit(original.start, original.text, written);
  assert.ok(edit, "the block changed, so there is an edit");
  return { start: original.start, end: original.start + original.text.length, after: applyTextEdits(text, [edit]) };
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234
test("saving one block of each fixture changes that block only and keeps every other byte", () => {
  for (const name of LINE_ENDING_FIXTURE_NAMES) {
    const text = readLineEndingFixture(name);
    for (const block of [PARAGRAPH, LIST]) {
      const { start, end, after } = saved(text, block);
      const label = `${name} line ${block.line}`;
      const tail = text.slice(end);
      assert.equal(after.slice(0, start), text.slice(0, start), `${label}: the bytes before the block are untouched`);
      assert.ok(after.endsWith(tail), `${label}: the bytes after the block are untouched`);
      assert.notEqual(after, text, `${label}: the block changed`);
      const written = after.slice(start, after.length - tail.length);
      const ending = blockAt(text, block.line, block.line).text.endsWith("\r\n") ? "\r\n" : "\n";
      assert.equal(written, block.editedText.replace(/\n/gu, ending), `${label}: the block keeps its own line ending`);
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234
test("a save never adds a bare LF to a CRLF file nor a CR to an LF file", () => {
  for (const name of LINE_ENDING_FIXTURE_NAMES.filter((fixture) => !fixture.includes("mixed"))) {
    const text = readLineEndingFixture(name);
    for (const block of [PARAGRAPH, LIST]) {
      const { after } = saved(text, block);
      if (name.includes(".crlf.")) {
        assert.equal(after.replace(/\r\n/gu, "").includes("\n"), false, `${name}: no bare LF`);
      } else {
        assert.equal(after.includes("\r"), false, `${name}: no CR`);
      }
    }
  }
});
