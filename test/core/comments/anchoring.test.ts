import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  createDocumentIndex,
  reanchor,
  reanchorThreads,
  shiftThreadLines,
  toLineChanges,
} from "../../../src/core/comments/anchoring";
import type { CommentThread } from "../../../src/core/comments/commentModel";

const thread = (
  id: string,
  anchor: Partial<CommentThread["anchor"]> & { line: number },
): CommentThread => ({
  id,
  anchor: { endLine: anchor.line, quote: "", prefix: "", suffix: "", ...anchor },
  resolved: false,
  createdAt: "2026-10-21T10:00:00Z",
  comments: [{ id: `c_${id}`, author: "Ada", createdAt: "2026-10-21T10:00:00Z", body: "Why?" }],
});

const filler = (count: number, label = "filler"): string[] =>
  Array.from({ length: count }, (_, index) => `${label} line number ${index} with words`);

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-094
test("T45: shiftThreadLines follows lines inserted and removed above", () => {
  const threads = [thread("a", { line: 10, endLine: 12, quote: "x" }), thread("b", { line: 3 })];
  const inserted = shiftThreadLines(threads, [{ startLine: 5, endLine: 5, insertedLineCount: 2 }]);
  assert.deepEqual(inserted.map((item) => [item.anchor.line, item.anchor.endLine]), [[12, 14], [3, 3]]);
  const removed = shiftThreadLines(threads, [{ startLine: 4, endLine: 6, insertedLineCount: 0 }]);
  assert.deepEqual(removed.map((item) => [item.anchor.line, item.anchor.endLine]), [[8, 10], [3, 3]]);
  assert.equal(removed[1], threads[1], "an unchanged thread keeps its identity");
  assert.equal(shiftThreadLines(threads, []), threads);
});

test("T45: shiftThreadLines applies several changes of one event (multi-cursor, undo order)", () => {
  const threads = [thread("a", { line: 20 })];
  const changes = toLineChanges([
    { range: { start: { line: 1 }, end: { line: 1 } }, text: "a\nb\n" },
    { range: { start: { line: 9 }, end: { line: 9 } }, text: "c\r\nd\r\n" },
    { range: { start: { line: 14 }, end: { line: 16 } }, text: "" },
  ]);
  // +2 (line 2), +2 (line 10), -2 (lines 15-17): 20 -> 22
  assert.equal(shiftThreadLines(threads, changes)[0].anchor.line, 22);
  assert.equal(shiftThreadLines(threads, [...changes].reverse())[0].anchor.line, 22);
  // The reverse edit (undo) brings it back.
  const undo = toLineChanges([{ range: { start: { line: 1 }, end: { line: 3 } }, text: "" }]);
  assert.equal(shiftThreadLines(shiftThreadLines(threads, toLineChanges([
    { range: { start: { line: 1 }, end: { line: 1 } }, text: "a\nb\n" },
  ])), undo)[0].anchor.line, 20);
});

test("T45: shiftThreadLines keeps endLine at or after line", () => {
  const shifted = shiftThreadLines([thread("a", { line: 5, endLine: 8 })],
    [{ startLine: 6, endLine: 12, insertedLineCount: 0 }]);
  assert.ok(shifted[0].anchor.endLine >= shifted[0].anchor.line);
});

test("T45: a quote still inside its lines stays anchored", () => {
  const text = ["# Title", "", "The quick brown fox jumps.", "", "tail"].join("\n");
  const result = reanchor(text, thread("a", { line: 3, quote: "quick brown fox" }));
  assert.deepEqual(result, { state: "anchored", line: 3, endLine: 3 });
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-100
test("T45: lines inserted above move the thread to the new line", () => {
  const body = ["# Title", "", ...filler(5), "", "The quick brown fox jumps.", ""].join("\n");
  const result = reanchor(body, thread("a", { line: 3, quote: "quick brown fox" }));
  assert.deepEqual(result, { state: "moved", line: 9, endLine: 9 });
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-101
test("T45: a deleted quote orphans the thread and keeps its old line", () => {
  const text = ["# Title", "", "Something else entirely.", "", "More unrelated words."].join("\n");
  const result = reanchor(text, thread("a", { line: 3, endLine: 3, quote: "quick brown fox" }));
  assert.deepEqual(result, { state: "orphaned", line: 3, endLine: 3 });
});

test("T45: a long unique quote that moved far away is found", () => {
  const text = [...filler(300), "The quick brown fox jumps over.", ...filler(10)].join("\n");
  const result = reanchor(text, thread("a", { line: 4, quote: "quick brown fox jumps" }));
  assert.equal(result.state, "moved");
  assert.equal(result.line, 301);
});

test("T45: a short quote is only found inside the +-50 line window", () => {
  const near = [...filler(20), "see the Fox here", ...filler(5)].join("\n");
  assert.equal(reanchor(near, thread("a", { line: 3, quote: "Fox" })).state, "moved");
  const far = [...filler(200), "see the Fox here", ...filler(5)].join("\n");
  assert.deepEqual(reanchor(far, thread("a", { line: 3, quote: "Fox" })), { state: "orphaned", line: 3, endLine: 3 });
});

test("T45: duplicate quotes are decided by prefix and suffix", () => {
  const text = [...filler(10), "Please fix the login flow soon.", ...filler(10),
    "Do not fix the login flow today.", ...filler(5)].join("\n");
  const second = reanchor(text, thread("a", { line: 2, quote: "fix the login flow", prefix: "Do not ", suffix: " today." }));
  assert.equal(second.state, "moved");
  assert.equal(second.line, 22);
  const first = reanchor(text, thread("b", { line: 30, quote: "fix the login flow", prefix: "Please ", suffix: " soon." }));
  assert.equal(first.state, "moved");
  assert.equal(first.line, 11);
});

test("T45: duplicate quotes without usable context use proximity only inside the window", () => {
  const text = [...filler(10), "Please fix the login flow soon.", ...filler(200),
    "Do not fix the login flow today.", ...filler(5)].join("\n");
  // Old line 205: the second occurrence (line 212) is the only one inside the window.
  const close = reanchor(text, thread("a", { line: 205, quote: "fix the login flow" }));
  assert.equal(close.state, "moved");
  assert.equal(close.line, 212);
  // Old line 110: both occurrences are outside the window.
  assert.equal(reanchor(text, thread("b", { line: 110, quote: "fix the login flow" })).state, "orphaned");
  // Two candidates inside the window at the same distance: no guess.
  const equal = [...filler(10), "fix the login flow here", ...filler(19), "fix the login flow there", ...filler(5)].join("\n");
  assert.equal(reanchor(equal, thread("c", { line: 21, quote: "fix the login flow" })).state, "orphaned");
});

test("T45: markdown markup does not hide the quote", () => {
  const text = ["", "- see **the quick** brown [fox](https://example.com) now", ""].join("\n");
  const result = reanchor(text, thread("a", { line: 9, quote: "the quick brown fox now" }));
  assert.deepEqual(result, { state: "moved", line: 2, endLine: 2 });
});

test("T45: a quote that spans lines is found, and CRLF documents work", () => {
  const text = ["# T", "", "The quick brown", "fox jumps over", "the lazy dog.", ""].join("\r\n");
  const result = reanchor(text, thread("a", { line: 9, quote: "brown fox jumps over the lazy" }));
  assert.deepEqual(result, { state: "moved", line: 3, endLine: 5 });
  assert.equal(reanchor(text, thread("a", { line: 3, endLine: 5, quote: "brown fox jumps" })).state, "anchored");
});

test("T45: text inside code fences and front matter is never a match", () => {
  const text = ["---", "title: the quick brown fox", "---", "", "```", "the quick brown fox", "```", "", "other"].join("\n");
  assert.equal(reanchor(text, thread("a", { line: 9, quote: "the quick brown fox" })).state, "orphaned");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-107
test("T45: a small edit of the quote is followed by the fuzzy search", () => {
  const quote = "the scheduler retries the failed upload twice";
  const text = [...filler(30), "the scheduler retries the failed uploads twice", ...filler(5)].join("\n");
  const result = reanchor(text, thread("a", { line: 28, quote }));
  assert.equal(result.state, "moved");
  assert.equal(result.line, 31);
});

test("T45: a quote that changed by more than 20 percent is orphaned, not guessed", () => {
  const quote = "the scheduler retries the failed upload twice";
  const text = [...filler(30), "the scheduler stops after the first problem", ...filler(5)].join("\n");
  assert.deepEqual(reanchor(text, thread("a", { line: 31, quote })), { state: "orphaned", line: 31, endLine: 31 });
});

test("T45: two fuzzy matches far apart are ambiguous and orphan the thread", () => {
  const text = [...filler(10), "the scheduler retries the failed uploads twice", ...filler(200),
    "the scheduler retries the failed uploaded twice", ...filler(5)].join("\n");
  const quote = "the scheduler retries the failed upload twice";
  assert.equal(reanchor(text, thread("a", { line: 100, quote })).state, "orphaned");
});

test("T45: fuzzy search needs a candidate containing the rarest word", () => {
  // Every word of the quote is gone from the document, so there is no candidate at all.
  const text = [...filler(20), "completely different sentence about nothing relevant"].join("\n");
  assert.equal(reanchor(text, thread("a", { line: 5, quote: "zebra giraffe elephant antelope rhino" })).state, "orphaned");
});

test("T45: a thread without quote stays where it is while the line exists", () => {
  const text = filler(5).join("\n");
  assert.equal(reanchor(text, thread("a", { line: 3 })).state, "anchored");
  assert.equal(reanchor(text, thread("a", { line: 30 })).state, "orphaned");
});

test("T45: reanchorThreads updates moved threads, keeps orphans untouched and loses nothing", () => {
  const text = [...filler(10), "The quick brown fox jumps.", "", "Second remark lives here."].join("\n");
  const threads = [
    thread("moved", { line: 2, quote: "quick brown fox" }),
    thread("orphan", { line: 4, endLine: 6, quote: "this text is gone for good" }),
    thread("same", { line: 13, quote: "Second remark lives" }),
  ];
  const outcome = reanchorThreads(text, threads);
  assert.equal(outcome.changed, true);
  assert.equal(outcome.threads.length, 3);
  const byId = new Map(outcome.threads.map((item) => [item.id, item]));
  assert.equal(byId.get("moved")!.anchor.line, 11);
  assert.deepEqual([byId.get("orphan")!.anchor.line, byId.get("orphan")!.anchor.endLine], [4, 6]);
  assert.equal(byId.get("same"), threads[2]);
  assert.deepEqual([...outcome.orphaned], ["orphan"]);
  assert.deepEqual(byId.get("orphan")!.comments, threads[1].comments);
  assert.equal(reanchorThreads(text, [threads[2]]).changed, false);
});

test("T45: the cost stays bounded for a large document and many fuzzy threads", () => {
  const lines = filler(20000);
  const text = lines.join("\n");
  const threads = Array.from({ length: 200 }, (_, index) =>
    thread(`t${index}`, { line: 10, quote: `${lines[index * 90]}x ${"filler ".repeat(40)}${index}` }));
  const start = Date.now();
  const outcome = reanchorThreads(text, threads);
  assert.equal(outcome.threads.length, 200);
  assert.ok(Date.now() - start < 5000, "bounded fuzzy cost");
  assert.ok(createDocumentIndex(text) !== undefined);
});

// ---- T45 r2 ----

test("T45r2: text that renders differently from its source stays anchored at the original line", () => {
  const cases: Array<[string, string]> = [
    ["As shown in {cite}`smith2020` the result holds.", "As shown in Smith, 2020 the result holds."],
    ["See {ref}`install-label` now.", "Installation"],
    ["Tom &amp; Jerry went home.", "Tom & Jerry went home."],
    ["A claim[^1] here.", "A claim1 here."],
    ["Text <!-- TODO fix --> after.", "Text after."],
    ["Press {kbd}`Ctrl` to continue.", "Press Ctrl to continue."],
    ["Read the *docs* and [the guide](https://example.com/x) first.", "Read the docs and the guide first."],
    ["Use `code` &lt;here&gt; please.", "Use code <here> please."],
  ];
  for (const [source, quote] of cases) {
    const text = ["# T", "", source, "", "tail"].join("\n");
    const result = reanchor(text, thread("a", { line: 3, quote }));
    assert.deepEqual(result, { state: "anchored", line: 3, endLine: 3 }, `${source} / ${quote}`);
  }
});

test("T45r2: a quote that resembles the old lines (60 % of its words, in order) is not orphaned", () => {
  const text = ["# T", "", "The scheduler stops after a first problem happens.", ""].join("\n");
  const kept = reanchor(text, thread("a", { line: 3, quote: "The scheduler stops after the first problem" }));
  assert.equal(kept.state, "anchored");
  const gone = reanchor(text, thread("b", { line: 3, quote: "Completely different words about nothing" }));
  assert.equal(gone.state, "orphaned");
});

test("T45r2: a short quote never re-attaches when the surroundings disagree", () => {
  const text = [...filler(2), "unrelated words here", ...filler(3), "## Overview", ...filler(2)].join("\n");
  const result = reanchor(text, thread("a", { line: 3, quote: "Overview", prefix: "Intro: ", suffix: "of the product" }));
  assert.deepEqual(result, { state: "orphaned", line: 3, endLine: 3 });
});

test("T45r2: several copies and no context match is no move", () => {
  const text = [...filler(10), "Please fix the login flow soon.", ...filler(5), "Do not fix the login flow today.", ...filler(3)].join("\n");
  const result = reanchor(text, thread("a", { line: 18, quote: "fix the login flow", prefix: "Warning: ", suffix: "Never." }));
  assert.equal(result.state, "orphaned");
});

test("T45r2: a copy in the old lines that does not fit the context yields to the copy that does", () => {
  // Copy A moved onto the old lines of copy B (lines inserted above A by an external change).
  const text = [...filler(20), "Intro: fix the login flow here.", ...filler(3), "Between fix the login flow today.", ...filler(2)].join("\n");
  const result = reanchor(text, thread("a", { line: 21, quote: "fix the login flow", prefix: "Between ", suffix: " today." }));
  assert.equal(result.state, "moved");
  assert.equal(result.line, 25);
  // Without a second copy the old lines keep the thread even if the context changed.
  const single = [...filler(20), "Intro: fix the login flow here.", ...filler(2)].join("\n");
  assert.equal(reanchor(single, thread("b", { line: 21, quote: "fix the login flow", prefix: "Between ", suffix: " today." })).state, "anchored");
});

test("T45r2: the old lines are checked before the candidate cap", () => {
  const many = Array.from({ length: 300 }, () => "x item x").join("\n");
  const text = `${many}\nlast item here`;
  const result = reanchor(text, thread("a", { line: 301, quote: "item" }));
  assert.deepEqual(result, { state: "anchored", line: 301, endLine: 301 });
});

test("T45r2: fuzzy matches must agree on numbers and negations", () => {
  const withText = (sentence: string) => [...filler(30), sentence, ...filler(5)].join("\n");
  const negated = reanchor(withText("You should not enable the cache for every request now."),
    thread("a", { line: 3, quote: "You should enable the cache for every request now." }));
  assert.equal(negated.state, "orphaned");
  const number = reanchor(withText("The timeout is set to 30 seconds by default for each call."),
    thread("b", { line: 3, quote: "The timeout is set to 300 seconds by default for each call." }));
  assert.equal(number.state, "orphaned");
  const typo = reanchor(withText("The timeout is set to 300 seconds by defaults for each call."),
    thread("c", { line: 3, quote: "The timeout is set to 300 seconds by default for each call." }));
  assert.equal(typo.state, "moved");
});
