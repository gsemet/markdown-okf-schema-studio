/**
 * Requirement tests of the theme and zoom features of the page: the theme modes the page accepts,
 * the reduced-motion attribute, the zoom read from the saved state, and the reading line kept
 * across a zoom change (`features/themeMode.ts`, `modules/viewControls.ts`).
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { PreviewRuntimeContext } from "../../src/core/protocol/bootContext";
import { installThemeMode } from "../../src/page/features/themeMode";
import { installViewControls } from "../../src/page/modules/viewControls";
import { createRuntimeHarness } from "./runtimeHarness";

function fakeRoot() {
  const attributes = new Map<string, string>();
  const properties = new Map<string, string>();
  return {
    attributes,
    properties,
    element: {
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      style: { setProperty: (name: string, value: string) => properties.set(name, value) },
    },
  };
}

function themePage(options: {
  context?: unknown;
  saved?: unknown;
  matchMedia?: (query: string) => { matches: boolean };
}) {
  const root = fakeRoot();
  const document = { querySelector: () => null, documentElement: root.element, body: root.element };
  const window = options.matchMedia ? { matchMedia: options.matchMedia } : {};
  const router = { on: () => undefined };
  const theme = installThemeMode(document as never, window as never, router as never, {
    host: { postMessage: () => undefined },
    context: { previewThemeMode: options.context } as unknown as PreviewRuntimeContext,
    savedState: options.saved === undefined ? undefined : { previewThemeMode: options.saved } as never,
    themeSwitch: () => undefined,
  } as never);
  return { theme, root };
}

// @tests_req SwRS-MDOKFSTUDIO-THEME-001
test("an unknown theme mode is ignored: the saved mode comes next, Cream last", () => {
  assert.equal(themePage({ context: "sepia" }).theme.mode(), "cream");
  assert.equal(themePage({ context: "sepia", saved: "white" }).theme.mode(), "white");
  assert.equal(themePage({ context: "dark", saved: "white" }).theme.mode(), "dark");

  const { theme, root } = themePage({ context: "sepia", saved: "white" });
  theme.applyPreviewThemeMode("sepia");
  assert.equal(root.attributes.get("data-sphinx-preview-theme-mode"), "cream");
  assert.equal(theme.mode(), "cream");
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-050
test("the page root records whether the system prefers reduced motion", () => {
  const reduced = themePage({ matchMedia: (query) => ({ matches: query === "(prefers-reduced-motion: reduce)" }) });
  reduced.theme.applyTheme(2);
  assert.equal(reduced.root.attributes.get("data-sphinx-preview-reduced-motion"), "true");
  assert.equal(reduced.root.attributes.get("data-sphinx-preview-theme"), "2");

  const none = themePage({ matchMedia: () => ({ matches: false }) });
  none.theme.applyTheme(1);
  assert.equal(none.root.attributes.get("data-sphinx-preview-reduced-motion"), "false");

  const unsupported = themePage({});
  unsupported.theme.applyTheme(undefined);
  assert.equal(unsupported.root.attributes.get("data-sphinx-preview-reduced-motion"), "false");
});

function zoomAtStart(saved: unknown, initial: unknown): { zoom: number; property: string | undefined } {
  const root = fakeRoot();
  const document = { querySelector: () => null, documentElement: root.element };
  const controls = installViewControls(
    document as never,
    { postMessage: () => undefined, getState: () => ({ viewZoom: saved }) },
    { documentId: "file:///a.md", revision: 1, requestId: 1, initialViewPreferences: { zoom: initial as number } },
    () => undefined,
  );
  return { zoom: controls.zoom(), property: root.properties.get("--sphinx-preview-zoom") };
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-170
test("a saved or initial zoom is rounded to the grid, clamped to 70-200, and ignored when not a number", () => {
  assert.equal(zoomAtStart(133, undefined).zoom, 130);
  assert.equal(zoomAtStart(300, undefined).zoom, 200);
  assert.equal(zoomAtStart(10, undefined).zoom, 70);
  assert.equal(zoomAtStart("big", 150).zoom, 150);
  assert.equal(zoomAtStart(Number.NaN, 160).zoom, 160);
  assert.equal(zoomAtStart(undefined, 133).zoom, 130, "the initial preference is rounded too");
  assert.equal(zoomAtStart("big", "also big").zoom, 100);
  assert.equal(zoomAtStart(130, undefined).property, "1.3");
});

/** Moves every mapped block down by 100 px when the zoom attribute changes, like the reflow. */
function reflowOnZoom(harness: ReturnType<typeof createRuntimeHarness>): void {
  const root = harness.documentElement;
  const original = root.setAttribute.bind(root);
  root.setAttribute = (name: string, value: string): void => {
    original(name, value);
    if (name === "data-sphinx-preview-zoom") {
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

// @tests_req SwRS-MDOKFSTUDIO-THEME-038
test("a zoom change keeps the text at the reading line, with or without an anchor already set", () => {
  const expected = stabilisedScroll();
  assert.notEqual(expected, 250, "the reflow moves the reading line");

  const anchored = createRuntimeHarness();
  anchored.windowState.scrollY = 250;
  anchored.dispatchWindow("scroll");
  anchored.flushFrames();
  reflowOnZoom(anchored);
  anchored.zoomInButton.dispatch("click");
  anchored.flushFrames();
  assert.equal(anchored.windowState.scrollY, expected, "the existing anchor is applied again");

  const fresh = createRuntimeHarness();
  fresh.windowState.scrollY = 250;
  reflowOnZoom(fresh);
  fresh.zoomInButton.dispatch("click");
  fresh.flushFrames();
  // Without an anchor the page takes the line at the scroll position (not at the reading line
  // offset) and the content moved by 100 px, so the page follows by 100 px.
  assert.equal(fresh.windowState.scrollY, 350, "the anchor is taken from the line at the reading line");
});
