import * as assert from "node:assert/strict";
import { test } from "node:test";

import { chartTooltip, hideChartTooltip } from "../../../src/page/modules/chartTooltip";
import { FakeDocument, type FakeElement } from "./fakeDom";

const doc = new FakeDocument();
const windowListeners = new Map<string, unknown[]>();
(globalThis as Record<string, unknown>).document = Object.assign(doc, {
  addEventListener: (type: string, listener: unknown) => windowListeners.set(`document:${type}`, [listener]),
});
(globalThis as Record<string, unknown>).window = {
  innerWidth: 800,
  innerHeight: 600,
  addEventListener: (type: string, listener: unknown, capture: unknown) => windowListeners.set(`window:${type}:${String(capture)}`, [listener]),
};

// The module reads `document` and `window` when it runs, so the fakes are set after the imports.
const at = (clientX: number, clientY: number) => ({ clientX, clientY }) as MouseEvent;
const show = (value: unknown, x = 100, y = 100): void => chartTooltip(undefined, at(x, y), undefined, value);
const box = (): FakeElement => doc.body.querySelector(".myst-vega-tooltip")!;
const rowsOf = (): string[][] => box().querySelectorAll(".myst-vega-tooltip-row")
  .map((row) => [row.querySelector(".myst-vega-tooltip-key")?.textContent ?? "", row.querySelector(".myst-vega-tooltip-value")!.textContent]);

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("an object value gives a key and a value row per field, as text and never as HTML", () => {
  show({ Quarter: "Q1", Revenue: 12, note: "<b>x</b>" });
  assert.deepEqual(rowsOf(), [["Quarter", "Q1"], ["Revenue", "12"], ["note", "<b>x</b>"]]);
  assert.equal(box().querySelectorAll("b").length, 0, "no element b: the value stays text");
  assert.equal(box().hasAttribute("hidden"), false);
  assert.equal(box().getAttribute("role"), "tooltip");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("a plain value gives one row with the value only, a nested value is written as JSON text", () => {
  show("Only text");
  assert.deepEqual(rowsOf(), [["", "Only text"]]);
  show({ list: [1, 2], nested: { a: 1 } });
  assert.deepEqual(rowsOf(), [["list", "[1,2]"], ["nested", '{"a":1}']]);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("a null or undefined value hides the box", () => {
  show({ a: 1 });
  show(null);
  assert.equal(box().hasAttribute("hidden"), true);
  show({ a: 1 });
  show(undefined);
  assert.equal(box().hasAttribute("hidden"), true);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("the box sits at the pointer, offset 10 px, through the CSSOM only (no style attribute)", () => {
  show({ a: 1 }, 100, 200);
  assert.equal(box().styles.get("left"), "110px");
  assert.equal(box().styles.get("top"), "210px");
  assert.equal(box().hasAttribute("style"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("at the right or bottom edge of the viewport the box goes to the other side of the pointer", () => {
  show({ a: 1 }, 790, 590);
  // The fake box is 40 by 20: left of the pointer by the offset and the width, above it by the offset and the height.
  assert.equal(box().styles.get("left"), "740px");
  assert.equal(box().styles.get("top"), "560px");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("one shared element serves every call, a child of body and not of the content", () => {
  show({ a: 1 });
  show({ b: 2 });
  assert.equal(doc.body.querySelectorAll(".myst-vega-tooltip").length, 1);
  assert.equal(box().parentNode, doc.body);
  assert.equal(doc.content.querySelectorAll(".myst-vega-tooltip").length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("a scroll (capture, on the window), a content patch and hideChartTooltip hide the box", () => {
  for (const hide of [
    () => (windowListeners.get("window:scroll:true")![0] as () => void)(),
    () => (windowListeners.get("document:studio:content-replaced")![0] as () => void)(),
    () => hideChartTooltip(),
  ]) {
    show({ a: 1 });
    assert.equal(box().hasAttribute("hidden"), false);
    hide();
    assert.equal(box().hasAttribute("hidden"), true);
  }
});
