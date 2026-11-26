/**
 * The block editor in a GitHub alert and in a MyST admonition. The document is rendered and mapped
 * like the preview, the lines the page sends for a click (or, with `exact`, for Enter on a block the
 * keyboard selected) are the ones `createMappedBlocks(...).editingElementFor` and `openBlockEditor`
 * would use, and the open goes through `handlePageMessage` of the real `PreviewManager` over an
 * in-memory document, like a page message: the answer is the source text the block editor shows.
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

import type { HostServices } from "../../src/host-api/index";
import type { PanelGroups } from "../../src/host-api/previewPanel";
import { createMemoryDocumentStore } from "../../src/host-memory/memoryDocumentStore";
import { renderMyst } from "../../src/core/render/mystRenderer";
import { PreviewManager } from "../../src/session/previewManager";
import { PreviewSession } from "../../src/session/previewSession";
import { createMappedBlocks } from "../../src/page/features/mappedBlocks";
import { MAPPINGS_SELECTOR } from "../../src/page/features/pageRuntime";
import { attribute, findElement, hasClass, parseHtml } from "../core/render/dom";
import { renderMappedPage, type MappedElement } from "./mappedHtmlDom";
import { nodeHostPorts } from "./nodeHostPorts";

const LAYOUT_FIXTURE = path.resolve(__dirname, "../../../test/core/render/alert-fixtures/layout-two-alerts.md");

async function settle(): Promise<void> {
  for (let index = 0; index < 20; index += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

/** A writable preview over an in-memory document; returns what the host posts to the page. */
function openPreview(text: string) {
  const store = createMemoryDocumentStore();
  const document = store.add("file:///w/README.md", text, "/w/README.md");
  const host = { ...nodeHostPorts, files: {}, documents: store, ui: {} } as unknown as HostServices;
  const groups: PanelGroups = { lockNewPanelGroup: () => Promise.resolve(false), release: () => undefined };
  const manager = new PreviewManager(host, groups);
  const posted: Array<Record<string, unknown>> = [];
  const preview = new PreviewSession({
    panel: { postMessage: (message: Record<string, unknown>) => { posted.push(message); return Promise.resolve(true); } },
    followsActiveEditor: false,
    document,
    documentUri: document.id,
    workspaceRoot: "/w",
    sessionRoots: [],
    navigationRoots: [],
    workspaceFolder: undefined,
    restrictedReads: false,
    webview: {},
    states: {},
    state: undefined,
    status: "success",
    configuration: {},
    plantUmlConfiguration: {},
    plantUmlEngineSettings: {},
    frontmatterConfiguration: {},
  } as never);
  preview.stage = { activeDocumentIdentity: document.id, activeDocumentRevision: document.revision, requestId: 1 } as never;
  preview.page.readyRequestId = 1;
  (manager as unknown as { live: Set<PreviewSession> }).live.add(preview);
  manager.rendering.refreshPreviewDocument = () => Promise.resolve() as never;
  const send = async (type: string, extra: Record<string, unknown>): Promise<void> => {
    await manager.handlePageMessage(preview, {
      type, documentId: document.id, revision: document.revision, requestId: 1, ...extra,
    });
    await settle();
  };
  return { posted, send };
}

// @tests_req SwRS-MDOKFSTUDIO-GFM-009#S1
// @tests_req SwRS-MDOKFSTUDIO-GFM-009#S9
test("the paragraph of the second alert of a document is mapped to its own lines and the host returns them", async () => {
  const source = fs.readFileSync(LAYOUT_FIXTURE, "utf8");
  const lines = source.split("\n");
  // The second alert of the fixture: the marker on line 39, its paragraph on lines 40 and 41.
  assert.equal(lines[38], "> [!NOTE]");
  const html = (await renderMyst(source)).html;
  const note = findElement(parseHtml(html), (element) => element.tagName === "aside" && hasClass(element, "note"));
  assert.ok(note, "the second alert renders as a note");
  const paragraph = findElement(note, (element) => element.tagName === "p" && attribute(element, "data-line") !== undefined);
  assert.ok(paragraph, "the paragraph of the note is a mapped block");
  const line = Number(attribute(paragraph, "data-line"));
  const endLine = Number(attribute(paragraph, "data-end-line"));

  const preview = openPreview(source);
  await preview.send("previewEditOpen", { editId: "e1", line, endLine });
  const answer = preview.posted.find((message) => message.type === "previewEditSource");
  assert.equal(answer?.error, undefined);
  assert.equal(answer?.originalText, `${lines.slice(39, 41).join("\n")}\n`);
  assert.match(String(answer?.originalText), /^> Neque porro quisquam est[^\n]*\n> adipisci velit[^\n]*\n$/u);
});

const SOURCE_FILE = "/w/README.md";
const DOCUMENT_ID = "file:///w/README.md";

type Page = Awaited<ReturnType<typeof renderMappedPage>>;

/** What a gesture aims at: the text of an element, or an element picked from the page. */
type Target = string | ((page: Page) => MappedElement);

/** The title of the admonition or alert of rank `index`, in page order. */
const title = (index = 0): Target => (page) => page.document.querySelectorAll(".admonition-title")[index]!;

/** The admonition or alert element of rank `index` itself: its frame. */
const frame = (index = 0): Target => (page) => page.document.querySelectorAll("aside.admonition")[index]!;

/**
 * Clicks `target` in the rendered `source`, as the page does in edit mode (with `exact`, presses
 * Enter on it after the keyboard selected it), and returns the line range posted with
 * previewEditOpen and the source text the host answers.
 */
async function openByClick(
  source: string, target: Target, exact = false,
): Promise<{ line: number; endLine: number; originalText: unknown }> {
  const page = await renderMappedPage(source, SOURCE_FILE, DOCUMENT_ID);
  const clicked = typeof target === "string" ? page.elementWithText(target) : target(page);
  assert.ok(clicked, "the target is on the page");
  const mapped = clicked.closest(MAPPINGS_SELECTOR);
  assert.ok(mapped, "the target lands in a mapped block");
  const blocks = createMappedBlocks(page.document as never, { activeSourceFile: SOURCE_FILE, documentId: DOCUMENT_ID } as never);
  const editing = blocks.editingElementFor(mapped as never, { exact });
  // The range `openBlockEditor` posts: the source range, else the lines of the editing element.
  const line = editing.sourceRange?.line ?? Number(editing.element.getAttribute("data-sphinx-source-line"));
  const endLine = editing.sourceRange?.endLine
    ?? Number(editing.element.getAttribute("data-sphinx-source-end-line") || line);
  const preview = openPreview(source);
  await preview.send("previewEditOpen", { editId: "e1", line, endLine });
  const answer = preview.posted.find((message) => message.type === "previewEditSource");
  assert.equal(answer?.error, undefined);
  return { line, endLine, originalText: answer?.originalText };
}

/** Lines `from` to `to` (one-based, inclusive) of `source`, as the host returns them. */
function linesOf(source: string, from: number, to: number): string {
  return `${source.split("\n").slice(from - 1, to).join("\n")}\n`;
}

/** Checks that `target` opens the lines `from` to `to` of `source`. */
async function assertOpens(
  source: string, target: Target, from: number, to: number, name: string, exact = false,
): Promise<void> {
  const opened = await openByClick(source, target, exact);
  assert.deepEqual([opened.line, opened.endLine], [from, to], name);
  assert.equal(opened.originalText, linesOf(source, from, to), name);
}

const TWO_PARAGRAPH_ALERT = [
  "---",
  "title: Alerts",
  "---",
  "",
  "A paragraph before the alert.",
  "",
  "> [!NOTE]",
  "> The first paragraph of the note.",
  ">",
  "> The second paragraph of the note.",
  "",
  "A paragraph after the alert.",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
test("a click on a paragraph of a two-paragraph alert opens that paragraph, its title or frame the whole alert", async () => {
  await assertOpens(TWO_PARAGRAPH_ALERT, "The first paragraph of the note.", 8, 8, "the first paragraph");
  await assertOpens(TWO_PARAGRAPH_ALERT, "The second paragraph of the note.", 10, 10, "the second paragraph");
  await assertOpens(TWO_PARAGRAPH_ALERT, title(), 7, 10, "the title");
  await assertOpens(TWO_PARAGRAPH_ALERT, frame(), 7, 10, "the frame");
  await assertOpens(TWO_PARAGRAPH_ALERT, "A paragraph after the alert.", 12, 12, "a paragraph after the alert");
});

const CONSECUTIVE_ALERTS = [
  "> [!NOTE]",
  "> The note.",
  "",
  "> [!TIP] A titled tip",
  "> The tip, first paragraph.",
  ">",
  "> The tip, second paragraph.",
  "",
  "> **Warning**",
  "> The bold-marker warning.",
  "",
  "> [!CAUTION]",
  "> The caution.",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
test("each of several consecutive alerts opens only its own lines from its title", async () => {
  const expected: Array<[number, number]> = [[1, 2], [4, 7], [9, 10], [12, 13]];
  for (const [index, [from, to]] of expected.entries()) {
    await assertOpens(CONSECUTIVE_ALERTS, title(index), from, to, `the title of alert ${index + 1}`);
  }
});

const ALERT_IN_LIST_ITEM = [
  "- A list item that holds an alert:",
  "",
  "  > [!WARNING]",
  "  > The warning inside the list item.",
  "  >",
  "  > Its second paragraph.",
  "",
  "- The last list item.",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
test("an alert inside a list item opens on its own indented lines from its title", async () => {
  const opened = await openByClick(ALERT_IN_LIST_ITEM, title());
  assert.deepEqual([opened.line, opened.endLine], [3, 6]);
  assert.equal(opened.originalText,
    "  > [!WARNING]\n  > The warning inside the list item.\n  >\n  > Its second paragraph.\n");
  const item = await openByClick(ALERT_IN_LIST_ITEM, "The last list item.");
  // A click on a list item opens that item only (it opened the whole list, 1 to 8, before list
  // items were edited one by one).
  assert.deepEqual([item.line, item.endLine], [8, 8], "a click on another item opens that item only");
  assert.equal(item.originalText, "- The last list item.\n");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
test("a paragraph in the body of an alert inside a list item opens that paragraph, not the item and not the alert", async () => {
  await assertOpens(ALERT_IN_LIST_ITEM, "The warning inside the list item.", 4, 4, "the first paragraph");
  await assertOpens(ALERT_IN_LIST_ITEM, "Its second paragraph.", 6, 6, "the second paragraph");
});

const LIST_IN_ALERT = [
  "> [!IMPORTANT]",
  "> Before the list:",
  ">",
  "> - first item",
  "> - second item",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
test("a click on a list item inside an alert opens that item", async () => {
  await assertOpens(LIST_IN_ALERT, "second item", 5, 5, "the second item");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
test("a click on the paragraph of the second alert of the layout fixture opens that paragraph", async () => {
  const source = fs.readFileSync(LAYOUT_FIXTURE, "utf8");
  await assertOpens(source,
    "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur,\nadipisci velit, sed quia non numquam eius modi tempora incidunt.",
    40, 41, "the paragraph of the second alert");
});

const MYST_ADMONITION = [
  "```{note}",
  "The first paragraph of the admonition.",
  "",
  "The second paragraph of the admonition.",
  "```",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
test("a click on a paragraph of a MyST admonition opens that paragraph, its title the whole directive", async () => {
  await assertOpens(MYST_ADMONITION, "The second paragraph of the admonition.", 4, 4, "the second paragraph");
  await assertOpens(MYST_ADMONITION, title(), 1, 5, "the title");
  await assertOpens(MYST_ADMONITION, frame(), 1, 5, "the frame");
});

const COLON_ADMONITION = [
  "Before.",
  "",
  ":::{warning}",
  "The first paragraph of the warning.",
  "",
  "- a list item in the warning",
  "- another list item",
  ":::",
  "",
  "After.",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
test("a click in a colon-fence admonition opens the pointed paragraph or item, its title the whole directive", async () => {
  await assertOpens(COLON_ADMONITION, "The first paragraph of the warning.", 4, 4, "the paragraph");
  await assertOpens(COLON_ADMONITION, "another list item", 7, 7, "the second item");
  await assertOpens(COLON_ADMONITION, title(), 3, 8, "the title");
  await assertOpens(COLON_ADMONITION, "After.", 10, 10, "after the admonition");
});

const NESTED_ADMONITIONS = [
  "::::{note}",
  "The outer paragraph.",
  "",
  ":::{tip}",
  "The inner paragraph.",
  ":::",
  "::::",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
test("in nested admonitions the nearest one decides: body block, inner title or frame, outer title", async () => {
  await assertOpens(NESTED_ADMONITIONS, "The inner paragraph.", 5, 5, "the inner paragraph");
  await assertOpens(NESTED_ADMONITIONS, title(1), 4, 6, "the inner title");
  await assertOpens(NESTED_ADMONITIONS, frame(1), 4, 6, "the inner frame");
  await assertOpens(NESTED_ADMONITIONS, title(0), 1, 7, "the outer title");
  await assertOpens(NESTED_ADMONITIONS, "The outer paragraph.", 2, 2, "the outer paragraph");
});

const WALKED_BODY = [
  "A sentence.",
  "",
  "- First item",
  "- Second item",
  "",
  "  Its second paragraph.",
  "",
  "  - the sub item",
  "  - another sub item",
  "- Third item",
];

const WALKED_ADMONITIONS: ReadonlyArray<[string, string]> = [
  ["a MyST admonition", [":::{note}", ...WALKED_BODY, ":::", ""].join("\n")],
  ["a GitHub alert", ["> [!NOTE]", ...WALKED_BODY.map((line) => (line === "" ? ">" : `> ${line}`)), ""].join("\n")],
];

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S5
for (const [kind, source] of WALKED_ADMONITIONS) {
  test(`Enter on an element of ${kind} reached with the arrows opens that element only`, async () => {
    const end = kind === "a MyST admonition" ? 12 : 11;
    const first = (selector: string): Target => (page) => page.document.querySelector(selector)!;
    await assertOpens(source, frame(), 1, end, "the admonition itself", true);
    await assertOpens(source, "A sentence.", 2, 2, "the paragraph", true);
    await assertOpens(source, first("ul"), 4, 11, "the list", true);
    await assertOpens(source, "First item", 4, 4, "the first item", true);
    await assertOpens(source, "the sub item", 9, 9, "an item of the nested sub-list", true);
    // A paragraph of a loose item is mapped up to the blank line that follows it.
    await assertOpens(source, "Its second paragraph.", 7, 8, "a block of an item", true);
  });
}

const CONTEXT_TAG = [
  "Before.",
  "",
  "<instructions>",
  "",
  "The first paragraph of the instructions.",
  "",
  "- a list item in the instructions",
  "",
  "</instructions>",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
// @tests_req SwRS-MDOKFSTUDIO-MYST-013#S2
test("a click in the body of a context-tag panel still opens the clicked paragraph only", async () => {
  const opened = await openByClick(CONTEXT_TAG, "The first paragraph of the instructions.");
  assert.deepEqual([opened.line, opened.endLine], [5, 5]);
  assert.equal(opened.originalText, linesOf(CONTEXT_TAG, 5, 5));
});
