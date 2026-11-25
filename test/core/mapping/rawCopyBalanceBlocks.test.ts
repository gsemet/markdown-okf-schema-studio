import * as assert from "node:assert/strict";
import { test } from "node:test";

import { balanceRawCut, type ResolvedRawEdge } from "../../../src/core/mapping/rawCopyEdges";
import { copyAll, renderPage } from "./rawCopyFrames";
import { assertCopy, at } from "./rawCopyBalanceSupport";

const CODE_IN_ITEM = ["- item", "", "  ```", "  foo()", "  bar()", "  ```", "", "After.", ""].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-281#S2
test("a code block: both edges inside give the code alone, with the container indentation removed", async () => {
  const top = ["Intro.", "", "```", "alpha()", "beta()", "```", "", "After.", ""].join("\n");
  await assertCopy(top, at("alpha()", 2), at("beta()", 5), "pha()\nbeta(", "pha()\nbeta(");
  await assertCopy(CODE_IN_ITEM, at("foo()", 1), at("bar()", "end"), "oo()\n  bar()", "oo()\nbar()");
  const quoted = ["> ```", "> foo()", "> bar()", "> ```", "", "After.", ""].join("\n");
  await assertCopy(quoted, at("foo()", 1), at("bar()", 3), "oo()\n> bar", "oo()\nbar");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-281#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-281#S4
test("a code block crossed at the start or at the end gets its fence lines", async () => {
  const top = ["Intro.", "", "```", "alpha()", "beta()", "```", "", "After.", ""].join("\n");
  await assertCopy(top, at("alpha()", 2), at("After.", 3), "pha()\nbeta()\n```\n\nAft", "```\npha()\nbeta()\n```\n\nAft");
  await assertCopy(top, at("Intro.", 1), at("beta()", 3), "ntro.\n\n```\nalpha()\nbet", "ntro.\n\n```\nalpha()\nbet\n```");
  await assertCopy(
    CODE_IN_ITEM,
    at("foo()", 1),
    at("After.", 3),
    "oo()\n  bar()\n  ```\n\nAft",
    "- ```\n  oo()\n  bar()\n  ```\n\nAft",
  );
  await assertCopy(
    CODE_IN_ITEM,
    at("item", 1),
    at("foo()", 3),
    "tem\n\n  ```\n  foo",
    "tem\n\n```\nfoo\n```",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-281#S2
test("an indented code block crossed gets its four columns back on the first line", async () => {
  const source = ["Para.", "", "    code one", "    code two", "", "After.", ""].join("\n");
  await assertCopy(source, at("code one", 5), at("After.", 3), "one\n    code two\n\nAft", "    one\n    code two\n\nAft");
});

const TABLE = [
  "Intro.", "", "| alpha | beta |", "|---|---|", "| gamma | **delta** |", "| epsilon | zeta |", "", "After.", "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-282#S2
test("a table: one cell inside only, otherwise the touched rows whole with the header and delimiter rows", async () => {
  await assertCopy(TABLE, at("alpha", 1), at("alpha", 4), "lph", "lph");
  await assertCopy(
    TABLE,
    at("gamma", 1),
    at("delta", 2),
    "amma | **de",
    "| alpha | beta |\n|---|---|\n| gamma | **delta** |",
  );
  await assertCopy(
    TABLE,
    at("beta", 1),
    at("epsilon", 2),
    "eta |\n|---|---|\n| gamma | **delta** |\n| ep",
    "| alpha | beta |\n|---|---|\n| gamma | **delta** |\n| epsilon | zeta |",
  );
  await assertCopy(
    TABLE,
    at("Intro.", 1),
    at("gamma", 2),
    "ntro.\n\n| alpha | beta |\n|---|---|\n| ga",
    "ntro.\n\n| alpha | beta |\n|---|---|\n| gamma | **delta** |",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-282#S2
test("a bold word inside one cell crossed copies the bold only", async () => {
  await assertCopy(TABLE, at("delta", 2), at("delta", 5), "lta", "lta");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-282#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-282#S4
test("a table in an admonition: crossed gets the opening lines, inside only does not", async () => {
  const source = [":::{note}", "", "| alpha | beta |", "|---|---|", "| gamma | delta |", "", ":::", "", "After.", ""].join("\n");
  await assertCopy(
    source,
    at("gamma", 1),
    at("After.", 3),
    "amma | delta |\n\n:::\n\nAft",
    ":::{note}\n| alpha | beta |\n|---|---|\n| gamma | delta |\n\n:::\n\nAft",
  );
  await assertCopy(
    source,
    at("gamma", 1),
    at("delta", 2),
    "amma | de",
    "| alpha | beta |\n|---|---|\n| gamma | delta |",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-284#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-284#S4
test("an ATX heading start crossed gets its marker; an end in it adds nothing", async () => {
  const source = ["Intro.", "", "## Hello world", "", "Next para.", ""].join("\n");
  await assertCopy(source, at("Hello world", 2), at("Hello world", 5), "llo", "llo");
  await assertCopy(source, at("Hello world", 2), at("Next para.", 3), "llo world\n\nNex", "## llo world\n\nNex");
  await assertCopy(source, at("Intro.", 1), at("Hello world", 5), "ntro.\n\n## Hello", "ntro.\n\n## Hello");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-284#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-284#S4
test("a setext heading end crossed gets its underline; a start in it adds nothing", async () => {
  const source = ["Intro.", "", "Title text", "==========", "", "Next para.", ""].join("\n");
  await assertCopy(source, at("Intro.", 1), at("Title text", 5), "ntro.\n\nTitle", "ntro.\n\nTitle\n==========");
  await assertCopy(source, at("Title text", 2), at("Next para.", 3), "tle text\n==========\n\nNex", "tle text\n==========\n\nNex");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-285#S3
test("a definition crossed at the start gets its term line and marker", async () => {
  const source = ["Intro.", "", "Term one", ": definition words here", "", "Term two", ": other def", "", "After.", ""].join("\n");
  await assertCopy(source, at("definition words here", 11), at("definition words here", 16), "words", "words");
  await assertCopy(
    source,
    at("definition words here", 11),
    at("After.", 3),
    "words here\n\nTerm two\n: other def\n\nAft",
    "Term one\n: words here\n\nTerm two\n: other def\n\nAft",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-285#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-285#S4
test("a raw HTML block crossed gets its opening tag line or its closing tag", async () => {
  const source = ["Intro.", "", "<div class=\"box\">", "hello world", "more words", "</div>", "", "After.", ""].join("\n");
  await assertCopy(source, at("hello world", 2), at("more words", 4), "llo world\nmore", "llo world\nmore");
  await assertCopy(
    source,
    at("hello world", 6),
    at("After.", 3),
    "world\nmore words\n</div>\n\nAft",
    "<div class=\"box\">\nworld\nmore words\n</div>\n\nAft",
  );
  await assertCopy(
    source,
    at("Intro.", 1),
    at("more words", 4),
    "ntro.\n\n<div class=\"box\">\nhello world\nmore",
    "ntro.\n\n<div class=\"box\">\nhello world\nmore\n</div>",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-285#S3
test("a footnote definition crossed at the start gets its label", () => {
  // The page shows a footnote at the end of the page, without a source line of its own, so the edges are given placed.
  const source = ["Text[^1] here.", "", "[^1]: Footnote body words.", "", "After.", ""].join("\n");
  const placed = (offset: number): ResolvedRawEdge => ({ kind: "placed", offset, frames: [] });
  const cut = (from: number, to: number, balanceEdges: boolean): string | undefined =>
    balanceRawCut({ source, lineBreak: "\n", balanceEdges, start: placed(from), end: placed(to) });
  const body = source.indexOf("body");
  const after = source.indexOf("After.") + 3;
  assert.equal(cut(body, body + 4, false), "body");
  assert.equal(cut(body, body + 4, true), "body");
  assert.equal(cut(body, after, false), "body words.\n\nAft");
  assert.equal(cut(body, after, true), "[^1]: body words.\n\nAft");
});

const TABS = [
  "::::{tab-set}", ":::{tab-item} One", "First tab.", ":::", ":::{tab-item} Two", "Second tab para.", "", "- list alpha", "- list bravo", ":::", "::::", "", "After.", "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S4
test("a tab set: the tab set and tab item openings when crossed, nothing when inside only", async () => {
  await assertCopy(TABS, at("Second tab para.", 3), at("Second tab para.", 10), "ond tab", "ond tab");
  await assertCopy(
    TABS,
    at("Second tab para.", 3),
    at("After.", 3),
    "ond tab para.\n\n- list alpha\n- list bravo\n:::\n::::\n\nAft",
    "::::{tab-set}\n:::{tab-item} Two\nond tab para.\n\n- list alpha\n- list bravo\n:::\n::::\n\nAft",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S3
test("a list inside a tab item crossed at the start gets the openings and the marker", async () => {
  await assertCopy(
    TABS,
    at("list bravo", 5),
    at("After.", 3),
    "bravo\n:::\n::::\n\nAft",
    "::::{tab-set}\n:::{tab-item} Two\n- bravo\n:::\n::::\n\nAft",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S1
test("a CR LF document keeps CR LF in the cut and in every added line", async () => {
  const source = TWO_NOTES.replace(/\n/gu, "\r\n");
  await assertCopy(
    source,
    at("Second line.", 3),
    at("After text.", 5),
    "ond line.\r\n:::\r\n\r\nAfter",
    ":::{note}\r\nond line.\r\n:::\r\n\r\nAfter",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S2
test("the whole document with the setting on is the source exactly", async () => {
  for (const source of [TWO_NOTES, TABLE, TABS, CODE_IN_ITEM]) {
    const page = await renderPage(source);
    assert.equal(copyAll(page, { balanceEdges: true }), source);
    assert.equal(copyAll(page), source);
  }
});

const TWO_NOTES = [
  "Intro text.", "", ":::{note}", "First one.", "", "Second line.", ":::", "", "After text.", "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S2
test("clean edges: a selection between top-level blocks gives the verbatim slice", async () => {
  const source = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.\n";
  await assertCopy(source, at("First paragraph.", 1), at("Second paragraph.", "end"), "irst paragraph.\n\nSecond paragraph.", "irst paragraph.\n\nSecond paragraph.");
});
