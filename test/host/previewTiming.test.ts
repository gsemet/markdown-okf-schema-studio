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
import { noteKeystrokeForTests } from "../../src/host-vscode/keystrokes";

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

// @tests_req SwRS-MDOKFSTUDIO-LIFE-039
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

// @tests_req SwRS-MDOKFSTUDIO-LIFE-049
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

// @tests_req SwRS-MDOKFSTUDIO-LIFE-071
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-193
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-191
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-041
// @tests_req SwRS-MDOKFSTUDIO-LIFE-032
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

// @tests_req SwRS-MDOKFSTUDIO-LIFE-143
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

// A table (source lines 1 to 3) followed by two paragraphs, for the cell editor tests below.
const TABLE = "| a | b |\n| --- | --- |\n| alpha | x |\n";
const TABLE_DOCUMENT = `${TABLE}\nPara one.\n\nPara two.\n`;
const ALPHA = TABLE_DOCUMENT.indexOf("alpha");

/** An open preview over {@link TABLE_DOCUMENT} whose page has loaded and reported ready. */
async function tablePreview(t: TestContext): Promise<HostSession> {
  const host = await openPreview(t.mock.timers, TABLE_DOCUMENT);
  t.after(() => closeHost(t.mock.timers));
  await host.ready();
  await host.settle();
  return host;
}

/** The page opens a table cell editor on the table of {@link TABLE_DOCUMENT}. */
async function openCellEditor(host: HostSession, editId: string): Promise<void> {
  await host.fromPage({ type: "previewEditOpen", ...host.loadedIdentity(), editId, line: 1, endLine: 3, cellEditor: true });
}

/** Lets the debounce pass and settles the host; returns what was posted from `from` on. */
async function renderFrom(host: HostSession, from: number): Promise<Array<Record<string, unknown>>> {
  host.tick(40);
  await host.settle();
  host.tick(10_000);
  await host.settle();
  return host.postedSince(from, "previewContentPatch");
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-119
test("an undo inside the table of an open cell editor reaches the page at once", async (t) => {
  const host = await tablePreview(t);
  const from = host.posted.length;
  await openCellEditor(host, "cell-1");
  host.edit(ALPHA, 5, "alpha X", 1);
  const patches = await renderFrom(host, from);
  assert.equal(patches.length, 1, "the render of the undo is not held behind the cell editor");
  assert.match(String(patches[0]!.contentHtml), /alpha X/u);
  assert.equal(host.postedSince(from, "previewEditorWatch").length, 0, "nothing waits for the editor to close");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-119
test("a revert-like change that is neither an undo nor typed also reaches an open cell editor's table", async (t) => {
  const host = await tablePreview(t);
  const from = host.posted.length;
  await openCellEditor(host, "cell-1");
  // The last row only: the cursor (line 1) is not near it, so the change is certainly not typing.
  host.edit(ALPHA, "alpha | x |".length, "restored | x |");
  const patches = await renderFrom(host, from);
  assert.equal(patches.length, 1);
  assert.match(String(patches[0]!.contentHtml), /restored/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-119
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-191
test("an undo inside the table releases a held host edit without writing and renders", async (t) => {
  const host = await tablePreview(t);
  const loaded = host.loadedIdentity();
  const from = host.posted.length;
  host.enableHostEdits();
  await openCellEditor(host, "cell-1");
  await host.fromPage({
    type: "previewEditSave", ...loaded, editId: "cell-1", line: 1, endLine: 3, final: false,
    originalText: TABLE, editedText: TABLE.replace("alpha", "alpha Y"),
  });
  await host.settle();
  assert.deepEqual(host.postedSince(from, "previewEditSource").map((message) => message.error), [undefined]);
  await host.until(() => host.document.getText().includes("alpha Y"), "the autosave reaching the document");
  await host.settle();
  host.tick(10_000);
  await host.settle();
  assert.deepEqual(host.postedSince(from, "previewContentPatch"), [], "the autosave's own render waits for the editor");
  const written = host.document.version;
  host.edit(host.document.getText().indexOf("alpha Y"), 7, "alpha", 1);
  const patches = await renderFrom(host, from);
  assert.equal(host.document.version, written + 1, "the host wrote nothing besides the undo");
  assert.equal(host.document.getText(), TABLE_DOCUMENT, "the buffer keeps the undone text");
  assert.equal(host.postedSince(from, "previewEditSource").filter((message) => message.error !== undefined).length, 0,
    "no conflict error is shown in the editor");
  assert.equal(patches.length, 1);
  assert.doesNotMatch(String(patches.at(-1)!.contentHtml), /alpha Y/u);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-193
test("a change outside the table of an open cell editor still waits for it, and follows the table", async (t) => {
  const host = await tablePreview(t);
  const from = host.posted.length;
  await openCellEditor(host, "cell-1");
  host.edit(TABLE_DOCUMENT.indexOf("Para two"), 4, "Part", 1);
  assert.deepEqual(await renderFrom(host, from), [], "an undo in another block waits for the editor");
  // A line added above the table moves it: the editor's range follows, a later undo in it renders.
  host.edit(0, 0, "intro\n\n");
  assert.deepEqual(await renderFrom(host, from), [], "a change above the table waits too");
  host.edit(host.document.getText().indexOf("alpha"), 5, "alpha X", 1);
  const patches = await renderFrom(host, from);
  assert.equal(patches.length, 1, "the table moved with the change before it, and the undo inside it renders");
  assert.match(String(patches[0]!.contentHtml), /alpha X/u);
  assert.match(String(patches[0]!.contentHtml), /Part two/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-119
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-193
test("the first character typed in the source table, before any keystroke is seen, keeps the render waiting", async (t) => {
  const host = await tablePreview(t);
  const from = host.posted.length;
  await openCellEditor(host, "cell-1");
  // The cursor sits on the changed line and VS Code reports the keystroke after the change.
  host.edit(2, 1, "A");
  assert.deepEqual(await renderFrom(host, from), [], "an undecided change does not close the cell editor");
  assert.equal(host.postedSince(from, "previewEditorWatch").length, 1, "the editor is still waited for");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-193
test("text typed in the source table keeps the render waiting", async (t) => {
  const host = await tablePreview(t);
  const from = host.posted.length;
  await openCellEditor(host, "cell-1");
  noteKeystrokeForTests();
  host.edit(2, 1, "A");
  assert.deepEqual(await renderFrom(host, from), [], "typing in the source does not close the cell editor");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-193
test("an undo over the block of a prose editor keeps the render waiting (not a cell editor)", async (t) => {
  const host = await tablePreview(t);
  const from = host.posted.length;
  await host.fromPage({ type: "previewEditOpen", ...host.loadedIdentity(), editId: "block-1", line: 1, endLine: 3 });
  host.edit(ALPHA, 5, "alpha X", 1);
  assert.deepEqual(await renderFrom(host, from), []);
});
