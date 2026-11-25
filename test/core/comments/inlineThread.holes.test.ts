import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_THREAD_REPLY_LENGTH,
  parseThreadBody,
  threadReplyEdit,
} from "../../../src/core/comments/inlineThread";

// Tests added by the mutation campaign of src/core (CR-450): they pin the survivors of the first run.

const thread = ["<!-- THREAD", "Ada (2026-10-21 10:00):", "  Why?", "-->"];

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-167#S4
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-186#S5
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-186#S8
test("a reply is accepted at exactly 10,000 characters and refused at 10,001", () => {
  assert.equal(MAX_THREAD_REPLY_LENGTH, 10000);
  const edit = threadReplyEdit(thread, "Bob", "2026-10-22 09:30", "x".repeat(10000));
  assert.ok(edit);
  assert.equal(edit.lines[1], `  ${"x".repeat(10000)}`);
  assert.equal(threadReplyEdit(thread, "Bob", "2026-10-22 09:30", "x".repeat(10001)), undefined);
  assert.equal(threadReplyEdit(thread, "Bob", "2026-10-22 09:30", "   \n "), undefined, "a blank reply");
  assert.equal(threadReplyEdit(["not", "a thread"], "Bob", "2026-10-22 09:30", "hi"), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-167#S2
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-167#S3
test("a thread body opens with THREAD alone on its line, and indents of one or two spaces or a tab are removed", () => {
  assert.equal(parseThreadBody("THREAD extra\nAda (2026-10-21 10:00):\n  Hi"), undefined, "text after THREAD on its line");
  assert.deepEqual(parseThreadBody("THREAD\nAda (2026-10-21 10:00):\n  Hi"), [{ author: "Ada", date: "2026-10-21 10:00", text: "Hi" }]);
  assert.deepEqual(parseThreadBody("THREAD \t\r\nAda (2026-10-21 10:00):\r\n\tHi\r\n"), [{ author: "Ada", date: "2026-10-21 10:00", text: "Hi" }]);
  assert.equal(parseThreadBody("THREAD"), undefined, "an opener with no message is no thread");
  assert.equal(parseThreadBody("xTHREAD\nAda (2026-10-21 10:00):\n  Hi"), undefined, "THREAD starts the body");
  assert.deepEqual(parseThreadBody("THREAD\nAda (2026-10-21 10:00):\n   Hi")?.[0].text, " Hi", "only two spaces of indent go");
  assert.deepEqual(parseThreadBody("THREAD\nAda (2026-10-21 10:00):\n Hi")?.[0].text, "Hi", "one space of indent goes");
  assert.deepEqual(parseThreadBody("THREAD\nAda (2026-10-21 10:00):\n\n  one\n\n  two\n\n")?.[0].text, "one\n\ntwo", "blank edges go, inner blanks stay");
});
