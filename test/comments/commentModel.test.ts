import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_COMMENTS_PER_THREAD,
  MAX_SIDECAR_BYTES,
  MAX_STRING_LENGTH,
  MAX_THREADS,
  parseSidecar,
  serializeSidecar,
  sidecarNameFor,
} from "../../src/comments/commentModel";

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

test("T42: sidecarNameFor puts .comments.json next to the document", () => {
  assert.equal(sidecarNameFor("notes.md"), "notes.comments.json");
  assert.equal(sidecarNameFor("/a/b/notes.md"), "/a/b/notes.comments.json");
  assert.equal(sidecarNameFor("notes"), "notes.comments.json");
  assert.equal(sidecarNameFor("a.b.md"), "a.b.comments.json");
});

test("T42: a valid file parses into threads", () => {
  const parsed = parseSidecar(file());
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.document, "notes.md");
  assert.equal(parsed.threads.length, 1);
  assert.equal(parsed.threads[0].anchor.quote, "hello");
  assert.equal(parsed.threads[0].comments[0].author, "Ada");
});

test("T42: malformed JSON and wrong shapes give errors and no threads", () => {
  for (const text of ["", "{", "[]", "null", "42", JSON.stringify({ version: 2, document: "a", threads: [] }),
    JSON.stringify({ version: 1, threads: [] }), JSON.stringify({ version: 1, document: "a" })]) {
    const parsed = parseSidecar(text);
    assert.ok(parsed.errors.length > 0, text);
    assert.deepEqual(parsed.threads, [], text);
  }
});

test("T42: one invalid thread rejects the whole file", () => {
  const bad = [
    thread({ id: "" }), thread({ resolved: "no" }), thread({ createdAt: "yesterday" }),
    thread({ comments: [] }), thread({ comments: [comment({ createdAt: "2026-13-45T99:00:00Z" })] }),
    thread({ comments: [comment({ body: 7 })] }),
    thread({ anchor: { line: 0, endLine: 1, quote: "", prefix: "", suffix: "" } }),
    thread({ anchor: { line: 5, endLine: 4, quote: "", prefix: "", suffix: "" } }),
    thread({ anchor: { line: 1.5, endLine: 2, quote: "", prefix: "", suffix: "" } }),
    thread({ anchor: { line: 1, endLine: 1, quote: 3, prefix: "", suffix: "" } }),
    thread({ anchor: "x" }),
  ];
  for (const candidate of bad) {
    const parsed = parseSidecar(file([thread({ id: "ok" }), candidate]));
    assert.ok(parsed.errors.length > 0, JSON.stringify(candidate));
    assert.deepEqual(parsed.threads, []);
  }
  assert.ok(parseSidecar(file([thread(), thread()])).errors.length > 0, "duplicate thread ids");
});

test("T42: limits on size, threads, comments and string length", () => {
  const many = Array.from({ length: MAX_THREADS + 1 }, (_, index) => thread({ id: `t${index}` }));
  assert.ok(parseSidecar(file(many)).errors.length > 0);
  assert.deepEqual(parseSidecar(file(many.slice(0, MAX_THREADS))).errors, []);
  const comments = Array.from({ length: MAX_COMMENTS_PER_THREAD + 1 }, (_, index) => comment({ id: `c${index}` }));
  assert.ok(parseSidecar(file([thread({ comments })])).errors.length > 0);
  assert.deepEqual(parseSidecar(file([thread({ comments: comments.slice(0, MAX_COMMENTS_PER_THREAD) })])).errors, []);
  assert.ok(parseSidecar(file([thread({ comments: [comment({ body: "x".repeat(MAX_STRING_LENGTH + 1) })] })])).errors.length > 0);
  assert.deepEqual(parseSidecar(file([thread({ comments: [comment({ body: "x".repeat(MAX_STRING_LENGTH) })] })])).errors, []);
  assert.ok(parseSidecar(file([], { padding: "x".repeat(MAX_SIDECAR_BYTES) })).errors.length > 0);
});

test("T42: hostile strings stay plain data and unknown fields are dropped", () => {
  const hostile = "<img src=x onerror=alert(1)>\u0000 ${process.exit()} `x`";
  const raw = JSON.parse(file([thread({
    comments: [comment({ body: hostile, author: "<b>x</b>", extra: "dropped" })],
    anchor: { line: 1, endLine: 1, quote: hostile, prefix: "", suffix: "", extra: 1 },
  })]));
  raw.__proto__ = { polluted: true };
  const parsed = parseSidecar(`{"__proto__":{"polluted":true},"constructor":{"x":1},${JSON.stringify(raw).slice(1)}`);
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.threads[0].comments[0].body, hostile);
  assert.equal(parsed.threads[0].comments[0].author, "<b>x</b>");
  assert.equal("extra" in parsed.threads[0].comments[0], false);
  assert.equal("extra" in parsed.threads[0].anchor, false);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test("T42: serialization is stable: fixed key order, 2 spaces, trailing newline", () => {
  const parsed = parseSidecar(file());
  const text = serializeSidecar({ document: parsed.document, threads: parsed.threads });
  assert.ok(text.endsWith("}\n"));
  assert.ok(text.startsWith('{\n  "version": 1,\n  "document": "notes.md",\n  "threads": [\n    {\n      "id": "t1",\n      "anchor": {\n        "line": 3,'));
  assert.equal(serializeSidecar(parseSidecar(text)), text);
  // Key order of the input does not matter.
  const shuffled = JSON.stringify({ threads: [{ comments: [{ body: "Why?", author: "Ada", id: "c1", createdAt: "2026-10-21T10:00:00Z" }],
    resolved: false, createdAt: "2026-10-21T10:00:00Z", id: "t1",
    anchor: { suffix: " world", prefix: "say ", quote: "hello", endLine: 3, line: 3 } }], document: "notes.md", version: 1 });
  assert.equal(serializeSidecar(parseSidecar(shuffled)), text);
});
