import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  containsRawTable,
  findNode,
  mergeProperties,
  type MystNode,
  normalizeTableAlignment,
  setHast,
  sourcePositionProperties,
  takeAdmonitionTitle,
} from "../../../src/core/render/mystNode";

test("setHast and mergeProperties add to the element a node renders as", () => {
  const node: MystNode = { type: "x", data: { hProperties: { id: "a" } } };
  setHast(node, "aside", { class: "note" });
  mergeProperties(node, { "data-line": 2 });
  assert.deepEqual(node.data, { hName: "aside", hProperties: { id: "a", class: "note", "data-line": 2 } });
  setHast(node, "div", {}, [{ type: "text", value: "t" }]);
  assert.deepEqual((node.data as Record<string, unknown>).hChildren, [{ type: "text", value: "t" }]);
});

test("source position attributes need a line and keep an end line that is not before it", () => {
  assert.deepEqual(sourcePositionProperties({ type: "p" }), {});
  assert.deepEqual(sourcePositionProperties({ type: "p", position: { end: { line: 4 } } }, 2), { "data-line": 2, "data-end-line": 4 });
  assert.deepEqual(sourcePositionProperties({ type: "p", position: { end: { line: 1 } } }, 2), { "data-line": 2 });
  assert.deepEqual(sourcePositionProperties({ type: "p", data: { included: true } }, 3),
    { "data-line": 3, "data-sphinx-preview-included": "true" });
});

test("findNode, table alignment and raw tables", () => {
  const table: MystNode = { type: "table" };
  assert.equal(findNode({ type: "root", children: [{ type: "p" }, { type: "div", children: [table] }] }, "table"), table);
  assert.equal(findNode({ type: "root" }, "table"), undefined);
  assert.equal(normalizeTableAlignment("CENTER"), "center");
  assert.equal(normalizeTableAlignment("middle"), undefined);
  assert.equal(normalizeTableAlignment(3), undefined);
  assert.ok(containsRawTable({ nodeName: "div", tagName: "div", childNodes: [{ nodeName: "table", tagName: "TABLE" }] }));
  assert.equal(containsRawTable({ nodeName: "p", tagName: "p" }), false);
});

test("an admonition takes its title from a leading heading or a lone bold paragraph", () => {
  const body: MystNode = { type: "paragraph", children: [{ type: "text", value: "Body" }] };
  assert.deepEqual(takeAdmonitionTitle([{ type: "heading", children: [{ type: "text", value: "T" }] }, body]),
    { title: { type: "admonitionTitle", children: [{ type: "text", value: "T" }] }, body: [body] });
  const bold: MystNode = { type: "paragraph", children: [{ type: "text", value: " " }, { type: "strong", children: [] }] };
  assert.equal(takeAdmonitionTitle([bold, body])?.title.type, "admonitionTitle");
  assert.equal(takeAdmonitionTitle([body]), undefined);
  assert.equal(takeAdmonitionTitle([]), undefined);
});
