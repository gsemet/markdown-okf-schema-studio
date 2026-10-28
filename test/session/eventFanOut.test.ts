/**
 * The event fan-out of many previews (`src/session/hostEvents.ts`, `sharedWatchers.ts`): a change of
 * a file nothing depends on costs no file system call per preview, previews of one root share one
 * dependency watcher, the stem index follows creates and deletes only, linked-target watches are
 * shared and capped, and the link search is bounded.
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { mock, test } from "node:test";

import { getCachedMarkdownStemIndex } from "../../src/core/frontmatter/stemIndex";
import type { HostServices } from "../../src/host-api/index";
import { nodeHostPorts } from "./nodeHostPorts";
import type { PanelGroups } from "../../src/host-api/previewPanel";
import { createMemoryDocumentStore } from "../../src/host-memory/memoryDocumentStore";
import { DISCOVERY_EXCLUDE, LinkController, MAX_DISCOVERED_FILES } from "../../src/session/features/links";
import { PreviewManager } from "../../src/session/previewManager";
import type { PreviewSession } from "../../src/session/previewSession";
import { SharedLinkedTargetWatches, SharedWatchers } from "../../src/session/sharedWatchers";

// The compiled CommonJS `fs` namespace of the extension is this very object: its functions can be spied on.
const nodeFs = require("node:fs") as typeof fs;

type Handler = (filePath: string) => void;

interface FakeWatcher {
  base: string | undefined;
  pattern: string;
  disposed: boolean;
  changed: Set<Handler>;
  created: Set<Handler>;
  deleted: Set<Handler>;
}

function fakeWatcherPort() {
  const watchers: FakeWatcher[] = [];
  const subscribe = (set: Set<Handler>) => (handler: Handler) => {
    set.add(handler);
    return { dispose: () => { set.delete(handler); } };
  };
  return {
    watchers,
    live: () => watchers.filter((entry) => !entry.disposed),
    port: {
      watch(base: string | undefined, pattern: string) {
        const entry: FakeWatcher = {
          base, pattern, disposed: false, changed: new Set(), created: new Set(), deleted: new Set(),
        };
        watchers.push(entry);
        return {
          onDidChange: subscribe(entry.changed),
          onDidCreate: subscribe(entry.created),
          onDidDelete: subscribe(entry.deleted),
          dispose: () => { entry.disposed = true; },
        };
      },
    },
  };
}

function fixture(sessionCount: number) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "okf-fanout-"));
  const store = createMemoryDocumentStore();
  const fakeWatchers = fakeWatcherPort();
  const host = {
    ...nodeHostPorts,
    files: {},
    documents: store,
    editors: { active: () => undefined },
    settings: { section: () => ({ get: <T>(_key: string, fallback: T): T => fallback }) },
    workspace: { trusted: true, folders: () => [{ path: root }], folderOf: () => ({ path: root }) },
    watcher: fakeWatchers.port,
    ui: { setPreviewEditing: () => undefined },
  } as unknown as HostServices;
  const groups: PanelGroups = { lockNewPanelGroup: () => Promise.resolve(false), release: () => undefined };
  const manager = new PreviewManager(host, groups);
  manager.scroll.restorePreviewState = (() => undefined) as never;
  manager.rendering.setResourceRoots = (() => undefined) as never;
  manager.rendering.assignWebviewHtml = (() => undefined) as never;
  const noEvent = (): { dispose(): void } => ({ dispose: () => undefined });
  const sessions: PreviewSession[] = [];
  const panels: Array<{ dispose(): void }> = [];
  for (let index = 0; index < sessionCount; index += 1) {
    const file = path.join(root, `doc${index}.md`);
    fs.writeFileSync(file, `# Doc ${index}\n`);
    const document = store.add(`file://${file}`, `# Doc ${index}\n`, file);
    const panel = {
      visible: false, active: false, html: "", title: "", cspSource: "csp", bundleRoot: undefined, column: 1,
      setResourceRoots: () => undefined,
      onDidReceiveMessage: noEvent, onDidChangeLayout: noEvent, onDidDispose: noEvent, onDidChangeViewState: noEvent,
      dispose: () => undefined,
    };
    panels.push(panel);
    sessions.push(manager.createSession(panel as never, document, { path: root } as never));
  }
  const foreignPath = path.join(root, "foreign.md");
  fs.writeFileSync(foreignPath, "# Foreign\n");
  const foreign = store.add(`file://${foreignPath}`, "# Foreign\n", foreignPath);
  const change = () => ({
    document: foreign,
    changes: [{ start: 0, length: 0, text: "x" }],
    reason: undefined,
  });
  return {
    root, manager, sessions, foreign, foreignPath, change, fakeWatchers,
    cleanup: () => {
      mock.restoreAll();
      manager.disposeAll(false);
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-039
test("a change of a document no preview depends on costs no realpath call per preview", () => {
  const f = fixture(20);
  try {
    // The first change resolves the shown path of each preview once; the next ones resolve none.
    f.manager.events.onDocumentChanged(f.change() as never);
    const spy = mock.method(nodeFs, "realpathSync");
    f.manager.events.onDocumentChanged(f.change() as never);
    // The path of the changed document is resolved once for all the previews, not once per preview.
    assert.ok(spy.mock.callCount() <= 2, `realpathSync was called ${spy.mock.callCount()} times for 20 previews`);
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-044
test("a change of a document that a preview depends on still refreshes that preview, the others stay", () => {
  const f = fixture(5);
  try {
    const [dependent, ...others] = f.sessions;
    (dependent!.queue as unknown as { lastGood: unknown }).lastGood = { stage: { dependencies: [f.foreignPath], dispose: () => undefined } };
    const refreshed: PreviewSession[] = [];
    f.manager.rendering.refreshOpenDocument = ((session: PreviewSession) => { refreshed.push(session); }) as never;
    f.manager.edits.deferWhileEditing = ((_session: unknown, _kind: unknown, run: () => void) => { run(); }) as never;
    f.manager.events.onDocumentChanged(f.change() as never);
    assert.deepEqual(refreshed, [dependent], "only the preview that depends on the document renders again");
    assert.equal(others.length, 4);
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-143
test("previews of one root share one dependency watcher until the last one closes", () => {
  const f = fixture(3);
  try {
    const dependency = (): FakeWatcher[] => f.fakeWatchers.live().filter((entry) => entry.pattern === "**/*");
    assert.equal(dependency().length, 1, "one watcher for three previews of the same root");
    f.manager.disposeSession(f.sessions[0]!, false);
    f.manager.disposeSession(f.sessions[1]!, false);
    assert.equal(dependency().length, 1, "the watcher stays while a preview uses it");
    f.manager.disposeSession(f.sessions[2]!, false);
    assert.equal(dependency().length, 0, "the last preview releases the watcher");
    assert.deepEqual(
      f.fakeWatchers.watchers.map((entry) => [entry.changed.size, entry.created.size, entry.deleted.size]),
      f.fakeWatchers.watchers.map(() => [0, 0, 0]),
      "no subscription is left behind",
    );
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-143
test("a file event on the shared watcher reaches every preview of the root", () => {
  const f = fixture(3);
  try {
    const seen: string[] = [];
    f.manager.events.refreshReferencedPath = ((session: PreviewSession, filePath: string) => {
      seen.push(`${path.basename(session.documentUri)}:${path.basename(filePath)}`);
    }) as never;
    const [watcher] = f.fakeWatchers.live().filter((entry) => entry.pattern === "**/*");
    for (const handler of [...watcher!.changed]) handler(f.foreignPath);
    assert.deepEqual(seen.sort(), ["doc0.md:foreign.md", "doc1.md:foreign.md", "doc2.md:foreign.md"]);
  } finally {
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
test("saving a Markdown file keeps the stem index, creating or deleting one rebuilds it", () => {
  const f = fixture(0);
  try {
    f.manager.events.watchStemRoot(f.root);
    const [watcher] = f.fakeWatchers.live().filter((entry) => entry.pattern === "**/*.md");
    assert.ok(watcher);
    const before = getCachedMarkdownStemIndex([f.root]);
    for (const handler of [...watcher.changed]) handler(f.foreignPath);
    assert.equal(getCachedMarkdownStemIndex([f.root]), before, "a change keeps the index");
    for (const handler of [...watcher.created]) handler(f.foreignPath);
    const rebuilt = getCachedMarkdownStemIndex([f.root]);
    assert.notEqual(rebuilt, before, "a created file rebuilds it");
    for (const handler of [...watcher.deleted]) handler(f.foreignPath);
    assert.notEqual(getCachedMarkdownStemIndex([f.root]), rebuilt, "a deleted file rebuilds it");
  } finally {
    f.manager.events.disposeStemRootWatchers();
    f.cleanup();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-067
test("previews linking one target share its watches, which end with the last preview", () => {
  const ports = fakeWatcherPort();
  const shared = new SharedLinkedTargetWatches(new SharedWatchers(ports.port as never));
  const target = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "okf-fanout-shared-")), "target.md");
  let eventsA = 0;
  let eventsB = 0;
  const a = shared.acquire(target, () => { eventsA += 1; }, () => undefined);
  const b = shared.acquire(target, () => { eventsB += 1; }, () => undefined);
  assert.equal(ports.live().length, 1, "one host watcher for two previews");
  assert.equal(a.direct, b.direct, "one direct watch for two previews");
  for (const handler of [...ports.live()[0]!.changed]) handler(target);
  assert.deepEqual([eventsA, eventsB], [1, 1]);
  a.dispose();
  assert.equal(ports.live().length, 1);
  b.dispose();
  assert.equal(ports.live().length, 0);
  assert.equal(b.direct.state().status, "closed");
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-067
test("linked-target watches are capped: a target past the limit gets none, a released slot is reusable", () => {
  const ports = fakeWatcherPort();
  const shared = new SharedLinkedTargetWatches(new SharedWatchers(ports.port as never), 2);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "okf-fanout-cap-"));
  const holds = ["a", "b", "c"].map((name) => shared.acquire(path.join(dir, `${name}.md`), () => undefined, () => undefined));
  assert.equal(ports.live().length, 2, "two targets are watched, the third is not");
  assert.equal(holds[2]!.direct.state().status, "failed");
  holds[0]!.dispose();
  const again = shared.acquire(path.join(dir, "c.md"), () => undefined, () => undefined);
  assert.equal(ports.live().length, 2, "the freed slot serves the next target");
  assert.notEqual(again.direct.state().status, "failed");
  holds.forEach((hold) => hold.dispose());
  again.dispose();
  assert.equal(ports.live().length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-079
test("the link target search skips dependency and VCS folders and stops after a bounded number of files", async () => {
  const searches: Array<{ exclude?: string; maxResults?: number }> = [];
  const root = path.join(os.tmpdir(), "okf-fanout-links");
  const manager = {
    host: { workspace: { findFiles: (search: { exclude?: string; maxResults?: number }) => {
      searches.push(search);
      return Promise.resolve([]);
    } } },
    navigator: {
      resolvePreviewNavigation: async (
        _request: string, _active: string, _root: string,
        discover: (name: string) => Promise<string[]>,
      ) => {
        await discover("name.md");
        return { kind: "blocked" as const, reason: "x" };
      },
    },
  } as unknown as PreviewManager;
  const preview = {
    stage: { activeDocumentPath: path.join(root, "a.md"), activeDocumentIdentity: "file:///a.md", requestId: 1 },
    workspaceRoot: root,
    navigationRoots: [root],
    readOnly: false,
    frontmatter: {},
    links: {},
    frontmatterConfiguration: {},
  } as unknown as PreviewSession;
  await new LinkController(manager).resolve(preview, "name.md");
  assert.equal(searches.length, 1);
  assert.equal(searches[0]!.exclude, DISCOVERY_EXCLUDE);
  assert.equal(searches[0]!.maxResults, MAX_DISCOVERED_FILES);
  assert.match(DISCOVERY_EXCLUDE, /node_modules/u);
});
