/**
 * The host side of "Export to HTML" (`src/session/features/htmlExport.ts`): the order of the
 * dialogs, what is written, what is refused. The ports are stubs over an in-memory file system.
 */

import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { buildHtmlExport } from "../../src/core/export/htmlExport";
import type { ExportSnapshot } from "../../src/core/export/exportSnapshot";
import { createMemoryFileSystem } from "../../src/host-memory/memoryFileSystem";
import { createMemoryLogger } from "../../src/host-memory/memoryLogger";
import { EXPORT_REFUSED } from "../../src/core/export/exportSnapshot";
import { HostRequestController } from "../../src/session/features/hostRequests";
import { HtmlExportController, removedLinksWarning } from "../../src/session/features/htmlExport";
import { PageMessageDispatcher, type PageMessageRouter } from "../../src/session/pageMessages";
import type { PreviewManager } from "../../src/session/previewManager";
import type { PreviewSession } from "../../src/session/previewSession";

const DOCUMENT = "file:///ws/docs/notes.md";
/** A 1x1 transparent PNG. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

const snapshot = (body: string): ExportSnapshot => ({
  contentHtml: `<main id="sphinx-myst-preview-content">${body}</main>`,
  rootAttributes: {},
  tokens: { "editor-background": "#fff" },
  mathStyles: "",
  shownTabs: [],
});

interface Options {
  confirm?: boolean;
  savePath?: string | undefined;
  failWrite?: boolean;
  local?: boolean;
}

function harness(options: Options = {}) {
  const png = new Uint8Array(PNG);
  const memory = createMemoryFileSystem();
  memory.addFile("/ws/docs/notes.md", "# Notes\n");
  void memory.writeFile("/ws/docs/pic.png", png);
  const written: Array<{ target: string; text: string }> = [];
  const files = {
    ...memory,
    writeFile: async (target: string, data: Uint8Array) => {
      if (options.failWrite) throw new Error("EACCES: permission denied");
      written.push({ target, text: new TextDecoder().decode(data) });
    },
  };
  const calls: string[] = [];
  const confirms: Array<{ message: string; detail?: string }> = [];
  const saves: Array<{ defaultPath: string; filters: Record<string, string[]>; saveLabel: string }> = [];
  const infos: string[] = [];
  const errors: string[] = [];
  const ui = {
    confirm: (confirm: { message: string; detail?: string }) => {
      calls.push("confirm");
      confirms.push(confirm);
      return Promise.resolve(options.confirm ?? true);
    },
    pickSaveFile: (save: { defaultPath: string; filters: Record<string, string[]>; saveLabel: string }) => {
      calls.push("pickSaveFile");
      saves.push(save);
      return Promise.resolve("savePath" in options ? options.savePath : "/out/notes.html");
    },
    showInformation: (message: string) => { infos.push(message); return Promise.resolve(); },
    showError: (message: string) => { errors.push(message); return Promise.resolve(); },
  };
  const manager = {
    host: {
      files, ui, logger: createMemoryLogger(),
      workspace: { folders: () => [{ path: "/ws" }] },
    },
    activePathOf: () => "/ws/docs/notes.md",
  } as unknown as PreviewManager;
  (manager as { requests: HostRequestController }).requests = new HostRequestController(manager);
  const exporter = new HtmlExportController(manager);
  const handlers = new Map<string, (message: unknown, preview: PreviewSession) => unknown>();
  exporter.register({ on: (type: string, handler: never) => handlers.set(type, handler) } as unknown as PageMessageRouter);
  const posted: Array<Record<string, unknown>> = [];
  const preview = {
    documentUri: DOCUMENT,
    document: options.local === false ? { id: DOCUMENT, path: undefined } : { id: DOCUMENT, path: "/ws/docs/notes.md" },
    configuration: { maxContentWidth: 900 },
    panel: { bundleRoot: undefined },
    webview: { html: "", nonce: "", resources: new Map([["vscode-webview://x/pic.png#a", "/ws/docs/pic.png"]]) },
    postToPage: (message: Record<string, unknown>) => { posted.push(message); return Promise.resolve(true); },
  } as unknown as PreviewSession;
  let count = 0;
  return {
    written, calls, confirms, saves, infos, errors, preview, exporter,
    async request(body: string, userGesture = true) {
      count += 1;
      const editId = `export-${count}`;
      await handlers.get("previewExportHtml")!({
        type: "previewExportHtml", documentId: DOCUMENT, revision: 1, requestId: 1, editId,
        snapshot: snapshot(body), userGesture,
      }, preview);
      return posted.find((message) => message.editId === editId);
    },
  };
}

const LINKS = (targets: string[]): string =>
  targets.map((target, index) => `<a data-sphinx-preview-navigation="${target}">link ${index}</a>`).join(" ");

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-134
test("the save dialog proposes notes.html next to the file with the HTML filter, and the bytes written are the builder output", async () => {
  const h = harness();
  const body = "<h1>Notes</h1><p>text</p>";
  const result = await h.request(body);
  assert.deepEqual(h.saves, [{ defaultPath: "/ws/docs/notes.html".split("/").join(path.sep), filters: { HTML: ["html"] }, saveLabel: "Export" }]);
  assert.equal(h.written.length, 1);
  assert.equal(h.written[0]!.target, "/out/notes.html");
  const expected = buildHtmlExport(snapshot(body), { stem: "notes", maxContentWidth: 900, imageData: () => undefined });
  assert.equal(h.written[0]!.text, expected.html);
  assert.equal(result?.type, "previewExportHtmlResult");
  assert.equal(result?.ok, true);
  assert.equal(result?.fileName, "notes.html");
  assert.deepEqual(h.infos, ["Exported to `notes.html`."]);
  assert.deepEqual(h.calls, ["pickSaveFile"], "no relative link: no warning");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-134
test("a document with no local folder proposes the first workspace folder", async () => {
  const h = harness({ local: false });
  await h.request("<p>x</p>");
  assert.match(h.saves[0]!.defaultPath.split("\\").join("/"), /^\/ws\/notes\.html$/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-134
test("a cancelled save dialog writes nothing and shows no message", async () => {
  const h = harness({ savePath: undefined });
  const result = await h.request("<p>x</p>");
  assert.deepEqual(h.written, []);
  assert.deepEqual(h.infos, []);
  assert.deepEqual([result?.ok, result?.cancelled], [true, true]);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-134
test("a write error shows the error with its reason and the page gets the reason", async () => {
  const h = harness({ failWrite: true });
  const result = await h.request("<p>x</p>");
  assert.equal(h.errors.length, 1);
  assert.match(h.errors[0]!, /EACCES/u);
  assert.deepEqual(h.infos, []);
  assert.equal(result?.ok, false);
  assert.match(String(result?.reason), /EACCES/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-135
test("with relative links the warning comes before the save dialog and lists the targets", async () => {
  const h = harness();
  await h.request(LINKS(["other.md", "./sub/x.md#h", "wiki:Page", "other.md"]));
  assert.deepEqual(h.calls, ["confirm", "pickSaveFile"]);
  assert.match(h.confirms[0]!.message, /^3 links to other files will be removed/u);
  assert.equal(h.confirms[0]!.detail, "other.md\n./sub/x.md#h\nwiki:Page");
  assert.equal((h.confirms[0] as { confirmLabel?: string }).confirmLabel, "Export");
  assert.equal(h.written.length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-135
test("cancelling the warning stops the export: no save dialog and no file", async () => {
  const h = harness({ confirm: false });
  const result = await h.request(LINKS(["other.md"]));
  assert.deepEqual(h.calls, ["confirm"]);
  assert.deepEqual(h.written, []);
  assert.equal(result?.cancelled, true);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-135
test("the warning lists at most 20 targets, then counts the rest", () => {
  const targets = Array.from({ length: 23 }, (_unused, index) => `f${index}.md`);
  const { message, detail } = removedLinksWarning(targets);
  assert.match(message, /^23 links/u);
  const lines = detail.split("\n");
  assert.equal(lines.length, 21);
  assert.equal(lines[19], "f19.md");
  assert.equal(lines[20], "and 3 more");
  assert.equal(removedLinksWarning(["a.md"]).message, "1 link to another file will be removed from the exported page.");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-136
test("a mapped image is embedded from the file, an unmapped one is counted in the closing message", async () => {
  const h = harness();
  await h.request('<img src="vscode-webview://x/pic.png#a" alt="a"><img src="vscode-webview://x/other.png" alt="b">');
  assert.match(h.written[0]!.text, new RegExp(`src="data:image/png;base64,${PNG.toString("base64").replace(/[+/]/gu, "\\$&")}"`, "u"));
  assert.doesNotMatch(h.written[0]!.text, /vscode-webview/u);
  assert.deepEqual(h.infos, ["Exported to `notes.html`. 1 image could not be embedded."]);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-134
test("a snapshot with no gesture and no command is refused; one after the command is served once", async () => {
  const h = harness();
  const refused = await h.request("<p>x</p>", false);
  assert.equal(refused?.ok, false);
  assert.deepEqual(h.calls, []);
  assert.deepEqual(h.written, []);

  h.exporter.expectSnapshot(h.preview);
  const served = await h.request("<p>x</p>", false);
  assert.equal(served?.ok, true);
  assert.equal(h.written.length, 1);

  const again = await h.request("<p>x</p>", false);
  assert.equal(again?.ok, false, "the command's ask is spent by its snapshot");
  assert.equal(h.written.length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-135
test("a snapshot the host cannot read, or one of another document, is answered with a refusal and an error message", () => {
  const h = harness();
  const posted: Array<Record<string, unknown>> = [];
  const errors: string[] = [];
  const preview = {
    ...h.preview,
    disposed: false,
    postToPage: (message: Record<string, unknown>) => { posted.push(message); return Promise.resolve(true); },
  } as unknown as PreviewSession;
  const manager = {
    host: { logger: createMemoryLogger(), ui: { showError: (message: string) => { errors.push(message); return Promise.resolve(); } } },
    has: () => true,
  } as unknown as PreviewManager;
  (manager as { requests: HostRequestController }).requests = new HostRequestController(manager);
  const dispatcher = new PageMessageDispatcher(manager, { on: () => undefined } as unknown as PageMessageRouter);
  const identity = { type: "previewExportHtml", revision: 1, requestId: 1, userGesture: true };
  // A wrong shape: no snapshot at all.
  dispatcher.handle(preview, { ...identity, documentId: DOCUMENT, editId: "export-1", snapshot: "nope" });
  // A valid snapshot of another document.
  dispatcher.handle(preview, { ...identity, documentId: "file:///ws/other.md", editId: "export-2", snapshot: snapshot("<p>x</p>") });
  assert.deepEqual(posted.map((message) => [message.type, message.editId, message.ok, message.reason]), [
    ["previewExportHtmlResult", "export-1", false, EXPORT_REFUSED],
    ["previewExportHtmlResult", "export-2", false, EXPORT_REFUSED],
  ]);
  assert.deepEqual(errors, [EXPORT_REFUSED, EXPORT_REFUSED]);
  // A message with no edit id cannot be answered and is dropped.
  dispatcher.handle(preview, { ...identity, documentId: DOCUMENT, snapshot: "nope" });
  assert.equal(posted.length, 2);
});
