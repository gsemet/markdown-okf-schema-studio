/**
 * The Alert action of the palette next to a block quote's lazy continuation lines: a caret on a
 * lazy line is in the alert above it, and a new alert under a quote starts after a blank line so
 * it does not join that quote.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createEditActions } from "../../../src/page/modules/editActions";
import { createMarkdownTableTools } from "../../../src/page/modules/markdownTable";

const registry = createEditActions([], createMarkdownTableTools());

interface Applied { value: string; selection: [number, number] }

function applyTo(
  id: string, value: string, selection: [number, number], arg?: string,
): Applied | undefined {
  const edit = registry.byId.get(id)!.apply({
    value, selectionStart: selection[0], selectionEnd: selection[1], scope: "block",
    ...(arg === undefined ? {} : { arg }),
  });
  if (!edit) return undefined;
  return {
    value: value.slice(0, edit.start) + edit.text + value.slice(edit.end),
    selection: [edit.selectionStart, edit.selectionEnd],
  };
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-115
test("alert: a caret on a lazy line is in the alert above it", () => {
  const value = "> [!TIP]\n> first\nSecond";
  const caret = value.indexOf("Second") + 2;
  assert.equal(applyTo("alert", value, [caret, caret]), undefined, "no argument: the type list opens");
  const out = applyTo("alert", value, [caret, caret], "WARNING")!;
  assert.equal(out.value, "> [!WARNING]\n> first\nSecond");
  assert.deepEqual(out.selection, [caret + 4, caret + 4], "the caret follows its text");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-115
test("alert: quoted lines after lazy lines stay in the same alert", () => {
  const value = "> [!TIP]\n> first\nSecond\n> third";
  const caret = value.indexOf("third") + 1;
  assert.equal(applyTo("alert", value, [caret, caret]), undefined);
  assert.equal(applyTo("alert", value, [caret, caret], "CAUTION")!.value, "> [!CAUTION]\n> first\nSecond\n> third");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-115
test("alert: an alert the caret is not in keeps its head", () => {
  const value = "> [!TIP]\n> first\n\nSecond";
  const caret = value.length;
  assert.equal(applyTo("alert", value, [caret, caret], "WARNING")!.value, "> [!TIP]\n> first\n\n> [!WARNING]\n> Second");
  const afterList = "> [!TIP]\n> first\n- item";
  const inItem = afterList.length;
  assert.equal(applyTo("alert", afterList, [inItem, inItem], "WARNING")!.value,
    "> [!TIP]\n> first\n\n> [!WARNING]\n> - item");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-115
test("alert: a new alert under a quoted or lazy line starts after a blank line", () => {
  const value = "> quote\nSecond";
  const caret = value.indexOf("Second") + 3;
  const out = applyTo("alert", value, [caret, caret])!;
  assert.equal(out.value, "> quote\n\n> [!NOTE]\n> Second");
  const expected = out.value.indexOf("> Second") + 2 + 3;
  assert.deepEqual(out.selection, [expected, expected]);
  const lazy = "> quote\nlazy\nThird";
  const onThird = lazy.length;
  assert.equal(applyTo("alert", lazy, [onThird, onThird])!.value, "> quote\nlazy\n\n> [!NOTE]\n> Third");
  const selected = "> quote\nSecond\nThird";
  const start = selected.indexOf("Second");
  const range = applyTo("alert", selected, [start, selected.length])!;
  assert.equal(range.value, "> quote\n\n> [!NOTE]\n> Second\n> Third");
  assert.equal(range.value.slice(range.selection[0], range.selection[1]), "> Second\n> Third");
  assert.equal(applyTo("alert", "Intro\nSecond", [8, 8])!.value, "Intro\n> [!NOTE]\n> Second",
    "a plain paragraph above needs no blank line");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-115
test("alert: a list item of any number after a quoted line is out of the alert", () => {
  for (const item of ["2. x", "+ b", "1) b"]) {
    const value = `> [!TIP]\n> a\n${item}`;
    const caret = value.length;
    assert.equal(applyTo("alert", value, [caret, caret], "WARNING")!.value, `> [!TIP]\n> a\n\n> [!WARNING]\n> ${item}`);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-115
test("alert: the line after a table in the alert is out of it", () => {
  const value = "> [!TIP]\n> | a | b |\n> | - | - |\nfoo";
  const caret = value.length;
  assert.equal(applyTo("alert", value, [caret, caret], "WARNING")!.value,
    "> [!TIP]\n> | a | b |\n> | - | - |\n\n> [!WARNING]\n> foo");
  const lazyRow = "> [!TIP]\n> | a | b |\n| - | - |";
  const onRow = lazyRow.length;
  assert.equal(applyTo("alert", lazyRow, [onRow, onRow], "WARNING")!.value, "> [!WARNING]\n> | a | b |\n| - | - |",
    "a lazy delimiter row is text of the alert");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-115
test("alert: a closed HTML comment in the alert leaves the next paragraph's lazy line in it", () => {
  const value = "> [!TIP]\n> <!-- c -->\n> text\nlazy";
  const caret = value.length;
  assert.equal(applyTo("alert", value, [caret, caret], "WARNING")!.value, "> [!WARNING]\n> <!-- c -->\n> text\nlazy");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-115
test("alert: an alert head inside fenced code is not an alert", () => {
  for (const body of ["foo", "> foo"]) {
    const value = "```\n> [!NOTE]\n" + body + "\n```";
    const caret = value.indexOf(body) + body.length;
    const out = applyTo("alert", value, [caret, caret], "TIP")!.value;
    assert.ok(out.startsWith("```\n> [!NOTE]\n"), `the head in the code block is kept: ${JSON.stringify(out)}`);
    assert.equal(out, "```\n> [!NOTE]\n> [!TIP]\n> " + body + "\n```");
  }
});
