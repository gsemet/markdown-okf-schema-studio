/**
 * Requirement tests of the Auto breakout and the figure mark in the page runtime
 * (`modules/widthMode.ts`): the sizes relative to the column, the Mermaid wrapper, the layout
 * triggers, and the figure mark of a paragraph that is not a lone image.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement } from "./runtimeHarness";

type Harness = ReturnType<typeof createRuntimeHarness>;

function autoFixture(): Harness {
  const harness = createRuntimeHarness({
    initialViewPreferences: { zoom: 100, widthMode: "auto", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: false },
  });
  harness.previewContent.clientWidth = 700;
  harness.documentElement.clientWidth = 1000;
  return harness;
}

function image(harness: Harness, attributes: Record<string, string>, naturalWidth: number): RuntimeElement {
  const element = new RuntimeElement(attributes, harness.windowState, 0, 40, "img");
  Object.assign(element, { naturalWidth, hasAttribute: (name: string) => element.getAttribute(name) !== null });
  element.rectProvider = () => ({ top: 0, height: 40, left: 0, width: 200 });
  harness.previewContent.appendChild(element);
  return element;
}

function measure(harness: Harness): void {
  harness.dispatchWindow("resize");
  harness.flushFrames();
}

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023
test("an image sized in %, em or rem asks for a size relative to the column and never breaks out", () => {
  for (const width of ["50%", "20em", "3rem"]) {
    const harness = autoFixture();
    const sized = image(harness, { "data-okf-width": width }, 3000);
    measure(harness);
    assert.equal(sized.getAttribute("data-sphinx-preview-wide"), null, `${width}: not marked wide`);
  }
  const harness = autoFixture();
  const plain = image(harness, {}, 3000);
  measure(harness);
  assert.equal(plain.getAttribute("data-sphinx-preview-wide"), "", "an image without a declared width breaks out");
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023
test("a Mermaid diagram wrapper wider than the column breaks out in Auto", () => {
  const harness = autoFixture();
  const diagram = new RuntimeElement({}, harness.windowState, 0, 40, "div");
  diagram.className = "myst-mermaid-diagram";
  diagram.scrollWidth = 900;
  harness.previewContent.appendChild(diagram);
  measure(harness);
  assert.equal(diagram.getAttribute("data-sphinx-preview-wide"), "");
  assert.equal(diagram.style.getPropertyValue("--sphinx-preview-breakout"), "200px");
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023
test("a layout trigger (a pane resize, the toolbar collapse) measures the wide elements again", () => {
  const harness = autoFixture();
  const table = new RuntimeElement({}, harness.windowState, 0, 40, "table");
  table.scrollWidth = 900;
  harness.previewContent.appendChild(table);
  measure(harness);
  assert.equal(table.style.getPropertyValue("--sphinx-preview-breakout"), "200px");
  table.scrollWidth = 950;
  measure(harness);
  assert.equal(table.style.getPropertyValue("--sphinx-preview-breakout"), "250px", "a resize measures again");
  table.scrollWidth = 1200;
  harness.collapseButton.dispatch("click");
  assert.equal(table.style.getPropertyValue("--sphinx-preview-breakout"), "268px", "the toolbar collapse measures again");
});

function paragraphOf(harness: Harness, children: RuntimeElement[], text = ""): RuntimeElement {
  const paragraph = new RuntimeElement({}, harness.windowState, 0, 40, "p");
  for (const child of children) paragraph.appendChild(child);
  paragraph.textContent = text;
  harness.previewContent.appendChild(paragraph);
  return paragraph;
}

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-022
test("a paragraph with an image and a sentence, or with two images, is not a figure, and a stale mark is removed", () => {
  const harness = createRuntimeHarness();
  const lone = paragraphOf(harness, [new RuntimeElement({}, harness.windowState, 0, 40, "img")]);
  const withText = paragraphOf(harness, [new RuntimeElement({}, harness.windowState, 0, 40, "img")], "A sentence.");
  const pair = paragraphOf(harness, [
    new RuntimeElement({}, harness.windowState, 0, 40, "img"),
    new RuntimeElement({}, harness.windowState, 0, 40, "img"),
  ]);
  measure(harness);
  assert.equal(lone.getAttribute("data-sphinx-preview-figure"), "");
  assert.equal(withText.getAttribute("data-sphinx-preview-figure"), null, "an image and a sentence");
  assert.equal(pair.getAttribute("data-sphinx-preview-figure"), null, "two images and no text");
  lone.textContent = "Now it has text.";
  measure(harness);
  assert.equal(lone.getAttribute("data-sphinx-preview-figure"), null, "a mark left on a paragraph that no longer qualifies is removed");
});
