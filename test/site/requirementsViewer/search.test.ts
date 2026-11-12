import * as assert from "node:assert/strict";
import { test } from "node:test";

import { fixtureReport } from "./fixture";
import { parseRequirementsReport } from "./model";
import { searchIndex, searchIndexScript } from "./searchIndex";

test("search index entries: areas, use cases, behaviours, files, retired flagged", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-084
  const model = parseRequirementsReport(fixtureReport(), "abc123");
  assert.ok(model);
  const items = searchIndex(model);
  const kinds = (kind: string) => items.filter((item) => item.k === kind);
  assert.deepEqual(kinds("Area").map((item) => [item.t, item.h]), [["GitHub Flavored Markdown", "gfm/"], ["MyST syntax", "myst/"]]);
  assert.deepEqual(kinds("Use case").filter((item) => !item.r).map((item) => item.h), ["gfm/StRS-X-001/", "gfm/StRS-X-003/"]);
  assert.equal(kinds("Behaviour").filter((item) => !item.r).length, 6);
  const retired = items.filter((item) => item.r);
  assert.deepEqual(retired.map((item) => [item.k, item.h]), [
    ["Use case", "gfm/StRS-X-001/"],
    ["Behaviour", "gfm/SwRS-X-014/"],
    ["Behaviour", "gfm/"],
  ]);
  const file = kinds("File").find((item) => item.t === "src/a.ts");
  assert.equal(file?.n, 5, "five active behaviours carry the file");
  assert.equal(file?.h, "gfm/SwRS-MDOKFSTUDIO-GFM-021/");
  assert.ok(kinds("File").some((item) => item.t === "test/integration/a.test.ts" && item.s === "test"));
  assert.ok(searchIndexScript(model).startsWith("window.SEARCH=[{"));
  assert.equal(searchIndexScript(undefined), "window.SEARCH=[];\n");
});
