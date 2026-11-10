import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createEditActions } from "../../../src/page/modules/editActions";
import { createMarkdownTableTools } from "../../../src/page/modules/markdownTable";

/** The table bar actions on a pipe table whose row has text after its closing pipe. */

const registry = createEditActions([], createMarkdownTableTools());
const TABLE = "| Name | Value |\n| --- | --- |\n| alpha | 1 | ^row-a\n| beta | 2 |";

function run(id: string, value: string, caret: number, arg?: string) {
  return registry.byId.get(id)!.apply({
    value, selectionStart: caret, selectionEnd: caret, scope: "block", arg,
  } as never);
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-117
test("the HTML table action gives no edit on a pipe table whose row has a tail", () => {
  assert.equal(run("htmlTable", TABLE, TABLE.indexOf("alpha")), undefined);
  assert.ok(run("htmlTable", TABLE.replace(" ^row-a", ""), TABLE.indexOf("alpha")), "no tail: converted");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-111
test("aligning a column gives no edit with the caret in a tail, and works in a cell", () => {
  assert.equal(run("columnAlign", TABLE, TABLE.indexOf("^row-a"), "right"), undefined);
  assert.ok(run("columnAlign", TABLE, TABLE.indexOf("alpha"), "right"));
});
