/**
 * Session tests of the links, Back and Next followed inside a Studio tab: the target's line goes
 * with the open, and the history follows what opened (a new Studio tab shares it, a Studio tab
 * already open keeps its own and gains the move, a text editor records nothing). A real
 * `PreviewManager` runs over a small fake host; messages go through `handlePageMessage`.
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { HostDocument, TextRange } from "../../src/host-api/documentStore";
import type { HostServices } from "../../src/host-api/index";
import type { ShowDocumentOptions, ShowDocumentOutcome } from "../../src/host-api/navigation";
import type { PanelGroups, PreviewPanel } from "../../src/host-api/previewPanel";
import { createNodeFileSystem } from "../../src/node-services/nodeFileSystem";
import { PreviewManager } from "../../src/session/previewManager";
import { PreviewSession } from "../../src/session/previewSession";
import { nodeHostPorts } from "./nodeHostPorts";

function fileDocument(filePath: string): HostDocument {
  const text = fs.readFileSync(filePath, "utf8");
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

interface Shown {
  id: string;
  selection: TextRange | undefined;
  options: ShowDocumentOptions | undefined;
}

interface Fixture {
  root: string;
  manager: PreviewManager;
  shown: Shown[];
  /** What the next `showDocument` does and answers: set by a test. */
  navigate: (shown: Shown) => ShowDocumentOutcome | undefined;
  /** A session of `name` (a file of the root) in its own panel, live in the manager. */
  session(name: string, options?: { inStudioTab?: boolean; followsActiveEditor?: boolean }): PreviewSession;
  idOf(name: string): string;
  send(preview: PreviewSession, type: string, extra?: Record<string, unknown>): PromiseLike<void> | undefined;
  cleanup(): void;
}

function fixture(): Fixture {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "studio-tab-nav-")));
  for (const [name, text] of [["source.md", "# Source\n\n## Part\n\ntext\n"], ["target.md", "# Target\n\ntext\n\n## Heading\n"],
    ["notes.txt", "notes\n"]] as const) {
    fs.writeFileSync(path.join(root, name), text);
  }
  const shown: Shown[] = [];
  const self: Fixture = {
    root,
    manager: undefined as never,
    shown,
    navigate: () => "other",
    session: undefined as never,
    idOf: (name) => pathToFileURL(path.join(root, name)).toString(),
    send: undefined as never,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
  const host = {
    ...nodeHostPorts,
    capabilities: { editorPairing: true },
    files: createNodeFileSystem(),
    documents: {
      idOf: (filePath: string) => pathToFileURL(filePath).toString(),
      open: (id: string) => Promise.resolve(fileDocument(fileURLToPath(id))),
      isApplying: () => false,
    },
    navigation: {
      showDocument: (id: string, selection?: TextRange, options?: ShowDocumentOptions) => {
        const entry = { id, selection, options };
        shown.push(entry);
        return Promise.resolve(self.navigate(entry));
      },
      openExternal: () => Promise.resolve(true),
    },
    settings: { section: () => ({ get: (_key: string, fallback: unknown) => fallback }) },
    ui: { showWarning: () => Promise.resolve() },
    workspace: { findFiles: () => Promise.resolve([] as string[]) },
    editors: { visible: () => [] },
    theme: { kind: "dark" },
    logger: { error: () => undefined },
  } as unknown as HostServices;
  const groups: PanelGroups = { lockNewPanelGroup: () => Promise.resolve(false), release: () => undefined };
  const manager = new PreviewManager(host, groups);
  self.manager = manager;
  self.session = (name, options = {}) => {
    const document = fileDocument(path.join(root, name));
    const panel = { postMessage: () => Promise.resolve(true), column: 1 };
    const preview = new PreviewSession({
      panel: panel as unknown as PreviewPanel,
      followsActiveEditor: options.followsActiveEditor ?? false,
      document,
      documentUri: document.id,
      workspaceRoot: root,
      sessionRoots: [root],
      navigationRoots: [root],
      workspaceFolder: undefined,
      restrictedReads: false,
      webview: { html: "", diagnostics: [], nonce: "" },
      states: new Map() as never,
      state: undefined,
      status: "ready" as never,
      configuration: { scrollPreviewWithEditor: false, scrollEditorWithPreview: false, markEditorSelection: false } as never,
      plantUmlConfiguration: {} as never,
      plantUmlEngineSettings: {} as never,
      frontmatterConfiguration: { allowOutsideWorkspaceLinks: false } as never,
    });
    preview.inStudioTab = options.inStudioTab ?? true;
    preview.stage = {
      activeDocumentPath: path.join(root, name),
      activeDocumentIdentity: document.id,
      activeDocumentRevision: 1,
      requestId: 1,
    } as never;
    (manager as unknown as { live: Set<PreviewSession> }).live.add(preview);
    return preview;
  };
  self.send = (preview, type, extra = {}) => manager.handlePageMessage(preview, {
    type,
    documentId: preview.stage!.activeDocumentIdentity,
    revision: 1,
    requestId: 1,
    ...extra,
  });
  return self;
}

const lineOf = (entry: Shown): number | undefined => entry.selection === undefined ? undefined : entry.selection.start.line + 1;

// @tests_req SwRS-MDOKFSTUDIO-LIFE-196#S1
test("a link with a heading anchor followed in a Studio tab hands the heading's line with the open", async () => {
  const f = fixture();
  try {
    const source = f.session("source.md");
    await f.send(source, "previewLink", { request: "target.md#heading" });
    assert.equal(f.shown.length, 1);
    assert.equal(f.shown[0]!.id, f.idOf("target.md"));
    assert.equal(lineOf(f.shown[0]!), 5, "the heading's line");
    assert.deepEqual(f.shown[0]!.options, { fromStudioTab: true, line: 5 });
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-196#S2
test("a link with a marker line and a link with neither hand their line, 1 for neither", async () => {
  const f = fixture();
  try {
    const source = f.session("source.md");
    await f.send(source, "previewLink", { request: "target.md#L3" });
    assert.deepEqual(f.shown[0]!.options, { fromStudioTab: true, line: 3 });
    await f.send(source, "previewLink", { request: "target.md" });
    assert.deepEqual(f.shown[1]!.options, { fromStudioTab: true, line: 1 });
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-197#S1
test("a link that opens a new Studio tab records the move, and the new tab shares the source's history", async () => {
  const f = fixture();
  try {
    const source = f.session("source.md");
    let created: PreviewSession | undefined;
    f.navigate = () => {
      created = f.session("target.md");
      return "studio-created";
    };
    await f.send(source, "previewLink", { request: "target.md#heading" });
    const history = f.manager.history.historyOf(source);
    assert.equal(history.canBack(), true, "the source records the move");
    assert.equal(f.manager.history.historyOf(created!), history, "the created tab shares the same history object");
    assert.equal(history.snapshot().entries.at(-1)!.line, 5);
    // Back in the target tab returns to the place left in the source, at its line.
    await f.send(created!, "previewHistoryGo", { direction: "back" });
    assert.equal(f.shown.length, 2);
    assert.equal(f.shown[1]!.id, f.idOf("source.md"));
    assert.deepEqual(f.shown[1]!.options, { fromStudioTab: true, line: 1 });
    // Next in the source tab goes to the target at its line again.
    await f.send(source, "previewHistoryGo", { direction: "forward" });
    assert.equal(f.shown[2]!.id, f.idOf("target.md"));
    assert.deepEqual(f.shown[2]!.options, { fromStudioTab: true, line: 5 });
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-197#S1
test("a link to a Studio tab that is already open keeps its own history and appends the move to it", async () => {
  const f = fixture();
  try {
    const source = f.session("source.md");
    const existing = f.session("target.md");
    // The existing tab has its own history: an in-page anchor jump.
    f.manager.history.recordNavigation(existing, { uri: f.idOf("target.md"), line: 3 });
    const ownBefore = f.manager.history.historyOf(existing);
    f.navigate = () => "studio-existing";
    await f.send(source, "previewLink", { request: "target.md#heading" });
    assert.equal(f.manager.history.historyOf(existing), ownBefore, "the existing tab keeps its own history object");
    assert.notEqual(f.manager.history.historyOf(source), ownBefore, "not shared");
    assert.equal(f.manager.history.historyOf(source).canBack(), true, "the source records the move in its own");
    assert.deepEqual(ownBefore.snapshot().entries, [
      { uri: f.idOf("target.md"), line: 1 },
      { uri: f.idOf("target.md"), line: 3 },
      { uri: f.idOf("source.md"), line: 1 },
      { uri: f.idOf("target.md"), line: 5 },
    ]);
    // Back in the existing tab returns first to the place left in the source, then to its own earlier place.
    await f.send(existing, "previewHistoryGo", { direction: "back" });
    assert.equal(f.shown.at(-1)!.id, f.idOf("source.md"));
    assert.deepEqual(ownBefore.snapshot().entries[ownBefore.snapshot().index], { uri: f.idOf("source.md"), line: 1 });
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-197#S2
test("a link from a Studio tab that opens as text records nothing, in either history", async () => {
  const f = fixture();
  try {
    const source = f.session("source.md");
    f.navigate = () => "other";
    await f.send(source, "previewLink", { request: "target.md#heading" });
    assert.equal(f.shown.length, 1, "the file still opens");
    assert.equal(f.manager.history.historyOf(source).canBack(), false);
    assert.equal(f.manager.history.historyOf(source).canForward(), false);
    // A host that reports nothing counts as "other".
    f.navigate = () => undefined;
    await f.send(source, "previewLink", { request: "target.md" });
    assert.equal(f.manager.history.historyOf(source).canBack(), false);
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-197#S2
test("a link to a file that is not Markdown opens without the Studio tab hand-off and without a history entry", async () => {
  const f = fixture();
  try {
    const source = f.session("source.md");
    await f.send(source, "previewLink", { request: "notes.txt" });
    assert.equal(f.shown.length, 1);
    assert.equal(f.shown[0]!.options, undefined);
    assert.equal(f.manager.history.historyOf(source).canBack(), false);
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-059#S2
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-059#S8
test("a fixed preview that is not a Studio tab records anchor jumps only and hands no line", async () => {
  const f = fixture();
  try {
    const restored = f.session("source.md", { inStudioTab: false });
    const history = f.manager.history.historyOf(restored);
    await f.send(restored, "previewLink", { request: "target.md" });
    assert.equal(f.shown.length, 1, "target.md opens");
    assert.equal(f.shown[0]!.options, undefined, "no Studio hand-off");
    assert.equal(history.canBack(), false);
    await f.send(restored, "previewLink", { request: "#part" });
    assert.equal(history.canBack(), true, "the anchor jump is recorded");
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-191#S1
test("the side preview that follows the editor hands no Studio tab line and keeps recording its links", async () => {
  const f = fixture();
  try {
    const side = f.session("source.md", { inStudioTab: false, followsActiveEditor: true });
    await f.send(side, "previewLink", { request: "target.md#heading" });
    assert.equal(f.shown[0]!.options, undefined);
    assert.equal(f.manager.history.historyOf(side).canBack(), true);
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-196#S1
test("Back and Next from a Studio tab to a file whose Studio tab is open elsewhere ask the host to reveal it, the same call as a link", async () => {
  const f = fixture();
  try {
    const source = f.session("source.md");
    const existing = f.session("target.md");
    f.manager.history.shareHistory(source, existing);
    f.manager.history.recordNavigation(source, { uri: f.idOf("target.md"), line: 5 });
    f.navigate = () => "studio-existing";
    await f.send(existing, "previewHistoryGo", { direction: "back" });
    assert.deepEqual(f.shown[0]!.options, { fromStudioTab: true, line: 1 });
    assert.equal(f.shown[0]!.id, f.idOf("source.md"));
    await f.send(source, "previewHistoryGo", { direction: "forward" });
    assert.deepEqual(f.shown[1]!.options, { fromStudioTab: true, line: 5 });
    assert.equal(f.shown[1]!.id, f.idOf("target.md"));
  } finally {
    f.cleanup();
  }
});
