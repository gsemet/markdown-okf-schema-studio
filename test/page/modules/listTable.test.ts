import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createMarkdownTableTools } from "../../../src/page/modules/markdownTable";

const tools = createMarkdownTableTools();

const PIPE = "| Name | Qty |\n| --- | --- |\n| apple | 3 |\n| pear | 4 |";
const LIST = [
  "```{list-table}",
  ":header-rows: 1",
  "",
  "* - Name",
  "  - Qty",
  "* - apple",
  "  - 3",
  "* - pear",
  "  - 4",
  "```",
].join("\n");

function convert(source: string, target: "list-table" | "pipe") {
  const result = tools.convertTable(source, target);
  assert.ok(result, "a table was recognised");
  return result;
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-080
test("a pipe table becomes a list-table with one header row", () => {
  assert.deepEqual(convert(PIPE, "list-table"), { ok: true, text: LIST });
});

test("a list-table becomes a canonical pipe table", () => {
  assert.deepEqual(convert(LIST, "pipe"), { ok: true, text: PIPE });
});

test("pipe -> list-table -> pipe is lossless for simple tables", () => {
  const sources = [
    PIPE,
    "| A |\n| --- |\n| x |",
    "| A | B |\n| --- | --- |",
    "| A | B |\n| --- | --- |\n|  | y |\n| z |  |",
    "| `a\\|b` | x\\|y |\n| --- | --- |\n| **bold** and [link](https://e.org) | été ✅ |",
    PIPE + "\n",
    PIPE.replace(/\n/gu, "\r\n"),
  ];
  for (const source of sources) {
    const list = convert(source, "list-table");
    assert.equal(list.ok, true, source);
    if (!list.ok) continue;
    assert.match(list.text, /^```\{list-table\}/u);
    const back = convert(list.text, "pipe");
    assert.deepEqual(back, { ok: true, text: source }, source);
  }
});

test("an escaped pipe is a plain pipe in the list item and escaped again in the pipe table", () => {
  const list = convert("| a |\n| --- |\n| x\\|y |", "list-table");
  assert.equal(list.ok && list.text.includes("* - x|y"), true);
});

test("the fence is longer than any backtick run in a cell", () => {
  const list = convert("| a |\n| --- |\n| ```x``` |", "list-table");
  assert.equal(list.ok && list.text.startsWith("````{list-table}"), true);
  assert.equal(list.ok && list.text.endsWith("\n````"), true);
});

test("column alignment colons are dropped going to a list-table", () => {
  const list = convert("| A | B |\n| :--- | ---: |\n| 1 | 2 |", "list-table");
  assert.equal(list.ok, true);
  assert.equal(list.ok && /:---|---:/u.test(list.text), false);
});

test("a list-table with several fence styles and options is read", () => {
  for (const [open, close] of [["~~~", "~~~"], [":::", ":::"], ["````", "````"]]) {
    const source = [
      `${open}{list-table}`, ":header-rows: 1", ":widths: 30 70", ":align: center", "",
      "- - H1", "  - H2", "- - a", "  - b", close,
    ].join("\n");
    assert.deepEqual(convert(source, "pipe"), { ok: true, text: "| H1 | H2 |\n| --- | --- |\n| a | b |" }, open);
  }
});

test("a list-table without header rows gets an empty header in the pipe table", () => {
  const source = "```{list-table}\n\n* - a\n  - b\n```";
  assert.deepEqual(convert(source, "pipe"), { ok: true, text: "|  |  |\n| --- | --- |\n| a | b |" });
});

test("a list-table cell with a pipe is escaped in the pipe table", () => {
  const source = "```{list-table}\n:header-rows: 1\n\n* - h\n* - a|b\n```";
  assert.deepEqual(convert(source, "pipe"), { ok: true, text: "| h |\n| --- |\n| a\\|b |" });
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-076
test("a list-table that would lose content is refused with a reason and nothing is produced", () => {
  const cases: [string, RegExp][] = [
    ["```{list-table}\n:header-rows: 1\n\n* - a\n    more\n  - b\n```", /several lines|block/iu],
    ["```{list-table}\n:header-rows: 1\n\n* - a\n\n    para two\n  - b\n```", /several lines|block/iu],
    ["```{list-table}\n:header-rows: 1\n\n* - a\n  - - nested\n    - list\n```", /several lines|block/iu],
    ["```{list-table} A title\n:header-rows: 1\n\n* - a\n  - b\n```", /title/iu],
    ["```{list-table}\n:name: tbl\n:header-rows: 1\n\n* - a\n  - b\n```", /label|name/iu],
    ["```{list-table}\n:header-rows: 2\n\n* - a\n  - b\n* - c\n  - d\n```", /header/iu],
    ["```{list-table}\n:header-rows: 1\n\n* - a\n  - b\n* - c\n```", /same number/iu],
  ];
  for (const [source, reason] of cases) {
    const result = convert(source, "pipe");
    assert.equal(result.ok, false, source);
    if (!result.ok) assert.match(result.reason, reason, source);
  }
});

test("a table already in the target form is refused, text that is no table is not recognised", () => {
  const same = convert(PIPE, "pipe");
  assert.equal(same.ok, false);
  assert.equal(convert(LIST, "list-table").ok, false);
  assert.equal(tools.convertTable("Just a paragraph", "pipe"), undefined);
  assert.equal(tools.convertTable("", "list-table"), undefined);
});

test("detectTable names the table form", () => {
  assert.equal(tools.detectTable(PIPE), "pipe");
  assert.equal(tools.detectTable(LIST), "list-table");
  assert.equal(tools.detectTable("<table>\n<tr><td>a</td></tr>\n</table>"), "html");
  assert.equal(tools.detectTable("text"), undefined);
});

const HTML = [
  "<table>",
  "  <thead>",
  "    <tr>",
  '      <th align="left">Name</th>',
  '      <th align="right">Qty</th>',
  "    </tr>",
  "  </thead>",
  "  <tbody>",
  "    <tr>",
  '      <td align="left">a&amp;b</td>',
  '      <td align="right">&lt;3</td>',
  "    </tr>",
  "  </tbody>",
  "</table>",
].join("\n");

test("a simple HTML table converts to a pipe table keeping alignment, and to a list-table", () => {
  assert.deepEqual(convert(HTML, "pipe"), {
    ok: true,
    text: "| Name | Qty |\n| :--- | ---: |\n| a&b | <3 |",
  });
  assert.deepEqual(convert(HTML, "list-table"), {
    ok: true,
    text: "```{list-table}\n:header-rows: 1\n\n* - Name\n  - Qty\n* - a&b\n  - <3\n```",
  });
});

test("the HTML table written by toHtmlTable converts back to the same pipe table", () => {
  const model = tools.parse("| Name | Qty |\n| :--- | ---: |\n| a&b | x\\|y |")!;
  const back = convert(tools.toHtmlTable(model), "pipe");
  assert.deepEqual(back, { ok: true, text: "| Name | Qty |\n| :--- | ---: |\n| a&b | x\\|y |" });
});

test("an HTML table with spans, markup or no body cells in a row is refused", () => {
  const cases = [
    '<table><tr><th colspan="2">A</th></tr><tr><td>1</td><td>2</td></tr></table>',
    "<table><tr><th>A</th></tr><tr><td><strong>1</strong></td></tr></table>",
    "<table><tr><th>A</th><th>B</th></tr><tr><td>1</td></tr></table>",
    '<table class="x"><tr><th>A</th></tr></table>',
  ];
  for (const source of cases) {
    for (const target of ["pipe", "list-table"] as const) {
      const result = convert(source, target);
      assert.equal(result.ok, false, source);
    }
  }
});
