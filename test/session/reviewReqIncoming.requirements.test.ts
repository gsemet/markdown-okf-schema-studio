/**
 * The incoming-change marks and the comment switch on the host side (requirements REVIEW-155,
 * REVIEW-195, REVIEW-197, REVIEW-198, REVIEW-199): the controllers run against stub ports and a
 * stub preview, the clock is the `node:test` mock clock.
 */

import * as assert from "node:assert/strict";
import { test, type TestContext } from "node:test";

import { PREVIEW_CONFIGURATION_SECTION } from "../../src/core/configuration/previewConfiguration";
import { HostEvents } from "../../src/session/hostEvents";
import { createIncomingState, IncomingChangesController } from "../../src/session/features/incomingChanges";
import { ViewStateController } from "../../src/session/features/viewState";

interface Fixture {
  readonly posted: Array<Record<string, unknown>>;
  readonly preview: any;
  readonly manager: any;
  readonly controller: IncomingChangesController;
  readonly watchers: Array<() => void>;
  readonly state: { head: string | undefined; diff: boolean; trusted: boolean; settings: Record<string, unknown> };
  headReads(): number;
}

const SOURCE = "one\nTWO\nthree\nFOUR\n";
const HEAD = "one\ntwo\nthree\nfour\n";

/** A preview of a tracked file whose shown text is `SOURCE` and whose text at HEAD is `HEAD`. */
function fixture(t: TestContext, uri = "file:///w/a.md"): Fixture {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const posted: Array<Record<string, unknown>> = [];
  const watchers: Array<() => void> = [];
  const state = { head: HEAD as string | undefined, diff: true, trusted: true, settings: {} as Record<string, unknown> };
  let reads = 0;
  const host = {
    workspace: { get trusted() { return state.trusted; } },
    documents: { idOf: (path: string) => `file://${path}` },
    editors: { active: () => undefined },
    settings: { section: () => ({ get: (key: string, fallback: unknown) => (key in state.settings ? state.settings[key] : fallback) }) },
    vcs: {
      headText: async () => {
        reads += 1;
        return state.head === undefined ? undefined : { commit: "c1", text: state.head };
      },
      watchHead: (_id: string, listener: () => void) => {
        watchers.push(listener);
        return { dispose: () => undefined };
      },
    },
  };
  const manager: any = { host, sharedRenders: { invalidate: () => undefined }, choices: { viewPreferences: { get incomingChanges() { return state.diff; } } } };
  const preview: any = {
    disposed: false,
    documentUri: uri,
    stage: {
      activeDocumentPath: "/w/a.md",
      activeDocumentIdentity: uri,
      activeDocumentRevision: 7,
      requestId: 3,
      sourceText: SOURCE,
    },
    configuration: { showIncomingChanges: true, showComments: true },
    incoming: createIncomingState(),
    probe: { incomingPosts: 0, baselinePosts: 0 },
    queue: { getState: () => ({ lastGood: undefined }) },
    postToPage: (message: Record<string, unknown>) => {
      posted.push(message);
      return Promise.resolve();
    },
  };
  const controller = new IncomingChangesController(manager);
  manager.incoming = controller;
  manager.view = new ViewStateController(manager);
  manager.events = new HostEvents(manager);
  manager.sessions = () => new Set([preview]);
  manager.refreshTrust = () => undefined;
  t.after(() => controller.clear(preview));
  return { posted, preview, manager, controller, watchers, state, headReads: () => reads };
}

/** Lets the promise chains of a post run (real `setImmediate`, the mock clock only has timeouts). */
async function flush(): Promise<void> {
  for (let index = 0; index < 5; index += 1) await new Promise<void>((resolve) => setImmediate(resolve));
}

const incoming = (f: Fixture) => f.posted.filter((message) => message.type === "previewIncomingChanges");

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-195
test("a tracked file posts the 1-based ranges of the shown lines that differ from HEAD", async (t) => {
  const f = fixture(t);
  f.controller.schedule(f.preview, 0);
  t.mock.timers.tick(1);
  await flush();
  assert.equal(incoming(f).length, 1);
  assert.deepEqual(incoming(f)[0], {
    type: "previewIncomingChanges",
    enabled: true,
    ranges: [{ start: 2, end: 2 }, { start: 4, end: 4 }],
    documentId: "file:///w/a.md",
    revision: 7,
    requestId: 3,
  });

  // An unsaved edit is part of the shown text: its line is in the ranges.
  f.preview.stage.sourceText = "one\nTWO\nTHREE\nFOUR\n";
  f.controller.schedule(f.preview, 0);
  t.mock.timers.tick(1);
  await flush();
  assert.deepEqual((incoming(f)[1]!.ranges), [{ start: 2, end: 4 }]);
});

test("a render schedules the marks after 300 ms and a second render replaces the pending one", async (t) => {
  const f = fixture(t);
  f.controller.schedule(f.preview);
  t.mock.timers.tick(299);
  await flush();
  assert.equal(f.headReads(), 0, "nothing at 299 ms");
  t.mock.timers.tick(1);
  await flush();
  assert.equal(incoming(f).length, 1, "the marks are posted at 300 ms");

  // Two renders within 300 ms: the first timer is cleared and only one post follows.
  f.controller.schedule(f.preview);
  t.mock.timers.tick(200);
  f.controller.schedule(f.preview);
  t.mock.timers.tick(299);
  await flush();
  assert.equal(incoming(f).length, 1, "the first timer was replaced: nothing at 200 + 299 ms");
  t.mock.timers.tick(1);
  await flush();
  assert.equal(incoming(f).length, 2, "one post for the two renders");
  t.mock.timers.tick(1_000);
  await flush();
  assert.equal(incoming(f).length, 2);
});

test("a new HEAD commit, trust and a settings change post the marks again without delay", async (t) => {
  const f = fixture(t);
  f.controller.schedule(f.preview);
  t.mock.timers.tick(300);
  await flush();
  assert.equal(incoming(f).length, 1);
  assert.equal(f.watchers.length, 1, "the HEAD of the repository is watched once marks were read");

  // The HEAD commit changes.
  f.watchers[0]!();
  t.mock.timers.tick(1);
  await flush();
  assert.equal(incoming(f).length, 2, "posted at once, not after 300 ms");

  // Trust is granted.
  f.manager.events.onTrustGranted();
  t.mock.timers.tick(1);
  await flush();
  assert.equal(incoming(f).length, 3);

  // The preview settings change.
  f.manager.events.onSettingsChanged({ affects: (section: string) => section === PREVIEW_CONFIGURATION_SECTION });
  t.mock.timers.tick(1);
  await flush();
  assert.equal(incoming(f).length, 4);
});

test("nothing is posted for a page without marks and an unchanged enabled value, marks are taken back", async (t) => {
  const f = fixture(t);
  // A file Git does not know: no ranges, no marks showing, "enabled" equal to the one posted.
  f.state.head = undefined;
  f.controller.schedule(f.preview, 0);
  t.mock.timers.tick(1);
  await flush();
  assert.equal(f.headReads(), 1, "the refresh ran");
  assert.deepEqual(f.posted, [], "and posted nothing");
  f.controller.schedule(f.preview, 0);
  t.mock.timers.tick(1);
  await flush();
  assert.deepEqual(f.posted, []);

  // Marks showing, then a document that equals HEAD: an empty list is posted, once.
  f.state.head = HEAD;
  f.controller.schedule(f.preview, 0);
  t.mock.timers.tick(1);
  await flush();
  assert.equal(incoming(f).length, 1);
  f.preview.stage.sourceText = HEAD;
  f.controller.schedule(f.preview, 0);
  t.mock.timers.tick(1);
  await flush();
  assert.equal(incoming(f).length, 2);
  assert.deepEqual(incoming(f)[1]!.ranges, []);
  f.controller.schedule(f.preview, 0);
  t.mock.timers.tick(1);
  await flush();
  assert.equal(incoming(f).length, 2, "nothing more once the marks are gone");

  // Marks showing, then the Diff choice turned off: an empty list again.
  f.preview.stage.sourceText = SOURCE;
  f.controller.schedule(f.preview, 0);
  t.mock.timers.tick(1);
  await flush();
  assert.equal(incoming(f).length, 3);
  f.state.diff = false;
  f.controller.schedule(f.preview, 0);
  t.mock.timers.tick(1);
  await flush();
  assert.equal(incoming(f).length, 4);
  assert.deepEqual(incoming(f)[3]!.ranges, []);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-152
test("the value of preview.showComments is posted to the page when the settings change, without a render", async (t) => {
  const f = fixture(t);
  f.manager.view.postShowComments(f.preview);
  assert.deepEqual(f.posted, [{
    type: "previewShowComments",
    showComments: true,
    documentId: "file:///w/a.md",
    revision: 7,
    requestId: 3,
  }]);

  // The setting turns false: the preview settings are read again and the page gets the new value.
  f.state.settings = { showComments: false };
  f.manager.events.onSettingsChanged({ affects: (section: string) => section === PREVIEW_CONFIGURATION_SECTION });
  const shown = f.posted.filter((message) => message.type === "previewShowComments");
  assert.equal(shown.length, 2);
  assert.equal(shown[1]!.showComments, false);
  assert.equal(f.posted.some((message) => message.type === "previewContentPatch"), false, "no render was asked for");
  f.controller.clear(f.preview);
});

/** A fixture whose controller renders the baseline with a stub that counts its calls. */
function sideBySideFixture(t: TestContext, html: string | null = "<p data-line=\"2\">two</p>") {
  const f = fixture(t);
  const renders: string[] = [];
  const controller = new IncomingChangesController(f.manager, async (_manager, _preview, _stage, text) => {
    renders.push(text);
    return html ?? undefined;
  });
  f.manager.incoming = controller;
  t.after(() => controller.clear(f.preview));
  const baselines = () => f.posted.filter((message) => message.type === "previewBaselineDiff");
  const run = async (): Promise<void> => {
    controller.schedule(f.preview, 0);
    t.mock.timers.tick(1);
    await flush();
  };
  return { ...f, controller, renders, baselines, run };
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-006
test("CR147: with the side-by-side diff on, the page gets the HEAD rendering and the hunks, rendered once per HEAD text", async (t) => {
  const f = sideBySideFixture(t);
  await f.run();
  assert.deepEqual(f.baselines(), [], "nothing while the diff is off");
  assert.deepEqual(f.renders, []);

  f.controller.setSideBySide(f.preview, true);
  t.mock.timers.tick(1);
  await flush();
  assert.deepEqual(f.baselines(), [{
    type: "previewBaselineDiff",
    html: "<p data-line=\"2\">two</p>",
    hunks: [{ baseStart: 2, baseEnd: 2, start: 2, end: 2 }, { baseStart: 4, baseEnd: 4, start: 4, end: 4 }],
    documentId: "file:///w/a.md",
    revision: 7,
    requestId: 3,
  }]);
  assert.deepEqual(f.renders, [HEAD]);

  // The shown text changes: new hunks, the same HEAD text is not rendered again.
  f.preview.stage.sourceText = "one\nTWO\nthree\nfour\n";
  await f.run();
  assert.equal(f.baselines().length, 2);
  assert.deepEqual((f.baselines()[1] as any).hunks, [{ baseStart: 2, baseEnd: 2, start: 2, end: 2 }]);
  assert.equal(f.renders.length, 1);

  // Another commit: rendered again.
  f.state.head = "one\ntwo\nthree\nfour\nfive\n";
  await f.run();
  assert.equal(f.renders.length, 2);

  // Off: nothing more is posted or rendered.
  f.controller.setSideBySide(f.preview, false);
  await f.run();
  assert.equal(f.baselines().length, 3);
  assert.equal(f.renders.length, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-006
test("CR147: the baseline does not depend on the Diff button and is empty for an untracked file", async (t) => {
  const f = sideBySideFixture(t);
  f.state.diff = false;
  f.controller.setSideBySide(f.preview, true);
  t.mock.timers.tick(1);
  await flush();
  assert.equal(f.baselines().length, 1, "the baseline does not depend on the Diff button");
  assert.deepEqual(incoming(f).map((message) => message.ranges), [], "and no ranges are posted");

  // A file Git does not know: an empty baseline, no render.
  f.state.head = undefined;
  await f.run();
  assert.deepEqual([(f.baselines()[1] as any).html, (f.baselines()[1] as any).hunks], ["", []]);

});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-006
test("CR147: a HEAD text that cannot be rendered is posted empty, so the page keeps the green bars", async (t) => {
  const broken = sideBySideFixture(t, null);
  broken.controller.setSideBySide(broken.preview, true);
  t.mock.timers.tick(1);
  await flush();
  assert.deepEqual([(broken.baselines()[0] as any).html, (broken.baselines()[0] as any).hunks], ["", []]);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-006
test("CR147: with preview.showIncomingChanges off nothing is read or posted", async (t) => {
  const off = sideBySideFixture(t);
  off.preview.configuration.showIncomingChanges = false;
  off.controller.setSideBySide(off.preview, true);
  t.mock.timers.tick(1);
  await flush();
  assert.equal(off.baselines().length, 0);
  assert.equal(off.headReads(), 0);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-006
test("CR147: the page message switches the diff on the session", async (t) => {
  const f = sideBySideFixture(t);
  const handlers = new Map<string, (message: any, preview: any) => void>();
  f.manager.view.register({ on: (type: string, handler: (message: any, preview: any) => void) => handlers.set(type, handler) } as never);
  handlers.get("previewSideBySideChanged")!({ on: true }, f.preview);
  assert.equal(f.preview.incoming.sideBySide, true);
  t.mock.timers.tick(1);
  await flush();
  assert.equal(f.baselines().length, 1);
  handlers.get("previewSideBySideChanged")!({ on: false }, f.preview);
  assert.equal(f.preview.incoming.sideBySide, false);
  assert.equal(f.preview.incoming.baseline, undefined);
});
