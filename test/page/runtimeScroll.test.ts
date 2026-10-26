import * as assert from "node:assert/strict";
import { test } from "node:test";

import { serializeRuntimeContext } from "../../src/core/protocol/bootContext";
import { createRuntimeHarness, RuntimeElement } from "./runtimeHarness";
import { blockEditorOf, mapping } from "./runtimeTestSupport";

/**
 * Scroll sync, sticky headings, the Description column, theme and anchoring, frontmatter tooltips
 * and pins (features/scrollCore.ts, stickyHeadings.ts, themeMode.ts, anchorMode.ts,
 * linkTooltip.ts).
 */

test("latest saved Description visibility wins over an older enrichment snapshot", () => {
  for (const collapsed of [true, false]) {
    const harness = createRuntimeHarness({ viewportWidth: 900,
      initialState: { descriptionsCollapsed: !collapsed }, savedDescriptionsCollapsed: collapsed });
    assert.equal(harness.descriptionButton.getAttribute("aria-expanded"), String(!collapsed));
    assert.equal(harness.getWebviewState().descriptionsCollapsed, collapsed);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-014
test("Description column toggles persist and restore both states", () => {
  const harness = createRuntimeHarness({ viewportWidth: 900 });
  assert.equal(harness.descriptionButton.getAttribute("aria-expanded"), "true");
  harness.dispatchDocument("click", { target: harness.descriptionButton });
  assert.equal(harness.documentElement.getAttribute("data-okf-descriptions-collapsed"), "true");
  assert.equal(harness.descriptionButton.getAttribute("aria-expanded"), "false");
  assert.equal(harness.getWebviewState().descriptionsCollapsed, true);
  assert.equal(harness.messages.at(-1)?.descriptionsCollapsed, true);
  for (const collapsed of [true, false]) {
    const restored = createRuntimeHarness({ initialState: { descriptionsCollapsed: collapsed } });
    assert.equal(restored.documentElement.getAttribute("data-okf-descriptions-collapsed"), String(collapsed));
    assert.equal(restored.descriptionButton.getAttribute("aria-expanded"), String(!collapsed));
    assert.equal(restored.getWebviewState().descriptionsCollapsed, collapsed);
  }
  harness.dispatchDocument("click", { target: harness.descriptionButton });
  assert.equal(harness.getWebviewState().descriptionsCollapsed, false);
});

test("narrow previews default to collapsed descriptions without overriding an explicit choice", () => {
  const narrow = createRuntimeHarness({ viewportWidth: 471 });
  assert.equal(narrow.descriptionButton.getAttribute("aria-expanded"), "false");
  const expanded = createRuntimeHarness({ viewportWidth: 471, initialState: { descriptionsCollapsed: false } });
  assert.equal(expanded.descriptionButton.getAttribute("aria-expanded"), "true");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-025
test("does not shift sticky headings down when the floating toolbar grows", () => {
  const harness = createRuntimeHarness({ toolbarBottom: 50 });
  harness.toolbar.rectProvider = () => ({ top: 12, height: 38, bottom: 50, width: 130 });
  harness.dispatchWindow("resize");
  harness.flushFrames();
  assert.equal(harness.stickyHeadings.style.getPropertyValue("inset-block-start"), "");
  assert.equal(harness.stickyHeadings.style.getPropertyValue("--sphinx-preview-toolbar-bottom"), "");
  assert.equal(harness.stickyHeadings.style.getPropertyValue("--sphinx-preview-toolbar-width"), "152px");

  harness.toolbar.rectProvider = () => ({ top: 12, height: 56, bottom: 68, width: 186 });
  harness.dispatchWindow("resize");
  harness.flushFrames();
  assert.equal(harness.stickyHeadings.style.getPropertyValue("inset-block-start"), "");
  assert.equal(harness.stickyHeadings.style.getPropertyValue("--sphinx-preview-toolbar-bottom"), "");
  assert.equal(harness.stickyHeadings.style.getPropertyValue("--sphinx-preview-toolbar-width"), "208px");
});

test("anchors source scrolling below a top-aligned sticky band without a toolbar row", () => {
  const harness = createRuntimeHarness({ scrollEditorWithPreview: false, toolbarBottom: 50 });
  harness.stickyHeadings.height = 40;
  harness.stickyHeadings.rectProvider = () => ({ top: 0, height: 40, bottom: 40 });
  harness.windowState.scrollY = 350;
  harness.dispatchWindow("scroll");
  harness.flushFrames();

  harness.dispatchMessage({
    type: "sourceScroll",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    line: 50,
  });
  harness.flushFrames();

  assert.equal(harness.windowState.scrollY, 435);
  assert.equal(harness.mappings[1].getBoundingClientRect().top, 65);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-018
test("the top-aligned sticky band grows and shrinks with the active heading hierarchy", () => {
  for (const depth of [1, 2, 3]) {
    const harness = createRuntimeHarness({ stickyHeadingDepth: depth });
    harness.stickyHeadings.rectProvider = () => {
      const height = harness.stickyHeadings.hidden ? 0 : harness.stickyHeadings.textContent.split("\n").length * 20 + 5;
      return { top: 0, height, bottom: height };
    };
    for (const [scrollTop, headingCount] of [[50, 1], [200, 2], [350, 3], [550, 2], [0, 0]]) {
      harness.windowState.scrollY = scrollTop;
      harness.dispatchWindow("scroll");
      harness.flushFrames();
      const count = Math.min(headingCount, depth);
      assert.equal(harness.stickyHeadings.hidden, count === 0);
      assert.equal(harness.stickyHeadings.textContent ? harness.stickyHeadings.textContent.split("\n").length : 0, count);
      assert.equal(harness.stickyHeadings.getBoundingClientRect().top, 0);
      assert.equal(harness.stickyHeadings.getBoundingClientRect().height, count ? count * 20 + 5 : 0);
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-002
test("the sticky band is marked as having content scrolled under it only below the top", () => {
  const harness = createRuntimeHarness();
  harness.stickyHeadings.height = 50;
  for (const [scrollY, marked] of [[0, false], [1, false], [250, true], [0, false]] as const) {
    harness.windowState.scrollY = scrollY;
    harness.dispatchWindow("scroll");
    harness.flushFrames();
    assert.equal(harness.stickyHeadings.getAttribute("data-scrolled-under") !== null, marked, `scrollY ${scrollY}`);
  }
});

test("sticks to the active Markdown heading hierarchy in up to three lines", () => {
  const harness = createRuntimeHarness();
  harness.stickyHeadings.height = 50;
  harness.windowState.scrollY = 250;
  harness.dispatchWindow("scroll");
  harness.flushFrames();

  assert.equal(harness.stickyHeadings.hidden, false);
  assert.equal(harness.stickyHeadings.textContent, "# Chapter\n## Section\n### Topic");

  harness.windowState.scrollY = 550;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  assert.equal(harness.stickyHeadings.textContent, "# Chapter\n## Next section");

  harness.windowState.scrollY = 0;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  assert.equal(harness.stickyHeadings.hidden, true);
  assert.equal(harness.stickyHeadings.textContent, "");
  assert.equal(harness.body.getAttribute("data-sphinx-preview-sticky-headings-active"), null);
});

test("the sticky band label leaves out comment chips and their hidden bodies", () => {
  const harness = createRuntimeHarness();
  const section = harness.headings[1] as unknown as Record<string, unknown> & { textContent: string };
  section.textContent = "Section TODOTODO fix later";
  section.querySelector = () => ({});
  section.cloneNode = () => {
    const copy = {
      textContent: section.textContent,
      querySelectorAll: () => [{ remove: () => { copy.textContent = "Section "; } }],
    };
    return copy;
  };
  harness.stickyHeadings.height = 50;
  harness.windowState.scrollY = 250;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  assert.equal(harness.stickyHeadings.textContent, "# Chapter\n## Section\n### Topic");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-030
test("caps sticky heading convergence at three passes", () => {
  const harness = createRuntimeHarness();
  let layoutPass = 0;
  harness.headings.forEach((heading, index) => {
    heading.rectProvider = () => {
      if (index === 0) layoutPass += 1;
      const activeIndex = layoutPass % 2 === 1 ? 0 : 1;
      return { top: index === activeIndex ? -1 : 100, height: 24 };
    };
    heading.rectReadCount = 0;
  });

  // A layout update measures the headings in every pass; a scroll frame reads none (PERF-08).
  harness.dispatchWindow("resize");
  harness.flushFrames();

  assert.equal(harness.headings[0].rectReadCount, 3);
});

test("PERF-08: a scroll frame reads no heading geometry and writes the webview state at most once per 100 ms", () => {
  const harness = createRuntimeHarness();
  harness.flushFrames();
  harness.headings.forEach((heading) => {
    heading.rectReadCount = 0;
  });
  const statesBefore = harness.setStateCalls;
  for (let frame = 1; frame <= 5; frame += 1) {
    harness.windowState.scrollY = frame * 7;
    harness.dispatchWindow("scroll");
    harness.flushFrames();
  }
  assert.deepEqual(harness.headings.map((heading) => heading.rectReadCount), harness.headings.map(() => 0),
    "the active heading comes from the tops measured with the layout");
  assert.ok(harness.setStateCalls - statesBefore <= 1, "five frames within 100 ms write the state at most once");
  harness.flushTimers();
  assert.ok(harness.setStateCalls - statesBefore <= 2, "and once more when the window ends");
  assert.equal(harness.getWebviewState().scrollTop, 35, "the last write carries the last scroll position");
});

test("maps the frontmatter table for stable top and mid-table scroll round-trips", () => {
  const harness = createRuntimeHarness({
    firstMappedSourceLine: 12,
    firstMappedTop: 420,
    frontmatterHeight: 380,
  });

  assert.equal(harness.messages.at(-1)?.type, "previewReady");
  assert.equal(harness.messages.at(-1)?.sourceLine, 1);

  harness.windowState.scrollY = 180;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  assert.equal(harness.messages.at(-1)?.type, "previewScroll");
  const reportedLine = Number(harness.messages.at(-1)?.line);
  assert.ok(reportedLine > 1 && reportedLine < 12);

  harness.dispatchMessage({
    type: "sourceScroll",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    line: Math.round(reportedLine),
  });
  harness.flushFrames();

  assert.ok(harness.windowState.scrollY > 0);
  assert.ok(harness.windowState.scrollY < 420);

  harness.windowState.scrollY = 0;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  assert.equal(harness.messages.at(-1)?.line, 1);

  harness.dispatchMessage({
    type: "sourceScroll",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    line: 1,
  });
  harness.flushFrames();
  assert.equal(harness.windowState.scrollY, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-119
test("preserves preview scroll when layout changes during sticky heading activation", () => {
  const harness = createRuntimeHarness({ viewportHeight: 800 });
  harness.stickyHeadings.height = 50;
  harness.windowState.scrollY = 50;
  harness.dispatchWindow("scroll");
  harness.flushFrames();

  assert.equal(harness.stickyHeadings.hidden, false);
  harness.triggerResizeObserver();
  harness.flushFrames();

  assert.equal(harness.windowState.scrollY, 50);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-022
test("uses the configured sticky heading depth", () => {
  const headings = [
    { depth: 1, expected: "### Topic" },
    { depth: 2, expected: "## Section\n### Topic" },
    { depth: 3, expected: "# Chapter\n## Section\n### Topic" },
  ];

  for (const { depth, expected } of headings) {
    const harness = createRuntimeHarness({ stickyHeadingDepth: depth });
    harness.windowState.scrollY = 350;
    harness.dispatchWindow("scroll");
    harness.flushFrames();

    assert.equal(harness.stickyHeadings.textContent, expected);
    assert.equal(harness.stickyHeadings.style.getPropertyValue("--sphinx-preview-sticky-heading-depth"), "");
  }
});

test("anchors the editor source line below the sticky heading band without reverse sync", () => {
  const harness = createRuntimeHarness({ scrollEditorWithPreview: false });
  harness.stickyHeadings.height = 40;
  harness.windowState.scrollY = 350;
  harness.dispatchWindow("scroll");
  harness.flushFrames();

  assert.equal(harness.stickyHeadings.hidden, false);
  assert.equal(harness.messages.some((message) => message.type === "previewScroll"), false);

  harness.dispatchMessage({
    type: "sourceScroll",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    line: 50,
  });
  harness.flushFrames();

  // The fake sticky band starts at 116 px, so its visible bottom is the reading line.
  assert.equal(harness.windowState.scrollY, 344);
  assert.equal(harness.mappings[1].getBoundingClientRect().top, 156);
});

test("source anchoring does not reserve a row for floating controls", () => {
  const harness = createRuntimeHarness({ controlsHeight: 116 });
  harness.dispatchMessage({
    type: "sourceScroll",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    line: 50,
  });
  harness.flushFrames();
  assert.equal(harness.mappings[1].getBoundingClientRect().top, 65);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-022
test("the boot context cannot terminate its containing script element", () => {
  const script = serializeRuntimeContext({
    documentId: "file:///active.md</script><script>alert(1)</script>",
    revision: 7,
    requestId: 11,
    activeSourceFile: "/workspace/active.md</script>",
  });

  assert.doesNotMatch(script, /<\/script>/iu);
});

test("T43: the Comment button and the reply box are installed only for writable previews", () => {
  const source = (commentsEnabled: boolean) => serializeRuntimeContext({
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    activeSourceFile: "/workspace/active.md",
    commentsEnabled,
  });
  assert.match(source(true), /"commentsEnabled":true/u);
  assert.match(source(false), /"commentsEnabled":false/u);
  // Both pages load; the read-only one never lists a Comment button hook.
  assert.doesNotThrow(() => createRuntimeHarness({ commentsEnabled: true }));
  assert.doesNotThrow(() => createRuntimeHarness({ commentsEnabled: false }));
  // The Comment button listens for the end of a text selection (mouseup) in writable previews only.
  assert.equal(
    createRuntimeHarness({ commentsEnabled: true }).documentListenerCount("mouseup")
      - createRuntimeHarness({ commentsEnabled: false }).documentListenerCount("mouseup"),
    1,
  );
});

test("observes preview content instead of the document body", () => {
  const harness = createRuntimeHarness();

  assert.equal(harness.observedResizeTarget, harness.previewContent);
  assert.notEqual(harness.observedResizeTarget, harness.body);
});

// @tests_req SwRS-MDOKFSTUDIO-THEME-001
// @tests_req SwRS-MDOKFSTUDIO-LIFE-170
// @tests_req SwRS-MDOKFSTUDIO-LIFE-169
test("cycles preview theme modes and restores the saved selection", () => {
  // A workspace that stored the "current" mode (the fresh default is cream).
  const harness = createRuntimeHarness({}, undefined, "current");

  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-theme-mode"), "current");
  assert.equal(harness.themeButton.getAttribute("aria-label"), "Preview theme: Current theme");
  assert.equal(harness.themeButton.getAttribute("data-tooltip"), "Current theme (click for dark theme)");
  harness.themeButton.dispatch("click");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-theme-mode"), "dark");
  assert.equal(harness.themeButton.getAttribute("title"), "Dark theme (click for white theme)");
  assert.equal(harness.themeButton.getAttribute("data-tooltip"), "Dark theme (click for white theme)");
  assert.equal(harness.getWebviewState().previewThemeMode, "dark");
  assert.equal(harness.messages.at(-1)?.type, "previewThemeModeChanged");
  assert.equal(harness.messages.at(-1)?.previewThemeMode, "dark");

  harness.themeButton.dispatch("click");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-theme-mode"), "white");
  assert.equal(harness.themeButton.getAttribute("data-tooltip"), "White theme (click for cream theme)");
  harness.themeButton.dispatch("click");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-theme-mode"), "cream");
  assert.equal(harness.themeButton.getAttribute("aria-label"), "Preview theme: Cream theme");
  assert.equal(harness.themeButton.getAttribute("data-tooltip"), "Cream theme (click for current theme)");
  assert.equal(harness.getWebviewState().previewThemeMode, "cream");
  assert.equal(harness.messages.at(-1)?.previewThemeMode, "cream");
  harness.themeButton.dispatch("click");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-theme-mode"), "current");

  const restored = createRuntimeHarness({}, "white");
  assert.equal(restored.documentElement.getAttribute("data-sphinx-preview-theme-mode"), "white");
  assert.equal(restored.themeButton.getAttribute("aria-label"), "Preview theme: White theme");

  const shared = createRuntimeHarness({}, "white", "dark");
  assert.equal(shared.documentElement.getAttribute("data-sphinx-preview-theme-mode"), "dark");
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-067
test("frontmatter tooltips preserve exact safe text and restore accessible metadata on dismissal", () => {
  for (const dismissal of ["leave", "blur", "scroll", "resize", "outside", "Escape", "refresh", "pagehide", "beforeunload"]) {
    const harness = createRuntimeHarness({ viewportHeight: 600, controlsHeight: 116 });
    const title = "fields.path: <script>alert('unsafe')</script>\nFull stakeholder fields";
    const link = new RuntimeElement({
      class: "okf-frontmatter-link", title, "aria-describedby": "existing-description",
    }, harness.windowState, 90, 20, "a");
    link.getBoundingClientRect = () => ({ top: 90, bottom: 110, left: 340, width: 20, height: 20 });
    harness.dispatchDocument(dismissal === "leave" ? "mouseover" : "focusin", { target: link });
    const tooltip = harness.createdElements.find((element) => element.className === "sphinx-preview-link-tooltip");
    assert.ok(tooltip);
    assert.equal(tooltip.getAttribute("role"), "tooltip");
    assert.equal(tooltip.textContent, title);
    assert.equal(tooltip.innerHTML, "");
    assert.equal(link.getAttribute("title"), null);
    assert.equal(link.getAttribute("aria-describedby"), "existing-description " + tooltip.getAttribute("id"));
    assert.equal(tooltip.parentElement, harness.body);
    assert.equal(tooltip.style.getPropertyValue("top"), "124px");
    assert.equal(tooltip.style.getPropertyValue("left"), "152px");
    assert.equal(tooltip.style.getPropertyValue("max-width"), "344px");
    assert.equal(tooltip.style.getPropertyValue("max-height"), "468px");
    harness.dispatchDocument("mouseover", { target: link });
    assert.equal(harness.createdElements.filter((element) => element.className === tooltip.className).length, 1);
    if (dismissal === "leave") harness.dispatchDocument("mouseout", { target: link });
    else if (dismissal === "blur") harness.dispatchDocument("focusout", { target: link });
    else if (dismissal === "outside") harness.dispatchDocument("pointerdown", { target: harness.body });
    else if (dismissal === "Escape") harness.dispatchDocument("keydown", { key: "Escape" });
    else if (dismissal === "refresh") harness.refreshButton.dispatch("click");
    else harness.dispatchWindow(dismissal);
    assert.equal(link.getAttribute("title"), title, dismissal);
    assert.equal(link.getAttribute("aria-describedby"), "existing-description", dismissal);
    assert.ok(!harness.body.contains(tooltip), dismissal);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-063
test("an invalid link span shows its full message in a tooltip on keyboard focus", () => {
  const harness = createRuntimeHarness({ viewportHeight: 600, controlsHeight: 116 });
  const title = "[E10] target 'missing.py' does not resolve to a file";
  const span = new RuntimeElement({
    class: "okf-frontmatter-link okf-link-invalid", "data-okf-link-status": "invalid", tabindex: "0", title,
  }, harness.windowState, 160, 20, "span");
  harness.dispatchDocument("focusin", { target: span });
  const tooltip = harness.createdElements.at(-1)!;
  assert.equal(tooltip.getAttribute("role"), "tooltip");
  assert.equal(tooltip.textContent, title);
  assert.equal(span.getAttribute("title"), null);
  harness.dispatchDocument("focusout", { target: span });
  assert.equal(span.getAttribute("title"), title);
  assert.ok(!harness.body.contains(tooltip));
});

test("a pending link never opens a tooltip", () => {
  const harness = createRuntimeHarness({ viewportHeight: 600, controlsHeight: 116 });
  const span = new RuntimeElement({
    class: "okf-frontmatter-link okf-link-pending", "data-okf-link-status": "pending", title: "Loading linked file",
  }, harness.windowState, 160, 20, "span");
  const before = harness.createdElements.length;
  harness.dispatchDocument("focusin", { target: span });
  assert.equal(harness.createdElements.length, before);
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-039
test("the badge click scrolls to and focuses the first issue row and highlights it briefly", () => {
  const harness = createRuntimeHarness({ viewportHeight: 600 });
  harness.frontmatterRow.setAttribute("class", "okf-error okf-known");
  const badge = new RuntimeElement({ "data-okf-badge": "" }, harness.windowState, 0, 20, "button");
  let prevented = false;
  harness.windowState.scrollY = 900;
  harness.dispatchDocument("click", { target: badge, preventDefault: () => { prevented = true; } });
  assert.ok(prevented);
  assert.equal(harness.frontmatterValueCell.getAttribute("data-okf-issue-highlight"), "true");
  assert.equal(harness.frontmatterValueCell.focusOptions !== undefined || harness.windowState.scrollY !== 900, true);
  harness.flushTimers();
  assert.equal(harness.frontmatterValueCell.getAttribute("data-okf-issue-highlight"), null);
});

test("switching frontmatter tooltip links removes the old tooltip and absent ARIA metadata", () => {
  const harness = createRuntimeHarness({ viewportHeight: 600, controlsHeight: 116 });
  const first = new RuntimeElement({ class: "okf-frontmatter-link", title: "First fields" },
    harness.windowState, 160, 20, "a");
  const second = new RuntimeElement({ class: "okf-frontmatter-link", title: "Second fields" },
    harness.windowState, 590, 20, "a");
  harness.dispatchDocument("mouseover", { target: first });
  const firstTooltip = harness.createdElements.at(-1)!;
  harness.dispatchDocument("focusin", { target: second });
  const secondTooltip = harness.createdElements.at(-1)!;
  assert.ok(!harness.body.contains(firstTooltip));
  assert.equal(first.getAttribute("title"), "First fields");
  assert.equal(first.getAttribute("aria-describedby"), null);
  assert.equal(secondTooltip.textContent, "Second fields");
  assert.equal(secondTooltip.style.getPropertyValue("top"), "582px");
  harness.dispatchDocument("focusout", { target: second });
  assert.equal(second.getAttribute("aria-describedby"), null);
  assert.ok(!harness.body.contains(secondTooltip));
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-032
test("refresh preserves viewport state while reverse synchronization stays disabled", () => {
  const harness = createRuntimeHarness({ scrollEditorWithPreview: false });
  harness.windowState.scrollY = 320;
  assert.equal(harness.anchorButton.getAttribute("aria-pressed"), "true");

  harness.refreshButton.dispatch("click");
  const refresh = harness.messages.at(-1);
  assert.equal(refresh?.type, "previewRefresh");
  assert.equal(refresh?.scrollTop, 320);
  assert.equal(typeof refresh?.sourceLine, "number");

  const sourceScroll = {
    type: "sourceScroll",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    line: 50,
  };
  harness.dispatchMessage(sourceScroll);
  harness.flushFrames();
  assert.notEqual(harness.windowState.scrollY, 320);
  assert.equal(harness.getWebviewState().anchorToEditor, true);

  const messageCount = harness.messages.length;
  harness.windowState.scrollY = 320;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  assert.equal(
    harness.messages.slice(messageCount).some((message) => message.type === "previewScroll"),
    false,
  );

  harness.anchorButton.dispatch("click");
  const anchor = harness.messages.at(-1);
  assert.equal(harness.anchorButton.getAttribute("aria-pressed"), "false");
  assert.equal(anchor?.type, "previewAnchorModeChanged");
  assert.equal(anchor?.anchorToEditor, false);

  const positionWhenDisabled = harness.windowState.scrollY;
  harness.dispatchMessage(sourceScroll);
  harness.flushFrames();
  assert.equal(harness.windowState.scrollY, positionWhenDisabled);

  const disabledMessageCount = harness.messages.length;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  assert.equal(
    harness.messages.slice(disabledMessageCount).some((message) => message.type === "previewScroll"),
    false,
  );
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-108
test("disabling editor anchoring stops preview-to-editor scrolling", () => {
  const harness = createRuntimeHarness({ scrollEditorWithPreview: true });

  harness.windowState.scrollY = 250;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  assert.deepEqual(harness.messages.map((message) => message.type), ["previewReady", "previewScroll"]);

  const messageCount = harness.messages.length;
  harness.anchorButton.dispatch("click");
  harness.windowState.scrollY = 300;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  assert.equal(
    harness.messages.slice(messageCount).some((message) => message.type === "previewScroll"),
    false,
  );
});

test("preview can revisit its last reported line after the source editor scrolls elsewhere", () => {
  const harness = createRuntimeHarness();
  harness.windowState.scrollY = 250;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  const firstLine = harness.messages.at(-1)?.line;
  harness.dispatchMessage({
    type: "sourceScroll",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    line: 50,
  });
  harness.flushFrames();
  harness.windowState.scrollY = 250;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  assert.equal(harness.messages.at(-1)?.type, "previewScroll");
  assert.equal(harness.messages.at(-1)?.line, firstLine);
});

test("source scrolling remains bidirectional while a block editor is open", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "Editable paragraph.\n",
  });
  harness.dispatchMessage({
    type: "sourceScroll",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    line: 50,
  });
  harness.flushFrames();
  assert.ok(harness.windowState.scrollY > 0);
  const alignedTop = harness.windowState.scrollY;
  harness.triggerResizeObserver();
  harness.flushFrames();
  assert.equal(harness.windowState.scrollY, alignedTop);
  harness.windowState.scrollY = 0;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  assert.equal(harness.messages.at(-1)?.type, "previewScroll");
  assert.equal(harness.messages.at(-1)?.line, 1);
});

test("refreshes source anchor geometry after a block editor changes document flow", () => {
  const harness = createRuntimeHarness({ scrollEditorWithPreview: false });
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "Editable paragraph.\n",
  });

  harness.mappings[2].top += 60;
  harness.dispatchMessage({
    type: "sourceScroll",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    line: 100,
  });
  harness.flushFrames();

  assert.equal(harness.windowState.scrollY, 1_000 + 60 - 65);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-120
test("restores saved editor anchoring when the configured preference changed", () => {
  const harness = createRuntimeHarness({ scrollPreviewWithEditor: false }, undefined, undefined, true);

  assert.equal(harness.anchorButton.getAttribute("aria-pressed"), "true");
  assert.equal(
    harness.messages.some((message) =>
      message.type === "previewAnchorModeChanged" && message.anchorToEditor === true),
    true,
  );
});

test("activating a centered block editor preserves scroll before and after layout stabilization", () => {
  const harness = createRuntimeHarness();
  harness.windowState.scrollY = 200;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  const scrollBeforeEditing = harness.windowState.scrollY;
  const blockTop = harness.mappings[1].getBoundingClientRect().top;

  harness.editModeButton.dispatch("click");
  assert.equal(harness.windowState.scrollY, scrollBeforeEditing);
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  assert.equal(harness.windowState.scrollY, scrollBeforeEditing);
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "A paragraph centered in the viewport.\n",
  });

  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  assert.equal(textarea.focusOptions?.preventScroll, true);
  assert.equal(harness.windowState.scrollY, scrollBeforeEditing);
  harness.triggerResizeObserver();
  harness.flushFrames();
  assert.equal(harness.windowState.scrollY, scrollBeforeEditing);
  assert.equal(blockEditorOf(harness.mappings[1]).getBoundingClientRect().top, blockTop);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-097
// @tests_req SwRS-MDOKFSTUDIO-LIFE-100
test("executes source and preview synchronization across layout changes", () => {
  const harness = createRuntimeHarness({ scrollEditorWithPreview: false });
  harness.stickyHeadings.rectProvider = () => ({
    top: 0,
    height: harness.stickyHeadings.height,
    bottom: harness.stickyHeadings.height,
  });
  const messageTypes = (): unknown[] => harness.messages
    .map((message) => message.type)
    .filter((type) => type !== "previewState");
  // Reading offset: 3 sticky lines x 20 px fallback line height + 5 px chrome.
  const readingOffset = 65;

  assert.deepEqual(messageTypes(), ["previewReady"]);

  harness.dispatchMessage({
    type: "sourceScroll",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    line: 50,
  });
  harness.flushFrames();
  assert.equal(harness.windowState.scrollY, 500 - readingOffset);
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  assert.deepEqual(messageTypes(), ["previewReady"]);

  harness.dispatchMessage({
    type: "sourceScroll",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    line: 10,
  });
  harness.dispatchMessage({
    type: "sourceScroll",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    line: 90,
  });
  harness.flushFrames();
  // Line 90 lies between the end of the 50-52 block (y 540, line 53) and line 100 (y 1000).
  assert.equal(harness.windowState.scrollY, 540 + (460 * 37) / 47 - readingOffset);

  harness.windowState.scrollY = 250;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  assert.deepEqual(messageTypes(), ["previewReady"]);

  // The preview now owns the anchor; every layout change keeps it at the reading line.
  for (const mapping of harness.mappings) {
    mapping.top += 100;
  }
  harness.dispatchWindow("resize");
  harness.flushFrames();
  assert.equal(harness.windowState.scrollY, 350);

  for (const mapping of harness.mappings) {
    mapping.top += 50;
  }
  harness.image.dispatch("load");
  harness.flushFrames();
  assert.equal(harness.windowState.scrollY, 400);

  for (const mapping of harness.mappings) {
    mapping.top += 40;
  }
  harness.dispatchVisualViewportResize();
  harness.flushFrames();
  assert.equal(harness.windowState.scrollY, 440);

  harness.mappings[1].top += 25;
  harness.triggerResizeObserver();
  harness.flushFrames();
  // The anchor sat 275/460 of the way from line 2 (y 230) to line 50, whose block moved to 715.
  assert.equal(harness.windowState.scrollY, 230 + (485 * 275) / 460 - readingOffset);

  harness.dispatchDocument("click", { target: harness.mappings[1] });
  assert.equal(harness.messages.at(-1)?.type, "previewReveal");
  assert.equal(harness.messages.at(-1)?.line, 50);
  const posted = harness.messages.length;
  harness.dispatchDocument("dblclick", { target: harness.mappings[1] });
  assert.equal(harness.messages.length, posted, "a double click posts nothing more than its clicks");

  harness.dispatchDocument("keydown", {
    key: "Enter",
    target: harness.mappings[1],
    preventDefault: () => undefined,
  });
  assert.equal(harness.messages.at(-1)?.activation, "keyboard");

  const messageCount = harness.messages.length;
  harness.dispatchMessage({
    type: "sourceScroll",
    documentId: "file:///other.md",
    revision: 7,
    requestId: 11,
    line: 1,
  });
  harness.flushFrames();
  assert.equal(harness.messages.length, messageCount);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-128
test("marks editor selection without moving the preview when following is disabled", () => {
  const sourceOnlyHarness = createRuntimeHarness({
    scrollPreviewWithEditor: false,
    markEditorSelection: true,
  });
  sourceOnlyHarness.dispatchMessage({
    type: "sourceScroll",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    line: 50,
    selectionLine: 50,
  });
  sourceOnlyHarness.flushFrames();
  assert.equal(sourceOnlyHarness.windowState.scrollY, 0);
  assert.equal(sourceOnlyHarness.mappings[1].getAttribute("data-sphinx-preview-current"), "true");

});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-059
test("a history move scrolls the preview even when following the editor is disabled", () => {
  const send = (extra: Record<string, unknown>) => {
    const harness = createRuntimeHarness({ scrollPreviewWithEditor: false });
    harness.dispatchMessage({
      type: "sourceScroll",
      documentId: "file:///active.md",
      revision: 7,
      requestId: 11,
      line: 50,
      ...extra,
    });
    harness.flushFrames();
    return harness.windowState.scrollY;
  };
  assert.equal(send({}), 0, "an ordinary editor scroll is ignored");
  assert.ok(send({ reveal: true }) > 0, "a Back or Next move scrolls");
});

test("source scrolling rejects stale identities and invalid line numbers", async (context) => {
  for (const [name, override] of Object.entries({
    "other document": { documentId: "file:///other.md" },
    "old document version": { revision: 6 },
    "old render request": { requestId: 10 },
    "zero line": { line: 0 },
    "non-finite line": { line: Number.NaN },
  })) {
    await context.test(name, () => {
      const harness = createRuntimeHarness();
      const messageCount = harness.messages.length;
      harness.dispatchMessage({
        type: "sourceScroll",
        documentId: "file:///active.md",
        revision: 7,
        requestId: 11,
        line: 50,
        ...override,
      });
      harness.flushFrames();
      assert.equal(harness.windowState.scrollY, 0);
      assert.equal(harness.messages.length, messageCount);
    });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-117
test("scrolls to host-approved anchors and ignores invalid or stale requests", () => {
  const harness = createRuntimeHarness();

  harness.dispatchMessage({
    type: "navigateAnchor",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    value: "#section",
  });
  assert.equal(harness.windowState.scrollY, 735);

  harness.dispatchMessage({
    type: "navigateAnchor",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    value: "#Caf%C3%A9",
    sourceLine: 50,
  });
  assert.equal(harness.windowState.scrollY, 435);

  harness.dispatchMessage({
    type: "navigateAnchor",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    value: "#unmapped-heading",
    sourceLine: 51,
  });
  assert.equal(harness.windowState.scrollY, 500 + (40 / 3) - 65);

  harness.dispatchMessage({
    type: "navigateAnchor",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    value: "#unmapped-final-heading",
    sourceLine: 100,
  });
  assert.equal(harness.windowState.scrollY, 935);

  harness.dispatchMessage({
    type: "navigateAnchor",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    value: "#invalid anchor",
  });
  assert.equal(harness.windowState.scrollY, 935);

  harness.dispatchMessage({
    type: "navigateAnchor",
    documentId: "file:///other.md",
    revision: 7,
    requestId: 11,
    value: "#section",
  });
  assert.equal(harness.windowState.scrollY, 935);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-117
test("an escape left after four decoding rounds is refused, whatever its digits", () => {
  const harness = createRuntimeHarness();
  // Five rounds of encoding: after four rounds the text is still the escape %41 (an element has that id).
  harness.dispatchMessage({
    type: "navigateAnchor",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    value: "#%2525252541",
  });
  assert.equal(harness.windowState.scrollY, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-032
test("markWideTables marks short cells and the overflow of a wide table, never the properties table", () => {
  const harness = createRuntimeHarness();
  const table = new RuntimeElement({}, harness.windowState, 0, 100, "table");
  const row = new RuntimeElement({}, harness.windowState, 0, 20, "tr");
  const shortCell = new RuntimeElement({}, harness.windowState, 0, 20, "td");
  shortCell.textContent = " nw-02 ";
  const spacedCell = new RuntimeElement({}, harness.windowState, 0, 20, "td");
  spacedCell.textContent = "North Pole";
  const longCell = new RuntimeElement({}, harness.windowState, 0, 20, "th");
  longCell.textContent = "a".repeat(25);
  table.appendChild(row);
  for (const cell of [shortCell, spacedCell, longCell]) row.appendChild(cell);
  table.scrollWidth = 900;
  table.clientWidth = 400;
  harness.contentTables.push(table);
  harness.triggerResizeObserver();
  harness.flushFrames();
  assert.equal(table.getAttribute("data-sphinx-table-overflow"), "true");
  assert.equal(shortCell.getAttribute("data-sphinx-short-cell"), "true");
  assert.equal(spacedCell.getAttribute("data-sphinx-short-cell"), null);
  assert.equal(longCell.getAttribute("data-sphinx-short-cell"), null);
  assert.equal(harness.frontmatterRow.getAttribute("data-sphinx-short-cell"), null);
  assert.equal(harness.frontmatterNameCell.getAttribute("data-sphinx-short-cell"), null);
  assert.equal(harness.frontmatterValueCell.getAttribute("data-sphinx-short-cell"), null);
});

test("markWideTables sets the overflow attribute only past a one pixel tolerance and is idempotent", () => {
  const harness = createRuntimeHarness();
  const table = new RuntimeElement({}, harness.windowState, 0, 100, "table");
  const cell = new RuntimeElement({}, harness.windowState, 0, 20, "td");
  cell.textContent = "North";
  table.appendChild(cell);
  harness.contentTables.push(table);
  table.scrollWidth = 401;
  table.clientWidth = 400;
  harness.triggerResizeObserver();
  harness.flushFrames();
  assert.equal(table.getAttribute("data-sphinx-table-overflow"), null, "one pixel is not an overflow");
  table.scrollWidth = 402;
  harness.triggerResizeObserver();
  harness.flushFrames();
  assert.equal(table.getAttribute("data-sphinx-table-overflow"), "true");
  let writes = 0;
  for (const element of [table, cell]) {
    const original = element.setAttribute.bind(element);
    element.setAttribute = (name: string, value: string): void => { writes += 1; original(name, value); };
    const originalRemove = element.removeAttribute.bind(element);
    element.removeAttribute = (name: string): void => { writes += 1; originalRemove(name); };
  }
  harness.triggerResizeObserver();
  harness.flushFrames();
  assert.equal(writes, 0, "a second pass must not touch any attribute");
  table.scrollWidth = 400;
  harness.triggerResizeObserver();
  harness.flushFrames();
  assert.equal(table.getAttribute("data-sphinx-table-overflow"), null, "the cue goes away when the table fits");
});

test("a final block save carries the edited element's pin; an autosave does not", () => {
  const harness = createRuntimeHarness();
  harness.windowState.scrollY = 200;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "A paragraph centered in the viewport.\n",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.value = "A paragraph, edited.";
  textarea.dispatch("input");
  harness.flushTimers();
  const autosave = harness.messages.at(-1);
  assert.equal(autosave?.type, "previewEditSave");
  assert.equal(autosave?.final, false);
  assert.equal("pinLine" in (autosave ?? {}), false);
  assert.equal("pinViewportTop" in (autosave ?? {}), false);

  const editorTop = blockEditorOf(harness.mappings[1]).getBoundingClientRect().top;
  textarea.dispatch("keydown", { key: "Enter", metaKey: true, preventDefault: () => undefined });
  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewEditSave");
  assert.equal(save?.final, true);
  assert.equal(save?.pinLine, 50);
  assert.equal(save?.pinViewportTop, editorTop);
  assert.equal(editorTop, 300);
});

test("restoreState puts the pinned block's top at the pinned viewport position", () => {
  const exact = createRuntimeHarness({ initialPin: { line: 50, viewportTop: 120 } });
  assert.equal(exact.windowState.scrollY, 380);
  assert.equal(exact.mappings[1].getBoundingClientRect().top, 120);

  const between = createRuntimeHarness({ initialPin: { line: 60, viewportTop: 120 } });
  assert.equal(between.windowState.scrollY, 380, "the last entry at or before the line is used");

  const pinWins = createRuntimeHarness({ initialPin: { line: 50, viewportTop: 120 }, initialState: { descriptionsCollapsed: false } });
  assert.equal(pinWins.windowState.scrollY, 380);

  const clampedLow = createRuntimeHarness({ initialPin: { line: 50, viewportTop: 5_000 } });
  assert.equal(clampedLow.windowState.scrollY, 0);
  const clampedHigh = createRuntimeHarness({ initialPin: { line: 100, viewportTop: -5_000 } });
  assert.equal(clampedHigh.windowState.scrollY, 1_900);
});

test("previewReady reports the pinned anchor only when the load restored a pin", () => {
  const pinned = createRuntimeHarness({ initialPin: { line: 50, viewportTop: 120 } });
  const ready = pinned.messages.find((message) => message.type === "previewReady");
  assert.ok(ready);
  assert.equal(pinned.windowState.scrollY, 380);
  // The block at line 50 sits at the top of the viewport band after the pin, so the reading line
  // anchor is a real source line (not the stale pre-save anchor) and is reported to the host.
  assert.equal(typeof ready.anchorLine, "number");
  assert.ok(Number(ready.anchorLine) >= 1);

  const plain = createRuntimeHarness();
  const plainReady = plain.messages.find((message) => message.type === "previewReady");
  assert.ok(plainReady);
  assert.equal("anchorLine" in plainReady, false, "a load without a pin sends no anchorLine");
});
