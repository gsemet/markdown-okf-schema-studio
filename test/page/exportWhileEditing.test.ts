import * as assert from "node:assert/strict";
import { test } from "node:test";

import { isElement, textOf, type HtmlElement, type HtmlNode, type HtmlParent } from "../../src/core/export/exportDom";
import { buildHtmlExport } from "../../src/core/export/htmlExport";
import type { ExportSnapshot } from "../../src/core/export/exportSnapshot";
import { parseFragment } from "parse5";
import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import { openBlockEditorWithSource } from "./runtimeTestSupport";

/**
 * Export to HTML while an editor is open: the page is built with the real editors of the runtime
 * (the block editor, the table cell editor, the front matter key and value editors), the Export
 * button takes the snapshot, and the snapshot goes through `buildHtmlExport`. The runtime harness
 * has no markup of its own, so the content is serialized here from its fake elements.
 */

const escapeText = (text: string): string => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;");

/** The element, its children and the siblings inserted after it (`afterend`), as markup. */
function markup(element: RuntimeElement): string {
  const tag = element.tagName.toLowerCase();
  const attributes = Object.entries((element as unknown as { attributes: Record<string, string> }).attributes)
    .map(([name, value]) => ` ${name}="${value.replace(/"/gu, "&quot;")}"`).join("");
  const own = escapeText(element.tagName === "TEXTAREA" ? element.value : element.textContent);
  const children = element.childElements.map((child) => markup(child) + child.insertedElements.map(markup).join("")).join("");
  return `<${tag}${attributes}>${own}${children}</${tag}>`;
}

/** The content as the page would hold it: `root` and what was inserted after each element. */
function contentOf(harness: RuntimeHarness, ...blocks: RuntimeElement[]): void {
  const root = new RuntimeElement({ id: "sphinx-myst-preview-content" }, harness.windowState, 0, 1, "main");
  blocks.forEach((block) => root.appendChild(block));
  harness.previewContent.innerHTML = root.childElements
    .map((child) => markup(child) + child.insertedElements.map(markup).join("")).join("");
}

/** Clicks Export and returns the snapshot the page sent the host, built into the file body. */
function exportedBody(harness: RuntimeHarness): { body: HtmlParent; snapshot: ExportSnapshot } {
  harness.exportButton.dispatch("click");
  harness.flushTimers();
  const request = harness.messages.find((message) => message.type === "previewExportHtml");
  assert.ok(request, "the export request was not sent");
  const snapshot = request.snapshot as ExportSnapshot;
  const { html } = buildHtmlExport(snapshot, { stem: "page", maxContentWidth: 0, imageData: () => undefined });
  const start = html.indexOf("<main");
  const end = html.lastIndexOf("</main>") + "</main>".length;
  return { body: parseFragment(html.slice(start, end)) as unknown as HtmlParent, snapshot };
}

const elementsOf = (root: HtmlParent): HtmlElement[] => {
  const found: HtmlElement[] = [];
  const visit = (node: HtmlParent): void => {
    for (const child of node.childNodes as HtmlNode[]) {
      if (isElement(child)) {
        found.push(child);
        visit(child);
      }
    }
  };
  visit(root);
  return found;
};

const attribute = (element: HtmlElement, name: string): string | undefined =>
  element.attrs.find((entry) => entry.name === name)?.value;

/** Asserts the text is in the file body on an element that nothing hides, and that no editor chrome is left. */
function assertShown(body: HtmlParent, text: string): void {
  const all = elementsOf(body);
  assert.equal(all.some((element) => element.tagName === "textarea"), false, "a textarea is left in the file");
  for (const name of ["data-sphinx-preview-block-editor", "data-okf-frontmatter-editor"]) {
    assert.equal(all.some((element) => attribute(element, name) !== undefined), false, `${name} is left in the file`);
  }
  const holders = all.filter((element) => textOf(element).includes(text));
  assert.ok(holders.length > 0, `"${text}" is not in the file`);
  const target = holders.at(-1)!;
  for (let current: HtmlElement | undefined = target; current && current.tagName !== "main"; current = current.parentNode as HtmlElement | undefined) {
    assert.equal(attribute(current, "hidden"), undefined, `<${current.tagName}> is hidden in the file`);
    assert.notEqual(attribute(current, "aria-hidden"), "true", `<${current.tagName}> is aria-hidden in the file`);
    assert.equal(attribute(current, "data-sphinx-table-cell-content"), undefined, "the cell content is still wrapped");
  }
  assert.equal(all.some((element) => attribute(element, "data-sphinx-table-cell-content") !== undefined), false);
}

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-137
test("a paragraph under the block editor is exported, and its editor stays open", () => {
  const harness = createRuntimeHarness();
  harness.mappings[1]!.textContent = "Second paragraph rendered.";
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Second paragraph typed";
  contentOf(harness, harness.mappings[1]!);
  const { body } = exportedBody(harness);
  assertShown(body, "Second paragraph rendered.");
  assert.equal(textarea.value, "Second paragraph typed");
  assert.equal(textarea.removed, false);
  assert.equal(harness.mappings[1]!.getAttribute("data-sphinx-preview-editing"), "true");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-137
test("a block editor opened inside a card exports the block of the card", () => {
  const harness = createRuntimeHarness();
  const card = new RuntimeElement({ class: "myst-card" }, harness.windowState, 400, 100, "div");
  harness.mappings[1]!.textContent = "Card body rendered.";
  card.appendChild(harness.mappings[1]!);
  const textarea = openBlockEditorWithSource(harness);
  contentOf(harness, card);
  const { body } = exportedBody(harness);
  assertShown(body, "Card body rendered.");
  assert.equal(textarea.removed, false);
});

/** A table with one body cell holding rendered content; its cell editor (or raw editor) is opened with `source`. */
function openCellEditor(harness: RuntimeHarness, source: string): { table: RuntimeElement; cell: RuntimeElement } {
  const table = new RuntimeElement({
    "data-sphinx-preview-document": "file:///active.md",
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
  row.rowIndex = 1;
  const cell = new RuntimeElement({}, harness.windowState, 100, 30, "td");
  cell.cellIndex = 1;
  const rendered = new RuntimeElement({}, harness.windowState, 100, 30, "strong");
  rendered.textContent = "Cell text rendered";
  cell.appendChild(rendered);
  table.appendChild(row);
  row.appendChild(cell);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: cell, preventDefault: () => undefined, stopPropagation: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: source,
  });
  // The fake does not move an element inserted after the table out of the cell it was built in.
  table.insertedElements.forEach((inserted) => cell.removeChild(inserted));
  return { table, cell };
}

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-137
test("a table cell under the cell editor is exported shown, and its editor stays open", () => {
  const harness = createRuntimeHarness();
  const { table, cell } = openCellEditor(harness, "| A | B |\n| --- | --- |\n| x | y |\n| p | q |\n");
  const input = harness.createdElements.filter((element) => element.getAttribute("aria-label") === "Markdown table cell").at(-1);
  assert.ok(input, "the cell editor did not open");
  contentOf(harness, table);
  const { body } = exportedBody(harness);
  assertShown(body, "Cell text rendered");
  assert.equal(input.removed, false);
  assert.equal(cell.getAttribute("data-sphinx-preview-table-cell-selected"), "true");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-137
test("a {list-table} edited as raw Markdown is exported with its table", () => {
  const harness = createRuntimeHarness();
  const { table } = openCellEditor(harness, "Not a table the cell editor can read\n");
  const textarea = harness.createdElements.find((element) => element.getAttribute("aria-label") === "Raw Markdown block");
  assert.ok(textarea, "the raw editor did not open");
  contentOf(harness, table);
  const { body } = exportedBody(harness);
  assertShown(body, "Cell text rendered");
  assert.equal(textarea.removed, false);
});

/** A properties table with the field row of the harness, its displays carrying text, in the content. */
function propertiesContent(harness: RuntimeHarness): void {
  harness.frontmatterNameDisplay.textContent = "lifecycle";
  harness.frontmatterValueDisplay.textContent = "draft";
  contentOf(harness, harness.frontmatterProperties);
}

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-137
test("a front matter value under the value editor is exported shown, and its editor stays open", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.frontmatterValueCell, preventDefault: () => undefined, stopPropagation: () => undefined });
  const control = harness.createdElements.find((element) => element.getAttribute("aria-label") === "Frontmatter lifecycle");
  assert.ok(control, "the value editor did not open");
  propertiesContent(harness);
  const { body } = exportedBody(harness);
  assertShown(body, "draft");
  assert.equal(control.removed, false);
  assert.equal(harness.frontmatterValueDisplay.getAttribute("hidden"), "", "the export changed the live display");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-137
test("a front matter key under the key editor is exported shown, and its editor stays open", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.frontmatterNameCell, preventDefault: () => undefined, stopPropagation: () => undefined });
  const control = harness.createdElements.find((element) => element.getAttribute("aria-label") === "Frontmatter key lifecycle");
  assert.ok(control, "the key editor did not open");
  propertiesContent(harness);
  const { body } = exportedBody(harness);
  assertShown(body, "lifecycle");
  assert.equal(control.removed, false);
});
