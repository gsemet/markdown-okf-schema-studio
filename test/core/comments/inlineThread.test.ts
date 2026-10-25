import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatThreadDate,
  isThreadSource,
  newThreadSnippet,
  parseThreadBody,
  threadDeleteRange,
  threadReplyEdit,
} from "../../../src/core/comments/inlineThread";

const BODY = [
  " THREAD",
  "User 1 (2026-10-16 10:47):",
  "  this comment is a text",
  "  that can span across several lines",
  "User 2 (2026-10-16 10:52):",
  "  this a response.",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-167
test("a thread body is read as messages with author, date and text", () => {
  assert.deepEqual(parseThreadBody(BODY), [
    { author: "User 1", date: "2026-10-16 10:47", text: "this comment is a text\nthat can span across several lines" },
    { author: "User 2", date: "2026-10-16 10:52", text: "this a response." },
  ]);
});

test("CRLF line ends and trailing spaces or tabs do not change the messages", () => {
  const crlf = BODY.replace(/\n/gu, " \t\r\n");
  assert.deepEqual(parseThreadBody(crlf), parseThreadBody(BODY));
});

test("blank lines inside a message are kept, and a tab indent is accepted", () => {
  const messages = parseThreadBody("THREAD\nAda (2026-01-02 03:04):\n\tfirst\n\n  second\n");
  assert.equal(messages?.[0].text, "first\n\nsecond");
});

test("what is not a thread is refused", () => {
  assert.equal(parseThreadBody("THREADS\nA (2026-01-02 03:04):\n  x"), undefined);
  assert.equal(parseThreadBody("TODO THREAD"), undefined);
  assert.equal(parseThreadBody("THREAD"), undefined, "no message");
  assert.equal(parseThreadBody("THREAD\nstray text\nA (2026-01-02 03:04):\n  x"), undefined);
  assert.equal(parseThreadBody("THREAD\nA (2026-1-2 3:04):\n  x"), undefined, "date format");
});

test("the date is written in local time as YYYY-MM-DD HH:MM", () => {
  assert.equal(formatThreadDate(new Date(2026, 0, 5, 9, 7)), "2026-01-05 09:07");
});

test("a new thread snippet holds the header and an indented caret line", () => {
  const snippet = newThreadSnippet("Ada", "2026-10-16 10:47");
  assert.equal(snippet.text, "<!-- THREAD\nAda (2026-10-16 10:47):\n  \n-->");
  assert.equal(snippet.text.slice(0, snippet.caret).endsWith("):\n  "), true);
});

const LINES = ["<!-- THREAD", "Ada (2026-10-16 10:47):", "  hello", "-->"];

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-186
test("a reply goes above the closing marker and nothing else changes", () => {
  const edit = threadReplyEdit(LINES, "Bob", "2026-10-17 08:00", "hi\nthere");
  assert.deepEqual(edit, {
    fromLine: 3,
    lineCount: 1,
    lines: ["Bob (2026-10-17 08:00):", "  hi", "  there", "-->"],
  });
});

test("a reply keeps the indentation and the text after the closing marker", () => {
  const edit = threadReplyEdit(["  <!-- THREAD", "Ada (2026-10-16 10:47):", "  hello", "  --> "], "Bob", "2026-10-17 08:00", "x");
  assert.deepEqual(edit?.lines, ["Bob (2026-10-17 08:00):", "  x", "  --> "]);
});

test("a thread closed on the last message line is split before the reply", () => {
  const edit = threadReplyEdit(["<!-- THREAD", "Ada (2026-10-16 10:47):", "  hello -->"], "Bob", "2026-10-17 08:00", "x");
  assert.deepEqual(edit?.lines, ["  hello", "Bob (2026-10-17 08:00):", "  x", "-->"]);
});

test("a reply cannot close the comment early, and an empty reply or a non-thread is refused", () => {
  const edit = threadReplyEdit(LINES, "Bob", "2026-10-17 08:00", "a --> b");
  assert.deepEqual(edit?.lines.slice(0, 2), ["Bob (2026-10-17 08:00):", "  a -- > b"]);
  assert.equal(threadReplyEdit(LINES, "Bob", "2026-10-17 08:00", "  \n "), undefined);
  assert.equal(threadReplyEdit(["<!-- note -->"], "Bob", "2026-10-17 08:00", "x"), undefined);
  assert.equal(isThreadSource(LINES), true);
  assert.equal(isThreadSource(["<!-- TODO x -->"]), false);
  assert.equal(isThreadSource([...LINES, "<!-- other -->"]), false);
});

test("an author is written on one line", () => {
  const edit = threadReplyEdit(LINES, "Ada\nLovelace\t", "2026-10-17 08:00", "x");
  assert.equal(edit?.lines[0], "Ada Lovelace (2026-10-17 08:00):");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-192
test("deleting takes one surrounding blank line when both neighbours are blank", () => {
  assert.deepEqual(threadDeleteRange(4, "", ""), { fromOffset: 0, count: 5 });
  assert.deepEqual(threadDeleteRange(4, "text", ""), { fromOffset: 0, count: 4 });
  assert.deepEqual(threadDeleteRange(4, "", "text"), { fromOffset: 0, count: 4 });
  assert.deepEqual(threadDeleteRange(4, undefined, ""), { fromOffset: 0, count: 5 });
  assert.deepEqual(threadDeleteRange(4, "", undefined), { fromOffset: -1, count: 5 });
  assert.deepEqual(threadDeleteRange(4, undefined, undefined), { fromOffset: 0, count: 4 });
});
