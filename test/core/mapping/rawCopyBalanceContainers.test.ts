import { test } from "node:test";

import { assertCopy, at } from "./rawCopyBalanceSupport";

const TWO = [
  "Intro text.", "", ":::{note}", "First one.", "", "Second line.", ":::", "", ":::{warning}", "Other one.", ":::", "", "After text.", "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S2
test("both edges in one admonition body: inside only, no fence line", async () => {
  await assertCopy(TWO, at("First one.", 6), at("Second line.", "end"), "one.\n\nSecond line.", "one.\n\nSecond line.");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S4
test("a start in admonition A and an end after it gets A's opening line", async () => {
  await assertCopy(
    TWO,
    at("Second line.", 3),
    at("After text.", 5),
    "ond line.\n:::\n\n:::{warning}\nOther one.\n:::\n\nAfter",
    ":::{note}\nond line.\n:::\n\n:::{warning}\nOther one.\n:::\n\nAfter",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S4
test("a start before admonition A and an end in it gets A's closing line", async () => {
  await assertCopy(
    TWO,
    at("Intro text.", 1),
    at("Second line.", 3),
    "ntro text.\n\n:::{note}\nFirst one.\n\nSec",
    "ntro text.\n\n:::{note}\nFirst one.\n\nSec\n:::",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S4
test("a start in A and an end in the next admonition B gets A's opening and B's closing", async () => {
  await assertCopy(
    TWO,
    at("Second line.", 3),
    at("Other one.", 3),
    "ond line.\n:::\n\n:::{warning}\nOth",
    ":::{note}\nond line.\n:::\n\n:::{warning}\nOth\n:::",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S3
test("a blockquote copied inside only loses its prefix, crossed at the start it keeps it on the first line", async () => {
  const source = "> quoted one\n> quoted two\n\nafter\n";
  await assertCopy(source, at("quoted one", 7), at("quoted two", 9), "one\n> quoted tw", "one\nquoted tw");
  await assertCopy(source, at("quoted two", 7), at("after", 3), "two\n\naft", "> two\n\naft");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S3
test("an alert copied inside only loses its prefix, crossed at the start it gets its type line", async () => {
  const source = "> [!NOTE]\n> alert one\n> alert two\n\nafter\n";
  await assertCopy(source, at("alert one", 6), at("alert two", 8), "one\n> alert tw", "one\nalert tw");
  await assertCopy(source, at("alert two", 6), at("after", 3), "two\n\naft", "> [!NOTE]\n> two\n\naft");
});

const NESTED = [
  "Before.", "", "::::{note}", "Outer start.", "", ":::{warning}", "Inner text.", ":::", "", "Outer end.", "::::", "", "After.", "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S2
test("an admonition in an admonition: inner only, inner opening, both openings, both closings", async () => {
  await assertCopy(NESTED, at("Inner text.", 2), at("Inner text.", 7), "ner t", "ner t");
  await assertCopy(
    NESTED,
    at("Inner text.", 2),
    at("Outer end.", 3),
    "ner text.\n:::\n\nOut",
    ":::{warning}\nner text.\n:::\n\nOut",
  );
  await assertCopy(
    NESTED,
    at("Inner text.", 2),
    at("After.", 3),
    "ner text.\n:::\n\nOuter end.\n::::\n\nAft",
    "::::{note}\n:::{warning}\nner text.\n:::\n\nOuter end.\n::::\n\nAft",
  );
  await assertCopy(
    NESTED,
    at("Before.", 1),
    at("Inner text.", 3),
    "efore.\n\n::::{note}\nOuter start.\n\n:::{warning}\nInn",
    "efore.\n\n::::{note}\nOuter start.\n\n:::{warning}\nInn\n:::\n::::",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S2
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S4
test("an unclosed colon fence with the end inside it adds nothing", async () => {
  const source = ":::{note}\nOpen one.\n\nOpen two.\n";
  await assertCopy(source, at("Open one.", 2), at("Open two.", 4), "en one.\n\nOpen", "en one.\n\nOpen");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-279#S2
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S4
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-284#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-284#S4
test("the base seam cases with the setting on", async () => {
  await assertCopy("Hello **world** again\n", at("world", 1), at(" again", "end"), "orld** again", "**orld** again");
  await assertCopy("## Hello\n", at("Hello", 2), at("Hello", "end"), "llo", "## llo");
  await assertCopy("## Hello\n\nNext.\n", at("Hello", 2), at("Next.", 3), "llo\n\nNex", "## llo\n\nNex");
  const source = ":::{note}\nFirst one.\n:::\n\n:::{warning}\nSecond one.\n:::\n";
  await assertCopy(
    source,
    at("First one.", 3),
    at("Second one.", 5),
    "st one.\n:::\n\n:::{warning}\nSecon",
    ":::{note}\nst one.\n:::\n\n:::{warning}\nSecon\n:::",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-280#S4
test("an edge in an admonition's title: the end case gets the closing line", async () => {
  const source = ":::{note} Heads up\nInside the note.\n:::\n";
  await assertCopy(source, at("Heads up", 2), at("Inside the note.", "end"), ":::{note} Heads up\nInside the note.", ":::{note} Heads up\nInside the note.\n:::");
  await assertCopy(source, at("Heads up", 0), at("Heads up", "end"), ":::{note} Heads up", ":::{note} Heads up\n:::");
});
