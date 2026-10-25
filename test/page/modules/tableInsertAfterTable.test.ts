import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createEditActions } from "../../../src/page/modules/editActions";
import { createMarkdownTableTools } from "../../../src/page/modules/markdownTable";

// @tests_req SwRS-MDOKFSTUDIO-TABLE-106
// @tests_req SwRS-MDOKFSTUDIO-TABLE-115
// @tests_req SwRS-MDOKFSTUDIO-TABLE-117

const registry = createEditActions([], createMarkdownTableTools());

const LIST_TABLE = ":::{list-table}\n* - a\n  - b\n:::";
const HTML_TABLE = "<table>\n  <tr><td>a</td></tr>\n</table>";
const PIPE_TABLE = "| A | B |\n| --- | --- |\n| 1 | 2 |";

function applyTo(id: string, value: string, caret: number, arg?: string): string | undefined {
  const edit = registry.byId.get(id)!.apply({
    value, selectionStart: caret, selectionEnd: caret, scope: "block",
    ...(arg === undefined ? {} : { arg }),
  });
  return edit ? value.slice(0, edit.start) + edit.text + value.slice(edit.end) : undefined;
}

test("Table with the caret in a pipe table, a list-table or an HTML table goes after it", () => {
  for (const [table, marker] of [[PIPE_TABLE, "1 |"], [LIST_TABLE, "- a"], [HTML_TABLE, "<td>"]]) {
    const source = "intro\n\n" + table + "\n\nafter";
    const out = applyTo("table", source, source.indexOf(marker) + 1, "1x1");
    assert.equal(out, "intro\n\n" + table + "\n\n| Column 1 |\n| --- |\n\nafter", marker);
  }
  const atEnd = "x\n\n" + PIPE_TABLE;
  assert.equal(applyTo("table", atEnd, atEnd.length, "1x1"), atEnd + "\n\n| Column 1 |\n| --- |");
});

test("HTML table and Table with caption in a list-table or HTML table insert after it", () => {
  for (const table of [LIST_TABLE, HTML_TABLE]) {
    const source = table + "\n\nafter";
    const caret = source.indexOf("a") + 1;
    const html = applyTo("htmlTable", source, caret)!;
    assert.equal(html.startsWith(table + "\n\n<table>\n  <thead>"), true, "html");
    assert.equal(html.endsWith("</table>\n\nafter"), true);
    const captioned = applyTo("tableCaption", source, caret)!;
    assert.equal(captioned.startsWith(table + "\n\n:::{table} Caption"), true, "caption");
    assert.equal(captioned.endsWith(":::\n\nafter"), true);
  }
});
