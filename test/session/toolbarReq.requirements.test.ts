/**
 * Requirement tests of the toolbar-navigation scope at host level: links, Back / Next, view
 * preferences, link discovery and scroll sync. A real `PreviewManager` runs over a small fake host;
 * messages go through `handlePageMessage`, so the gates, the validators and the handlers are the
 * production ones.
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import type { HostDocument } from "../../src/host-api/documentStore";
import type { HostServices } from "../../src/host-api/index";
import type { PanelGroups, PreviewPanel } from "../../src/host-api/previewPanel";
import type { PairedEditor } from "../../src/host-api/textEditors";
import { createNodeFileSystem } from "../../src/node-services/nodeFileSystem";
import { EDIT_REQUEST_TYPES } from "../../src/session/pageMessages";
import { PreviewManager } from "../../src/session/previewManager";
import { createPreviewNavigator } from "../../src/session/previewNavigator";
import { PreviewSession } from "../../src/session/previewSession";

const files = createNodeFileSystem();

interface Fixture {
  readonly root: string;
  readonly manager: PreviewManager;
  readonly preview: PreviewSession;
  readonly posted: Array<Record<string, any>>;
  readonly shown: Array<{ id: string; selection: unknown }>;
  readonly warnings: string[];
  readonly searches: string[];
  readonly state: { requestId: number; open: (id: string) => Promise<HostDocument>; editors: PairedEditor[] };
  /** The identity of the render the page shows. */
  identity(): { documentId: string; revision: number; requestId: number };
  send(type: string, extra?: Record<string, unknown>): PromiseLike<void> | undefined;
  cleanup(): void;
}

function fileDocument(filePath: string, text = ""): HostDocument {
  const lines = text.split("\n");
  return {
    id: pathToFileURL(filePath).toString(),
    path: filePath,
    revision: 1,
    eol: "\n",
    isDirty: false,
    lineCount: lines.length,
    getText: () => text,
    lineText: (index: number) => lines[index] ?? "",
  };
}

/** A manager over a temporary folder with `active.md`; the preview is read-only when asked. */
function fixture(options: { readOnly?: boolean; followsActiveEditor?: boolean; activeText?: string } = {}): Fixture {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "toolbar-req-")));
  const activePath = path.join(root, "active.md");
  fs.writeFileSync(activePath, options.activeText ?? "# Active\n\n## Part\n");
  const posted: Array<Record<string, any>> = [];
  const shown: Array<{ id: string; selection: unknown }> = [];
  const warnings: string[] = [];
  const searches: string[] = [];
  const state = {
    requestId: 1,
    open: (id: string): Promise<HostDocument> => {
      const target = decodeURIComponent(new URL(id).pathname);
      return Promise.resolve(fileDocument(target, fs.existsSync(target) ? fs.readFileSync(target, "utf8") : ""));
    },
    editors: [] as PairedEditor[],
  };
  const host = {
    capabilities: { editorPairing: true },
    files,
    documents: {
      idOf: (filePath: string) => pathToFileURL(filePath).toString(),
      open: (id: string) => state.open(id),
    },
    navigation: {
      showDocument: (id: string, selection?: unknown) => {
        shown.push({ id, selection });
        return Promise.resolve();
      },
      openExternal: () => Promise.resolve(true),
    },
    ui: { showWarning: (message: string) => { warnings.push(message); return Promise.resolve(); } },
    workspace: {
      findFiles: (search: { pattern: string }) => {
        searches.push(search.pattern);
        return Promise.resolve([] as string[]);
      },
    },
    editors: { visible: () => state.editors },
  } as unknown as HostServices;
  const groups: PanelGroups = { lockNewPanelGroup: () => Promise.resolve(false), release: () => undefined };
  const manager = new PreviewManager(host, groups);
  const panel = { postMessage: (message: Record<string, any>) => { posted.push(message); return Promise.resolve(true); } };
  const document = fileDocument(activePath, options.activeText ?? "# Active\n\n## Part\n");
  const readOnly = options.readOnly ?? false;
  const preview = new PreviewSession({
    panel: panel as unknown as PreviewPanel,
    followsActiveEditor: options.followsActiveEditor ?? true,
    document,
    documentUri: document.id,
    workspaceRoot: root,
    sessionRoots: readOnly ? [] : [root],
    navigationRoots: [root],
    workspaceFolder: undefined,
    readOnly,
    webview: { html: "", diagnostics: [], nonce: "" },
    states: new Map() as never,
    state: undefined,
    status: "ready" as never,
    configuration: {
      scrollPreviewWithEditor: false,
      scrollEditorWithPreview: false,
      markEditorSelection: false,
    } as never,
    plantUmlConfiguration: {} as never,
    plantUmlEngineSettings: {} as never,
    frontmatterConfiguration: { allowOutsideWorkspaceLinks: false } as never,
  });
  preview.stage = {
    activeDocumentPath: activePath,
    activeDocumentIdentity: document.id,
    activeDocumentRevision: 1,
    requestId: 1,
  } as never;
  (manager as unknown as { live: Set<PreviewSession> }).live.add(preview);
  // The boot context needs a full render; the discovery answer only needs the identity of the page.
  manager.rendering.runtimeContext = ((stage: { activeDocumentIdentity: string; activeDocumentRevision: number; requestId: number }) => ({
    documentId: stage.activeDocumentIdentity,
    revision: stage.activeDocumentRevision,
    requestId: stage.requestId,
  })) as never;
  const identity = () => ({
    documentId: preview.stage!.activeDocumentIdentity,
    revision: preview.stage!.activeDocumentRevision,
    requestId: preview.stage!.requestId,
  });
  return {
    root, manager, preview, posted, shown, warnings, searches, state, identity,
    send: (type, extra = {}) => manager.handlePageMessage(preview, { type, ...identity(), ...extra }),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

async function until(condition: () => boolean, what: string): Promise<void> {
  for (let attempt = 0; attempt < 200 && !condition(); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.ok(condition(), what);
}

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 30));

function editorOf(preview: PreviewSession, init: { first?: number; cursor: number }): PairedEditor {
  return {
    document: { id: preview.documentUri } as HostDocument,
    fsPath: preview.stage!.activeDocumentPath,
    firstVisibleLine: init.first,
    isLineVisible: () => true,
    selectionLine: init.cursor,
    column: 1,
    revealLine: () => undefined,
  };
}

/** Makes the preview show another document, as a switch of the panel does. */
function showOther(preview: PreviewSession, id: string): void {
  (preview as { documentUri: string }).documentUri = id;
  preview.stage = { ...preview.stage!, activeDocumentIdentity: id } as never;
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-006
test("a read-only preview stores a view preference like a writable one", async () => {
  const f = fixture({ readOnly: true });
  try {
    assert.equal(EDIT_REQUEST_TYPES.has("previewViewPreferenceChanged"), false);
    assert.equal(f.manager.choices.viewPreferences.toc, false);
    await f.send("previewViewPreferenceChanged", { preference: "toc", value: true });
    assert.equal(f.manager.choices.viewPreferences.toc, true);
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-214
test("only the incoming-change preference schedules the update of the marks at once", async () => {
  const f = fixture();
  try {
    const scheduled: Array<[PreviewSession, number]> = [];
    f.manager.incoming.schedule = ((preview: PreviewSession, delay: number) => {
      scheduled.push([preview, delay]);
    }) as never;
    await f.send("previewViewPreferenceChanged", { preference: "toc", value: true });
    assert.equal(scheduled.length, 0);
    await f.send("previewViewPreferenceChanged", { preference: "incomingChanges", value: false });
    assert.deepEqual(scheduled, [[f.preview, 0]]);
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-113
test("a link message without a request records the page state and follows nothing", async () => {
  const f = fixture();
  try {
    fs.writeFileSync(path.join(f.root, "other.md"), "# Other\n");
    let resolved = 0;
    const resolve = f.manager.navigator.resolvePreviewNavigation;
    f.manager.navigator.resolvePreviewNavigation = ((...args: Parameters<typeof resolve>) => {
      resolved += 1;
      return resolve(...args);
    }) as typeof resolve;
    await f.send("previewLink", { sourceLine: 3 });
    assert.equal(resolved, 0);
    assert.equal(f.shown.length, 0);
    assert.equal(f.preview.state?.sourceLine, 3, "the scroll state is recorded");
    await f.send("previewLink", { request: "other.md" });
    assert.equal(resolved, 1);
    assert.equal(f.shown.length, 1);
  } finally {
    f.cleanup();
  }
});

test("a read-only preview follows a link to a sibling Markdown file", async () => {
  const f = fixture({ readOnly: true });
  try {
    fs.writeFileSync(path.join(f.root, "sibling.md"), "# Sibling\n");
    assert.equal(EDIT_REQUEST_TYPES.has("previewLink"), false);
    await f.send("previewLink", { request: "sibling.md" });
    assert.deepEqual(f.shown.map((entry) => path.basename(new URL(entry.id).pathname)), ["sibling.md"]);
    assert.deepEqual(f.warnings, []);
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-205
test("following a link applies the pending saves before the link is resolved", async () => {
  const f = fixture();
  try {
    fs.writeFileSync(path.join(f.root, "other.md"), "# Other\n");
    const order: string[] = [];
    f.preview.edits.pendingSaves.add("save-1" as never);
    setTimeout(() => {
      order.push("saved");
      f.preview.edits.pendingSaves.clear();
    }, 25);
    const resolve = f.manager.navigator.resolvePreviewNavigation;
    f.manager.navigator.resolvePreviewNavigation = ((...args: Parameters<typeof resolve>) => {
      order.push("resolved");
      return resolve(...args);
    }) as typeof resolve;
    await f.send("previewLink", { request: "other.md" });
    assert.deepEqual(order, ["saved", "resolved"]);
    assert.equal(f.shown.length, 1);
    // No edit in flight: the link resolves at once.
    order.length = 0;
    await f.send("previewLink", { request: "other.md" });
    assert.deepEqual(order, ["resolved"]);
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-065
test("a link request of a stale page or a disposed preview is ignored", async () => {
  const f = fixture();
  try {
    fs.writeFileSync(path.join(f.root, "other.md"), "# Other\n");
    await f.send("previewLink", { request: "other.md", requestId: 0 });
    await f.send("previewLink", { request: "other.md", revision: 0 });
    await f.send("previewLink", { request: "other.md", documentId: "file:///elsewhere.md" });
    assert.equal(f.shown.length, 0);
    assert.equal(f.manager.history.historyOf(f.preview).canBack(), false);
    f.preview.disposed = true;
    await f.send("previewLink", { request: "other.md" });
    assert.equal(f.shown.length, 0);
    assert.deepEqual(f.warnings, []);
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-059
test("a locked preview records anchor jumps only", async () => {
  const f = fixture({ followsActiveEditor: false });
  try {
    fs.writeFileSync(path.join(f.root, "second.md"), "# Second\n");
    const history = f.manager.history.historyOf(f.preview);
    await f.send("previewLink", { request: "second.md" });
    assert.equal(f.shown.length, 1, "second.md opens");
    assert.equal(history.canBack(), false);
    assert.equal(history.canForward(), false);
    await f.send("previewLink", { request: "#part" });
    assert.equal(history.canBack(), true, "the anchor jump is recorded");
  } finally {
    f.cleanup();
  }
});

test("a link to a file that is not Markdown opens without a history entry", async () => {
  const f = fixture();
  try {
    fs.writeFileSync(path.join(f.root, "notes.txt"), "text\n");
    fs.writeFileSync(path.join(f.root, "UPPER.MD"), "# Upper\n");
    const history = f.manager.history.historyOf(f.preview);
    await f.send("previewLink", { request: "notes.txt" });
    assert.equal(f.shown.length, 1, "the file opens");
    assert.equal(history.canBack(), false, "the history is unchanged");
    await f.send("previewLink", { request: "UPPER.MD" });
    assert.equal(f.shown.length, 2);
    assert.equal(history.canBack(), true, "the extension is compared in lower case");
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-077
test("a file that cannot be opened shows a warning with the path and the reason", async () => {
  const f = fixture();
  try {
    fs.writeFileSync(path.join(f.root, "bin.md"), "# Bin\n");
    fs.writeFileSync(path.join(f.root, "fine.md"), "# Fine\n");
    const host = f.manager.host;
    const show = host.navigation.showDocument;
    host.navigation.showDocument = (id, selection) => {
      if (id.endsWith("bin.md")) return Promise.reject(new Error("is binary"));
      return show(id, selection);
    };
    await f.send("previewLink", { request: "fine.md" });
    assert.deepEqual(f.warnings, []);
    await f.send("previewLink", { request: "bin.md" });
    assert.deepEqual(f.warnings, [
      `Markdown OKF-Schema Studio could not open ${path.join(f.root, "bin.md")}: is binary`,
    ]);
  } finally {
    f.cleanup();
  }
});

test("a link whose resolution fails shows a warning and records nothing", async () => {
  const f = fixture();
  try {
    fs.writeFileSync(path.join(f.root, "other.md"), "# Other\n");
    const resolve = f.manager.navigator.resolvePreviewNavigation;
    f.manager.navigator.resolvePreviewNavigation = () => Promise.reject(new Error("boom"));
    await f.send("previewLink", { request: "other.md" });
    assert.deepEqual(f.warnings, ["Preview link resolution failed: Error: boom"]);
    assert.equal(f.shown.length, 0);
    assert.equal(f.manager.history.historyOf(f.preview).canBack(), false);
    f.manager.navigator.resolvePreviewNavigation = resolve;
    await f.send("previewLink", { request: "other.md" });
    assert.equal(f.warnings.length, 1, "a resolvable link shows no such warning");
  } finally {
    f.cleanup();
  }
});

test("each preview panel has its own history that outlives a session", () => {
  const first = fixture();
  const second = fixture();
  try {
    const history = first.manager.history.historyOf(first.preview);
    assert.equal(first.manager.history.historyOf(first.preview), history);
    first.manager.history.recordNavigation(first.preview, { uri: "file:///a.md", line: 1 });
    assert.equal(history.canBack(), true);
    const other = first.manager.history.historyOf(second.preview);
    assert.notEqual(other, history);
    assert.equal(other.canBack(), false);
    assert.equal(other.canForward(), false);
    // A session recreated for the same panel (a switch to another root) finds the same history.
    const again = Object.create(first.preview, {}) as PreviewSession;
    assert.equal(first.manager.history.historyOf(again), history);
  } finally {
    first.cleanup();
    second.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-054
test("Back with nowhere to go only posts the history state again", async () => {
  const f = fixture();
  try {
    await f.send("previewHistoryGo", { direction: "back" });
    const states = f.posted.filter((message) => message.type === "previewHistoryState");
    assert.equal(states.length, 1);
    assert.equal(states[0].canBack, false);
    assert.equal(f.posted.length, 1, "nothing else is posted");
    assert.equal(f.shown.length, 0);
    // With a previous place the move happens.
    const other = path.join(f.root, "other.md");
    fs.writeFileSync(other, "# Other\n");
    const history = f.manager.history.historyOf(f.preview);
    history.push({ uri: pathToFileURL(other).toString(), line: 1 });
    history.push({ uri: f.preview.documentUri, line: 1 });
    await f.send("previewHistoryGo", { direction: "back" });
    assert.equal(f.shown.length, 1);
  } finally {
    f.cleanup();
  }
});

test("a Back or Next that cannot open its document shows a warning", async () => {
  const f = fixture();
  try {
    const a = pathToFileURL(path.join(f.root, "a.md")).toString();
    const b = pathToFileURL(path.join(f.root, "b.md")).toString();
    const history = f.manager.history.historyOf(f.preview);
    history.push({ uri: a, line: 1 });
    history.push({ uri: b, line: 1 });
    f.state.open = () => Promise.reject(new Error("deleted"));
    showOther(f.preview, b);
    await f.send("previewHistoryGo", { direction: "back" });
    assert.deepEqual(f.warnings, ["Markdown OKF-Schema Studio could not go back: deleted"]);
    // The document did not change, so the history position did not move either.
    assert.equal(history.snapshot().index, 1);
    assert.equal(history.canBack(), true);
    assert.equal(history.canForward(), false);
    const afterBack = f.posted.filter((message) => message.type === "previewHistoryState").at(-1)!;
    assert.equal(afterBack.canBack, true);
    assert.equal(afterBack.canForward, false);
    history.back();
    showOther(f.preview, a);
    await f.send("previewHistoryGo", { direction: "forward" });
    assert.equal(f.warnings[1], "Markdown OKF-Schema Studio could not go forward: deleted");
    assert.equal(history.snapshot().index, 0);
    assert.equal(history.canForward(), true);
  } finally {
    f.cleanup();
  }
});

test("Back and Next work in a read-only preview", async () => {
  const f = fixture({ readOnly: true });
  try {
    assert.equal(EDIT_REQUEST_TYPES.has("previewHistoryGo"), false);
    const other = path.join(f.root, "other.md");
    fs.writeFileSync(other, "# Other\n");
    const history = f.manager.history.historyOf(f.preview);
    history.push({ uri: pathToFileURL(other).toString(), line: 1 });
    history.push({ uri: f.preview.documentUri, line: 1 });
    await f.send("previewHistoryGo", { direction: "back" });
    assert.deepEqual(f.shown.map((entry) => entry.id), [pathToFileURL(other).toString()]);
  } finally {
    f.cleanup();
  }
});

test("a read-only preview answers the link discovery", async () => {
  const f = fixture({ readOnly: true });
  try {
    assert.equal(EDIT_REQUEST_TYPES.has("previewLinkDiscover"), false);
    fs.writeFileSync(path.join(f.root, "sibling.md"), "# Sibling\n");
    await f.send("previewLinkDiscover", { requests: ["sibling.md"] });
    await until(() => f.posted.some((message) => message.type === "previewLinkTargets"), "an answer");
    const answer = f.posted.find((message) => message.type === "previewLinkTargets")!;
    assert.equal(answer.targets[0].kind, "local");
    assert.equal(answer.targets[0].path, path.join(f.root, "sibling.md"));
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-079
test("the host answers a discovery with one target per request, in order", async () => {
  const f = fixture();
  try {
    fs.writeFileSync(path.join(f.root, "here.md"), "# Here\n");
    const requests = ["gone.md", "here.md", "javascript:alert(1)"];
    await f.send("previewLinkDiscover", { requests });
    await until(() => f.posted.some((message) => message.type === "previewLinkTargets"), "an answer");
    const targets = f.posted.find((message) => message.type === "previewLinkTargets")!.targets as Array<Record<string, string>>;
    assert.deepEqual(targets.map((target) => target.request), requests);
    assert.deepEqual(targets.map((target) => target.kind), ["blocked", "local", "blocked"]);
    assert.equal(targets[1].path, path.join(f.root, "here.md"));
    assert.equal(targets[0].reason, "File not found: gone.md");
    assert.equal(targets[2].reason, "The navigation scheme is not allowed in the preview.");
  } finally {
    f.cleanup();
  }
});

test("a discovery of another render gets no answer", async () => {
  const f = fixture();
  try {
    fs.writeFileSync(path.join(f.root, "here.md"), "# Here\n");
    await f.send("previewLinkDiscover", { requests: ["here.md"], requestId: 0 });
    await settle();
    assert.equal(f.posted.length, 0, "an older request id is dropped");
    // A discovery in flight when a new render is shown.
    const resolve = f.manager.navigator.resolvePreviewNavigation;
    let release!: () => void;
    const gate = new Promise<void>((done) => { release = done; });
    let finished = false;
    f.manager.navigator.resolvePreviewNavigation = (async (...args: Parameters<typeof resolve>) => {
      await gate;
      const result = await resolve(...args);
      finished = true;
      return result;
    }) as typeof resolve;
    await f.send("previewLinkDiscover", { requests: ["here.md"] });
    f.preview.stage = { ...f.preview.stage!, requestId: 2 } as never;
    release();
    await until(() => finished, "the resolution ended");
    await settle();
    assert.equal(f.posted.some((message) => message.type === "previewLinkTargets"), false);
  } finally {
    f.cleanup();
  }
});

test("a failed discovery shows a warning and sends no answer", async () => {
  const f = fixture();
  try {
    f.manager.navigator.resolvePreviewNavigation = () => Promise.reject(new Error("boom"));
    await f.send("previewLinkDiscover", { requests: ["here.md"] });
    await until(() => f.warnings.length === 1, "a warning");
    assert.equal(f.warnings[0], "Preview link discovery failed: Error: boom");
    assert.equal(f.posted.some((message) => message.type === "previewLinkTargets"), false);
    // A preview closed meanwhile shows no warning.
    f.manager.navigator.resolvePreviewNavigation = async () => {
      f.preview.disposed = true;
      throw new Error("late");
    };
    f.preview.disposed = false;
    await f.send("previewLinkDiscover", { requests: ["here.md"] });
    await settle();
    assert.equal(f.warnings.length, 1);
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-098
test("one search per wikilink name runs at a time", async () => {
  const f = fixture();
  try {
    let release!: () => void;
    const gate = new Promise<string[]>((done) => { release = () => done([]); });
    f.manager.host.workspace.findFiles = (search) => {
      f.searches.push(search.pattern);
      return gate;
    };
    const both = Promise.all([
      f.manager.links.resolve(f.preview, "wiki:Note"),
      f.manager.links.resolve(f.preview, "wiki:Note"),
    ]);
    await settle();
    assert.equal(f.searches.length, 1, "two requests share one search");
    release();
    await both;
    f.manager.host.workspace.findFiles = (search) => {
      f.searches.push(search.pattern);
      return Promise.resolve([]);
    };
    await f.manager.links.resolve(f.preview, "wiki:Note");
    assert.equal(f.searches.length, 2, "a request after the search ended runs a new one");
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-007
test("in a read-only preview only the document's folder is allowed", async () => {
  const f = fixture({ readOnly: true });
  try {
    fs.mkdirSync(path.join(f.root, "below"));
    fs.writeFileSync(path.join(f.root, "below", "inner.md"), "# Inner\n");
    const inside = await f.manager.links.resolve(f.preview, "below/inner.md");
    assert.equal(inside.kind, "local");
    const outside = await f.manager.links.resolve(f.preview, "../other.md");
    assert.deepEqual(outside, {
      kind: "blocked",
      reason: "The navigation target is outside the standalone document directory.",
    });
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-094
test("a symbolic link out of the workspace is blocked", async () => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "toolbar-req-sym-")));
  const outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "toolbar-req-out-")));
  try {
    const { validatePreviewNavigation } = createPreviewNavigator(files);
    fs.writeFileSync(path.join(outside, "secret.md"), "# Secret\n");
    fs.writeFileSync(path.join(root, "real.md"), "# Real\n");
    fs.symlinkSync(path.join(outside, "secret.md"), path.join(root, "out.md"));
    fs.symlinkSync(path.join(root, "real.md"), path.join(root, "in.md"));
    const active = path.join(root, "active.md");
    assert.deepEqual(await validatePreviewNavigation("out.md", active, root), {
      kind: "blocked",
      reason: "The navigation target escapes the workspace.",
    });
    assert.deepEqual(await validatePreviewNavigation("in.md", active, root), {
      kind: "local",
      path: path.join(root, "real.md"),
      suffix: "",
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("a target that is missing or not a regular file is blocked", async () => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "toolbar-req-kind-")));
  try {
    const { validatePreviewNavigation } = createPreviewNavigator(files);
    fs.mkdirSync(path.join(root, "folder"));
    const active = path.join(root, "active.md");
    assert.deepEqual(await validatePreviewNavigation("missing.md", active, root), {
      kind: "blocked",
      reason: "The navigation target is unavailable.",
    });
    assert.deepEqual(await validatePreviewNavigation("folder", active, root), {
      kind: "blocked",
      reason: "The navigation target is not a regular file.",
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-128
test("the host sends the editor's cursor line and no scroll line", () => {
  const f = fixture();
  try {
    f.preview.configuration = { ...f.preview.configuration, markEditorSelection: true } as never;
    f.state.editors = [editorOf(f.preview, { first: 0, cursor: 11 })];
    f.manager.scroll.markEditorSelectionInPreview(f.preview);
    assert.equal(f.posted.length, 1);
    assert.equal(f.posted[0].type, "sourceScroll");
    assert.equal(f.posted[0].selectionLine, 12);
    assert.equal("line" in f.posted[0], false, "the page does not scroll");
    f.preview.configuration = { ...f.preview.configuration, markEditorSelection: false } as never;
    f.manager.scroll.markEditorSelectionInPreview(f.preview);
    f.preview.configuration = { ...f.preview.configuration, markEditorSelection: true } as never;
    f.state.editors = [];
    f.manager.scroll.markEditorSelectionInPreview(f.preview);
    assert.equal(f.posted.length, 1, "nothing is posted with the setting off or without an editor");
  } finally {
    f.cleanup();
  }
});

test("the host sends the first visible line and the cursor line when the editor scrolls", () => {
  const f = fixture();
  try {
    const editor = editorOf(f.preview, { first: 19, cursor: 4 });
    f.state.editors = [editor];
    f.manager.scroll.syncEditorToPreview(editor);
    assert.equal(f.posted.length, 0, "neither the mark nor the following is on");
    f.preview.configuration = { ...f.preview.configuration, markEditorSelection: true } as never;
    f.manager.scroll.syncEditorToPreview(editor);
    assert.equal(f.posted.length, 1);
    assert.equal(f.posted[0].type, "sourceScroll");
    assert.equal(f.posted[0].line, 20);
    assert.equal(f.posted[0].selectionLine, 5);
    // A cursor move alone posts nothing: the host registers no selection listener.
    const sources = ["src/host-vscode/activation.ts", "src/host-vscode/vscodeHost.ts"]
      .map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");
    assert.doesNotMatch(sources, /onDidChangeTextEditorSelection/u);
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-120
test("turning the anchor mode on aligns the preview with the text editor", async () => {
  const f = fixture();
  try {
    f.state.editors = [editorOf(f.preview, { first: 6, cursor: 2 })];
    await f.send("previewAnchorModeChanged", { anchorToEditor: false });
    assert.equal(f.posted.filter((message) => message.type === "sourceScroll").length, 0);
    await f.send("previewAnchorModeChanged", { anchorToEditor: true });
    const scrolls = f.posted.filter((message) => message.type === "sourceScroll");
    assert.equal(scrolls.length, 1);
    assert.equal(scrolls[0].line, 7);
    assert.equal(f.preview.configuration.scrollPreviewWithEditor, true, "the page follows the editor now");
  } finally {
    f.cleanup();
  }
});
