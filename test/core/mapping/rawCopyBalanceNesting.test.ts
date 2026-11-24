import * as assert from "node:assert/strict";
import { test } from "node:test";

import { copyRaw, pageOf, previewHtml, renderPage } from "./rawCopyFrames";
import { assertCopy, at } from "./rawCopyBalanceSupport";

/** An admonition holding a list item that holds an admonition: the levels 0 (outside), 1, 2 and 3 (the inner admonition). */
const SOURCE = [
  "Before.",
  "",
  "::::{note}",
  "Outer a.",
  "",
  "- item a",
  "",
  "  :::{warning}",
  "  Inner text.",
  "  :::",
  "",
  "  Item tail.",
  "",
  "- item b",
  "",
  "Outer z.",
  "::::",
  "",
  "After.",
  "",
].join("\n");

const STARTS = [
  { spot: at("Before.", 1), offset: SOURCE.indexOf("Before.") + 1 },
  { spot: at("Outer a.", 1), offset: SOURCE.indexOf("Outer a.") + 1 },
  { spot: at("item a", 1), offset: SOURCE.indexOf("item a") + 1 },
  { spot: at("Inner text.", 1), offset: SOURCE.indexOf("Inner text.") + 1 },
];
const ENDS = [
  { spot: at("After.", 3), offset: SOURCE.indexOf("After.") + 3 },
  { spot: at("Outer z.", 3), offset: SOURCE.indexOf("Outer z.") + 3 },
  { spot: at("Item tail.", 3), offset: SOURCE.indexOf("Item tail.") + 3 },
  { spot: at("Inner text.", 3), offset: SOURCE.indexOf("Inner text.") + 3 },
];

const lines = (...values: string[]): string => values.join("\n");

/** The setting-on copy of each start level (rows) by each end level (columns). */
const ON: string[][] = [
  [
    SOURCE.slice(STARTS[0]!.offset, ENDS[0]!.offset),
    SOURCE.slice(STARTS[0]!.offset, ENDS[1]!.offset) + "\n::::",
    SOURCE.slice(STARTS[0]!.offset, ENDS[2]!.offset) + "\n::::",
    SOURCE.slice(STARTS[0]!.offset, ENDS[3]!.offset) + "\n  :::\n::::",
  ],
  [
    "::::{note}\n" + SOURCE.slice(STARTS[1]!.offset, ENDS[0]!.offset),
    SOURCE.slice(STARTS[1]!.offset, ENDS[1]!.offset),
    SOURCE.slice(STARTS[1]!.offset, ENDS[2]!.offset),
    SOURCE.slice(STARTS[1]!.offset, ENDS[3]!.offset) + "\n  :::",
  ],
  [
    lines("::::{note}", "- tem a", "", "  :::{warning}", "  Inner text.", "  :::", "", "  Item tail.", "", "- item b", "", "Outer z.", "::::", "", "Aft"),
    lines("- tem a", "", "  :::{warning}", "  Inner text.", "  :::", "", "  Item tail.", "", "- item b", "", "Out"),
    lines("tem a", "", ":::{warning}", "Inner text.", ":::", "", "Ite"),
    lines("tem a", "", ":::{warning}", "Inn", ":::"),
  ],
  [
    lines("::::{note}", "- :::{warning}", "  nner text.", "  :::", "", "  Item tail.", "", "- item b", "", "Outer z.", "::::", "", "Aft"),
    lines("- :::{warning}", "  nner text.", "  :::", "", "  Item tail.", "", "- item b", "", "Out"),
    lines(":::{warning}", "nner text.", ":::", "", "Ite"),
    "nn",
  ],
];

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-283
test("the nesting grid: an admonition, a list item and an admonition, every start level by every end level", async () => {
  for (const [row, start] of STARTS.entries()) {
    for (const [column, end] of ENDS.entries()) {
      try {
        await assertCopy(SOURCE, start.spot, end.spot, SOURCE.slice(start.offset, end.offset), ON[row]![column]!);
      } catch (error) {
        throw new Error(`start level ${row}, end level ${column}: ${(error as Error).message}`);
      }
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-286
test("an unplaced edge snaps to its whole element, setting off or on", async () => {
  const source = ":::{note}\nPlain text here.\n:::\n\nAfter.\n";
  const page = pageOf(source, (await previewHtml(source)).replace("Plain text here.", "Quite another words."));
  assert.equal(copyRaw(page, at("Quite", 0), at("words.", "end")), "Plain text here.");
  assert.equal(copyRaw(page, at("Quite", 0), at("words.", "end"), { balanceEdges: true }), "Plain text here.");
  assert.equal(copyRaw(page, at("Quite", 0), at("After.", 3)), "Plain text here.\n:::\n\nAft");
  assert.equal(copyRaw(page, at("Quite", 0), at("After.", 3), { balanceEdges: true }), ":::{note}\nPlain text here.\n:::\n\nAft");
  assert.equal(copyRaw(await renderPage(source), at("Plain", 0), at("After.", 3), { balanceEdges: true }), ":::{note}\nPlain text here.\n:::\n\nAft");
});
