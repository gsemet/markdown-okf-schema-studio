/**
 * Requirement tests of the palette's host requests: the bounded citation scan (`bibScan.ts`) and the
 * refusals and answers of the host request controller (`features/hostRequests.ts`). Each test
 * asserts the behaviour of the current code through the controller's registered handlers.
 */

import * as assert from "node:assert/strict";
import { mock, test } from "node:test";

import type { FileSystem } from "../../src/host-api/fileSystem";
import type { PickedFile } from "../../src/host-api/hostUi";
import { HostRequestController } from "../../src/session/features/hostRequests";
import { MAX_BIB_BYTES, scanBibKeys, SCAN_TIMEOUT_MS } from "../../src/session/bibScan";
import type { PageMessageRouter } from "../../src/session/pageMessages";
import type { PreviewManager } from "../../src/session/previewManager";
import type { PreviewSession } from "../../src/session/previewSession";

const DOC = "/ws/docs/chapter.md";
const STALE = "The preview is out of date. Try again once it has refreshed.";
const NOT_A_FILE = "The preview is out of date, or the document is not a file.";

interface FakeFile { size: number; text?: string; unreadable?: boolean }

/** A file system over `{ path: FakeFile }` that records the files that were read. */
function bibFiles(entries: Record<string, FakeFile>, onRead?: (path: string) => void): { files: FileSystem; read: string[] } {
  const read: string[] = [];
  const files = {
    stat: (path: string) => Promise.resolve({ kind: "file" as const, size: entries[path].size }),
    readFile: (path: string) => {
      read.push(path);
      onRead?.(path);
      if (entries[path].unreadable) return Promise.reject(new Error("EACCES"));
      return Promise.resolve(new TextEncoder().encode(entries[path].text ?? ""));
    },
  } as unknown as FileSystem;
  return { files, read };
}

function workspaceOf(found: string[][]): never {
  let call = 0;
  return {
    folderOf: () => ({ id: "ws", path: "/ws", name: "ws" }),
    findFiles: () => Promise.resolve(found[Math.min(call++, found.length - 1)]),
  } as never;
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-183
test("the scan skips files that do not fit in 2 MiB, marks the list truncated and skips an unreadable file", async () => {
  const big = MAX_BIB_BYTES - 10;
  const { files, read } = bibFiles({
    "/ws/docs/a.bib": { size: big, text: "@book{alpha,\n  title = {Alpha}\n}\n" },
    "/ws/docs/b.bib": { size: 1024 * 1024, text: "@book{beta,\n}\n" },
    "/ws/docs/c.bib": { size: 5, unreadable: true },
    "/ws/docs/d.bib": { size: 5, text: "@book{delta,\n}\n" },
  });
  const result = await scanBibKeys(DOC, {
    files,
    workspace: workspaceOf([["/ws/docs/a.bib", "/ws/docs/b.bib", "/ws/docs/c.bib", "/ws/docs/d.bib"], []]),
  });
  assert.deepEqual(result.items.map((item) => item.key), ["alpha", "delta"], "b.bib does not fit, c.bib is unreadable");
  assert.equal(result.truncated, true);
  assert.equal(result.files, 2);
  assert.deepEqual(read, ["/ws/docs/a.bib", "/ws/docs/c.bib", "/ws/docs/d.bib"], "the oversized file is never read");

  const small = bibFiles({ "/ws/docs/a.bib": { size: 10, text: "@book{alpha,\n}\n" } });
  const fits = await scanBibKeys(DOC, { files: small.files, workspace: workspaceOf([["/ws/docs/a.bib"], []]) });
  assert.equal(fits.truncated, false, "files within the cap do not truncate");
});

test("a scan still running after 5 seconds stops reading and marks the list truncated; a fast scan clears the timer", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    assert.equal(SCAN_TIMEOUT_MS, 5000);
    const entries = {
      "/ws/docs/a.bib": { size: 10, text: "@book{alpha,\n}\n" },
      "/ws/docs/b.bib": { size: 10, text: "@book{beta,\n}\n" },
    };
    // The time limit is reached while the first file is read.
    const slow = bibFiles(entries, () => mock.timers.tick(SCAN_TIMEOUT_MS));
    const result = await scanBibKeys(DOC, {
      files: slow.files,
      workspace: workspaceOf([["/ws/docs/a.bib", "/ws/docs/b.bib"], []]),
    });
    assert.deepEqual(slow.read, ["/ws/docs/a.bib"], "no file is read after the limit");
    assert.equal(result.truncated, true);
    assert.deepEqual(result.items.map((item) => item.key), ["alpha"], "the list holds the keys read so far");

    const fast = bibFiles(entries);
    const clear = mock.method(globalThis, "clearTimeout");
    const done = await scanBibKeys(DOC, { files: fast.files, workspace: workspaceOf([["/ws/docs/a.bib", "/ws/docs/b.bib"], []]) });
    assert.equal(done.truncated, false);
    assert.equal(clear.mock.callCount(), 1, "the timer is cleared when the scan ends in time");
    clear.mock.restore();
  } finally {
    mock.timers.reset();
  }
});

interface Setup {
  answers: Array<Record<string, unknown>>;
  preview: { readOnly: boolean; document: unknown; stage: unknown; documentUri: string };
  dialogs: number;
  writes: number;
  scans: string[];
  ask(type: string, extra?: Record<string, unknown>): Promise<Record<string, unknown>>;
}

interface SetupOptions {
  readOnly?: boolean;
  documentPath?: string | undefined;
  revision?: number;
  stageRevision?: number;
  documentId?: string;
  workspaceFolder?: string | undefined;
  picked?: PickedFile | undefined;
  canonical?: (value: string) => string;
  text?: string;
  bibFailure?: Error;
}

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

/** A controller whose handlers are called directly, over fakes that count dialogs, writes and reads. */
function setup(options: SetupOptions = {}): Setup {
  const documentPath = "documentPath" in options ? options.documentPath : DOC;
  const state = { dialogs: 0, writes: 0, scans: [] as string[] };
  const files = {
    stat: (path: string) => { state.scans.push(`stat ${path}`); return Promise.reject(new Error("unexpected stat")); },
    readFile: (path: string) => { state.scans.push(`read ${path}`); return Promise.reject(new Error("unexpected read")); },
    writeFile: () => { state.writes += 1; return Promise.resolve(); },
    rename: () => { state.writes += 1; return Promise.resolve(); },
    delete: () => Promise.resolve(),
    readDirectory: () => Promise.resolve([]),
  } as unknown as FileSystem;
  const folder = "workspaceFolder" in options ? options.workspaceFolder : "/ws";
  const manager = {
    host: {
      files,
      workspace: {
        folderOf: () => (folder === undefined ? undefined : { id: "ws", path: folder, name: "ws" }),
        findFiles: (search: { base: string }) => {
          state.scans.push(`find ${search.base}`);
          if (options.bibFailure) return Promise.reject(options.bibFailure);
          return Promise.resolve([]);
        },
      },
      ui: {
        pickFile: () => { state.dialogs += 1; return Promise.resolve(options.picked); },
        writeClipboard: () => Promise.resolve(),
      },
    },
    canonicalPath: options.canonical ?? ((value: string) => value),
  } as unknown as PreviewManager;
  const handlers = new Map<string, (message: unknown, preview: PreviewSession) => unknown>();
  const router = { on: (type: string, handler: never) => handlers.set(type, handler) } as unknown as PageMessageRouter;
  new HostRequestController(manager).register(router);
  const answers: Array<Record<string, unknown>> = [];
  const revision = options.revision ?? 3;
  const document = {
    id: options.documentId ?? "file:///ws/docs/chapter.md",
    path: documentPath,
    revision,
    getText: () => options.text ?? "(intro)=\n# Intro\n\n(next)=\n## Next\n",
  };
  const preview = {
    readOnly: options.readOnly ?? false,
    document,
    stage: { activeDocumentRevision: options.stageRevision ?? revision },
    documentUri: "file:///ws/docs/chapter.md",
    postToPage: (message: Record<string, unknown>) => { answers.push(message); return Promise.resolve(true); },
  };
  let count = 0;
  return Object.assign(state, {
    answers,
    preview,
    async ask(type: string, extra: Record<string, unknown> = {}) {
      count += 1;
      const editId = `req-${count}`;
      await handlers.get(type)!({ type, documentId: preview.documentUri, revision: 3, requestId: count, editId, ...extra }, preview as unknown as PreviewSession);
      const answer = answers.find((message) => message.editId === editId);
      assert.ok(answer, `no answer to ${type}`);
      assert.equal(answer.type, `${type}Result`);
      return answer;
    },
  }) as Setup;
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-065
test("a label request for a stale preview is answered with the out-of-date error, a current one with the labels", async () => {
  const stale = setup({ stageRevision: 2 });
  assert.deepEqual(await stale.ask("previewListTargets"), {
    type: "previewListTargetsResult", documentId: "file:///ws/docs/chapter.md", revision: 3, requestId: 1, editId: "req-1",
    ok: false, reason: STALE,
  });
  const current = await setup().ask("previewListTargets");
  assert.equal(current.ok, true);
  assert.deepEqual((current.items as Array<{ value: string }>).map((item) => item.value), ["intro", "next"]);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-006
test("the label list is answered in a read-only preview, the citation list is refused", async () => {
  const readOnly = setup({ readOnly: true });
  const labels = await readOnly.ask("previewListTargets");
  assert.equal(labels.ok, true);
  assert.equal((labels.items as unknown[]).length, 2);
  const citations = await readOnly.ask("previewListCitations");
  assert.equal(citations.ok, false);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-005
test("the citation list is refused in a read-only preview and no file is read", async () => {
  const readOnly = setup({ readOnly: true });
  const answer = await readOnly.ask("previewListCitations");
  assert.equal(answer.ok, false);
  assert.equal(answer.reason, "Citations are read from the workspace, which needs trust.");
  assert.deepEqual(readOnly.scans, []);
  const writable = await setup().ask("previewListCitations");
  assert.equal(writable.ok, true);
  assert.deepEqual(writable.items, []);
});

test("a citation request for a stale preview is answered with the out-of-date error and reads no file", async () => {
  const stale = setup({ stageRevision: 2 });
  const answer = await stale.ask("previewListCitations");
  assert.equal(answer.ok, false);
  assert.equal(answer.reason, STALE);
  assert.deepEqual(stale.scans, []);
  assert.equal((await setup().ask("previewListCitations")).ok, true);
});

test("a citation scan that throws is answered with ok false and the message of the error", async () => {
  const answer = await setup({ bibFailure: new Error("search backend down") }).ask("previewListCitations");
  assert.equal(answer.ok, false);
  assert.equal(answer.reason, "search backend down");
});

test("the document picker is refused in a read-only preview and opens no dialog; a writable preview opens it", async () => {
  const readOnly = setup({ readOnly: true });
  const answer = await readOnly.ask("previewPickDocument");
  assert.equal(answer.ok, false);
  assert.equal(answer.reason, "Linking a document needs a trusted workspace.");
  assert.equal(readOnly.dialogs, 0);
  const writable = setup();
  assert.deepEqual(
    { ok: (await writable.ask("previewPickDocument")).ok, dialogs: writable.dialogs },
    { ok: true, dialogs: 1 },
  );
});

test("the document picker does not open for a stale preview or a document that is not a file", async () => {
  const stale = setup({ stageRevision: 2 });
  assert.equal((await stale.ask("previewPickDocument")).reason, NOT_A_FILE);
  assert.equal(stale.dialogs, 0);
  const untitled = setup({ documentPath: undefined });
  assert.equal((await untitled.ask("previewPickDocument")).reason, NOT_A_FILE);
  assert.equal(untitled.dialogs, 0);
});

test("the image picker does not open for a stale preview or an unsaved document", async () => {
  const stale = setup({ stageRevision: 2 });
  const refusal = await stale.ask("previewPickImage");
  assert.equal(refusal.ok, false);
  assert.equal(refusal.reason, NOT_A_FILE);
  assert.equal(stale.dialogs, 0);
  const untitled = setup({ documentPath: undefined });
  assert.equal((await untitled.ask("previewPickImage")).reason, NOT_A_FILE);
  assert.equal(untitled.dialogs, 0);
});

const paste = { mime: "image/png", dataBase64: PNG.toString("base64") };

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-196
test("an image paste is refused for an unsaved document or one that is not the previewed document", async () => {
  const unsaved = setup({ documentPath: undefined });
  const answer = await unsaved.ask("previewPasteImage", paste);
  assert.equal(answer.ok, false);
  assert.equal(answer.reason, "Save the document before pasting an image.");
  assert.equal(unsaved.writes, 0);
  const other = setup({ documentId: "file:///ws/docs/other.md" });
  assert.equal((await other.ask("previewPasteImage", paste)).reason, "Save the document before pasting an image.");
  assert.equal(other.writes, 0);
});

test("an image paste is refused for a folder outside the workspace, links resolved, and accepted inside it", async () => {
  const outside = setup({ workspaceFolder: "/elsewhere" });
  const answer = await outside.ask("previewPasteImage", paste);
  assert.equal(answer.ok, false);
  assert.equal(answer.reason, "The image must be saved inside a workspace folder.");
  assert.equal(outside.writes, 0);
  // A link inside the workspace whose target is outside: the canonical paths are compared.
  const linked = setup({ canonical: (value) => (value === "/ws/docs" ? "/outside/docs" : value) });
  assert.equal((await linked.ask("previewPasteImage", paste)).reason, "The image must be saved inside a workspace folder.");
  assert.equal(linked.writes, 0);
  const inside = setup();
  assert.equal((await inside.ask("previewPasteImage", paste)).ok, true);
  assert.ok(inside.writes > 0);
});

test("an image paste is refused for a saved file that is not a Markdown file and accepted for a .md file", async () => {
  const text = setup({ documentPath: "/ws/docs/notes.txt" });
  const answer = await text.ask("previewPasteImage", paste);
  assert.equal(answer.ok, false);
  assert.equal(answer.reason, "Pasting an image needs a Markdown file.");
  assert.equal(text.writes, 0);
  const markdown = setup();
  assert.equal((await markdown.ask("previewPasteImage", paste)).ok, true);
});
