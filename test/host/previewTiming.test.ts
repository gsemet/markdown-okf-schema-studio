/**
 * Timer and ordering behaviour of the preview host, through its public seams only (activation, the
 * commands, text-document events, webview messages): the render debounce, the pending overlay, the
 * content-patch acknowledgement fallback, the page reload after patches, work deferred while the
 * page has an inline editor open, and disposal with timers or renders still pending.
 *
 * The clock is the `node:test` mock clock; every delay boundary is checked one millisecond before
 * and at the limit. Identities are compared with what the host itself sent, never with the editor's
 * document version, so the tests hold whatever numbering the host uses.
 */
import * as assert from "node:assert/strict";
import { test, type TestContext } from "node:test";

import { identityOf, nextIdentityOf } from "../shared/previewIdentity";
import { closeHost, identityOfDocument, openPreview, type HostSession } from "./hostHarness";

const MARKDOWN = "# Title\n\nFirst paragraph.\n\nSecond paragraph.\n";
const edited = (marker: string): string => `# Title\n\nFirst paragraph ${marker}.\n\nSecond paragraph.\n`;

/** An open preview whose page has loaded and reported ready, with nothing left to settle. */
async function readyPreview(t: TestContext): Promise<HostSession> {
  const host = await openPreview(t.mock.timers, MARKDOWN);
  t.after(() => closeHost(t.mock.timers));
  await host.ready();
  await host.settle();
  return host;
}

/** Types `text`, lets the 40 ms debounce pass and waits for the patch it produces. */
async function typeAndPatch(host: HostSession, text: string): Promise<Record<string, unknown>> {
  const from = host.posted.length;
  host.type(text);
  host.tick(40);
  await host.until(() => host.postedSince(from, "previewContentPatch").length > 0, "the content patch");
  return host.postedSince(from, "previewContentPatch")[0]!;
}

test("edits inside the 40 ms render debounce reach the page once, as the last text", async (t) => {
  const host = await readyPreview(t);
  const from = host.posted.length;
  const assignments = host.assignments.length;
  host.type(edited("A"));
  host.tick(30);
  host.type(edited("B"));
  host.tick(30);
  host.type(edited("C"));
  host.tick(39);
  await host.settle();
  assert.deepEqual(host.postedSince(from, "previewContentPatch"), [], "no render 39 ms after the last edit");
  host.tick(1);
  await host.until(() => host.postedSince(from, "previewContentPatch").length > 0, "the content patch");
  await host.settle();
  host.tick(1_000);
  await host.settle();
  const patches = host.postedSince(from, "previewContentPatch");
  assert.equal(patches.length, 1, "one render for the burst");
  assert.match(String(patches[0]!.contentHtml), /First paragraph C\./u);
  assert.doesNotMatch(String(patches[0]!.contentHtml), /paragraph [AB]\./u);
  assert.deepEqual(identityOf(patches[0]!), host.loadedIdentity(), "the patch is addressed to the loaded page");
  assert.equal(host.assignments.length, assignments, "a ready page is patched, not reloaded");
});

test("a render pending for 1500 ms over a ready page shows the overlay, hidden again before the patch", async (t) => {
  const host = await readyPreview(t);
  const from = host.posted.length;
  host.type(edited("slow"));
  // The render starts at 40 ms; the clock moves synchronously, so it cannot finish in between.
  host.tick(1_499);
  assert.deepEqual(host.postedSince(from, "previewPendingOverlay"), [], "no overlay at 1499 ms");
  host.tick(1);
  const overlays = host.postedSince(from, "previewPendingOverlay");
  assert.equal(overlays.length, 1, "the overlay at 1500 ms");
  assert.equal(overlays[0]!.visible, true);
  assert.deepEqual(identityOf(overlays[0]!), host.loadedIdentity(), "addressed to the loaded page");
  await host.until(() => host.postedSince(from, "previewContentPatch").length > 0, "the content patch");
  assert.deepEqual(
    host.postedSince(from).filter((message) => message.type === "previewPendingOverlay" || message.type === "previewContentPatch")
      .map((message) => `${String(message.type)}${message.visible === undefined ? "" : `:${String(message.visible)}`}`),
    ["previewPendingOverlay:true", "previewPendingOverlay:false", "previewContentPatch"],
  );
});

test("a render that finishes before 1500 ms never shows the overlay", async (t) => {
  const host = await readyPreview(t);
  const from = host.posted.length;
  await typeAndPatch(host, edited("fast"));
  host.tick(10_000);
  await host.settle();
  assert.deepEqual(host.postedSince(from, "previewPendingOverlay"), []);
});

test("a patched page that does not report ready within 2000 ms gets the full document", async (t) => {
  const host = await readyPreview(t);
  const assignments = host.assignments.length;
  const patch = await typeAndPatch(host, edited("unacknowledged"));
  host.tick(1_999);
  await host.settle();
  assert.equal(host.assignments.length, assignments, "no reload at 1999 ms");
  host.tick(1);
  await host.settle();
  assert.equal(host.assignments.length, assignments + 1, "one reload at 2000 ms");
  assert.deepEqual(identityOfDocument(host.assignments.at(-1)!), nextIdentityOf(patch),
    "the reloaded document is the patched render");
  assert.match(host.assignments.at(-1)!, /First paragraph unacknowledged\./u);
});

test("a patched page that reports ready in time keeps its document", async (t) => {
  const host = await readyPreview(t);
  const assignments = host.assignments.length;
  const patch = await typeAndPatch(host, edited("acknowledged"));
  host.tick(1_999);
  await host.ready(nextIdentityOf(patch));
  host.tick(10_000);
  await host.settle();
  assert.equal(host.assignments.length, assignments, "no reload");
});

test("a ready report for an earlier patch of a chain restarts the 2000 ms wait for the newest", async (t) => {
  const host = await readyPreview(t);
  const assignments = host.assignments.length;
  const first = await typeAndPatch(host, edited("one"));
  host.tick(1_000);
  const second = await typeAndPatch(host, edited("two"));
  assert.deepEqual(identityOf(second), nextIdentityOf(first), "the second patch follows the first one");
  host.tick(1_500);
  // The page caught up with the first patch only: alive, still working through the chain.
  await host.ready(nextIdentityOf(first));
  host.tick(1_999);
  await host.settle();
  assert.equal(host.assignments.length, assignments, "no reload 1999 ms after the ready report");
  host.tick(1);
  await host.settle();
  assert.equal(host.assignments.length, assignments + 1, "the reload 2000 ms after it");
  assert.deepEqual(identityOfDocument(host.assignments.at(-1)!), nextIdentityOf(second));
});

test("a page reloaded by the webview after patches gets the current document again", async (t) => {
  const host = await readyPreview(t);
  const loaded = host.loadedIdentity();
  const assignments = host.assignments.length;
  const patch = await typeAndPatch(host, edited("patched"));
  await host.ready(nextIdentityOf(patch));
  await host.settle();
  // The same identity again from the patched page: nothing to do.
  await host.ready(nextIdentityOf(patch));
  await host.settle();
  assert.equal(host.assignments.length, assignments);
  // VS Code recreated the webview, which loads the last assigned document: it reports that render.
  await host.ready(loaded);
  await host.settle();
  assert.equal(host.assignments.length, assignments + 1, "the current document is assigned again");
  assert.deepEqual(identityOfDocument(host.assignments.at(-1)!), nextIdentityOf(patch));
  assert.match(host.assignments.at(-1)!, /First paragraph patched\./u);
});

test("renders wait while the page has an inline editor open, and the newest one arrives on its close", async (t) => {
  const host = await readyPreview(t);
  const loaded = host.loadedIdentity();
  const assignments = host.assignments.length;
  const from = host.posted.length;
  await host.fromPage({ type: "previewEditOpen", ...loaded, editId: "edit-1", line: 5, endLine: 5 });
  const sources = host.postedSince(from, "previewEditSource");
  assert.equal(sources.length, 1, "the host answers the open with the block source");
  assert.equal(sources[0]!.editId, "edit-1");
  assert.equal(sources[0]!.originalText, "Second paragraph.\n");

  for (const marker of ["one", "two"]) {
    host.type(edited(marker));
    host.tick(40);
    await host.until(() => host.postedSince(from, "previewEditorWatch").length > 0, "the editor watch");
    await host.settle();
  }
  host.tick(10_000);
  await host.settle();
  assert.deepEqual(host.postedSince(from, "previewContentPatch"), [], "no render reaches the open editor");
  assert.equal(host.assignments.length, assignments, "and no reload");
  const watches = host.postedSince(from, "previewEditorWatch");
  assert.equal(watches.length, 1, "the page is asked once per editor");
  assert.equal(watches[0]!.editId, "edit-1");

  await host.fromPage({ type: "previewEditClosed", ...loaded, editId: "edit-1" });
  await host.settle();
  const patches = host.postedSince(from, "previewContentPatch");
  assert.equal(patches.length, 1, "the deferred render arrives once the editor closed");
  assert.match(String(patches[0]!.contentHtml), /First paragraph two\./u, "the newest render, not the older one");
  assert.deepEqual(identityOf(patches[0]!), loaded);
});

test("a close of another editor id releases nothing", async (t) => {
  const host = await readyPreview(t);
  const loaded = host.loadedIdentity();
  const from = host.posted.length;
  await host.fromPage({ type: "previewEditOpen", ...loaded, editId: "edit-1", line: 5, endLine: 5 });
  host.type(edited("held"));
  host.tick(40);
  await host.until(() => host.postedSince(from, "previewEditorWatch").length > 0, "the editor watch");
  await host.fromPage({ type: "previewEditClosed", ...loaded, editId: "edit-other" });
  host.tick(10_000);
  await host.settle();
  assert.deepEqual(host.postedSince(from, "previewContentPatch"), []);
});

test("Refresh Preview brings the render to the page even over an open inline editor", async (t) => {
  const host = await readyPreview(t);
  const loaded = host.loadedIdentity();
  const assignments = host.assignments.length;
  const from = host.posted.length;
  await host.fromPage({ type: "previewEditOpen", ...loaded, editId: "edit-1", line: 5, endLine: 5 });
  const refresh = host.runCommand("markdown-okf-schema-studio.refreshPreview");
  host.tick(40);
  await host.until(() => host.postedSince(from, "previewContentPatch").length > 0, "the forced render");
  await refresh;
  assert.equal(host.assignments.length, assignments, "the ready page is patched in place");
  assert.deepEqual(identityOf(host.postedSince(from, "previewContentPatch")[0]!), loaded);
  // A plain edit afterwards waits for the editor again: only the refresh goes through.
  const afterRefresh = host.posted.length;
  host.type(edited("after refresh"));
  host.tick(40);
  await host.settle();
  host.tick(10_000);
  await host.settle();
  assert.deepEqual(host.postedSince(afterRefresh, "previewContentPatch"), []);
});

test("a preview disposed while its render is debouncing, building or awaiting a patch acknowledgement stays silent", async (t) => {
  for (const moment of ["debouncing", "building", "awaiting acknowledgement"] as const) {
    const host = await openPreview(t.mock.timers, MARKDOWN);
    await host.ready();
    await host.settle();
    const from = host.posted.length;
    host.type(edited(moment.replaceAll(" ", "-")));
    if (moment === "building") host.tick(40);
    if (moment === "awaiting acknowledgement") {
      host.tick(40);
      await host.until(() => host.postedSince(from, "previewContentPatch").length > 0, "the content patch");
    }
    host.panel.dispose();
    await host.settle();
    host.tick(10_000);
    await host.settle();
    assert.deepEqual(host.panel.afterDispose, [], `${moment}: nothing is posted or assigned after the dispose`);
    closeHost(t.mock.timers);
  }
});
