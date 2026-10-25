/**
 * Requirement tests of the width mode in the page runtime (`modules/widthMode.ts` and the change
 * callback in `runtime.ts`): the breakout of an image with an author's pixel width, the reading
 * line kept across a mode change, and the first-element clearance measured again.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement } from "./runtimeHarness";

function autoFixture() {
  const harness = createRuntimeHarness({
    initialViewPreferences: { zoom: 100, widthMode: "auto", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: false },
  });
  harness.previewContent.clientWidth = 700;
  harness.documentElement.clientWidth = 1000;
  return harness;
}

function image(harness: ReturnType<typeof createRuntimeHarness>, attributes: Record<string, string>, naturalWidth: number): RuntimeElement {
  const element = new RuntimeElement(attributes, harness.windowState, 0, 40, "img");
  // The harness elements have no hasAttribute / naturalWidth: the image gets the two members the
  // width measurement reads.
  Object.assign(element, {
    naturalWidth,
    hasAttribute: (name: string) => element.getAttribute(name) !== null,
  });
  element.rectProvider = () => ({ top: 0, height: 40, left: 0, width: 200 });
  harness.previewContent.appendChild(element);
  return element;
}

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023
test("Auto measures an image from the width its author wrote, and ignores a gain of 1 px or less", () => {
  const declared = autoFixture();
  const sized = image(declared, { "data-okf-width": "800" }, 3000);
  declared.dispatchWindow("resize");
  declared.flushFrames();
  assert.equal(sized.getAttribute("data-sphinx-preview-wide"), "");
  assert.equal(sized.style.getPropertyValue("--sphinx-preview-breakout"), "100px", "800 px, not the intrinsic 3000 px");

  const intrinsic = autoFixture();
  const plain = image(intrinsic, {}, 3000);
  intrinsic.dispatchWindow("resize");
  intrinsic.flushFrames();
  assert.equal(plain.style.getPropertyValue("--sphinx-preview-breakout"), "268px", "without a declared width the intrinsic size counts, capped at the pane");

  const tolerance = autoFixture();
  const near = new RuntimeElement({}, tolerance.windowState, 0, 40, "table");
  near.scrollWidth = 701;
  tolerance.previewContent.appendChild(near);
  const far = new RuntimeElement({}, tolerance.windowState, 0, 40, "table");
  far.scrollWidth = 702;
  tolerance.previewContent.appendChild(far);
  tolerance.dispatchWindow("resize");
  tolerance.flushFrames();
  assert.equal(near.getAttribute("data-sphinx-preview-wide"), null, "a gain of 1 px is not a breakout");
  assert.equal(far.style.getPropertyValue("--sphinx-preview-breakout"), "2px");
});

/** Moves every mapped block down by 100 px when the width attribute changes, like the reflow. */
function reflowOnWidthChange(harness: ReturnType<typeof createRuntimeHarness>): void {
  const root = harness.documentElement;
  const original = root.setAttribute.bind(root);
  root.setAttribute = (name: string, value: string): void => {
    original(name, value);
    if (name === "data-sphinx-preview-width") {
      for (const mapping of harness.mappings) mapping.top += 100;
    }
  };
}

/** The scroll position the page's own layout stabilisation gives after a 100 px reflow. */
function stabilisedScroll(): number {
  const baseline = createRuntimeHarness();
  baseline.windowState.scrollY = 250;
  baseline.dispatchWindow("scroll");
  baseline.flushFrames();
  for (const mapping of baseline.mappings) mapping.top += 100;
  baseline.dispatchWindow("resize");
  baseline.flushFrames();
  return baseline.windowState.scrollY;
}

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-020
test("a width mode change keeps the line at the reading position, with or without an anchor yet", () => {
  const expected = stabilisedScroll();
  assert.notEqual(expected, 250, "the reflow moves the reading line");

  const anchored = createRuntimeHarness();
  anchored.windowState.scrollY = 250;
  anchored.dispatchWindow("scroll");
  anchored.flushFrames();
  reflowOnWidthChange(anchored);
  anchored.widthButton.dispatch("click");
  anchored.flushFrames();
  assert.equal(anchored.windowState.scrollY, expected, "the same line stays at the reading position");

  const fresh = createRuntimeHarness();
  fresh.windowState.scrollY = 250;
  reflowOnWidthChange(fresh);
  fresh.widthButton.dispatch("click");
  fresh.flushFrames();
  // Without an anchor the page takes the line at the scroll position (not at the reading line
  // offset) and the content moved by 100 px, so the page follows by 100 px.
  assert.equal(fresh.windowState.scrollY, 350, "the anchor is taken from the line at the current scroll position");
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-018
test("a width mode change measures the first-element clearance again, even when nothing moved", () => {
  const harness = createRuntimeHarness();
  const property = "--sphinx-preview-toolbar-bottom";
  const published = (): string => harness.documentElement.style.getPropertyValue(property);
  harness.previewContent.rectProvider = () => ({ top: 0, height: 2000, left: 50, width: 600, right: 650, bottom: 2000 } as never);
  let toolbarBottom = 84;
  harness.toolbar.rectProvider = () => ({
    top: 12, height: toolbarBottom - 12, bottom: toolbarBottom, left: 100, width: 150, right: 250,
  } as never);
  const before = published();

  harness.widthButton.dispatch("click");
  assert.equal(published(), `${toolbarBottom + 8}px`, "the toolbar edge is measured on the click");
  assert.notEqual(published(), before);

  toolbarBottom = 130;
  harness.widthButton.dispatch("click");
  assert.equal(published(), "138px", "each mode change measures again");
  harness.widthButton.dispatch("click");
  assert.equal(published(), "138px", "the published value stays when nothing moved");
});
