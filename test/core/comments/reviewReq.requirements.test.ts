/**
 * The size limit of the review comments file (requirement REVIEW-062), through the comment store
 * with an in-memory file system.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { MAX_STRING_LENGTH, parseSidecar, type CommentThread } from "../../../src/core/comments/commentModel";
import { createCommentStore } from "../../../src/core/comments/commentStore";

const thread = (id: string, body: string): CommentThread => ({
  id,
  anchor: { line: 1, endLine: 1, quote: "x", prefix: "", suffix: "" },
  resolved: false,
  createdAt: "2026-10-21T10:00:00Z",
  comments: [{ id: `c${id}`, author: "Ada", createdAt: "2026-10-21T10:00:00Z", body }],
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-054
test("a change that makes the serialized file larger than 2 MiB is refused before the write", async () => {
  const files = new Map<string, string>();
  let writes = 0;
  const store = createCommentStore({
    read: async (path) => files.get(path),
    write: async (path, text) => { writes += 1; files.set(path, text); },
  });

  // Within the limit: written.
  const small = await store.update("/w/a.comments.json", "a.md", () => [thread("t1", "short")]);
  assert.equal(small.ok, true);
  assert.equal(writes, 1);
  const before = files.get("/w/a.comments.json");

  // 210 threads of 10 000 characters are about 2.1 MB: over the limit of 2 MiB.
  const big = Array.from({ length: 210 }, (_unused, index) => thread(`t${index}`, "x".repeat(MAX_STRING_LENGTH)));
  const refused = await store.update("/w/a.comments.json", "a.md", () => big);
  assert.deepEqual(refused, { ok: false, reason: "the comments file would become too large" });
  assert.equal(writes, 1, "nothing was written");
  assert.equal(files.get("/w/a.comments.json"), before, "the file is untouched");
  assert.equal(parseSidecar(before!).threads.length, 1);
});
