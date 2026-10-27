/**
 * The comments controller on the host side (requirements REVIEW-016, REVIEW-064, REVIEW-122,
 * REVIEW-123, REVIEW-124, REVIEW-127, REVIEW-128, REVIEW-129): the sidecar reads, writes, anchors
 * and moves, against an in-memory file system and a stub preview.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { serializeSidecar, type CommentThread } from "../../src/core/comments/commentModel";
import { CommentsController, createCommentsState } from "../../src/session/features/comments";
import { READ_ONLY_NO_FOLDER, READ_ONLY_UNTRUSTED } from "../../src/core/edits/sourceEdits";

const DOCUMENT = "/w/a.md";
const SIDECAR = "/w/a.comments.json";
const MIB = 1024 * 1024;

const thread = (id: string, line: number, quote = "needle"): CommentThread => ({
  id,
  anchor: { line, endLine: line, quote, prefix: "", suffix: "" },
  resolved: false,
  createdAt: "2026-10-21T10:00:00Z",
  comments: [{ id: `c_${id}`, author: "Ada", createdAt: "2026-10-21T10:00:00Z", body: `body of ${id}` }],
});

const sidecarOf = (documentName: string, threads: CommentThread[]): string =>
  serializeSidecar({ document: documentName, threads });

function notFound(path: string): Error {
  return Object.assign(new Error(`not found: ${path}`), { code: "ENOENT" });
}

interface Setup {
  readonly files: Map<string, string>;
  readonly sizes: Map<string, number>;
  readonly directories: Set<string>;
  readonly warnings: string[];
  readonly renames: Array<[string, string]>;
  readonly writes: string[];
  readonly posted: Array<Record<string, any>>;
  readonly open: Map<string, { path: string; isDirty: boolean; getText(): string }>;
  readonly previews: any[];
  readonly controller: CommentsController;
  readonly hooks: { readFile?: (path: string) => Promise<Uint8Array> | undefined };
  preview(extra?: Record<string, unknown>): any;
}

function setup(): Setup {
  const files = new Map<string, string>();
  const sizes = new Map<string, number>();
  const directories = new Set<string>();
  const warnings: string[] = [];
  const renames: Array<[string, string]> = [];
  const writes: string[] = [];
  const posted: Array<Record<string, any>> = [];
  const open = new Map<string, { path: string; isDirty: boolean; getText(): string }>();
  const previews: any[] = [];
  const hooks: Setup["hooks"] = {};
  const encode = (text: string): Uint8Array => new TextEncoder().encode(text);
  const host = {
    files: {
      stat: async (path: string) => {
        if (directories.has(path)) return { kind: "directory", size: 0 };
        const text = files.get(path);
        if (text === undefined) throw notFound(path);
        return { kind: "file", size: sizes.get(path) ?? encode(text).length };
      },
      readFile: async (path: string) => {
        const held = hooks.readFile?.(path);
        if (held) return held;
        const text = files.get(path);
        if (text === undefined) throw notFound(path);
        return encode(text);
      },
      writeFile: async (path: string, data: Uint8Array) => {
        // The store writes a temporary file and renames it: the write counts when it lands on its path.
        if (!path.endsWith(".tmp")) writes.push(path);
        files.set(path, new TextDecoder().decode(data));
      },
      rename: async (from: string, to: string) => {
        if (from.endsWith(".tmp")) writes.push(to);
        else renames.push([from, to]);
        files.set(to, files.get(from)!);
        files.delete(from);
      },
      delete: async (path: string) => { files.delete(path); },
      isSymbolicLink: async () => false,
    },
    ui: { showWarning: (text: string) => { warnings.push(text); return Promise.resolve(); } },
    documents: {
      idOf: (path: string) => `file://${path}`,
      get: (id: string) => open.get(id),
    },
    settings: { section: () => ({ get: (_key: string, fallback: unknown) => fallback }) },
    vcs: { userName: async () => "Ada" },
    watcher: {
      watch: () => ({ onDidCreate: () => undefined, onDidChange: () => undefined, onDidDelete: () => undefined, dispose: () => undefined }),
    },
  };
  const manager: any = { host, sessions: () => new Set(previews) };
  const controller = new CommentsController(manager);
  const preview = (extra: Record<string, unknown> = {}): any => {
    const value = {
      disposed: false,
      readOnly: false,
      documentUri: `file://${DOCUMENT}`,
      stage: {
        activeDocumentPath: DOCUMENT,
        activeDocumentIdentity: `file://${DOCUMENT}`,
        activeDocumentRevision: 2,
        requestId: 5,
      },
      comments: createCommentsState(),
      probe: { commentPosts: 0 },
      postToPage: (message: Record<string, unknown>) => {
        posted.push(message);
        return Promise.resolve();
      },
      ...extra,
    };
    previews.push(value);
    return value;
  };
  return { files, sizes, directories, warnings, renames, writes, posted, open, previews, controller, hooks, preview };
}

const threadsOf = (message: Record<string, any>): Array<Record<string, any>> => message.threads;

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-012
test("a read of the comments file that a newer read overtook posts nothing", async () => {
  const s = setup();
  s.files.set(DOCUMENT, "a needle here\n");
  s.files.set(SIDECAR, sidecarOf("a.md", [thread("t_old", 1)]));
  const preview = s.preview();
  const post = (s.controller as any).post.bind(s.controller) as (value: unknown) => Promise<void>;

  // The first read stops at readFile; the file changes; the second read runs to the end.
  let release!: (data: Uint8Array) => void;
  const held = new Promise<Uint8Array>((resolve) => { release = resolve; });
  const oldBytes = new TextEncoder().encode(s.files.get(SIDECAR)!);
  let first = true;
  s.hooks.readFile = (path) => {
    if (path !== SIDECAR || !first) return undefined;
    first = false;
    return held;
  };
  const older = post(preview);
  s.files.set(SIDECAR, sidecarOf("a.md", [thread("t_new", 1)]));
  await post(preview);
  assert.equal(s.posted.length, 1, "the newer read posted");
  assert.deepEqual(threadsOf(s.posted[0]!).map((value) => value.id), ["t_new"]);
  release(oldBytes);
  await older;
  assert.equal(s.posted.length, 1, "nothing from the older read");

  // A single read posts its result.
  const single = setup();
  single.files.set(DOCUMENT, "a needle here\n");
  single.files.set(SIDECAR, sidecarOf("a.md", [thread("t_one", 1)]));
  await (single.controller as any).post(single.preview());
  assert.equal(single.posted.length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-054
test("a comment for a document that is not a file is refused with 'save the document first.'", async () => {
  const s = setup();
  const router = new Map<string, (message: any, preview: any) => Promise<void>>();
  s.controller.register({ on: (type: string, handler: any) => { router.set(type, handler); } } as never);
  const message = { anchor: { line: 1, endLine: 1, quote: "x", prefix: "", suffix: "" }, body: "Hello" };

  const untitled = s.preview({ documentUri: "untitled:Untitled-1" });
  await router.get("previewCommentCreate")!(message, untitled);
  assert.deepEqual(s.posted.map((value) => [value.type, value.ok, value.reason]), [
    ["previewCommentResult", false, "save the document first."],
  ]);
  assert.deepEqual(s.writes, [], "nothing is written");
  assert.deepEqual(s.warnings, ["The comment was not saved: save the document first."]);

  const saved = s.preview();
  s.files.set(DOCUMENT, "x\n");
  await router.get("previewCommentCreate")!(message, saved);
  assert.deepEqual(s.writes, [SIDECAR], "a saved file gets its comment");
  assert.equal(s.posted.at(-1)!.ok, true);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-005
test("saving writes nothing to the comments file when the only previews are read-only", async () => {
  const s = setup();
  s.files.set(SIDECAR, sidecarOf("a.md", [thread("t1", 1)]));
  const document: any = { id: `file://${DOCUMENT}`, path: DOCUMENT, isDirty: false, getText: () => "x\n\nsee the needle\n" };

  s.preview({ readOnly: true });
  await s.controller.persistAnchors(document);
  assert.deepEqual(s.writes, []);

  // A writable preview of the same document: the moved line is written.
  s.preview();
  await s.controller.persistAnchors(document);
  assert.deepEqual(s.writes, [SIDECAR]);
  assert.match(s.files.get(SIDECAR)!, /"line": 3/u);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-119
test("a document without unsaved changes that changes drops the followed lines, a dirty one shifts them", () => {
  const s = setup();
  const view = () => ({ diskHash: "h", threads: [thread("t1", 4)], orphaned: new Set<string>() });
  const dirty = s.preview();
  dirty.comments.view = view();
  const clean = s.preview();
  clean.comments.view = view();
  const change = (isDirty: boolean) => ({
    document: { id: `file://${DOCUMENT}`, isDirty },
    changes: [{ start: 0, length: 0, startLine: 0, endLine: 0, text: "new line\n" }],
  });

  s.controller.shiftForEdits(change(true) as never);
  assert.equal(dirty.comments.view.threads[0].anchor.line, 5, "the line is shifted in memory");

  clean.comments.view = view();
  s.previews.splice(0, 1);
  s.controller.shiftForEdits(change(false) as never);
  assert.equal(clean.comments.view, undefined, "the lines are dropped: the threads are checked again against the text");
  s.controller.clear(dirty);
  s.controller.clear(clean);
});

test("a closed document over 8 MiB is not searched: the stored lines are posted", async () => {
  const quoted = thread("t1", 3, "gone quote");
  const bodyText = "first\nsecond\nthird\n";

  const large = setup();
  large.files.set(DOCUMENT, bodyText);
  large.sizes.set(DOCUMENT, 8 * MIB + 1);
  large.files.set(SIDECAR, sidecarOf("a.md", [quoted]));
  await (large.controller as any).post(large.preview());
  assert.equal(threadsOf(large.posted[0]!)[0]!.anchor.line, 3, "the stored line");
  assert.equal(threadsOf(large.posted[0]!)[0]!.orphaned, false, "not orphaned: the quote was never searched");

  // The same text under the limit is searched, and the missing quote orphans the thread.
  const small = setup();
  small.files.set(DOCUMENT, bodyText);
  small.files.set(SIDECAR, sidecarOf("a.md", [quoted]));
  await (small.controller as any).post(small.preview());
  assert.equal(threadsOf(small.posted[0]!)[0]!.orphaned, true);

  // An open document of the same size: the open text is used, whatever its size.
  const opened = setup();
  opened.files.set(DOCUMENT, "unrelated\n");
  opened.sizes.set(DOCUMENT, 8 * MIB + 1);
  opened.open.set(`file://${DOCUMENT}`, { path: DOCUMENT, isDirty: false, getText: () => "gone quote is here now\n" });
  opened.files.set(SIDECAR, sidecarOf("a.md", [quoted]));
  await (opened.controller as any).post(opened.preview());
  assert.equal(threadsOf(opened.posted[0]!)[0]!.anchor.line, 1, "re-anchored on the open text");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-125
test("a comments file that names another document stays where it is, without a warning", async () => {
  const other = setup();
  other.files.set("/w/move-me.comments.json", sidecarOf("other.md", [thread("t1", 1)]));
  other.files.set("/w/moved.md", "x\n");
  await other.controller.moveSidecars([{ oldPath: "/w/move-me.md", newPath: "/w/moved.md", local: true }]);
  assert.deepEqual(other.renames, []);
  assert.deepEqual(other.warnings, []);
  assert.ok(other.files.has("/w/move-me.comments.json"));
  assert.equal(other.files.has("/w/moved.comments.json"), false);

  // Its own document: the file moves and names the new document.
  const own = setup();
  own.files.set("/w/move-me.comments.json", sidecarOf("move-me.md", [thread("t1", 1)]));
  own.files.set("/w/moved.md", "x\n");
  await own.controller.moveSidecars([{ oldPath: "/w/move-me.md", newPath: "/w/moved.md", local: true }]);
  assert.deepEqual(own.renames, [["/w/move-me.comments.json", "/w/moved.comments.json"]]);
  assert.match(own.files.get("/w/moved.comments.json")!, /"document": "moved\.md"/u);
});

test("a folder, a comments file itself and a file that is not local move no comments file", async () => {
  const s = setup();
  s.files.set("/w/dir.comments.json", sidecarOf("dir", [thread("t1", 1)]));
  s.files.set("/w/x.comments.json", sidecarOf("x.comments.json", [thread("t1", 1)]));
  s.files.set("/w/remote.comments.json", sidecarOf("remote.md", [thread("t1", 1)]));
  s.directories.add("/w/dir-renamed");

  await s.controller.moveSidecars([
    { oldPath: "/w/dir", newPath: "/w/dir-renamed", local: true },
    { oldPath: "/w/x.comments.json", newPath: "/w/y.comments.json", local: true },
    { oldPath: "/w/remote.md", newPath: "/w/remote2.md", local: false },
  ]);
  assert.deepEqual(s.renames, []);
  assert.deepEqual(s.warnings, []);
});

test("a save that cannot write the moved lines warns once for each reason", async () => {
  const s = setup();
  s.files.set(SIDECAR, sidecarOf("a.md", [thread("t1", 1)]));
  s.open.set(`file://${SIDECAR}`, { path: SIDECAR, isDirty: true, getText: () => "" });
  const preview = s.preview();
  preview.comments.view = { diskHash: "h", threads: [thread("t1", 1)], orphaned: new Set<string>() };
  const document: any = { id: `file://${DOCUMENT}`, path: DOCUMENT, isDirty: false, getText: () => "see the needle\n" };

  await s.controller.persistAnchors(document);
  assert.deepEqual(s.warnings, [
    "The review comments were not re-anchored in their file: a.comments.json has unsaved changes in an editor.",
  ]);
  await s.controller.persistAnchors(document);
  assert.equal(s.warnings.length, 1, "the same reason again is not shown again");
  assert.deepEqual(s.writes, []);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-005
test("a comment from a read-only preview is refused with the real cause", async () => {
  const s = setup();
  const router = new Map<string, (message: any, preview: any) => Promise<void>>();
  s.controller.register({ on: (type: string, handler: any) => { router.set(type, handler); } } as never);
  const message = { anchor: { line: 1, endLine: 1, quote: "x", prefix: "", suffix: "" }, body: "Hello" };

  await router.get("previewCommentCreate")!(message, s.preview({ readOnly: true }));
  await router.get("previewCommentCreate")!(message, s.preview({ readOnly: true, workspaceFolder: { path: "/ws" } }));
  assert.deepEqual(s.posted.map((value) => value.reason), [READ_ONLY_NO_FOLDER, READ_ONLY_UNTRUSTED]);
  assert.deepEqual(s.warnings, [
    `The comment was not saved: ${READ_ONLY_NO_FOLDER}`,
    `The comment was not saved: ${READ_ONLY_UNTRUSTED}`,
  ]);
  assert.deepEqual(s.writes, []);
});
