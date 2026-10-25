import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createMarkdownTableTools } from "../../../src/page/modules/markdownTable";

const tools = createMarkdownTableTools();

const listTable = (headerRows: number): string => [
  "```{list-table}",
  `:header-rows: ${headerRows}`,
  "",
  "* - Name",
  "  - Qty",
  "* - apple",
  "  - 3",
  "```",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-TABLE-076
test("a list-table with several header rows is refused as a pipe table with the header-row count", () => {
  assert.deepEqual(tools.convertTable(listTable(2), "pipe"), {
    ok: false,
    reason: "A pipe table has one header row; this table has 2. Nothing was changed.",
  });
  assert.deepEqual(tools.convertTable(listTable(1), "pipe"), {
    ok: true,
    text: "| Name | Qty |\n| --- | --- |\n| apple | 3 |",
  });
});
