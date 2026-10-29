/**
 * The block editor of a GitHub alert. The document is rendered and mapped like the preview, the
 * lines the page sends for a click are the ones `createMappedBlocks(...).editingElementFor` and
 * `openBlockEditor` would use, and the open goes through `handlePageMessage` of the real
 * `PreviewManager` over an in-memory document, like a page message: the answer is the source text
 * the block editor shows.
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
import { renderMappedPage } from "./mappedHtmlDom";
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
    readOnly: false,
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

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
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

/**
 * Clicks the element of the rendered `source` that reads `text`, as the page does in edit mode,
 * and returns the line range posted with previewEditOpen and the source text the host answers.
 */
async function openByClick(source: string, text: string): Promise<{ line: number; endLine: number; originalText: unknown }> {
  const page = await renderMappedPage(source, SOURCE_FILE, DOCUMENT_ID);
  const clicked = page.elementWithText(text);
  const mapped = clicked.closest(MAPPINGS_SELECTOR);
  assert.ok(mapped, `the click on "${text}" lands in a mapped block`);
  const blocks = createMappedBlocks(page.document as never, { activeSourceFile: SOURCE_FILE, documentId: DOCUMENT_ID } as never);
  const editing = blocks.editingElementFor(mapped as never);
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

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("a click on either paragraph of a two-paragraph alert opens the whole alert, marker line to last quoted line", async () => {
  for (const text of ["The first paragraph of the note.", "The second paragraph of the note."]) {
    const opened = await openByClick(TWO_PARAGRAPH_ALERT, text);
    assert.deepEqual([opened.line, opened.endLine], [7, 10], `click on "${text}"`);
    assert.equal(opened.originalText,
      "> [!NOTE]\n> The first paragraph of the note.\n>\n> The second paragraph of the note.\n");
  }
  const after = await openByClick(TWO_PARAGRAPH_ALERT, "A paragraph after the alert.");
  assert.deepEqual([after.line, after.endLine], [12, 12], "a paragraph after the alert still opens alone");
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

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("each of several consecutive alerts opens only its own lines", async () => {
  const expected: Array<[string, number, number]> = [
    ["The note.", 1, 2],
    ["The tip, second paragraph.", 4, 7],
    ["The bold-marker warning.", 9, 10],
    ["The caution.", 12, 13],
  ];
  for (const [text, from, to] of expected) {
    const opened = await openByClick(CONSECUTIVE_ALERTS, text);
    assert.deepEqual([opened.line, opened.endLine], [from, to], `click on "${text}"`);
    assert.equal(opened.originalText, linesOf(CONSECUTIVE_ALERTS, from, to), `click on "${text}"`);
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

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("an alert inside a list item opens on its own indented lines, the list item indentation included", async () => {
  const opened = await openByClick(ALERT_IN_LIST_ITEM, "Its second paragraph.");
  assert.deepEqual([opened.line, opened.endLine], [3, 6]);
  assert.equal(opened.originalText,
    "  > [!WARNING]\n  > The warning inside the list item.\n  >\n  > Its second paragraph.\n");
  const item = await openByClick(ALERT_IN_LIST_ITEM, "The last list item.");
  assert.deepEqual([item.line, item.endLine], [1, 8], "a click on another item still opens the whole list");
});

const LIST_IN_ALERT = [
  "> [!IMPORTANT]",
  "> Before the list:",
  ">",
  "> - first item",
  "> - second item",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("a click on a list item inside an alert opens the whole alert", async () => {
  const opened = await openByClick(LIST_IN_ALERT, "second item");
  assert.deepEqual([opened.line, opened.endLine], [1, 5]);
  assert.equal(opened.originalText, LIST_IN_ALERT);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("a click on the paragraph of the second alert of the layout fixture opens that whole alert", async () => {
  const source = fs.readFileSync(LAYOUT_FIXTURE, "utf8");
  const opened = await openByClick(source, "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur,\nadipisci velit, sed quia non numquam eius modi tempora incidunt.");
  assert.deepEqual([opened.line, opened.endLine], [39, 41]);
  assert.equal(opened.originalText, linesOf(source, 39, 41));
});

const MYST_ADMONITION = [
  "```{note}",
  "The first paragraph of the admonition.",
  "",
  "The second paragraph of the admonition.",
  "```",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("a click on a paragraph in the body of a MyST admonition opens the whole directive", async () => {
  const opened = await openByClick(MYST_ADMONITION, "The second paragraph of the admonition.");
  assert.deepEqual([opened.line, opened.endLine], [1, 5]);
  assert.equal(opened.originalText, MYST_ADMONITION);
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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("a click in the body of a colon-fence admonition opens the whole directive, also from a list item", async () => {
  for (const text of ["The first paragraph of the warning.", "another list item"]) {
    const opened = await openByClick(COLON_ADMONITION, text);
    assert.deepEqual([opened.line, opened.endLine], [3, 8], `click on "${text}"`);
    assert.equal(opened.originalText, linesOf(COLON_ADMONITION, 3, 8));
  }
  const after = await openByClick(COLON_ADMONITION, "After.");
  assert.deepEqual([after.line, after.endLine], [10, 10]);
});

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

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
// @tests_req SwRS-MDOKFSTUDIO-MYST-013
test("a click in the body of a context-tag panel still opens the clicked paragraph only", async () => {
  const opened = await openByClick(CONTEXT_TAG, "The first paragraph of the instructions.");
  assert.deepEqual([opened.line, opened.endLine], [5, 5]);
  assert.equal(opened.originalText, linesOf(CONTEXT_TAG, 5, 5));
});
