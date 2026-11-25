import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_SIDECAR_BYTES,
  MAX_THREADS,
  isValidAnchor,
  parseSidecar,
  sidecarNameFor,
} from "../../../src/core/comments/commentModel";

// Tests added by the mutation campaign of src/core (CR-450): they pin the survivors of the first run.

const comment = (overrides: Record<string, unknown> = {}) => ({
  id: "c1", author: "Ada", createdAt: "2026-10-21T10:00:00Z", body: "Why?", ...overrides,
});
const thread = (overrides: Record<string, unknown> = {}) => ({
  id: "t1",
  anchor: { line: 3, endLine: 3, quote: "hello", prefix: "say ", suffix: " world" },
  resolved: false,
  createdAt: "2026-10-21T10:00:00Z",
  comments: [comment()],
  ...overrides,
});
const file = (threads: unknown[] = [thread()], extra: Record<string, unknown> = {}) =>
  JSON.stringify({ version: 1, document: "notes.md", threads, ...extra });
const errorsOf = (text: string) => parseSidecar(text).errors;
const dateErrors = (createdAt: string) => errorsOf(file([thread({ createdAt })]));

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-001#S1
test("a sidecar name keeps the last path segment whole, and a leading dot is not an extension", () => {
  assert.equal(sidecarNameFor("a/b.d\\c"), "a/b.d\\c.comments.json", "the last of / and \\ ends the directory");
  assert.equal(sidecarNameFor("a\\b.d/c"), "a\\b.d/c.comments.json");
  assert.equal(sidecarNameFor("dir\\notes.md"), "dir\\notes.comments.json");
  assert.equal(sidecarNameFor(".hidden"), ".hidden.comments.json");
  assert.equal(sidecarNameFor("dir/.hidden"), "dir/.hidden.comments.json");
  assert.equal(sidecarNameFor("a.b.md"), "a.b.comments.json", "only the last extension goes");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-004#S2
test("a comment date is an ISO 8601 date-time with a zone, to the minute or finer, naming a real instant", () => {
  for (const good of [
    "2026-10-21T10:00Z",
    "2026-10-21T10:00:00Z",
    "2026-10-21T10:00:00.1Z",
    "2026-10-21T10:00:00.123456789Z",
    "2026-10-21T10:00:00+02:00",
    "2026-10-21T10:00-05:30",
    "2024-02-29T10:00:00Z",
    "2000-02-29T10:00:00Z",
    "2026-04-30T10:00:00Z",
    "2026-12-31T23:59Z",
  ]) assert.deepEqual(dateErrors(good), [], good);
  for (const bad of [
    "2026-10-21T10:00:00",
    "2026-10-21T10:00:00+0200",
    "2026-10-21T10:00:00+2:00",
    "2026-10-21T10:00:00+02:0",
    "2026-10-21T10:00:00 02:00",
    "2026-10-21T10:00:00.Z",
    "2026-10-21T10:00:00.1234567890Z",
    "x2026-10-21T10:00:00Z",
    "2026-10-21T10:00:00Zx",
    "2026-10-21T10Z",
    "2026-10-21 10:00:00Z",
    "26-10-21T10:00:00Z",
    "2026-13-01T10:00:00Z",
    "2026-02-30T10:00:00Z",
    "2026-02-29T10:00:00Z",
    "1900-02-29T10:00:00Z",
    "2026-04-31T10:00:00Z",
    "2026-00-10T10:00:00Z",
    "2026-10-00T10:00:00Z",
    "",
  ]) assert.ok(dateErrors(bad).length > 0, bad);
  assert.ok(errorsOf(file([thread({ createdAt: 20261021 })])).length > 0);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-004#S6
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-004#S7
test("a sidecar is refused over 2 MiB of text or of UTF-8, and accepted at exactly 2 MiB", () => {
  const base = file([]);
  const exact = base + " ".repeat(MAX_SIDECAR_BYTES - base.length);
  assert.equal(exact.length, MAX_SIDECAR_BYTES);
  assert.deepEqual(errorsOf(exact), [], "exactly at the cap");
  const over = parseSidecar(`${exact} `);
  assert.deepEqual(over.errors, [`the sidecar is larger than ${MAX_SIDECAR_BYTES} bytes`]);
  assert.equal(over.document, "");
  const wide = "é".repeat(MAX_SIDECAR_BYTES / 2);
  assert.equal(wide.length, MAX_SIDECAR_BYTES / 2);
  assert.deepEqual(errorsOf(wide), ["the sidecar is not valid JSON"], "2 MiB of UTF-8 in half the characters is still within the cap");
  assert.deepEqual(errorsOf(`${wide}é`), [`the sidecar is larger than ${MAX_SIDECAR_BYTES} bytes`], "one more two-byte character is over");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-004#S2
test("each way a sidecar can be refused gives its own error and no threads", () => {
  const refused = (text: unknown) => {
    const parsed = parseSidecar(text as string);
    assert.deepEqual(parsed.threads, []);
    assert.equal(parsed.document, "");
    return parsed.errors;
  };
  assert.deepEqual(refused(5), ["the sidecar is not text"]);
  assert.deepEqual(refused("{"), ["the sidecar is not valid JSON"]);
  assert.deepEqual(refused("[]"), ["the sidecar must be a JSON object"]);
  assert.deepEqual(refused("null"), ["the sidecar must be a JSON object"]);
  assert.deepEqual(refused(JSON.stringify({ version: 2, document: "d", threads: [] })), ["unsupported sidecar version (expected 1)"]);
  assert.deepEqual(refused(JSON.stringify({ version: 1, threads: [] })), ["the sidecar needs a document name"]);
  assert.deepEqual(refused(JSON.stringify({ version: 1, document: "d" })), ["the sidecar needs a threads array"]);
  const many = Array.from({ length: MAX_THREADS + 1 }, (_, index) => thread({ id: `t${index}` }));
  assert.deepEqual(refused(file(many)), [`the sidecar holds more than ${MAX_THREADS} threads`]);
  assert.deepEqual(errorsOf(file(many.slice(0, MAX_THREADS))), []);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-004#S1
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-004#S2
test("a broken thread names its place and what is wrong, and keeps the document name", () => {
  const parsed = parseSidecar(file([
    42,
    thread({ id: "" }),
    thread({ id: "t3", comments: [] }),
    thread({ id: "t4", anchor: 7 }),
    thread({ id: "t5", anchor: { line: 0, endLine: 1, quote: "", prefix: "", suffix: "" } }),
    thread({ id: "t6", anchor: { line: 4, endLine: 3, quote: "", prefix: "", suffix: "" } }),
    thread({ id: "t7", anchor: { line: 1, endLine: 1, quote: 5, prefix: "", suffix: "" } }),
    thread({ id: "t8", comments: [9] }),
    thread({ id: "t9", comments: [comment({ author: 3 })] }),
    thread({ id: "t1" }),
    thread({ id: "t1" }),
  ]));
  assert.deepEqual(parsed.threads, []);
  assert.equal(parsed.document, "notes.md");
  assert.deepEqual(parsed.errors, [
    "threads[0] must be an object",
    "threads[1] needs an id, a boolean resolved and an ISO createdAt",
    "threads[2].comments must hold 1 to 200 comments",
    "threads[3].anchor must be an object",
    "threads[4].anchor needs integer lines with 1 <= line <= endLine",
    "threads[5].anchor needs integer lines with 1 <= line <= endLine",
    "threads[6].anchor quote, prefix and suffix must be strings of at most 10000 characters",
    "threads[7].comments[0] must be an object",
    "threads[8].comments[0] needs an id, an author, a body and an ISO createdAt",
    "threads[10] repeats the id of an earlier thread",
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-004#S6
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-004#S7
test("a valid sidecar returns its document name and every thread", () => {
  const parsed = parseSidecar(file([thread({ id: "a" }), thread({ id: "b", resolved: true })]));
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.document, "notes.md");
  assert.deepEqual(parsed.threads.map((entry) => [entry.id, entry.resolved]), [["a", false], ["b", true]]);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-004#S6
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-004#S7
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-001#S2
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-001#S3
test("an anchor sent by the page holds at most 500 characters of quote and 32 of prefix and suffix", () => {
  const anchor = (extra: Record<string, unknown>) => ({ line: 2, endLine: 2, quote: "q", prefix: "p", suffix: "s", ...extra });
  assert.equal(isValidAnchor(anchor({})), true, "one line is a valid range");
  assert.equal(isValidAnchor(anchor({ endLine: 5 })), true);
  assert.equal(isValidAnchor(anchor({ endLine: 1 })), false);
  assert.equal(isValidAnchor(anchor({ line: 0, endLine: 1 })), false);
  assert.equal(isValidAnchor(anchor({ quote: "q".repeat(500) })), true);
  assert.equal(isValidAnchor(anchor({ quote: "q".repeat(501) })), false);
  assert.equal(isValidAnchor(anchor({ prefix: "p".repeat(32) })), true);
  assert.equal(isValidAnchor(anchor({ prefix: "p".repeat(33) })), false);
  assert.equal(isValidAnchor(anchor({ suffix: "s".repeat(32) })), true);
  assert.equal(isValidAnchor(anchor({ suffix: "s".repeat(33) })), false);
  assert.equal(isValidAnchor(anchor({ quote: 1 })), false);
  assert.equal(isValidAnchor(anchor({ prefix: undefined })), false);
  assert.equal(isValidAnchor(anchor({ suffix: null })), false);
  assert.equal(isValidAnchor(null), false);
  assert.equal(isValidAnchor([]), false);
});
