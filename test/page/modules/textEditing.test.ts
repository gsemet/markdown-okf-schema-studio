import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createTextEditingTools } from "../../../src/page/modules/textEditing";

const tools = createTextEditingTools();

/** `|` marks the caret; returns the text after the edit with the caret shown, or undefined. */
function run(input: string): string | undefined {
  const caret = input.indexOf("|");
  const value = input.replace("|", "");
  const edit = tools.continueOnEnter(value, caret, caret);
  if (!edit) return undefined;
  const result = value.slice(0, edit.start) + edit.text + value.slice(edit.end);
  return result.slice(0, edit.selectionStart) + "|" + result.slice(edit.selectionEnd);
}

const cases: [string, string | undefined][] = [
  ["- a|", "- a\n- |"],
  ["      - Dry goods|", "      - Dry goods\n      - |"],
  ["1. a|", "1. a\n2. |"],
  ["9) a|", "9) a\n10) |"],
  ["* a|", "* a\n* |"],
  ["+ a|", "+ a\n+ |"],
  ["- [x] done|", "- [x] done\n- [ ] |"],
  ["- [ ] todo|", "- [ ] todo\n- [ ] |"],
  ["> quote|", "> quote\n> |"],
  ["> - item|", "> - item\n> - |"],
  ["- |", "|"],
  ["a\n  - |\nb", "a\n|\nb"],
  [">  |", "|"],
  ["|- a", undefined],
  ["-| a", undefined],
  ["plain|", undefined],
  ["    code|", "    code\n    |"],
  ["```\n- a|", undefined],
  ["```\n  x|", "```\n  x\n  |"],
  ["```\n- a\n```\n- b|", "```\n- a\n```\n- b\n- |"],
  ["- a|b", "- a\n- |b"],
];

for (const [input, expected] of cases) {
  test("continueOnEnter " + JSON.stringify(input), () => {
    assert.equal(run(input), expected);
  });
}

test("continueOnEnter leaves non-collapsed selections to the native behaviour", () => {
  assert.equal(tools.continueOnEnter("- abc", 2, 4), undefined);
});

/** `[` and `]` mark the selection (or `|` a caret); returns the result in the same notation. */
function indent(input: string, outdent = false): string | undefined {
  const caret = input.indexOf("|");
  let start: number;
  let end: number;
  let value: string;
  if (caret !== -1) {
    value = input.replace("|", "");
    start = caret;
    end = caret;
  } else {
    start = input.indexOf("[");
    value = input.replace("[", "");
    end = value.indexOf("]");
    value = value.replace("]", "");
  }
  const edit = tools.indentSelection(value, start, end, outdent);
  if (!edit) return undefined;
  const result = value.slice(0, edit.start) + edit.text + value.slice(edit.end);
  if (edit.selectionStart === edit.selectionEnd) {
    return result.slice(0, edit.selectionStart) + "|" + result.slice(edit.selectionEnd);
  }
  return (
    result.slice(0, edit.selectionStart)
    + "["
    + result.slice(edit.selectionStart, edit.selectionEnd)
    + "]"
    + result.slice(edit.selectionEnd)
  );
}

const indentCases: [string, boolean, string | undefined][] = [
  ["- a|", false, "  - a|"],
  ["|- a", false, "  |- a"],
  ["1. a|", false, "   1. a|"],
  ["10. a|", false, "    10. a|"],
  ["[- a\n- b]", false, "  [- a\n  - b]"],
  ["- a\n[- b\n]", false, "- a\n  [- b\n]"],
  ["    - a|", true, "  - a|"],
  ["  - a|", true, "- a|"],
  ["- a|", true, undefined],
  ["plain|", true, undefined],
  ["    plain|", true, "plain|"],
  ["\tplain|", true, "plain|"],
  ["some| prose", false, "some    | prose"],
  ["[some prose]", false, "    [some prose]"],
  ["> - a|", false, ">   - a|"],
  ["> - a|", true, undefined],
  [">   - a|", true, "> - a|"],
  ["a\n  - b|\nc", false, "a\n    - b|\nc"],
];

for (const [input, outdent, expected] of indentCases) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-061
  test("indentSelection " + (outdent ? "outdent " : "indent ") + JSON.stringify(input), () => {
    assert.equal(indent(input, outdent), expected);
  });
}

// [name, source, rendered text before the click, rendered text after the click, expected "a|b"].
const caretCases: [string, string, string, string, string | undefined][] = [
  ["three-line paragraph", "Alpha bravo charlie\ndelta echo foxtrot\ngolf hotel india.", "Alpha br", "avo charlie delta", "Alpha br|avo charlie\ndelta echo foxtrot\ngolf hotel india."],
  ["emphasis", "Some **bold** text", "Some bo", "ld text", "Some **bo|ld** text"],
  ["link label", "See [the label](https://x.y/z) here", "See the la", "bel here", "See [the la|bel](https://x.y/z) here"],
  ["list", "- Dry goods\n- Refrigerated goods", "Dry", " goods Refrigerated goods", "- Dry| goods\n- Refrigerated goods"],
  ["heading", "## Title here", "Tit", "le here", "## Tit|le here"],
  ["only the last 12 characters before the click match", "Say Hello brave world", "zzz Say Hello brave", "", "Say Hello brave| world"],
  ["fenced code with underscore (documents the current result)", "```py\nfoo_bar = 1\n```", "foo_b", "ar = 1", "```py\nfoo_b|ar = 1\n```"],
  ["ambiguous", "a a a a", "a a", " a", undefined],
  ["no match", "Nothing relevant", "zzz", "qqq", undefined],
  ["empty context", "Nothing relevant", "", "", undefined],
];

for (const [name, source, before, after, expected] of caretCases) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-026
  test("mapRenderedCaret " + name, () => {
    const caret = createTextEditingTools().mapRenderedCaret(source, before, after);
    if (expected === undefined) {
      assert.equal(caret, undefined);
    } else {
      assert.notEqual(caret, undefined);
      assert.equal(source.slice(0, caret) + "|" + source.slice(caret), expected);
    }
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-069
test("wrapSelection wraps a non-empty selection with the marker and keeps it selected", () => {
  for (const marker of ["*", "_", "`", "~"]) {
    const edit = tools.wrapSelection("a foo b", 2, 5, marker);
    assert.deepEqual(edit, {
      start: 2,
      end: 5,
      text: marker + "foo" + marker,
      selectionStart: 3,
      selectionEnd: 6,
    });
  }
});

test("wrapSelection ignores a caret, other keys and invalid ranges", () => {
  assert.equal(tools.wrapSelection("abc", 1, 1, "*"), undefined);
  assert.equal(tools.wrapSelection("abc", 0, 3, "a"), undefined);
  assert.equal(tools.wrapSelection("abc", 0, 3, "**"), undefined);
  assert.equal(tools.wrapSelection("abc", 2, 9, "*"), undefined);
});

test("T35: cellSafeEdit escapes unescaped pipes, flattens newlines and moves the selection", () => {
  const edit = tools.cellSafeEdit("see a|b", {
    start: 4, end: 7, text: "[a|b](u\nv)", selectionStart: 14, selectionEnd: 14,
  });
  assert.equal(edit.text, "[a\\|b](u v)");
  assert.equal(edit.selectionStart, 15);
  assert.equal(edit.selectionEnd, 15);
  assert.equal(edit.start, 4);
  assert.equal(edit.end, 7);
});

test("T35: cellSafeEdit leaves escaped pipes and pipe-free text alone, and counts backslashes", () => {
  const plain = { start: 0, end: 0, text: "**x**", selectionStart: 2, selectionEnd: 3 };
  assert.deepEqual(tools.cellSafeEdit("", plain), plain);
  assert.equal(tools.cellSafeEdit("", { ...plain, text: "a\\|b" }).text, "a\\|b");
  assert.equal(tools.cellSafeEdit("", { ...plain, text: "a\\\\|b" }).text, "a\\\\\\|b");
  assert.equal(tools.cellSafeEdit("x\\", { ...plain, start: 2, end: 2, text: "|b" }).text, "|b",
    "a backslash before the insertion already escapes the first pipe");
  assert.equal(tools.cellSafeEdit("", { ...plain, text: "a\r\nb\rc" }).text, "a b c");
});

test("T35: cellSafeEdit keeps a selection inside the inserted text on the same characters", () => {
  const edit = tools.cellSafeEdit("", {
    start: 0, end: 0, text: "**a|b**", selectionStart: 2, selectionEnd: 5,
  });
  assert.equal(edit.text, "**a\\|b**");
  assert.equal(edit.selectionStart, 2);
  assert.equal(edit.selectionEnd, 6);
});

/** Applies the delete-line edit to `value` with the selection `[start, end]`; the text with `|` at the caret. */
function deleteLine(value: string, start: number, end = start): string | undefined {
  const edit = tools.deleteLine(value, start, end);
  if (!edit) return undefined;
  const text = value.slice(0, edit.start) + edit.text + value.slice(edit.end);
  return text.slice(0, edit.selectionStart) + "|" + text.slice(edit.selectionStart);
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-003
test("CR 119: deleteLine removes the caret line with its break and keeps the column on the next line", () => {
  assert.equal(deleteLine("one\ntwo\nthree", 5), "one\nt|hree");
  assert.equal(deleteLine("one\ntwo\nthree", 1), "t|wo\nthree");
  assert.equal(deleteLine("abcdef\nxy\nz", 4), "xy|\nz", "the column is cut to the next line's length");
  assert.equal(deleteLine("a\n\nb", 2), "a\n|b", "an empty line goes too");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-003
test("CR 119: deleteLine on the last line takes the break before it and moves the caret up", () => {
  assert.equal(deleteLine("one\ntwo\nthree", 10), "one\ntw|o");
  assert.equal(deleteLine("one\ntwo\n", 8), "one\n|two", "the empty line after the final break goes");
  assert.equal(deleteLine("only", 2), "|", "the only line leaves an empty text");
  assert.equal(deleteLine("", 0), undefined, "no text, no edit");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-003
test("CR 119: deleteLine removes every line a selection touches, not the line it ends at the start of", () => {
  assert.equal(deleteLine("a\nb\nc\nd", 2, 5), "a\n|d", "a selection over b and c");
  assert.equal(deleteLine("a\nb\nc\nd", 1, 4), "c|\nd", "from the end of a to the start of c: a and b");
  assert.equal(deleteLine("a\nb\nc\nd", 2, 4), "a\n|c\nd", "ending at the start of c leaves c alone");
  assert.equal(deleteLine("a\nb\nc", 5, 0), "|", "a backward selection over everything");
});
