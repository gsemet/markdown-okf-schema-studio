/**
 * The session layer on the memory host: the path facts, the render queue and the linked-target
 * watches come from the host's ports (`HostPaths`, `RenderQueues`, `LinkedTargetWatcher`), so a
 * session needs no disk and no Node service.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { HostServices } from "../../src/host-api/index";
import type { PanelGroups } from "../../src/host-api/previewPanel";
import { createMemoryDocumentStore } from "../../src/host-memory/memoryDocumentStore";
import { createMemoryFileSystem } from "../../src/host-memory/memoryFileSystem";
import { createMemoryHostPorts } from "../../src/host-memory/memoryHostPorts";
import { PreviewManager } from "../../src/session/previewManager";
import type { PreviewSession } from "../../src/session/previewSession";
import { SharedLinkedTargetWatches, SharedWatchers } from "../../src/session/sharedWatchers";

const noEvent = (): { dispose(): void } => ({ dispose: () => undefined });

function memorySession() {
  const files = createMemoryFileSystem();
  files.addFile("/ws/docs/a.md", "# A\n");
  files.addDirectory("/ws/docs/folder.md");
  const ports = createMemoryHostPorts(files, "ada");
  const store = createMemoryDocumentStore();
  const host = {
    files,
    documents: store,
    ...ports,
    workspace: { trusted: true, folders: () => [{ path: "/ws", name: "ws", id: "file:///ws" }] },
    watcher: {
      watch: () => ({ onDidChange: noEvent, onDidCreate: noEvent, onDidDelete: noEvent, dispose: () => undefined }),
    },
  } as unknown as HostServices;
  const groups: PanelGroups = { lockNewPanelGroup: () => Promise.resolve(false), release: () => undefined };
  const manager = new PreviewManager(host, groups);
  return { files, ports, store, manager };
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-062
test("a session on the memory host decides whether its source exists from the host's paths port", () => {
  const { store, manager, files } = memorySession();
  const document = store.add("file:///ws/docs/a.md", "# A\n", "/ws/docs/a.md");
  const session = { document, documentUri: document.id, workspaceRoot: "/ws" } as unknown as PreviewSession;
  assert.equal(manager.sourceAvailable(session), true);
  assert.equal(manager.canonicalPath("/ws/docs/../docs/a.md"), "/ws/docs/a.md", "canonical form is the normalised path");

  // Outside the root, or not a file: unavailable.
  const outside = store.add("file:///other/b.md", "x", "/other/b.md");
  files.addFile("/other/b.md", "x");
  assert.equal(manager.sourceAvailable({ document: outside, documentUri: outside.id, workspaceRoot: "/ws" } as unknown as PreviewSession), false);
  const folder = store.add("file:///ws/docs/folder.md", "x", "/ws/docs/folder.md");
  assert.equal(manager.sourceAvailable({ document: folder, documentUri: folder.id, workspaceRoot: "/ws" } as unknown as PreviewSession), false);
});

test("the memory host's paths port answers from its file system and its user", () => {
  const files = createMemoryFileSystem();
  files.addFile("/w/x.md", "x");
  const { paths } = createMemoryHostPorts(files, "ada");
  assert.equal(paths.sourceExists("/w/x.md"), true);
  assert.equal(paths.sourceExists("/w/missing.md"), false);
  assert.equal(paths.sourceExists("/w"), false, "a directory is not a source");
  assert.equal(paths.userName(), "ada");
  assert.equal(createMemoryHostPorts(files).paths.userName(), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-039
test("the memory host's render queue compares changed files with the dependencies in canonical form", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const { ports } = memorySession();
  const document = { id: "d", revision: 1, getText: () => "x" };
  const queue = ports.renderQueues.create<typeof document, { stage: { dependencies: string[] } }>({
    debounceMs: 0,
    revisionOf: (queued) => queued.revision,
    build: async () => ({ stage: { dependencies: ["/ws/docs/../inc.md"] } }),
  });
  context.after(() => queue.dispose());
  const outcome = queue.request(document);
  context.mock.timers.tick(0);
  assert.equal((await outcome).status, "ready");
  assert.equal(queue.dependsOn("/ws/inc.md"), true);
  assert.equal(queue.dependsOn("/ws/other.md"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-067
test("linked-target watches of the memory host are shared, fired by the host and closed with the last preview", () => {
  const { ports } = memorySession();
  const watchers = new SharedWatchers({
    watch: () => ({ onDidChange: noEvent, onDidCreate: noEvent, onDidDelete: noEvent, dispose: () => undefined }),
  } as never);
  const shared = new SharedLinkedTargetWatches(watchers, undefined, ports.linkedTargets);
  let eventsA = 0;
  let eventsB = 0;
  const a = shared.acquire("/ws/t.md", () => { eventsA += 1; }, () => undefined);
  const b = shared.acquire("/ws/t.md", () => { eventsB += 1; }, () => undefined);
  assert.equal(a.direct, b.direct, "one direct watch for two previews");
  assert.equal(ports.linkedTargets.fire("/ws/t.md"), 1);
  assert.deepEqual([eventsA, eventsB], [1, 1]);
  assert.equal(a.direct.state().events, 1);
  a.dispose();
  assert.equal(b.direct.state().status, "watching");
  b.dispose();
  assert.equal(b.direct.state().status, "closed");
  assert.equal(ports.linkedTargets.fire("/ws/t.md"), 0);
});
