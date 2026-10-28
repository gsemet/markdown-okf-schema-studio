/**
 * The preview manager (`src/session/previewManager.ts`): its feature controllers register exactly
 * one handler for every page message type the protocol has a gate for, and the renders it starts
 * are counted: one per document and revision for all its previews, none for a hidden panel.
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

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
  assert.equal(types.length, 41);
  for (const type of types) {
    // The router refuses a second handler: one is registered already.
    assert.throws(() => router.on(type, () => undefined), /already registered/u, type);
  }
});

const noEvent = (): { dispose(): void } => ({ dispose: () => undefined });

function renderFixture() {
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
  const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
  const cleanup = (): void => {
    resetRenderHooksForTests();
    manager.disposeAll(false);
    fs.rmSync(root, { recursive: true, force: true });
  };
  return { manager, document, newSession, renders, finished, wait, cleanup };
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-039
test("two previews of one document and revision share one render, each with its own request id", async () => {
  const f = renderFixture();
  try {
    const a = f.newSession(true);
    const b = f.newSession(true);
    await Promise.all([
      f.manager.requestDocument(a.session, f.document),
      f.manager.requestDocument(b.session, f.document),
    ]);
    assert.equal(f.renders.length, 1, "one render for both previews");
    assert.equal(f.finished.length, 2, "both previews received a result");
    assert.deepEqual(f.finished.map((entry) => entry.requestId), [1, 1]);
    assert.notEqual(a.session.queue.getState().lastGood?.stage, b.session.queue.getState().lastGood?.stage);
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-039
// @tests_req SwRS-MDOKFSTUDIO-LIFE-032
test("a page refresh inside the join window renders again instead of joining the shared render", async () => {
  const f = renderFixture();
  try {
    const a = f.newSession(true);
    const b = f.newSession(true);
    await f.manager.requestDocument(b.session, f.document);
    await f.manager.requestDocument(a.session, f.document);
    assert.equal(f.renders.length, 1, "the second preview joined the first render");
    const router = (f.manager as unknown as {
      router: { dispatch(message: unknown, session: unknown): unknown };
    }).router;
    router.dispatch({ type: "previewRefresh" }, a.session);
    await f.wait(100);
    assert.equal(f.renders.length, 2, "the Refresh button renders again");
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-039
test("a hidden panel does not render until it is shown, then renders once", async () => {
  const f = renderFixture();
  try {
    const hidden = f.newSession(false);
    await f.manager.requestDocument(hidden.session, f.document);
    f.manager.rendering.refreshOpenDocument(hidden.session);
    await f.manager.rendering.refreshPreviewDocument(hidden.session, f.document);
    await f.wait(150);
    assert.equal(f.renders.length, 0, "no render while the panel is hidden");
    assert.equal(hidden.session.renderDirty, true);
    hidden.show();
    await f.wait(200);
    assert.equal(f.renders.length, 1, "one render when the panel is shown");
    assert.equal(hidden.session.renderDirty, false);
  } finally {
    f.cleanup();
  }
});
