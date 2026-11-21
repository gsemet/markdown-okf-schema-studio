/**
 * The preview manager (`src/session/previewManager.ts`): its feature controllers register exactly
 * one handler for every page message type the protocol has a gate for, and the renders it starts
 * are counted: one per document and revision for all its previews, none for a hidden panel.
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { mock, test } from "node:test";

import type { HostServices } from "../../src/host-api/index";
import { nodeHostPorts } from "./nodeHostPorts";
import type { PanelGroups } from "../../src/host-api/previewPanel";
import { createMemoryDocumentStore } from "../../src/host-memory/memoryDocumentStore";
import { resetRenderHooksForTests, setRenderOverrideForTests } from "../../src/core/render/renderPipeline";
import type { RenderResult } from "../../src/core/render/renderPipeline";
import { PAGE_MESSAGE_GATES } from "../../src/session/pageMessages";
import { PreviewManager } from "../../src/session/previewManager";

test("every page message type has one handler of a feature controller", () => {
  const host = { files: {} } as unknown as HostServices;
  const groups: PanelGroups = { lockNewPanelGroup: () => Promise.resolve(false), release: () => undefined };
  const manager = new PreviewManager(host, groups);
  const router = (manager as unknown as { router: { on(type: string, handler: () => void): void } }).router;
  const types = Object.keys(PAGE_MESSAGE_GATES);
  // CR 147 added previewSideBySideChanged (43 -> 44 page message types).
  // CR 288 added previewExportHtml (44 -> 45).
  // CR 312 added previewSaveRequest (45 -> 46).
  // CR 439 added previewBlocksDelete (46 -> 47); CR 444 added previewBlankRunDelete (47 -> 48).
  // CR 463 added previewBaselineRequested (48 -> 49).
  assert.equal(types.length, 49);
  for (const type of types) {
    // The router refuses a second handler: one is registered already.
    assert.throws(() => router.on(type, () => undefined), /already registered/u, type);
  }
});

const noEvent = (): { dispose(): void } => ({ dispose: () => undefined });

/**
 * The fixture controls time: the queue debounce and overrun timers and the shared-render window run
 * on node:test fake timers (`setTimeout` and `Date`), so a stalled or loaded machine cannot change
 * what a test sees. `advance` moves time and lets the promise chains settle; nothing sleeps.
 */
function renderFixture() {
  mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "okf-shared-render-"));
  const file = path.join(root, "a.md");
  fs.writeFileSync(file, "# Title\n\nText.\n");
  const store = createMemoryDocumentStore();
  const document = store.add("file:///w/a.md", "# Title\n\nText.\n", file);
  const host = {
    ...nodeHostPorts,
    files: {},
    documents: store,
    settings: { section: () => ({ get: <T>(_key: string, fallback: T): T => fallback }) },
    workspace: { trusted: true, folders: () => [{ path: root }] },
    watcher: {
      watch: () => ({
        onDidChange: noEvent, onDidCreate: noEvent, onDidDelete: noEvent, dispose: () => undefined,
      }),
    },
    ui: { setPreviewEditing: () => undefined },
  } as unknown as HostServices;
  const groups: PanelGroups = { lockNewPanelGroup: () => Promise.resolve(false), release: () => undefined };
  const manager = new PreviewManager(host, groups);
  const finished: Array<{ requestId: number; sessionIndex: number }> = [];
  manager.rendering.handleQueueState = ((session: unknown, state: { phase: string; result?: RenderResult }) => {
    if (state.phase === "ready" && state.result) {
      finished.push({
        requestId: state.result.stage.requestId,
        sessionIndex: [...manager.sessions()].indexOf(session as never),
      });
    }
  }) as never;
  manager.scroll.restorePreviewState = (() => undefined) as never;
  manager.rendering.setResourceRoots = (() => undefined) as never;
  manager.rendering.assignWebviewHtml = (() => undefined) as never;
  const renders: string[] = [];
  setRenderOverrideForTests((source) => {
    renders.push(source);
    return Promise.resolve({ html: "<p>x</p>" });
  });
  const newSession = (visible: boolean) => {
    const listeners: Array<() => void> = [];
    const panel = {
      visible,
      active: false,
      html: "",
      title: "",
      cspSource: "csp",
      bundleRoot: undefined,
      column: 1,
      setResourceRoots: () => undefined,
      onDidReceiveMessage: noEvent,
      onDidChangeLayout: noEvent,
      onDidDispose: noEvent,
      onDidChangeViewState: (listener: () => void) => { listeners.push(listener); return noEvent(); },
      dispose: () => undefined,
    };
    const session = manager.createSession(panel as never, document, { path: root } as never);
    const show = (): void => { panel.visible = true; listeners.forEach((listener) => listener()); };
    return { session, show };
  };
  /** Lets the pending promise chains run: a few turns of the event loop, never a timed sleep. */
  const settle = async (): Promise<void> => {
    for (let turn = 0; turn < 5; turn += 1) await new Promise<void>((resolve) => setImmediate(resolve));
  };
  /** Moves the controlled time by `ms`, then lets the promise chains settle. */
  const advance = async (ms: number): Promise<void> => {
    await settle();
    mock.timers.tick(ms);
    await settle();
  };
  const cleanups: Array<() => void> = [];
  const onCleanup = (undo: () => void): void => { cleanups.push(undo); };
  const cleanup = (): void => {
    cleanups.forEach((undo) => undo());
    mock.timers.reset();
    resetRenderHooksForTests();
    manager.disposeAll(false);
    fs.rmSync(root, { recursive: true, force: true });
  };
  return { manager, document, newSession, renders, finished, settle, advance, onCleanup, cleanup };
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-039
test("two previews of one document and revision share one render, each with its own request id", async () => {
  const f = renderFixture();
  try {
    const a = f.newSession(true);
    const b = f.newSession(true);
    const both = Promise.all([
      f.manager.requestDocument(a.session, f.document),
      f.manager.requestDocument(b.session, f.document),
    ]);
    await f.advance(QUEUE_DEBOUNCE_MS);
    await both;
    assert.equal(f.renders.length, 1, "one render for both previews");
    assert.equal(f.finished.length, 2, "both previews received a result");
    assert.deepEqual(f.finished.map((entry) => entry.requestId), [1, 1]);
    assert.notEqual(a.session.queue.getState().lastGood?.stage, b.session.queue.getState().lastGood?.stage);
  } finally {
    f.cleanup();
  }
});

/** The debounce of a preview's queue (`debounceMs` in `src/session/sessionFactory.ts`). */
const QUEUE_DEBOUNCE_MS = 40;
/** The longest debounce of a queue (`maxDebounceMs`) and the window a finished render stays joinable. */
const QUEUE_MAX_DEBOUNCE_MS = 1000;
const JOIN_WINDOW_MS = 250;

/** Blocks the thread for `ms` of real time, as a loaded machine does (the fake `Date` does not move). */
function stallThread(ms: number): void {
  const until = process.hrtime.bigint() + BigInt(ms) * 1_000_000n;
  while (process.hrtime.bigint() < until) { /* busy wait */ }
}

/** Two previews of one document: the second joins the render of the first, a page refresh renders again. */
async function joinWindowScenario(stallMs: number): Promise<void> {
  const f = renderFixture();
  try {
    const a = f.newSession(true);
    const b = f.newSession(true);
    const first = f.manager.requestDocument(b.session, f.document);
    await f.advance(QUEUE_DEBOUNCE_MS);
    await first;
    assert.equal(f.renders.length, 1, "the first preview rendered");
    if (stallMs > 0) {
      const paths = nodeHostPorts.paths;
      const sourceExists = paths.sourceExists;
      let stalled = false;
      paths.sourceExists = (file: string): boolean => {
        if (!stalled) { stalled = true; stallThread(stallMs); }
        return sourceExists.call(paths, file);
      };
      f.onCleanup(() => { paths.sourceExists = sourceExists; });
    }
    const second = f.manager.requestDocument(a.session, f.document);
    await f.advance(QUEUE_DEBOUNCE_MS);
    await second;
    assert.equal(f.renders.length, 1, "the second preview joined the first render");
    assert.equal(f.manager.sharedRenders.started, 1, "the manager started one render");
    const router = (f.manager as unknown as {
      router: { dispatch(message: unknown, session: unknown): unknown };
    }).router;
    router.dispatch({ type: "previewRefresh" }, a.session);
    await f.advance(QUEUE_DEBOUNCE_MS * 2);
    assert.equal(f.renders.length, 2, "the Refresh button renders again");
  } finally {
    f.cleanup();
  }
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-039
// @tests_req SwRS-MDOKFSTUDIO-LIFE-032
test("a page refresh inside the join window renders again instead of joining the shared render", async () => {
  await joinWindowScenario(0);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-039
test("a stalled machine between two requests does not close the join window", async () => {
  // The stall is longer than the window of real time: only the controlled time decides.
  await joinWindowScenario(JOIN_WINDOW_MS + 10);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-039
test("a hidden panel does not render until it is shown, then renders once", async () => {
  const f = renderFixture();
  try {
    const hidden = f.newSession(false);
    await f.manager.requestDocument(hidden.session, f.document);
    f.manager.rendering.refreshOpenDocument(hidden.session);
    await f.manager.rendering.refreshPreviewDocument(hidden.session, f.document);
    await f.settle();
    assert.equal(f.renders.length, 0, "no render while the panel is hidden");
    assert.equal(f.manager.sharedRenders.started, 0, "no shared render started while the panel is hidden");
    assert.equal(hidden.session.renderDirty, true);
    await f.advance(QUEUE_MAX_DEBOUNCE_MS + JOIN_WINDOW_MS);
    assert.equal(f.renders.length, 0, "still no render after every timer the queue could arm");
    hidden.show();
    await f.advance(QUEUE_DEBOUNCE_MS);
    await f.advance(QUEUE_MAX_DEBOUNCE_MS + JOIN_WINDOW_MS);
    assert.equal(f.renders.length, 1, "one render when the panel is shown");
    assert.equal(f.manager.sharedRenders.started, 1, "the manager started one render");
    assert.equal(f.finished.length, 1, "the preview received one result");
    assert.equal(hidden.session.renderDirty, false);
  } finally {
    f.cleanup();
  }
});

/** Gives a fixture session a stage and records what it posts to its page and the snapshots the host expects. */
function exportProbe(f: ReturnType<typeof renderFixture>, entry: ReturnType<ReturnType<typeof renderFixture>["newSession"]>, withStage = true) {
  const posted: Array<Record<string, unknown>> = [];
  const session = entry.session as unknown as {
    stage?: unknown; postToPage(message: Record<string, unknown>): PromiseLike<boolean>;
  };
  if (withStage) session.stage = { activeDocumentIdentity: "file:///w/a.md", activeDocumentRevision: 7, requestId: 3 };
  session.postToPage = (message) => { posted.push(message); return Promise.resolve(true); };
  const expected: unknown[] = [];
  const exports = f.manager.exports as unknown as { expectSnapshot(session: unknown): void };
  exports.expectSnapshot = (armed) => { expected.push(armed); };
  return { posted, expected };
}

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-134
test("the Export command asks the focused preview, even when another one shows the active document", () => {
  const f = renderFixture();
  try {
    const focused = f.newSession(true);
    const other = f.newSession(true);
    (focused.session.panel as { active: boolean }).active = true;
    const otherProbe = exportProbe(f, other);
    const probe = exportProbe(f, focused);
    assert.equal(f.manager.runExportCommand(f.document), true);
    assert.deepEqual(probe.posted, [{
      type: "previewExportCommand", documentId: "file:///w/a.md", revision: 7, requestId: 3,
    }]);
    assert.deepEqual(probe.expected, [focused.session], "the snapshot is expected from that preview");
    assert.deepEqual(otherProbe.posted, [], "the other preview is not asked");
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-134
test("the Export command falls back to the latest preview of the active document when none has the focus", () => {
  const f = renderFixture();
  try {
    const first = f.newSession(true);
    const second = f.newSession(true);
    const firstProbe = exportProbe(f, first);
    const secondProbe = exportProbe(f, second);
    assert.equal(f.manager.runExportCommand(f.document), true);
    assert.equal(secondProbe.posted.length, 1);
    assert.deepEqual(secondProbe.expected, [second.session]);
    assert.deepEqual(firstProbe.posted, []);
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-134
test("the Export command returns false and posts nothing without a focused preview, a matching document or a render", () => {
  const f = renderFixture();
  try {
    const entry = f.newSession(true);
    const probe = exportProbe(f, entry);
    assert.equal(f.manager.runExportCommand(undefined), false, "no active document, no focus");
    assert.equal(f.manager.runExportCommand({ ...f.document, id: "file:///w/other.md" } as never), false, "no preview of that document");
    assert.deepEqual(probe.posted, []);
    assert.deepEqual(probe.expected, []);
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-134
test("the Export command returns false for a preview that has not rendered yet", () => {
  const f = renderFixture();
  try {
    const entry = f.newSession(true);
    (entry.session.panel as { active: boolean }).active = true;
    const probe = exportProbe(f, entry, false);
    assert.equal(f.manager.runExportCommand(f.document), false);
    assert.deepEqual(probe.posted, []);
    assert.deepEqual(probe.expected, []);
  } finally {
    f.cleanup();
  }
});
