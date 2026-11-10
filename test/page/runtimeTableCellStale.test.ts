import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import { NEXT_IDENTIFIERS, patchMessage } from "./runtimeTestSupport";

/**
 * A table the page wrote into is rebuilt by the next content patch (QA 271, c6-1). The harness has
 * no HTML parser: a template stub hands the morph prepared nodes, so the keyed morph runs for real.
 */

const TABLE_HTML = "<table><tr><td>alpha</td><td>y</td></tr></table>";
const SOURCE = "| A | B |\n| --- | --- |\n| alpha | y |\n| p | q |\n";

/** A rendered table of three rows by two columns, as the host HTML `TABLE_HTML` stands for it. */
function renderedTable(harness: RuntimeHarness): { table: RuntimeElement; cells: RuntimeElement[][] } {
  const table = new RuntimeElement({
    "data-sphinx-preview-document": "file:///active.md",
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  Object.defineProperty(table, "outerHTML", { value: TABLE_HTML });
  Object.defineProperty(table, "nodeType", { value: 1 });
  const rows: RuntimeElement[] = [];
  const cells = [0, 1, 2].map((rowIndex) => {
    const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
    row.rowIndex = rowIndex;
    table.appendChild(row);
    rows.push(row);
    return [0, 1].map((columnIndex) => {
      const cell = new RuntimeElement({}, harness.windowState, 100, 30, rowIndex === 0 ? "th" : "td");
      cell.cellIndex = columnIndex;
      row.appendChild(cell);
      row.cells.push(cell);
      return cell;
    });
  });
  table.rows = rows;
  return { table, cells };
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-069
// @tests_req SwRS-MDOKFSTUDIO-TABLE-035
// @tests_req SwRS-MDOKFSTUDIO-TABLE-119
test("a table whose cell was left with Tab is rebuilt by a patch that carries the first render again", () => {
  const harness = createRuntimeHarness();
  const content = harness.previewContent;
  // The nodes the next patch parses: the harness gives the morph a template that hands them out.
  let nextNodes: RuntimeElement[] = [];
  const document = harness.document as unknown as { createElement: (tag: string) => unknown };
  const createElement = document.createElement.bind(document);
  document.createElement = (tag: string) => tag === "template"
    ? { content: { get childNodes() { return nextNodes; } }, set innerHTML(_html: string) { /* nodes are prepared */ } }
    : createElement(tag);
  (content as unknown as { replaceChildren: (...nodes: RuntimeElement[]) => void }).replaceChildren = (...nodes) => {
    content.childElements.splice(0, content.childElements.length, ...nodes);
    nodes.forEach((node) => { node.parentElement = content; });
  };
  Object.defineProperty(RuntimeElement.prototype, "parentNode", { get() { return this.parentElement ?? null; }, configurable: true });
  try {
    const first = renderedTable(harness);
    nextNodes = [first.table];
    harness.dispatchMessage(patchMessage({ contentHtml: TABLE_HTML }));
    assert.equal(content.childElements[0], first.table, "the first render is in the page");

    harness.editModeButton.dispatch("click");
    harness.dispatchDocument("click", { target: first.cells[1][0], preventDefault: () => undefined });
    harness.dispatchMessage({
      type: "previewEditSource", ...NEXT_IDENTIFIERS, editId: harness.messages.at(-1)?.editId, originalText: SOURCE,
    });
    const input = (): RuntimeElement => harness.createdElements.filter((element) =>
      element.getAttribute("aria-label") === "Markdown table cell").at(-1)!;
    assert.equal(input().value, "alpha");
    input().value = "alpha X";
    input().dispatch("input");
    input().dispatch("keydown", { key: "Tab", preventDefault: () => undefined });
    input().dispatch("keydown", { key: "Escape", preventDefault: () => undefined });

    // The buffer went back to the first render: its patch carries the HTML the page started with.
    const second = renderedTable(harness);
    nextNodes = [second.table];
    harness.dispatchMessage(patchMessage({
      documentId: NEXT_IDENTIFIERS.documentId,
      revision: NEXT_IDENTIFIERS.revision,
      requestId: NEXT_IDENTIFIERS.requestId,
      next: { revision: 9, requestId: 13 },
      contentHtml: TABLE_HTML,
    }));
    assert.equal(content.childElements[0], second.table, "the table the page rewrote is replaced by the host's");
  } finally {
    Reflect.deleteProperty(RuntimeElement.prototype, "parentNode");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-069
test("a table the page did not write into is kept by a patch with the same HTML", () => {
  const harness = createRuntimeHarness();
  const content = harness.previewContent;
  let nextNodes: RuntimeElement[] = [];
  const document = harness.document as unknown as { createElement: (tag: string) => unknown };
  const createElement = document.createElement.bind(document);
  document.createElement = (tag: string) => tag === "template"
    ? { content: { get childNodes() { return nextNodes; } }, set innerHTML(_html: string) { /* nodes are prepared */ } }
    : createElement(tag);
  (content as unknown as { replaceChildren: (...nodes: RuntimeElement[]) => void }).replaceChildren = (...nodes) => {
    content.childElements.splice(0, content.childElements.length, ...nodes);
    nodes.forEach((node) => { node.parentElement = content; });
  };
  const first = renderedTable(harness);
  nextNodes = [first.table];
  harness.dispatchMessage(patchMessage({ contentHtml: TABLE_HTML }));
  nextNodes = [renderedTable(harness).table];
  harness.dispatchMessage(patchMessage({
    ...NEXT_IDENTIFIERS, next: { revision: 9, requestId: 13 }, contentHtml: TABLE_HTML,
  }));
  assert.equal(content.childElements[0], first.table, "an untouched block stays in place (PERF-05)");
});
