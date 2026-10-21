import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installFirstClearance } from "../../src/webview/firstClearance";

function rect(top: number, left: number, width: number, height: number) {
  return { top, left, right: left + width, bottom: top + height, width, height };
}

function setup(column: ReturnType<typeof rect>, toolbar: ReturnType<typeof rect>, scrollY = 0) {
  const published = new Map<string, string>();
  const content = { getBoundingClientRect: () => column };
  const bar = { getBoundingClientRect: () => toolbar };
  const document = {
    getElementById: (id: string) => (id === "sphinx-myst-preview-content" ? content : null),
    querySelector: (selector: string) => (selector === "[data-sphinx-preview-toolbar]" ? bar : null),
    documentElement: { style: { setProperty: (name: string, value: string) => published.set(name, value) } },
  };
  const window = {
    scrollY,
    addEventListener: () => undefined,
    getComputedStyle: () => ({ paddingLeft: "16px", paddingRight: "16px" }),
  };
  const clearance = installFirstClearance(document as never, window as never);
  return { clearance, published };
}

test("the clearance is 0 when the toolbar is beside the column", () => {
  const { clearance, published } = setup(rect(0, 100, 600, 2000), rect(12, 800, 150, 72));
  assert.equal(clearance.value(), 0);
  assert.equal(published.get("--sphinx-preview-first-clearance"), "0px");
});

test("the clearance pushes the first block below a toolbar that overlaps the column", () => {
  const { clearance, published } = setup(rect(0, 0, 460, 2000), rect(12, 200, 250, 72));
  // Toolbar bottom 84 + 8 margin - 0 content top - 40 gap.
  assert.equal(clearance.value(), 52);
  assert.equal(published.get("--sphinx-preview-first-clearance"), "52px");
});

test("a toolbar that ends above the 40px gap needs no clearance", () => {
  const { clearance } = setup(rect(0, 0, 460, 2000), rect(0, 200, 250, 20));
  assert.equal(clearance.value(), 0);
});

test("the clearance measures the content top in document coordinates", () => {
  const { clearance } = setup(rect(-300, 0, 460, 2000), rect(12, 200, 250, 72), 300);
  assert.equal(clearance.value(), 52);
});

test("P4: the toolbar's bottom edge is published for the sticky palette only where it overlaps the column", () => {
  const overlap = setup(rect(0, 0, 460, 2000), rect(12, 200, 250, 72));
  // Toolbar bottom 84 + 8 margin.
  assert.equal(overlap.published.get("--sphinx-preview-toolbar-bottom"), "92px");
  const beside = setup(rect(0, 100, 600, 2000), rect(12, 800, 150, 72));
  assert.equal(beside.published.get("--sphinx-preview-toolbar-bottom"), "0px");
});
