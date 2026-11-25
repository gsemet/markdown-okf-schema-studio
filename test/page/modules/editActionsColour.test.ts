import * as assert from "node:assert/strict";
import { test } from "node:test";
import { createEditActions } from "../../../src/page/modules/editActions";
import { createMarkdownTableTools } from "../../../src/page/modules/markdownTable";
import { isSafeOkfColor } from "../../../src/core/security/spanColors";

// T34: the colour picker and the colour-code swatch.
const colourRegistry = createEditActions([], createMarkdownTableTools(), isSafeOkfColor);

function colour(
  id: string, input: string, arg?: string, scope: "block" | "cell" = "block",
): string | undefined {
  const caret = input.indexOf("|");
  const value = caret !== -1 ? input.replace("|", "") : input.replace("[", "").replace("]", "");
  const start = caret !== -1 ? caret : input.indexOf("[");
  const end = caret !== -1 ? caret : input.indexOf("]") - 1;
  const edit = colourRegistry.byId.get(id)!.apply({
    value, selectionStart: start, selectionEnd: end, scope, ...(arg === undefined ? {} : { arg }),
  });
  if (!edit) return undefined;
  const result = value.slice(0, edit.start) + edit.text + value.slice(edit.end);
  const a = edit.selectionStart;
  const b = edit.selectionEnd;
  return a === b
    ? result.slice(0, a) + "|" + result.slice(a)
    : result.slice(0, a) + "[" + result.slice(a, b) + "]" + result.slice(b);
}

test("T34: color is a strict-mode action for blocks and cells with a swatch popover", () => {
  const action = colourRegistry.byId.get("color")!;
  assert.deepEqual(action.modes, ["strict"]);
  assert.deepEqual(action.scopes, ["block", "cell"]);
  assert.equal(action.popover, "color");
  assert.equal(action.colors?.length, 16);
  for (const swatch of action.colors ?? []) assert.equal(isSafeOkfColor(swatch), true, swatch);
  assert.equal(new Set(action.colors).size, 16);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-058
test("T34: color wraps the selection in the exact span the renderer keeps", () => {
  assert.equal(colour("color", "say [foo] now", "text:#c00"), 'say <span style="color:#c00">[foo]</span> now');
  assert.equal(colour("color", "say [foo] now", "background:#ff0"),
    'say <span style="background-color:#ff0">[foo]</span> now');
  assert.equal(colour("color", "say | now", "text:#c00"), 'say <span style="color:#c00">|</span> now');
  assert.equal(colour("color", "a[ foo ]b", "text:#c00"), 'a <span style="color:#c00">[foo]</span> b');
});

test("T34: color updates the span the selection or caret is in, and adds the second property", () => {
  assert.equal(colour("color", 'x <span style="color:#c00">[foo]</span> y', "text:#00f"),
    'x <span style="color:#00f">[foo]</span> y');
  assert.equal(colour("color", 'x <span style="color:#c00">f|oo</span> y', "text:#00f"),
    'x <span style="color:#00f">f|oo</span> y', "a caret stays where it was");
  assert.equal(colour("color", 'x <span style="color:#c00">[foo]</span> y', "background:#ff0"),
    'x <span style="color:#c00; background-color:#ff0">[foo]</span> y');
  assert.equal(colour("color", 'x <span style="color:#c00; background-color:#ff0">[foo]</span> y', "background:rgb(1, 2, 3)"),
    'x <span style="color:#c00; background-color:rgb(1, 2, 3)">[foo]</span> y');
});

test("T34: a partial selection inside a coloured span nests a new span instead", () => {
  assert.equal(colour("color", 'x <span style="color:#c00">a[b]c</span>', "text:#00f"),
    'x <span style="color:#c00">a<span style="color:#00f">[b]</span>c</span>');
});

test("T34: color refuses a selection that straddles a span boundary, in both directions", () => {
  assert.equal(colour("color", 'ab<span style="color:#c00">c[d</span>e]f', "text:#00f"), undefined);
  assert.equal(colour("color", 'a[b<span style="color:#c00">c]d</span>ef', "text:#00f"), undefined);
  assert.equal(colour("color", 'a[b<span style="color:#c00">cd</span>e]f', "text:#00f"),
    'a<span style="color:#00f">[b<span style="color:#c00">cd</span>e]</span>f', "balanced still wraps");
});

test("T34: color refuses a boundary inside a tag's own text", () => {
  assert.equal(colour("color", 'ab<span style="co[lor:#c00">cd</span>e]f', "text:#00f"), undefined);
  assert.equal(colour("color", 'a<b onclick="x|y">c</b>', "text:#00f"), undefined);
});

test("T34: color Remove drops one property and unwraps the span when none is left", () => {
  assert.equal(colour("color", 'x <span style="color:#c00; background-color:#ff0">[foo]</span>', "text:"),
    'x <span style="background-color:#ff0">[foo]</span>');
  assert.equal(colour("color", 'x <span style="color:#c00">[foo]</span> y', "text:"), "x [foo] y");
  assert.equal(colour("color", 'x <span style="color:#c00">fo|o</span> y', "text:"), "x fo|o y");
  assert.equal(colour("color", "x [foo] y", "text:"), undefined, "nothing to remove");
  assert.equal(colour("color", 'x <span style="color:#c00">[foo]</span> y', "background:"), undefined,
    "no such property");
});

test("T34: color refuses an invalid value and never writes markup the sanitizer would strip", () => {
  for (const bad of ["text:redd", "text:#12", "text:#ggg", "text:url(x)", "text:#c00;position:fixed",
    'text:#c00"><script>', "text:rgb(1,2,3", "text:var(--x)", "text:#c00 !important", "sky:#c00", "#c00", ""]) {
    assert.equal(colour("color", "say [foo] now", bad), undefined, bad);
  }
  assert.equal(colour("color", "say [foo] now"), undefined, "no argument");
  // Everything the action writes passes the sanitizer grammar.
  const edit = colourRegistry.byId.get("color")!.apply({
    value: "foo", selectionStart: 0, selectionEnd: 3, scope: "block", arg: "text:rgba(1, 2, 3, 0.5)" })!;
  assert.match(edit.text, /^<span style="color:rgba\(1, 2, 3, 0\.5\)">foo<\/span>$/u);
});

test("T34: without a colour validator the colour actions refuse", () => {
  const bare = createEditActions();
  assert.equal(bare.byId.get("color")!.apply({
    value: "foo", selectionStart: 0, selectionEnd: 3, scope: "block", arg: "text:#c00" }), undefined);
});

test("T34: color works in a table cell without escaping the pipes", () => {
  assert.equal(colour("color", "[foo]", "text:#c00", "cell"), '<span style="color:#c00">[foo]</span>');
  assert.equal(colour("color", '<span style="color:#c00">f|oo</span>', "background:#ff0", "cell"),
    '<span style="color:#c00; background-color:#ff0">f|oo</span>');
});

test("T34: colorCode is available only with the caret in a colour code", () => {
  const action = colourRegistry.byId.get("colorCode")!;
  const probe = (input: string): boolean => {
    const caret = input.indexOf("|");
    return action.available!({ value: input.replace("|", ""), selectionStart: caret, selectionEnd: caret, scope: "block" });
  };
  assert.equal(probe("a #c00| b"), true, "right edge");
  assert.equal(probe("a |#c00 b"), true, "left edge");
  assert.equal(probe("a #c|c0000 b"), true);
  assert.equal(probe("a rgb(1, 2,| 3) b"), true);
  assert.equal(probe("a |rgba(1,2,3,0.5)"), true);
  assert.equal(probe("a| #c00 b"), false, "one space before");
  assert.equal(probe("a #c00 |b"), false, "one space after");
  assert.equal(probe("a #c0| b"), false, "two digits");
  assert.equal(probe("a #c00x| b"), false, "followed by a letter");
  assert.equal(probe("a x#c00| b"), false, "preceded by a letter");
  assert.equal(probe("a #ccccc| b"), false, "five digits");
  assert.equal(probe("a rgb(300,0,0)| b"), false, "out of range");
  assert.equal(probe("a rgb(1,2| b"), false, "unclosed");
  assert.equal(probe("plain| text"), false);
  assert.equal(action.current!({ value: "a #C00 b", selectionStart: 3, selectionEnd: 3, scope: "block" }), "#C00");
  assert.equal(action.current!({ value: "plain", selectionStart: 1, selectionEnd: 1, scope: "block" }), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-069
test("T34: colorCode replaces the code under the caret in place, validated", () => {
  assert.equal(colour("colorCode", "a #c0|0 b", "#00f"), "a #00f| b");
  assert.equal(colour("colorCode", "a rgb(1, 2, 3)| b", "#ff8800"), "a #ff8800| b");
  assert.equal(colour("colorCode", "a #c0|0 b", "redd"), undefined);
  assert.equal(colour("colorCode", "a #c0|0 b", 'rgb(1,2,3);"'), undefined);
  assert.equal(colour("colorCode", "a plain| b", "#00f"), undefined, "no code at the caret");
  assert.equal(colour("colorCode", "a #c0|0 b"), undefined);
});
