import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  addReply,
  addThread,
  deleteThread,
  setResolved,
  isValidAnchor,
  MAX_COMMENTS_PER_THREAD,
  MAX_THREADS,
  normalizeBody,
  parseSidecar,
  serializeSidecar,
  type CommentThread,
} from "../../../src/core/comments/commentModel";
import { resolveAuthor } from "../../../src/core/comments/author";
import { createCommentStore, formatId, hashText } from "../../../src/core/comments/commentStore";

const anchor = { line: 3, endLine: 4, quote: "hello", prefix: "say ", suffix: " world" };
const NOW = new Date("2026-10-21T10:00:00.000Z");

test("T43: addThread appends a thread with its first comment and does not touch the input", () => {
  const before: CommentThread[] = [];
  const after = addThread(before, { threadId: "t_00000001", commentId: "c_00000001", anchor, author: "Ada", body: "Why?", now: NOW });
  assert.ok(after);
  assert.equal(before.length, 0);
  assert.equal(after.length, 1);
  assert.deepEqual(after[0], {
    id: "t_00000001",
    anchor,
    resolved: false,
    createdAt: "2026-10-21T10:00:00.000Z",
    comments: [{ id: "c_00000001", author: "Ada", createdAt: "2026-10-21T10:00:00.000Z", body: "Why?" }],
  });
  assert.deepEqual(parseSidecar(serializeSidecar({ document: "a.md", threads: after })).errors, []);
});

test("T43: addThread refuses a full file and a repeated id", () => {
  const first = addThread([], { threadId: "t1", commentId: "c1", anchor, author: "A", body: "x", now: NOW })!;
  assert.equal(addThread(first, { threadId: "t1", commentId: "c2", anchor, author: "A", body: "y", now: NOW }), undefined);
  const full = Array.from({ length: MAX_THREADS }, (_, index) => ({ ...first[0], id: `t${index}` }));
  assert.equal(addThread(full, { threadId: "tn", commentId: "cn", anchor, author: "A", body: "y", now: NOW }), undefined);
});

test("T43: addReply appends to the named thread only", () => {
  const base = addThread([], { threadId: "t1", commentId: "c1", anchor, author: "A", body: "x", now: NOW })!;
  const two = addThread(base, { threadId: "t2", commentId: "c2", anchor, author: "A", body: "y", now: NOW })!;
  const replied = addReply(two, "t2", { commentId: "c3", author: "Bob", body: "Because", now: NOW });
  assert.ok(replied);
  assert.equal(replied[0].comments.length, 1);
  assert.deepEqual(replied[1].comments.map((comment) => comment.id), ["c2", "c3"]);
  assert.equal(two[1].comments.length, 1, "the input is untouched");
  assert.equal(addReply(two, "missing", { commentId: "c9", author: "B", body: "z", now: NOW }), undefined);
  const crowded = [{ ...two[0], comments: Array.from({ length: MAX_COMMENTS_PER_THREAD }, (_, i) => ({ ...two[0].comments[0], id: `c${i}` })) }];
  assert.equal(addReply(crowded, "t1", { commentId: "cx", author: "B", body: "z", now: NOW }), undefined);
});

test("T43: isValidAnchor enforces lines and the 500 / 32 / 32 limits", () => {
  assert.equal(isValidAnchor(anchor), true);
  assert.equal(isValidAnchor({ ...anchor, quote: "" }), true);
  assert.equal(isValidAnchor({ ...anchor, quote: "q".repeat(500) }), true);
  assert.equal(isValidAnchor({ ...anchor, quote: "q".repeat(501) }), false);
  assert.equal(isValidAnchor({ ...anchor, prefix: "p".repeat(33) }), false);
  assert.equal(isValidAnchor({ ...anchor, suffix: "p".repeat(33) }), false);
  assert.equal(isValidAnchor({ ...anchor, line: 0 }), false);
  assert.equal(isValidAnchor({ ...anchor, line: 1.5 }), false);
  assert.equal(isValidAnchor({ ...anchor, endLine: 2 }), false);
  assert.equal(isValidAnchor({ ...anchor, quote: 5 }), false);
  assert.equal(isValidAnchor(null), false);
  assert.equal(isValidAnchor([]), false);
  assert.equal(isValidAnchor({ line: 1, endLine: 1 }), false);
});

test("T43: normalizeBody trims and enforces 1 to 10000 characters", () => {
  assert.equal(normalizeBody("  hi \n"), "hi");
  assert.equal(normalizeBody(""), undefined);
  assert.equal(normalizeBody("   \n"), undefined);
  assert.equal(normalizeBody(5), undefined);
  assert.equal(normalizeBody("x".repeat(10_000)), "x".repeat(10_000));
  assert.equal(normalizeBody("x".repeat(10_001)), undefined);
});

test("T43: resolveAuthor uses the setting, then Git, then the OS user, then Anonymous", async () => {
  const none = () => undefined;
  assert.equal(await resolveAuthor({ setting: " Ada ", gitName: async () => "Git", osUserName: () => "os" }), "Ada");
  assert.equal(await resolveAuthor({ setting: "", gitName: async () => " Git Name ", osUserName: () => "os" }), "Git Name");
  assert.equal(await resolveAuthor({ setting: undefined, gitName: async () => "", osUserName: () => "os" }), "os");
  assert.equal(await resolveAuthor({ setting: "  ", gitName: async () => { throw new Error("git"); }, osUserName: () => "os" }), "os");
  assert.equal(await resolveAuthor({ setting: "", gitName: async () => undefined, osUserName: none }), "Anonymous");
  assert.equal(await resolveAuthor({ setting: "", gitName: async () => undefined, osUserName: () => { throw new Error("no user"); } }), "Anonymous");
  assert.equal((await resolveAuthor({ setting: "a\u0000b\nc", osUserName: none })), "a b c", "control characters are replaced");
  assert.equal((await resolveAuthor({ setting: "n".repeat(500), osUserName: none })).length, 100);
});

test("T43: ids are a prefix and 8 hex characters", () => {
  assert.equal(formatId("t_", new Uint8Array([0, 1, 171, 255])), "t_0001abff");
  assert.match(formatId("c_", new Uint8Array([9, 9, 9, 9])), /^c_[0-9a-f]{8}$/u);
  assert.notEqual(hashText("a"), hashText("b"));
  assert.equal(hashText("a"), hashText("a"));
});

function memoryIo(initial?: string, delayMs = 5) {
  const files = new Map<string, string>();
  if (initial !== undefined) files.set("/d/notes.comments.json", initial);
  const sleep = () => new Promise<void>((resolve) => setTimeout(resolve, delayMs));
  return {
    files,
    writes: [] as string[],
    async read(path: string) { await sleep(); return files.get(path); },
    async write(path: string, text: string) { await sleep(); files.set(path, text); this.writes.push(text); },
  };
}

test("T43: two quick creates never lose one (per-file queue: read latest, apply, write)", async () => {
  const io = memoryIo();
  const store = createCommentStore(io);
  const create = (n: number) => store.update("/d/notes.comments.json", "notes.md", (threads) =>
    addThread(threads, { threadId: `t${n}`, commentId: `c${n}`, anchor, author: "A", body: `body ${n}`, now: NOW }) ?? "full");
  const results = await Promise.all([create(1), create(2), create(3)]);
  assert.deepEqual(results.map((result) => result.ok), [true, true, true]);
  const parsed = parseSidecar(io.files.get("/d/notes.comments.json")!);
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(parsed.threads.map((thread) => thread.id), ["t1", "t2", "t3"]);
  assert.equal(parsed.document, "notes.md");
});

test("T43: a create and a reply queued together both land", async () => {
  const first = serializeSidecar({ document: "notes.md", threads: addThread([], { threadId: "t1", commentId: "c1", anchor, author: "A", body: "x", now: NOW })! });
  const io = memoryIo(first);
  const store = createCommentStore(io);
  const results = await Promise.all([
    store.update("/d/notes.comments.json", "notes.md", (threads) =>
      addThread(threads, { threadId: "t2", commentId: "c2", anchor, author: "A", body: "y", now: NOW }) ?? "full"),
    store.update("/d/notes.comments.json", "notes.md", (threads) =>
      addReply(threads, "t1", { commentId: "c3", author: "B", body: "z", now: NOW }) ?? "gone"),
  ]);
  assert.deepEqual(results.map((result) => result.ok), [true, true]);
  const threads = parseSidecar(io.files.get("/d/notes.comments.json")!).threads;
  assert.deepEqual(threads.map((thread) => thread.id), ["t1", "t2"]);
  assert.deepEqual(threads[0].comments.map((comment) => comment.id), ["c1", "c3"]);
});

test("T43: an invalid existing file is never overwritten, and a refusal does not stop the queue", async () => {
  const io = memoryIo("{ not json");
  const store = createCommentStore(io);
  const refused = await store.update("/d/notes.comments.json", "notes.md", (threads) => threads);
  assert.equal(refused.ok, false);
  assert.equal(io.files.get("/d/notes.comments.json"), "{ not json");
  const gone = await store.update("/d/other.comments.json", "other.md", () => "nothing to do");
  assert.deepEqual(gone, { ok: false, reason: "nothing to do" });
  const failing = createCommentStore({ read: async () => undefined, write: async () => { throw new Error("disk full"); } });
  const failed = await failing.update("/d/x.comments.json", "x.md", (threads) =>
    addThread(threads, { threadId: "t", commentId: "c", anchor, author: "A", body: "x", now: NOW })!);
  assert.equal(failed.ok, false);
  const next = await failing.update("/d/x.comments.json", "x.md", () => "still alive");
  assert.deepEqual(next, { ok: false, reason: "still alive" });
});

test("T43: the result carries the written text and its hash (the host ignores that echo)", async () => {
  const io = memoryIo();
  const store = createCommentStore(io);
  const result = await store.update("/d/notes.comments.json", "notes.md", (threads) =>
    addThread(threads, { threadId: "t1", commentId: "c1", anchor, author: "A", body: "x", now: NOW })!);
  assert.ok(result.ok);
  assert.equal(result.text, io.files.get("/d/notes.comments.json"));
  assert.equal(result.hash, hashText(result.text));
});

test("T44: setResolved resolves and reopens the named thread only, without touching the input", () => {
  const base = addThread([], { threadId: "t1", commentId: "c1", anchor, author: "A", body: "x", now: NOW })!;
  const two = addThread(base, { threadId: "t2", commentId: "c2", anchor, author: "A", body: "y", now: NOW })!;
  const resolved = setResolved(two, "t2", true)!;
  assert.deepEqual(resolved.map((thread) => thread.resolved), [false, true]);
  assert.equal(two[1].resolved, false, "the input is untouched");
  assert.deepEqual(resolved[1].comments, two[1].comments);
  assert.deepEqual(setResolved(resolved, "t2", false)!.map((thread) => thread.resolved), [false, false]);
  assert.deepEqual(setResolved(resolved, "t2", true)!.map((thread) => thread.resolved), [false, true], "idempotent");
  assert.equal(setResolved(two, "missing", true), undefined);
  assert.deepEqual(parseSidecar(serializeSidecar({ document: "a.md", threads: resolved })).errors, []);
});

test("T44: deleteThread removes the named thread only; the last one leaves an empty list", () => {
  const base = addThread([], { threadId: "t1", commentId: "c1", anchor, author: "A", body: "x", now: NOW })!;
  const two = addThread(base, { threadId: "t2", commentId: "c2", anchor, author: "A", body: "y", now: NOW })!;
  const left = deleteThread(two, "t1")!;
  assert.deepEqual(left.map((thread) => thread.id), ["t2"]);
  assert.equal(two.length, 2, "the input is untouched");
  assert.equal(deleteThread(two, "missing"), undefined);
  const empty = deleteThread(left, "t2")!;
  assert.deepEqual(empty, []);
  const text = serializeSidecar({ document: "a.md", threads: empty });
  const parsed = parseSidecar(text);
  assert.deepEqual(parsed.errors, [], "an empty list is a valid file");
  assert.deepEqual(parsed.threads, []);
});

test("T44: resolve and delete go through the same per-file queue as create", async () => {
  const files = new Map<string, string>();
  const io = {
    read: async (path: string) => { await new Promise((r) => setTimeout(r, 5)); return files.get(path); },
    write: async (path: string, text: string) => { await new Promise((r) => setTimeout(r, 5)); files.set(path, text); },
  };
  const store = createCommentStore(io);
  const create = (id: string) => store.update("/a.comments.json", "a.md", (threads) =>
    addThread(threads, { threadId: id, commentId: `c${id}`, anchor, author: "A", body: "x", now: NOW }) ?? "full");
  await Promise.all([create("t1"), create("t2"), create("t3")]);
  await Promise.all([
    store.update("/a.comments.json", "a.md", (threads) => setResolved(threads, "t1", true) ?? "missing"),
    store.update("/a.comments.json", "a.md", (threads) => deleteThread(threads, "t2") ?? "missing"),
    store.update("/a.comments.json", "a.md", (threads) => deleteThread(threads, "nope") ?? "the thread no longer exists"),
  ]);
  const parsed = parseSidecar(files.get("/a.comments.json")!);
  assert.deepEqual(parsed.threads.map((thread) => [thread.id, thread.resolved]), [["t1", true], ["t3", false]]);
});
