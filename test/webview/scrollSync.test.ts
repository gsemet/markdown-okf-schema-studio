import * as assert from "node:assert/strict";
import { test } from "node:test";

import { pageLiveStateMessages, type PageIdentity } from "../../src/preview/pageLiveState";
import { PREVIEW_THEME_CSS } from "../../src/preview/previewStyles";
import { highlightLanguageNames } from "../../src/render/highlight";
import {
  createScrollSyncScript,
  type PositionedSourceMapping,
} from "../../src/webview/scrollSync";
import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";

function mapping(sourceLine: number, top: number): PositionedSourceMapping {
  return {
    element: { getAttribute: () => null },
    blockId: `block-${sourceLine}`,
    sourceFile: "/workspace/active.md",
    sourceLine,
    documentId: "file:///active.md",
    domOrder: sourceLine,
    top,
    height: 40,
  };
}

// Edit mode also inserts zero-height insertion points after blocks; the editor is the inserted
// element that carries the block-editor attribute.
function blockEditorOf(block: RuntimeElement): RuntimeElement {
  return block.insertedElements.find((element) =>
    element.getAttribute("data-sphinx-preview-block-editor") !== null) as RuntimeElement;
}

test("latest saved Description visibility wins over an older enrichment snapshot", () => {
  for (const collapsed of [true, false]) {
    const harness = createRuntimeHarness({ viewportWidth: 900,
      initialState: { descriptionsCollapsed: !collapsed }, savedDescriptionsCollapsed: collapsed });
    assert.equal(harness.descriptionButton.getAttribute("aria-expanded"), String(!collapsed));
    assert.equal(harness.getWebviewState().descriptionsCollapsed, collapsed);
  }
});

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

test("runtime script cannot terminate its containing script element", () => {
  const script = createScrollSyncScript({
    documentId: "file:///active.md</script><script>alert(1)</script>",
    revision: 7,
    requestId: 11,
    activeSourceFile: "/workspace/active.md</script>",
  });

  assert.doesNotMatch(script, /<\/script>/iu);
});

test("T43: the Comment button and the reply box are installed only for writable previews", () => {
  const source = (commentsEnabled: boolean) => createScrollSyncScript({
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    activeSourceFile: "/workspace/active.md",
    commentsEnabled,
  });
  assert.match(source(true), /"commentsEnabled":true/u);
  assert.match(source(false), /"commentsEnabled":false/u);
  assert.match(source(true), /const commentsEnabled = context\.commentsEnabled === true;/u);
  assert.match(source(true), /commentsEnabled \? \(\s*function installCommentCompose/u);
  // Both pages load; the read-only one never lists a Comment button hook.
  assert.doesNotThrow(() => createRuntimeHarness({ commentsEnabled: true }));
  assert.doesNotThrow(() => createRuntimeHarness({ commentsEnabled: false }));
});

test("observes preview content instead of the document body", () => {
  const harness = createRuntimeHarness();

  assert.equal(harness.observedResizeTarget, harness.previewContent);
  assert.notEqual(harness.observedResizeTarget, harness.body);
});

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

test("fenced Markdown editors sit outside the rendered pre and preserve source when saving", () => {
  const harness = createRuntimeHarness();
  const code = harness.mappings[1];
  const pre = new RuntimeElement({}, harness.windowState, 500, 200, "pre");
  pre.appendChild(code);
  const originalText = [
    "```md",
    "Implementation completed: <tasks-number> tasks",
    "",
    "Tasks:",
    "- <task-1>: completed",
    "- <task-2>: completed (1 reworks)",
    "- <task-3>: completed",
    "",
    "```",
    "",
  ].join("\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: code, preventDefault: () => undefined });
  const editor = blockEditorOf(pre);
  assert.ok(editor);
  assert.equal(code.insertedElements.length, 0);
  assert.equal(pre.contains(editor), false);
  assert.equal(pre.getAttribute("data-sphinx-preview-editing"), "true");
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText,
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  assert.equal(textarea.parentElement, editor);
  assert.equal(textarea.value, originalText.slice(0, -1));
  textarea.value = textarea.value.replace("(1 reworks)", "(1 rework)");
  textarea.dispatch("input");
  harness.flushTimers();
  assert.equal(harness.messages.at(-1)?.editedText, originalText.replace("(1 reworks)", "(1 rework)"));
  textarea.dispatch("keydown", { key: "Enter", metaKey: true, preventDefault: () => undefined });
  // Cmd+Enter commits like blur: a final save, closed by the re-render; never a cancel.
  assert.equal(harness.messages.at(-1)?.type, "previewEditSave");
  assert.equal(harness.messages.at(-1)?.final, true);
  assert.equal(
    harness.messages.at(-1)?.editedText,
    originalText.replace("(1 reworks)", "(1 rework)"),
  );
  assert.equal(harness.messages.some((message) => message.type === "previewEditCancel"), false);
});

test("without caretRangeFromPoint a click opens the editor with the caret at the end of the block", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.mappings[1],
    clientX: 10,
    clientY: 10,
    preventDefault: () => undefined,
  });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "First line\nSecond line\n",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  assert.equal(textarea.selectionStart, "First line\nSecond line".length);
  assert.equal(textarea.selectionEnd, "First line\nSecond line".length);
});

test("active Markdown editors leave repeated spaces and Enter to native text input", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "- `compendium-jira-confluence`:\n  - `jira-skill`.        \n  - `derive-jira-issue-to-change-request`\n",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.parentElement = harness.mappings[1];
  assert.equal(textarea.getAttribute("autocorrect"), "off");
  assert.equal(textarea.getAttribute("autocapitalize"), "off");
  assert.equal(textarea.getAttribute("autocomplete"), "off");
  // The editor opens with the caret at the end of a list line, where Enter continues the list (D-03);
  // this test checks Enter before the marker, which stays native.
  textarea.setSelectionRange(0, 0);
  const messageCount = harness.messages.length;
  let prevented = 0;
  for (const key of [" ", " ", " ", " ", "Enter"]) {
    const event = { target: textarea, key, preventDefault: () => { prevented += 1; } };
    textarea.dispatch("keydown", event);
    harness.dispatchDocument("keydown", event);
  }
  assert.equal(prevented, 0);
  assert.equal(harness.messages.length, messageCount);
});

test("Enter in a list item continues the list, and Shift+Enter stays native", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "- a\n",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.setSelectionRange(3, 3);
  let prevented = 0;
  textarea.dispatch("keydown", { key: "Enter", shiftKey: true, preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 0);
  assert.equal(textarea.value, "- a");
  textarea.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 1);
  assert.equal(textarea.value, "- a\n- ");
  assert.equal(textarea.selectionStart, 6);
  assert.equal(textarea.selectionEnd, 6);
  harness.flushTimers();
  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewEditSave");
  assert.equal(save?.editedText, "- a\n- \n");
});

test("Tab and Shift+Tab indent the block editor without closing it", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "- a\n  - b\n",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.setSelectionRange(6, 6);
  let prevented = 0;
  textarea.dispatch("keydown", { key: "Tab", preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 1);
  assert.equal(textarea.value, "- a\n    - b");
  harness.flushTimers();
  const autosave = harness.messages.at(-1);
  assert.equal(autosave?.type, "previewEditSave");
  assert.equal(autosave?.editedText, "- a\n    - b\n");
  textarea.dispatch("keydown", { key: "Tab", shiftKey: true, preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 2);
  assert.equal(textarea.value, "- a\n  - b");
  textarea.setSelectionRange(0, 0);
  textarea.dispatch("keydown", { key: "Tab", shiftKey: true, preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 3);
  assert.equal(textarea.value, "- a\n  - b");
  harness.flushTimers();
  assert.equal(
    harness.messages.some((message) => message.type === "previewEditSave" && message.final === true),
    false,
  );
  assert.ok(harness.createdElements.includes(textarea));
});

test("Enter on an empty list item empties the line and Enter in plain text stays native", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "- a\n- \n",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.setSelectionRange(6, 6);
  let prevented = 0;
  textarea.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 1);
  assert.equal(textarea.value, "- a\n");
  assert.equal(textarea.selectionStart, 4);
  textarea.value = "plain";
  textarea.setSelectionRange(5, 5);
  textarea.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 1);
  assert.equal(textarea.value, "plain");
});

test("block textareas resize on input and preview layout changes", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "A long paragraph. ".repeat(500),
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  assert.equal(textarea.style.height, `${textarea.scrollHeight}px`);
  for (const [height, resize] of [
    [3_000, () => textarea.dispatch("input")],
    [4_000, () => harness.dispatchWindow("resize")],
    [5_000, () => harness.dispatchVisualViewportResize()],
    [2_500, () => harness.triggerResizeObserver()],
  ] as const) {
    textarea.scrollHeight = height;
    resize();
    harness.flushFrames();
    assert.equal(textarea.style.height, `${height}px`);
  }
});

test("edit mode loads raw Markdown and saves changes when the block loses focus", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  const request = harness.messages.at(-1);
  const editId = request?.editId;
  const originalText = "**Raw line one**\n\nRaw line two\n";
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId,
    originalText,
  });

  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  assert.equal(textarea.value, "**Raw line one**\n\nRaw line two");
  assert.equal(textarea.rows, 1);
  const lastContentPosition = originalText.trimEnd().length;
  assert.deepEqual(textarea.selectionRange, [lastContentPosition, lastContentPosition]);
  assert.equal(harness.createdElements.some((element) =>
    element.getAttribute("aria-label") === "Save Markdown block"
    || element.getAttribute("aria-label") === "Cancel Markdown edit"), false);
  assert.equal(harness.createdElements.some((element) =>
    element.tagName === "BUTTON" && element.getAttribute("aria-label") === "Done editing"), true);
  assert.equal(harness.createdElements.some((element) =>
    element.tagName === "BUTTON"
    && element.getAttribute("aria-label") === "Cancel editing and restore the original text"), true);
  assert.equal(harness.createdElements.some((element) =>
    element.tagName === "BUTTON" && element.textContent === "Revert"), false);
  textarea.value = "**Edited line one**\n\nRaw line two";
  textarea.dispatch("input");
  textarea.dispatch("blur");

  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewEditSave");
  assert.equal(save?.originalText, originalText);
  assert.equal(save?.editedText, textarea.value + "\n");
  assert.equal(save?.line, 50);
  assert.equal(save?.endLine, 52);
});

function openRawEditor(harness: RuntimeHarness): RuntimeElement {
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "Raw line one\nRaw line two\n",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  return textarea;
}

function findButton(harness: RuntimeHarness, label: string): RuntimeElement {
  const button = harness.createdElements.find((element) =>
    element.tagName === "BUTTON" && element.getAttribute("aria-label") === label);
  assert.ok(button, "missing button " + label);
  return button;
}

test("edit mode hover marks the whole list that a click would edit", () => {
  for (const editMode of [true, false]) {
    const harness = createRuntimeHarness();
    if (editMode) harness.editModeButton.dispatch("click");
    const list = new RuntimeElement({
      "data-sphinx-preview-document": "file:///active.md",
      "data-sphinx-source-end-line": "8",
      "data-sphinx-source-file": "/workspace/active.md",
      "data-sphinx-source-line": "5",
    }, harness.windowState, 0, 40, "ul");
    const item = new RuntimeElement({
      "data-sphinx-preview-document": "file:///active.md",
      "data-sphinx-source-end-line": "6",
      "data-sphinx-source-file": "/workspace/active.md",
      "data-sphinx-source-line": "6",
    }, harness.windowState, 0, 20, "li");
    list.appendChild(item);
    harness.dispatchDocument("mouseover", { target: item });
    assert.equal(list.getAttribute("data-sphinx-preview-edit-hover"), editMode ? "true" : null);
    assert.equal(item.getAttribute("data-sphinx-preview-edit-hover"), null);
    if (editMode) {
      harness.dispatchDocument("mouseout", { target: item, relatedTarget: undefined });
      assert.equal(list.getAttribute("data-sphinx-preview-edit-hover"), null);
      harness.dispatchDocument("focusin", { target: item });
      assert.equal(list.getAttribute("data-sphinx-preview-edit-hover"), "true");
      harness.dispatchDocument("focusout", { target: item });
      assert.equal(list.getAttribute("data-sphinx-preview-edit-hover"), null);
      harness.dispatchDocument("mouseover", { target: item });
      harness.editModeButton.dispatch("click");
      assert.equal(list.getAttribute("data-sphinx-preview-edit-hover"), null);
    }
  }
});

test("an opened block editor shows its line range, Done and Cancel on one row", () => {
  const harness = createRuntimeHarness();
  const textarea = openRawEditor(harness);
  const editor = textarea.parentElement;
  assert.ok(editor);
  const status = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-preview-edit-status") !== null);
  assert.ok(status);
  assert.match(status.textContent, /^Lines 50\u201352 \u00b7 Enter: new line \u00b7 Tab: indent \u00b7 Esc: cancel \u00b7 /u);
  assert.match(status.textContent, /(?:\u2318\u21a9|Ctrl\+Enter): done$/u);
  assert.equal(findButton(harness, "Done editing").textContent, "Done");
  const cancel = findButton(harness, "Cancel editing and restore the original text");
  assert.equal(cancel.textContent, "Cancel");
  assert.equal(cancel.disabled, false);
});

test("the status line shares one row with the Done and Cancel buttons", () => {
  const harness = createRuntimeHarness();
  const textarea = openRawEditor(harness);
  const editor = textarea.parentElement;
  assert.ok(editor);
  const row = editor.childElements.find((child) =>
    child.getAttribute("class") === "sphinx-preview-block-editor-actions"
    || child.className === "sphinx-preview-block-editor-actions");
  assert.ok(row, "the actions row is a direct child of the editor");
  const status = row.childElements.find((child) =>
    child.getAttribute("data-sphinx-preview-edit-status") !== null);
  assert.ok(status, "the status element lives inside the actions row");
  assert.equal(editor.childElements.includes(status), false);
  const done = findButton(harness, "Done editing");
  const cancel = findButton(harness, "Cancel editing and restore the original text");
  const buttons = row.childElements.find((child) => child.childElements.includes(done));
  assert.ok(buttons);
  assert.equal(buttons.childElements.includes(cancel), true);
  assert.equal(row.childElements.indexOf(status) < row.childElements.indexOf(buttons), true);
});

test("Cancel cancels only what reached the document", () => {
  const withAutosave = createRuntimeHarness();
  let textarea = openRawEditor(withAutosave);
  let cancel = findButton(withAutosave, "Cancel editing and restore the original text");
  textarea.value = "Changed";
  textarea.dispatch("input");
  assert.equal(cancel.disabled, false);
  withAutosave.flushTimers();
  assert.equal(withAutosave.messages.at(-1)?.final, false);
  cancel.dispatch("click");
  assert.equal(withAutosave.messages.at(-1)?.type, "previewEditCancel");

  const withoutAutosave = createRuntimeHarness();
  textarea = openRawEditor(withoutAutosave);
  cancel = findButton(withoutAutosave, "Cancel editing and restore the original text");
  textarea.value = "Changed";
  textarea.dispatch("input");
  assert.equal(cancel.disabled, false);
  const before = withoutAutosave.messages.length;
  cancel.dispatch("click");
  textarea.dispatch("blur");
  assert.equal(withoutAutosave.messages.length, before);
  assert.equal(withoutAutosave.pendingTimerCount(), 0);
});

test("Done posts a final save and both buttons keep the textarea focused on press", () => {
  const harness = createRuntimeHarness();
  const textarea = openRawEditor(harness);
  textarea.value = "Changed";
  textarea.dispatch("input");
  for (const label of ["Done editing", "Cancel editing and restore the original text"]) {
    let prevented = false;
    findButton(harness, label).dispatch("mousedown", { preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true, label);
  }
  findButton(harness, "Done editing").dispatch("click");
  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewEditSave");
  assert.equal(save?.final, true);
  assert.equal(save?.editedText, "Changed\n");
});

test("raw Markdown block edits autosave on input without disabling the textarea", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  const editId = harness.messages.at(-1)?.editId;
  const originalText = "Raw line one\nRaw line two\n";
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId,
    originalText,
  });

  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.value = "First keystroke";
  textarea.dispatch("input");
  harness.flushTimers();
  let save = harness.messages.at(-1);
  assert.equal(save?.type, "previewEditSave");
  assert.equal(save?.final, false);
  assert.equal(save?.editedText, "First keystroke\n");
  assert.equal(textarea.disabled, false);

  textarea.value = "Continued typing";
  textarea.dispatch("input");
  harness.flushTimers();
  save = harness.messages.at(-1);
  assert.equal(save?.final, false);
  assert.equal(save?.editedText, "Continued typing\n");
  assert.equal(textarea.disabled, false);

  textarea.dispatch("blur");
  save = harness.messages.at(-1);
  assert.equal(save?.final, true);
  assert.equal(save?.editedText, "Continued typing\n");
});

test("arrow boundaries transfer block editing in every direction", () => {
  const cases = [
    { key: "ArrowLeft", position: 0, line: 1, source: "Previous block\n", caret: "end" },
    { key: "ArrowRight", position: "end", line: 100, source: "Next block\n", caret: "start" },
    { key: "ArrowUp", position: 0, line: 1, source: "Previous block\n", caret: "end" },
    { key: "ArrowDown", position: "end", line: 100, source: "Next block\n", caret: "start" },
  ] as const;

  for (const testCase of cases) {
    const harness = createRuntimeHarness();
    harness.editModeButton.dispatch("click");
    harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
    const request = harness.messages.at(-1);
    harness.dispatchMessage({
      type: "previewEditSource",
      documentId: "file:///active.md",
      revision: 7,
      requestId: 11,
      editId: request?.editId,
      originalText: "Current block\n",
    });
    const textarea = harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1);
    assert.ok(textarea);
    const position = testCase.position === "end" ? textarea.value.length : testCase.position;
    textarea.setSelectionRange(position, position);
    let prevented = false;
    textarea.dispatch("keydown", {
      key: testCase.key,
      preventDefault: () => { prevented = true; },
    });

    assert.equal(prevented, true, testCase.key);
    const navigationRequest = harness.messages.at(-1);
    assert.equal(navigationRequest?.type, "previewEditOpen", testCase.key);
    assert.equal(navigationRequest?.line, testCase.line, testCase.key);
    harness.dispatchMessage({
      type: "previewEditSource",
      documentId: "file:///active.md",
      revision: 7,
      requestId: 11,
      editId: navigationRequest?.editId,
      originalText: testCase.source,
    });
    const nextTextarea = harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1);
    assert.ok(nextTextarea);
    const expectedPosition = testCase.caret === "start"
      ? 0
      : testCase.source.trimEnd().length;
    assert.deepEqual(nextTextarea.selectionRange, [expectedPosition, expectedPosition], testCase.key);
  }
});

test("table cell editing exposes row and column operations and saves the edited table", () => {
  const harness = createRuntimeHarness();
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
  row.rowIndex = 1;
  const cell = new RuntimeElement({}, harness.windowState, 100, 30, "td");
  cell.cellIndex = 1;
  const renderedContent = new RuntimeElement({}, harness.windowState, 100, 30, "strong");
  renderedContent.textContent = "y";
  cell.appendChild(renderedContent);
  table.appendChild(row);
  row.appendChild(cell);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const request = harness.messages.at(-1);
  assert.equal(request?.type, "previewEditOpen");
  assert.equal(request?.line, 20);
  assert.equal(request?.endLine, 23);
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: request?.editId,
    originalText: "| A | B |\n| --- | :---: |\n| x | y |\n| p | q |\n",
  });

  let input = harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Markdown table cell").at(-1);
  assert.ok(input);
  assert.equal(input.tagName, "TEXTAREA");
  assert.equal(input.value, "y");
  const cellEditor = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-preview-table-cell-editor") === "true");
  assert.ok(cellEditor);
  assert.equal(cellEditor.parentElement, cell);
  const hiddenContent = cell.childElements.find((element) =>
    element.getAttribute("data-sphinx-table-cell-content") === "true");
  assert.ok(hiddenContent);
  assert.equal(renderedContent.parentElement, hiddenContent);
  assert.equal(hiddenContent.getAttribute("aria-hidden"), "true");
  const tableMenu = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-table-menu") === "true");
  assert.ok(tableMenu);
  tableMenu.height = 40;
  cell.rectProvider = () => ({
    top: cell.top - harness.windowState.scrollY,
    bottom: cell.top - harness.windowState.scrollY + cell.height,
    height: cell.height,
    left: 120,
    width: 200,
  });
  harness.dispatchWindow("resize");
  // The toolbar is in the document flow (no body placement, no floating coordinates); its parent
  // here is the detached test table's parent, i.e. the body fallback.
  assert.equal(tableMenu.getAttribute("role"), "toolbar");
  assert.equal(tableMenu.getAttribute("data-placement"), null);
  assert.equal(tableMenu.style.getPropertyValue("--sphinx-preview-table-menu-top"), "");
  assert.equal(tableMenu.style.getPropertyValue("--sphinx-preview-table-menu-left"), "");
  cell.top = 100;
  assert.equal(
    tableMenu.childElements.filter((element) => element.tagName === "BUTTON").length,
    5,
  );
  const operationButtons = harness.createdElements.filter((element) =>
    element.getAttribute("data-sphinx-table-operation") !== null);
  assert.equal(operationButtons.length, 5);
  assert.ok(operationButtons.every((button) =>
    button.innerHTML.includes("<svg") && button.getAttribute("title") !== null));
  assert.equal(harness.createdElements.filter((element) =>
    element.getAttribute("data-sphinx-preview-table-save") !== null
    || element.getAttribute("data-sphinx-preview-table-cancel") !== null).length, 0);
  input.value = "new";
  input.dispatch("input");
  harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Insert row after selected row").at(-1)?.dispatch("click");
  input = harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Markdown table cell").at(-1);
  assert.ok(input);
  input.value = "new row";
  input.dispatch("input");
  harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Insert column after selected column").at(-1)?.dispatch("click");
  input = harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Markdown table cell").at(-1);
  assert.ok(input);
  input.value = "new column";
  input.dispatch("input");
  input.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });

  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewEditSave");
  assert.equal(save?.originalText, "| A | B |\n| --- | :---: |\n| x | y |\n| p | q |\n");
  assert.equal(save?.editedText, [
    "| A | B |  |",
    "| --- | :---: | --- |",
    "| x | new |  |",
    "|  | new row | new column |",
    "| p | q |  |",
    "",
  ].join("\n"));
  input.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  // Escape commits like blur and never cancels; the re-render closes the finished edit.
  assert.equal(harness.messages.at(-1)?.type, "previewEditSave");
  assert.equal(harness.messages.at(-1)?.final, true);
  assert.equal(harness.messages.some((message) => message.type === "previewEditCancel"), false);
});

function openPipeTableCellEditor(harness: ReturnType<typeof createRuntimeHarness>, parent?: RuntimeElement) {
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  if (parent) parent.appendChild(table);
  const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
  row.rowIndex = 1;
  const cell = new RuntimeElement({}, harness.windowState, 100, 30, "td");
  cell.cellIndex = 1;
  table.appendChild(row);
  row.appendChild(cell);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const request = harness.messages.at(-1);
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: request?.editId,
    originalText: "| A | B |\n| --- | --- |\n| x | y |\n",
  });
}

const convertButton = (harness: ReturnType<typeof createRuntimeHarness>) =>
  harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Convert to list-table").at(-1);

test("CR038: the table toolbar converts the pipe table to a list-table in one final save", () => {
  const harness = createRuntimeHarness();
  openPipeTableCellEditor(harness);
  const input = harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Markdown table cell").at(-1);
  assert.ok(input);
  input.value = "edited";
  input.dispatch("input");
  const saves = harness.messages.filter((message) => message.type === "previewEditSave").length;
  const button = convertButton(harness);
  assert.ok(button, "the conversion button is in the table toolbar");
  assert.equal(button.disabled, false);
  button.dispatch("click");
  const saved = harness.messages.filter((message) => message.type === "previewEditSave");
  assert.equal(saved.length, saves + 1, "one save, so one undo step");
  assert.equal(saved.at(-1)?.final, true);
  assert.equal(saved.at(-1)?.originalText, "| A | B |\n| --- | --- |\n| x | y |\n");
  assert.equal(saved.at(-1)?.editedText, [
    "```{list-table}", ":header-rows: 1", "", "* - A", "  - B", "* - x", "  - edited", "```", "",
  ].join("\n"));
});

test("CR038: the conversion button is off for a table inside a captioned figure", () => {
  const harness = createRuntimeHarness();
  const figure = new RuntimeElement({}, harness.windowState, 100, 100, "figure");
  harness.body.appendChild(figure);
  openPipeTableCellEditor(harness, figure);
  assert.equal(convertButton(harness)?.disabled, true);
});

test("table toolbar sits in the flow above the table with text labels and a position status", () => {
  const harness = createRuntimeHarness();
  const section = new RuntimeElement({}, harness.windowState, 0, 300, "section");
  harness.body.appendChild(section);
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  section.appendChild(table);
  const cells = [0, 1, 2].map((rowIndex) => {
    const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
    row.rowIndex = rowIndex;
    table.appendChild(row);
    return [0, 1].map((columnIndex) => {
      const cell = new RuntimeElement({}, harness.windowState, 100, 30, rowIndex === 0 ? "th" : "td");
      cell.cellIndex = columnIndex;
      row.appendChild(cell);
      return cell;
    });
  });
  const click = (cell: RuntimeElement): void => harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  harness.editModeButton.dispatch("click");
  click(cells[1][1]);
  const request = harness.messages.at(-1);
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: request?.editId,
    originalText: "| A | B |\n| --- | --- |\n| x | y |\n| p | q |\n",
  });
  const menu = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-table-menu") === "true");
  assert.ok(menu);
  assert.equal(menu.parentElement, section);
  assert.equal(section.childElements.indexOf(menu) + 1, section.childElements.indexOf(table));
  assert.equal(menu.getAttribute("data-placement"), null);
  assert.equal(menu.style.getPropertyValue("--sphinx-preview-table-menu-top"), "");
  const labels = menu.childElements.filter((element) => element.tagName === "BUTTON")
    .map((button) => button.childElements.find((child) =>
      child.className === "sphinx-preview-table-menu-label")?.textContent);
  assert.deepEqual(labels, ["Row +", "Row \u2212", "Col +", "Col \u2212", "List table"]);
  assert.equal(menu.childElements.find((element) =>
    element.getAttribute("data-sphinx-preview-edit-status") !== null)?.textContent,
  "Row 1 of 2 \u00b7 column 2 of 2");
  click(cells[0][0]);
  assert.equal(menu.childElements.find((element) =>
    element.getAttribute("data-sphinx-preview-edit-status") !== null)?.textContent,
  "Header \u00b7 column 1 of 2");
  assert.equal(menu.parentElement, section);
  const input = harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Markdown table cell").at(-1);
  assert.ok(input);
  input.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(menu.parentElement, undefined);
  assert.equal(section.childElements.includes(menu), false);
});

test("CR 034: the table toolbar rides down with a tall table and leaves with the table", () => {
  const harness = createRuntimeHarness({ viewportHeight: 600 });
  const section = new RuntimeElement({}, harness.windowState, 0, 3000, "section");
  harness.body.appendChild(section);
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 200, 1200, "table");
  section.appendChild(table);
  const row = new RuntimeElement({}, harness.windowState, 200, 30, "tr");
  row.rowIndex = 1;
  table.appendChild(row);
  const cell = new RuntimeElement({}, harness.windowState, 240, 30, "td");
  cell.cellIndex = 0;
  row.appendChild(cell);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "| A | B |\n| --- | --- |\n| x | y |\n| p | q |\n",
  });
  const menu = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-table-menu") === "true");
  assert.ok(menu);
  // The bar's natural place is just above the table (top 156 in the page); a shift moves it.
  const shiftOf = (): number => Number.parseFloat(menu.style.getPropertyValue("--sphinx-preview-table-menu-shift")) || 0;
  menu.rectProvider = () => {
    const top = 156 - harness.windowState.scrollY + shiftOf();
    return { top, bottom: top + 40, height: 40, left: 0, right: 200, width: 200 };
  };
  const scrollTo = (y: number): void => {
    harness.windowState.scrollY = y;
    harness.dispatchWindow("scroll");
  };
  scrollTo(0);
  assert.equal(shiftOf(), 0, "table top in view: the bar stays above the table");
  assert.equal(menu.getAttribute("data-sphinx-table-menu-stuck"), null);
  scrollTo(400);
  assert.ok(shiftOf() > 0, "table top scrolled out: the bar rides down");
  assert.equal(menu.getAttribute("data-sphinx-table-menu-stuck"), "true");
  const stuck = menu.getBoundingClientRect();
  assert.ok(stuck.top >= 0 && (stuck.bottom ?? 0) <= 600, "the bar stays inside the viewport");
  scrollTo(1250);
  const leaving = menu.getBoundingClientRect();
  assert.ok((leaving.bottom ?? 0) <= 200 + 1200 - 1250 + 0.5, "the bar never goes below the table's bottom");
  scrollTo(0);
  assert.equal(shiftOf(), 0, "back at the top the bar is back in place");
  assert.equal(menu.getAttribute("data-sphinx-table-menu-stuck"), null);
  assert.equal(menu.parentElement, section, "the bar is not moved in the flow");
});

function openTableForToolbarReveal(options: {
  cellTop: number;
  barTop: number;
  scrollY: number;
  /** The floating controls cover the right end of the table toolbar box; its items are given. */
  controlsOverRightEnd?: boolean;
}) {
  const harness = createRuntimeHarness({ viewportHeight: 600 });
  if (options.controlsOverRightEnd) {
    harness.toolbar.rectProvider = () => ({ top: 12, height: 100, bottom: 112, left: 150, right: 280, width: 130 });
  }
  const section = new RuntimeElement({}, harness.windowState, 0, 2000, "section");
  harness.body.appendChild(section);
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  section.appendChild(table);
  const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
  row.rowIndex = 1;
  table.appendChild(row);
  const cell = new RuntimeElement({}, harness.windowState, options.cellTop, 30, "td");
  cell.cellIndex = 0;
  row.appendChild(cell);
  const insertBefore = section.insertBefore.bind(section);
  const bar = { top: options.barTop, height: 76 };
  section.insertBefore = (child: RuntimeElement, reference: RuntimeElement | null): RuntimeElement => {
    if (child.getAttribute("data-sphinx-table-menu") === "true") {
      // The toolbar's viewport top is fixed by the test, as after the R7 anchor restore.
      child.rectProvider = () => ({
        top: bar.top, bottom: bar.top + bar.height, height: bar.height, left: 0, width: options.controlsOverRightEnd ? 300 : 200,
      });
      if (options.controlsOverRightEnd) {
        // Line 1 (the buttons) ends left of the controls; the status text on line 2 sits under them.
        const place = (item: RuntimeElement): void => {
          const status = item.getAttribute("data-sphinx-preview-edit-status") !== null;
          item.rectProvider = () => ({
            top: bar.top + (status ? 40 : 10), height: 20, bottom: bar.top + (status ? 60 : 30),
            left: status ? 200 : 0, width: status ? 90 : 20,
          });
        };
        child.childElements.forEach(place);
        const appendChild = child.appendChild.bind(child);
        child.appendChild = (item: RuntimeElement): RuntimeElement => {
          place(item);
          bar.height += 1; // the menu grows as it is filled, like a real one
          return appendChild(item);
        };
      }
    }
    return insertBefore(child, reference);
  };
  harness.editModeButton.dispatch("click");
  harness.windowState.scrollY = options.scrollY;
  harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const scrolls: number[] = [];
  const request = harness.messages.at(-1);
  const beforeScroll = harness.windowState.scrollY;
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: request?.editId,
    originalText: "| A |\n| --- |\n| x |\n",
  });
  scrolls.push(beforeScroll, harness.windowState.scrollY);
  return { harness, cell, scrolls, bar };
}

test("a toolbar that appears above the reading offset is scrolled into view by the exact delta", () => {
  // Reading offset is 65 in the harness; the bar top is -28, so the page scrolls up by 93.
  const { scrolls } = openTableForToolbarReveal({ cellTop: 340, barTop: -28, scrollY: 300 });
  assert.deepEqual(scrolls, [300, 300 - 93]);
});

test("P8: a toolbar box is not revealed when only its empty part is under the preview controls", () => {
  // Controls bottom 112 + 4 = 116 > bar top 90, but the buttons end left of the controls and the
  // status text on line 2 (top 130) is already below them: nothing is covered, so no scroll.
  const free = openTableForToolbarReveal({ cellTop: 340, barTop: 90, scrollY: 300, controlsOverRightEnd: true });
  assert.deepEqual(free.scrolls, [300, 300]);
  // A bar 24 px higher has its status text (top 106) under the controls (bottom 112 + 4): the page
  // scrolls by the 10 px that bring the status text under them, not by the 26 px of the box.
  const covered = openTableForToolbarReveal({ cellTop: 340, barTop: 66, scrollY: 300, controlsOverRightEnd: true });
  assert.deepEqual(covered.scrolls, [300, 300 - 10]);
});

test("a toolbar that is already visible causes no extra scroll", () => {
  const { scrolls } = openTableForToolbarReveal({ cellTop: 340, barTop: 80, scrollY: 300 });
  assert.deepEqual(scrolls, [300, 300]);
});

test("the toolbar is not revealed when that would push the selected cell out of the viewport", () => {
  // The cell sits near the bottom of the 600 px viewport, so a 93 px reveal would push it out.
  const { scrolls } = openTableForToolbarReveal({ cellTop: 860, barTop: -28, scrollY: 300 });
  assert.deepEqual(scrolls, [300, 300]);
});

test("a later layout change that pushes the toolbar above the reading offset is revealed again", () => {
  // The bar first appears visible (top 80). The status line then wraps: the bar grows and the anchor
  // restore leaves its top at 20, under the 65 px sticky band, so the page scrolls up by 45.
  const { harness, scrolls, bar } = openTableForToolbarReveal({ cellTop: 340, barTop: 80, scrollY: 300 });
  assert.deepEqual(scrolls, [300, 300]);
  bar.top = 20;
  bar.height = 100;
  harness.triggerResizeObserver();
  harness.flushFrames();
  assert.equal(harness.windowState.scrollY, 300 - 45);
  // Unchanged bar size: a deliberate user scroll is not undone by a further layout pass.
  bar.top = 10;
  harness.triggerResizeObserver();
  harness.flushFrames();
  assert.equal(harness.windowState.scrollY, 300 - 45);
});

test("table editing switches cells without losing changes and finalizes before leaving the table", () => {
  const harness = createRuntimeHarness();
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  const cells = [0, 1, 2].map((rowIndex) => {
    const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
    row.rowIndex = rowIndex;
    table.appendChild(row);
    return [0, 1].map((columnIndex) => {
      const cell = new RuntimeElement({}, harness.windowState, 100, 30, rowIndex === 0 ? "th" : "td");
      cell.cellIndex = columnIndex;
      const content = new RuntimeElement({}, harness.windowState, 100, 30, "strong");
      content.textContent = `${rowIndex}-${columnIndex}`;
      cell.appendChild(content);
      row.appendChild(cell);
      return cell;
    });
  });
  const click = (cell: RuntimeElement): void => harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
  });
  const input = (): RuntimeElement => {
    const control = harness.createdElements.filter((element) =>
      element.getAttribute("aria-label") === "Markdown table cell").at(-1);
    assert.ok(control);
    return control;
  };
  harness.editModeButton.dispatch("click");
  click(cells[1][0]);
  const editId = harness.messages.at(-1)?.editId;
  click(harness.mappings[2]);
  assert.equal(harness.messages.at(-1)?.editId, editId);
  assert.equal(harness.getWebviewState().pendingBlockNavigation, undefined);
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId,
    originalText: "| A | B |\n| --- | --- |\n| x | y |\n| p | q |\n",
  });
  input().value = "edited x";
  input().dispatch("input");
  click(cells[2][1]);
  assert.equal(input().value, "q");
  assert.equal(cells[1][0].getAttribute("data-sphinx-preview-table-cell-selected"), null);
  assert.equal(cells[1][0].childElements[0].tagName, "STRONG");
  input().value = "edited q";
  input().dispatch("input");
  click(cells[0][1]);
  assert.equal(input().value, "B");
  input().value = "edited B";
  input().dispatch("input");
  click(cells[1][0]);
  assert.equal(input().value, "edited x");
  assert.equal(harness.messages.filter((message) => message.type === "previewEditOpen").length, 1);
  const saves = harness.messages.filter((message) => message.type === "previewEditSave");
  assert.ok(saves.every((message) => message.editId === editId && message.final === false));
  assert.equal(saves.at(-1)?.editedText, "| A | edited B |\n| --- | --- |\n| edited x | y |\n| p | edited q |\n");
  click(harness.mappings[2]);
  assert.equal(harness.messages.at(-1)?.final, true);
  assert.equal(harness.getWebviewState().pendingBlockNavigation !== undefined, true);
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId,
    error: "The save could not be applied.",
  });
  assert.equal(harness.getWebviewState().pendingBlockNavigation, undefined);
  click(cells[2][1]);
  assert.equal(input().value, "edited q");
  input().dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  // Enter commits the edited cell like blur; the re-render closes the editor.
  assert.equal(harness.messages.at(-1)?.type, "previewEditSave");
  assert.equal(harness.messages.at(-1)?.final, true);
  assert.match(String(harness.messages.at(-1)?.editedText), /edited q/u);
  assert.equal(harness.messages.some((message) => message.type === "previewEditCancel"), false);
});

function openTableCellEditorForTab(
  harness: ReturnType<typeof createRuntimeHarness>,
  options: { mapped?: boolean } = {},
) {
  const table = new RuntimeElement({
    "data-sphinx-preview-document": "file:///active.md",
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
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
  if (options.mapped) harness.mappings.push(table);
  harness.editModeButton.dispatch("click");
  const click = (cell: RuntimeElement): void => harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
  });
  click(cells[1][0]);
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "| A | B |\n| --- | --- |\n| x | y |\n| p | q |\n",
  });
  const input = (): RuntimeElement => {
    const control = harness.createdElements.filter((element) =>
      element.getAttribute("aria-label") === "Markdown table cell").at(-1);
    assert.ok(control);
    return control;
  };
  return { cells, click, input };
}

test("Tab and Shift+Tab move between table cells, wrapping across rows", () => {
  const harness = createRuntimeHarness();
  const { cells, input } = openTableCellEditorForTab(harness);
  let prevented = 0;
  const tab = (shiftKey = false): void => input().dispatch("keydown", {
    key: "Tab", shiftKey, preventDefault: () => { prevented += 1; },
  });
  assert.equal(input().value, "x");
  tab();
  assert.equal(input().value, "y");
  assert.equal(harness.createdElements.filter((element) =>
    element.getAttribute("data-sphinx-preview-table-cell-editor") === "true")[0].parentElement, cells[1][1]);
  input().value = "yy";
  input().dispatch("input");
  tab();
  assert.equal(input().value, "p");
  assert.equal(prevented, 2);
  tab(true);
  assert.equal(input().value, "yy");
  tab(true);
  assert.equal(input().value, "x");
  assert.equal(harness.messages.filter((message) => message.type === "previewEditOpen").length, 1);
  assert.equal(harness.messages.some((message) => message.final === true), false);
});

test("Shift+Tab on the first header cell does nothing", () => {
  const harness = createRuntimeHarness();
  const { cells, click, input } = openTableCellEditorForTab(harness);
  click(cells[0][0]);
  assert.equal(input().value, "A");
  const count = harness.messages.length;
  let prevented = false;
  input().dispatch("keydown", { key: "Tab", shiftKey: true, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(harness.messages.length, count);
  assert.equal(input().value, "A");
});

function descendantsOf(element: RuntimeElement): RuntimeElement[] {
  return element.childElements.flatMap((child) => [child, ...descendantsOf(child)]);
}

function cellEditorOf(harness: ReturnType<typeof createRuntimeHarness>): RuntimeElement {
  const editor = harness.createdElements.filter((element) =>
    element.getAttribute("data-sphinx-preview-table-cell-editor") === "true").at(-1);
  assert.ok(editor);
  return editor;
}

test("arrow keys move the table cell editor cell to cell in every direction", () => {
  const harness = createRuntimeHarness();
  const { cells, input } = openTableCellEditorForTab(harness);
  const press = (key: string, position: number | "end", init: Record<string, unknown> = {}): boolean => {
    const at = position === "end" ? input().value.length : position;
    input().setSelectionRange(at, at);
    let prevented = false;
    input().dispatch("keydown", { key, ...init, preventDefault: () => { prevented = true; } });
    return prevented;
  };
  assert.equal(input().value, "x");
  // Mid-text caret: native caret movement, nothing happens.
  input().value = "xx";
  assert.equal(press("ArrowRight", 1), false);
  assert.equal(cellEditorOf(harness).parentElement, cells[1][0]);
  assert.equal(press("ArrowRight", "end"), true);
  assert.equal(cellEditorOf(harness).parentElement, cells[1][1]);
  assert.equal(input().value, "y");
  assert.deepEqual(input().selectionRange, [0, 0]);
  assert.equal(press("ArrowDown", "end"), true);
  assert.equal(cellEditorOf(harness).parentElement, cells[2][1]);
  assert.equal(input().value, "q");
  assert.equal(press("ArrowLeft", 0), true);
  assert.equal(cellEditorOf(harness).parentElement, cells[2][0]);
  assert.equal(input().value, "p");
  assert.deepEqual(input().selectionRange, [1, 1]);
  assert.equal(press("ArrowUp", 0), true);
  assert.equal(cellEditorOf(harness).parentElement, cells[1][0]);
  // The edited first cell was committed by the move, like Tab: autosave, no final save, one edit.
  assert.equal(input().value, "xx");
  assert.equal(harness.messages.filter((message) => message.type === "previewEditOpen").length, 1);
  assert.equal(harness.messages.some((message) => message.final === true), false);
  assert.match(String(harness.messages.at(-1)?.editedText), /\| xx \| y \|/u);
});

test("table cell arrows behave natively with a selection, modifiers, IME or a caret inside a multi-line cell", () => {
  const harness = createRuntimeHarness();
  const { cells, input } = openTableCellEditorForTab(harness);
  const count = harness.messages.length;
  const attempt = (key: string, start: number, end: number, init: Record<string, unknown> = {}): void => {
    input().setSelectionRange(start, end);
    let prevented = false;
    input().dispatch("keydown", { key, ...init, preventDefault: () => { prevented = true; } });
    assert.equal(prevented, false, key + JSON.stringify(init));
  };
  input().value = "ab";
  attempt("ArrowRight", 0, 2);
  attempt("ArrowLeft", 0, 2);
  for (const modifier of ["shiftKey", "altKey", "metaKey", "ctrlKey"]) {
    attempt("ArrowRight", 2, 2, { [modifier]: true });
    attempt("ArrowLeft", 0, 0, { [modifier]: true });
  }
  input().value = "one\ntwo";
  attempt("ArrowDown", 1, 1);
  attempt("ArrowUp", 5, 5);
  assert.equal(cellEditorOf(harness).parentElement, cells[1][0]);
  assert.equal(harness.messages.length, count);
});

test("table cell arrows fall back to block navigation only when no cell lies in that direction", () => {
  const harness = createRuntimeHarness();
  const { cells, click, input } = openTableCellEditorForTab(harness, { mapped: true });
  click(cells[0][0]);
  assert.equal(input().value, "A");
  input().setSelectionRange(0, 0);
  let prevented = false;
  input().dispatch("keydown", { key: "ArrowUp", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(harness.messages.at(-1)?.type, "previewEditOpen");
  assert.equal(harness.messages.at(-1)?.line, 1);
});

test("a table cell arrow without a matching model cell is not swallowed", () => {
  const harness = createRuntimeHarness();
  const { cells, input } = openTableCellEditorForTab(harness);
  // The rendered table has a third column in the row below that the Markdown model lacks.
  const extra = new RuntimeElement({}, harness.windowState, 100, 30, "td");
  extra.cellIndex = 2;
  cells[1][1].parentElement?.appendChild(extra);
  (cells[1][1].parentElement as unknown as { cells: RuntimeElement[] }).cells.push(extra);
  input().dispatch("keydown", { key: "Tab", preventDefault: () => undefined });
  assert.equal(input().value, "y");
  input().setSelectionRange(1, 1);
  let prevented = false;
  input().dispatch("keydown", { key: "ArrowRight", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(cellEditorOf(harness).parentElement, cells[1][1]);
});

test("the table cell field is re-fitted when the preview is resized", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  const field = input();
  const heights: number[] = [];
  Object.defineProperty(field, "scrollHeight", { get: () => 77, configurable: true });
  field.style.height = "5px";
  harness.dispatchWindow("resize");
  harness.flushFrames();
  heights.push(parseFloat(String(field.style.height)));
  assert.deepEqual(heights, [77]);
});

test("the table cell editor has Done and Cancel but no status hint", () => {
  const harness = createRuntimeHarness();
  const { cells, input } = openTableCellEditorForTab(harness);
  const editor = cellEditorOf(harness);
  const buttons = descendantsOf(editor).filter((element) => element.tagName === "BUTTON");
  assert.deepEqual(buttons.map((button) => button.textContent), ["Done", "Cancel"]);
  assert.equal(descendantsOf(editor).filter((element) =>
    element.getAttribute("data-sphinx-preview-edit-status") !== null).length, 0);
  assert.equal(descendantsOf(editor).filter((element) =>
    element.className === "sphinx-preview-block-editor-buttons").length, 1);
  assert.equal(editor.childElements.at(-1)?.className, "sphinx-preview-block-editor-actions");
  // The status stays on the toolbar.
  const menu = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-table-menu") === "true");
  assert.ok(menu?.childElements.some((element) =>
    element.getAttribute("data-sphinx-preview-edit-status") !== null));
  // Done commits the cell, like Enter; the buttons never take the focus from the field.
  input().value = "typed";
  input().dispatch("input");
  let prevented = false;
  buttons[0].dispatch("mousedown", { preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  buttons[0].dispatch("click");
  assert.equal(harness.messages.at(-1)?.type, "previewEditSave");
  assert.equal(harness.messages.at(-1)?.final, true);
  assert.match(String(harness.messages.at(-1)?.editedText), /typed/u);
  assert.equal(cellEditorOf(harness).parentElement, cells[1][0]);
});

test("Cancel in the table cell editor does what Escape does", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  input().value = "typed";
  input().dispatch("input");
  harness.flushTimers();
  const buttons = descendantsOf(cellEditorOf(harness)).filter((element) => element.tagName === "BUTTON");
  buttons[1].dispatch("click");
  assert.equal(harness.messages.at(-1)?.type, "previewEditCancel");
  assert.equal(harness.createdElements.filter((element) =>
    element.getAttribute("data-sphinx-preview-table-cell-editor") === "true"
    && element.parentElement !== undefined).length, 0);
});

function homeEndKeys(
  control: RuntimeElement,
  harness: ReturnType<typeof createRuntimeHarness>,
  value: string,
): void {
  control.value = value;
  const end = value.replace(/[\r\n]+$/u, "").length;
  const press = (key: string, init: Record<string, unknown> = {}): boolean => {
    let prevented = false;
    harness.windowState.scrollY = 77;
    control.dispatch("keydown", { key, ...init, preventDefault: () => { prevented = true; } });
    assert.equal(harness.windowState.scrollY, 77, key + " must not scroll the preview");
    return prevented;
  };
  control.setSelectionRange(4, 4);
  assert.equal(press("Home"), true);
  assert.deepEqual(control.selectionRange, [0, 0]);
  assert.equal(press("End"), true);
  assert.deepEqual(control.selectionRange, [end, end]);
  control.setSelectionRange(4, 4);
  assert.equal(press("End", { shiftKey: true }), true);
  assert.deepEqual(control.selectionRange, [4, end]);
  control.setSelectionRange(4, 4);
  assert.equal(press("Home", { shiftKey: true }), true);
  assert.deepEqual(control.selectionRange, [0, 4]);
  assert.equal(control.selectionDirection, "backward");
  // Extending a backward selection keeps its anchor at the original caret.
  assert.equal(press("End", { shiftKey: true }), true);
  assert.deepEqual(control.selectionRange, [4, end]);
  // Cmd+arrow stays native, Cmd+Home is not ours, IME composition is ignored.
  control.setSelectionRange(4, 4);
  assert.equal(press("End", { metaKey: true }), false);
  assert.equal(press("Home", { isComposing: true }), false);
  assert.deepEqual(control.selectionRange, [4, 4]);
}

test("Home and End move the caret inside the block textarea instead of scrolling the preview", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "first line\nsecond line\n",
  });
  const textarea = harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1);
  assert.ok(textarea);
  homeEndKeys(textarea, harness, "first line\nsecond line\n");
});

test("Home and End move the caret inside the table cell input instead of scrolling the table", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  homeEndKeys(input(), harness, "a very wide table cell value");
});

test("Tab on the last cell inserts a row and resumes in its first cell", () => {
  const harness = createRuntimeHarness();
  const { cells, click, input } = openTableCellEditorForTab(harness);
  click(cells[2][1]);
  assert.equal(input().value, "q");
  input().value = "qq";
  input().dispatch("input");
  input().dispatch("keydown", { key: "Tab", preventDefault: () => undefined });
  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewEditSave");
  assert.equal(save?.final, true);
  assert.match(String(save?.editedText), /^\| A \| B \|\n\| --- \| --- \|\n\| x \| y \|\n\| p \| qq \|\n\|\s*\|\s*\|\n$/u);
  const pending = harness.getWebviewState().pendingBlockNavigation as Record<string, unknown> | undefined;
  assert.equal(pending?.tableRowIndex, 3);
  assert.equal(pending?.tableColumnIndex, 0);
  assert.equal(pending?.sourceLine, 20);
});

test("the table cell editor commits on blur unless a pointer press is in progress", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  input().value = "typed";
  input().dispatch("input");
  const control = input();
  harness.dispatchDocument("pointerdown", { target: harness.mappings[2] });
  control.dispatch("blur");
  harness.flushTimers();
  assert.equal(harness.messages.some((message) => message.final === true), false);
});

test("the table cell editor commits and closes when focus leaves without a click", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  input().value = "typed";
  input().dispatch("input");
  input().dispatch("blur");
  harness.flushTimers();
  const last = harness.messages.at(-1);
  assert.equal(last?.type, "previewEditSave");
  assert.equal(last?.final, true);
  assert.match(String(last?.editedText), /typed/u);
});

test("Escape cancels a table cell even when focus is outside the cell editor", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  input().value = "typed";
  input().dispatch("input");
  harness.flushTimers();
  assert.equal(harness.messages.at(-1)?.final, false);
  harness.dispatchDocument("keydown", { key: "Escape", target: harness.body });
  assert.equal(harness.messages.filter((message) => message.final === true).length, 0);
  assert.equal(harness.messages.at(-1)?.type, "previewEditCancel");
});

function openBlockEditorWithSource(harness: ReturnType<typeof createRuntimeHarness>) {
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "Second paragraph.\n",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  return textarea;
}

test("Escape in a changed Markdown block editor cancels and never saves a final text", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Second paragraph. DROP ME.";
  textarea.dispatch("input");
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  // Nothing reached the document yet: the editor closes without any message.
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave"), false);
  assert.equal(harness.pendingTimerCount(), 0);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), null);
  textarea.dispatch("blur");
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave"), false);
});

test("Escape after an autosave restores the block with previewEditCancel", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Second paragraph. DROP ME.";
  textarea.dispatch("input");
  harness.flushTimers();
  assert.equal(harness.messages.at(-1)?.final, false);
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(harness.messages.at(-1)?.type, "previewEditCancel");
  assert.equal(harness.messages.some((message) => message.final === true), false);
  textarea.dispatch("blur");
  assert.equal(harness.messages.at(-1)?.type, "previewEditCancel");
  assert.equal(harness.messages.some((message) => message.final === true), false);
});

test("Escape during IME composition neither cancels nor saves a block edit", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Second paragraph. ime";
  textarea.dispatch("input");
  harness.flushTimers();
  const count = harness.messages.length;
  textarea.dispatch("keydown", { key: "Escape", isComposing: true, preventDefault: () => undefined });
  assert.equal(harness.messages.length, count);
  assert.equal(harness.messages.some((message) => message.type === "previewEditCancel"), false);
  assert.equal(harness.messages.some((message) => message.final === true), false);
});

test("Cmd+Enter and Ctrl+Enter finish the block editor like Done", () => {
  for (const modifier of [{ metaKey: true }, { ctrlKey: true }]) {
    const harness = createRuntimeHarness();
    const textarea = openBlockEditorWithSource(harness);
    textarea.value = "Second paragraph. KEEP ME PLEASE.";
    textarea.dispatch("keydown", { key: "Enter", ...modifier, preventDefault: () => undefined });
    const last = harness.messages.at(-1);
    assert.equal(last?.type, "previewEditSave");
    assert.equal(last?.final, true);
    assert.equal(last?.editedText, "Second paragraph. KEEP ME PLEASE.\n");
    assert.equal(harness.messages.some((message) => message.type === "previewEditCancel"), false);
  }
});

test("undo and redo shortcuts stop at the block textarea and keep the native undo", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const messageCount = harness.messages.length;
  const cases: Array<[Record<string, unknown>, boolean]> = [
    [{ key: "z", keyCode: 90, metaKey: true }, true],
    [{ key: "z", keyCode: 90, ctrlKey: true }, true],
    [{ key: "Z", keyCode: 90, metaKey: true, shiftKey: true }, true],
    [{ key: "y", keyCode: 89, ctrlKey: true }, true],
    [{ key: "z", keyCode: 90 }, false],
    [{ key: "y", keyCode: 89 }, false],
    [{ key: "s", keyCode: 83, metaKey: true }, false],
    [{ key: "z", keyCode: 90, metaKey: true, altKey: true }, false],
  ];
  for (const [init, intercepted] of cases) {
    let stopped = 0;
    let prevented = 0;
    textarea.dispatch("keydown", {
      target: textarea,
      ...init,
      stopPropagation: () => { stopped += 1; },
      preventDefault: () => { prevented += 1; },
    });
    assert.equal(stopped, intercepted ? 1 : 0, JSON.stringify(init));
    assert.equal(prevented, 0, JSON.stringify(init));
  }
  assert.equal(harness.messages.length, messageCount);
});

test("Escape in an unchanged Markdown block editor closes it without a message", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const messageCount = harness.messages.length;
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(harness.messages.length, messageCount);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), null);
  assert.equal(harness.mappings[1].contains(textarea.parentElement as RuntimeElement), false);
});

test("STAB-03: an editor the host watches reports its close; without a watch the close stays silent", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const editId = harness.messages.filter((message) => message.type === "previewEditOpen").at(-1)?.editId;
  assert.equal(typeof editId, "string");
  harness.dispatchMessage({ type: "previewEditorWatch", documentId: "file:///active.md", revision: 7, requestId: 11, editId });
  const messageCount = harness.messages.length;
  assert.equal(harness.messages.length, messageCount, "the watch itself posts nothing while the editor is open");
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  const closed = harness.messages.slice(messageCount);
  assert.deepEqual(closed.map((message) => message.type), ["previewEditClosed"]);
  assert.equal(closed[0]?.editId, editId);
  assert.equal(closed[0]?.documentId, "file:///active.md");
});

test("STAB-03: a watch for an editor that is already closed is answered at once", () => {
  const harness = createRuntimeHarness();
  const messageCount = harness.messages.length;
  harness.dispatchMessage({ type: "previewEditorWatch", documentId: "file:///active.md", revision: 7, requestId: 11, editId: "gone" });
  assert.deepEqual(harness.messages.slice(messageCount).map((message) => [message.type, message.editId]),
    [["previewEditClosed", "gone"]]);
});

test("STAB-03: a watch sent while the host already follows another document is still answered", () => {
  // The host switched to the next document while this page still shows the previous one: the
  // watch carries the new document id, and the page must answer it by editor id, or the host
  // waits for an editor that is gone and the preview stays on the old document.
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const editId = harness.messages.filter((message) => message.type === "previewEditOpen").at(-1)?.editId;
  harness.dispatchMessage({ type: "previewEditorWatch", documentId: "file:///other.md", revision: 1, requestId: 12, editId });
  const messageCount = harness.messages.length;
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.deepEqual(harness.messages.slice(messageCount).map((message) => [message.type, message.editId]),
    [["previewEditClosed", editId]], "the open editor reports its close");
  harness.dispatchMessage({ type: "previewEditorWatch", documentId: "file:///other.md", revision: 1, requestId: 12, editId: "gone" });
  assert.deepEqual(harness.messages.slice(messageCount + 1).map((message) => [message.type, message.editId]),
    [["previewEditClosed", "gone"]], "a closed editor is reported at once");
});

function openTableCellEditor(harness: ReturnType<typeof createRuntimeHarness>) {
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
  row.rowIndex = 1;
  const cell = new RuntimeElement({}, harness.windowState, 100, 30, "td");
  cell.cellIndex = 1;
  table.appendChild(row);
  row.appendChild(cell);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "| A | B |\n| --- | --- |\n| x | y |\n",
  });
  const input = harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Markdown table cell").at(-1);
  assert.ok(input);
  return input;
}

test("Escape in a changed table cell cancels and never saves a final table", () => {
  const harness = createRuntimeHarness();
  const input = openTableCellEditor(harness);
  input.value = "y2";
  input.dispatch("input");
  input.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave"), false);
  assert.equal(harness.pendingTimerCount(), 0);
  input.dispatch("blur");
  harness.flushTimers();
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave"), false);
});

test("Escape during IME composition neither cancels nor saves a table cell", () => {
  const harness = createRuntimeHarness();
  const input = openTableCellEditor(harness);
  input.value = "y2";
  input.dispatch("input");
  harness.flushTimers();
  const count = harness.messages.length;
  input.dispatch("keydown", { key: "Escape", isComposing: true, preventDefault: () => undefined });
  assert.equal(harness.messages.length, count);
  assert.equal(harness.messages.some((message) => message.type === "previewEditCancel"), false);
  assert.equal(harness.messages.some((message) => message.final === true), false);
});

test("Escape in a table cell after an autosave restores the table with previewEditCancel", () => {
  const harness = createRuntimeHarness();
  const input = openTableCellEditor(harness);
  input.value = "y2";
  input.dispatch("input");
  harness.flushTimers();
  assert.equal(harness.messages.at(-1)?.final, false);
  input.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(harness.messages.at(-1)?.type, "previewEditCancel");
  assert.equal(harness.messages.some((message) => message.final === true), false);
});

test("Enter in a changed table cell saves the table", () => {
  const harness = createRuntimeHarness();
  const input = openTableCellEditor(harness);
  input.value = "y2";
  input.dispatch("input");
  input.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  const last = harness.messages.at(-1);
  assert.equal(last?.type, "previewEditSave");
  assert.equal(last?.final, true);
  assert.match(String(last?.editedText), /\| x \| y2 \|/u);
});

test("turning edit mode off saves a changed block editor and ignores an unchanged one", () => {
  const changed = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(changed);
  textarea.value = "Second paragraph. B";
  changed.editModeButton.dispatch("click");
  const last = changed.messages.at(-1);
  assert.equal(last?.type, "previewEditSave");
  assert.equal(last?.final, true);
  assert.equal(last?.editedText, "Second paragraph. B\n");
  assert.equal(changed.messages.some((message) => message.type === "previewEditCancel"), false);

  const unchanged = createRuntimeHarness();
  openBlockEditorWithSource(unchanged);
  const messageCount = unchanged.messages.length;
  unchanged.editModeButton.dispatch("click");
  assert.deepEqual(
    unchanged.messages.slice(messageCount).map((message) => message.type),
    ["previewEditModeChanged"],
  );
  assert.equal(unchanged.messages.some((message) => message.type === "previewEditCancel"), false);
  assert.equal(unchanged.mappings[1].getAttribute("data-sphinx-preview-editing"), null);
});

test("table header cannot be deleted from the cell toolbar", () => {
  const harness = createRuntimeHarness();
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
  row.rowIndex = 0;
  const cell = new RuntimeElement({}, harness.windowState, 100, 30, "th");
  cell.cellIndex = 0;
  table.appendChild(row);
  row.appendChild(cell);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const request = harness.messages.at(-1);
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: request?.editId,
    originalText: "| A | B |\n| --- | --- |\n| x | y |\n",
  });

  const deleteButton = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Delete selected row");
  assert.ok(deleteButton);
  assert.equal(deleteButton.disabled, true);
});

test("table toolbar cannot delete the last body row", () => {
  const harness = createRuntimeHarness();
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "22",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
  row.rowIndex = 1;
  const cell = new RuntimeElement({}, harness.windowState, 100, 30, "td");
  cell.cellIndex = 0;
  table.appendChild(row);
  row.appendChild(cell);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const request = harness.messages.at(-1);
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: request?.editId,
    originalText: "| A |\n| --- |\n| x |\n",
  });

  const deleteButton = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Delete selected row");
  assert.ok(deleteButton);
  assert.equal(deleteButton.disabled, true);
});

test("edit mode opens mapped figures and admonition titles at their source ranges", () => {
  const figureHarness = createRuntimeHarness();
  figureHarness.editModeButton.dispatch("click");
  const figure = new RuntimeElement({
    "data-sphinx-source-line": "20",
    "data-sphinx-source-end-line": "24",
  }, figureHarness.windowState, 100, 80, "figure");
  figureHarness.dispatchDocument("click", {
    target: figure,
    preventDefault: () => undefined,
  });
  const figureRequest = figureHarness.messages.at(-1);
  assert.equal(figureRequest?.type, "previewEditOpen");
  assert.equal(figureRequest?.line, 20);
  assert.equal(figureRequest?.endLine, 24);

  const admonitionHarness = createRuntimeHarness();
  admonitionHarness.editModeButton.dispatch("click");
  const admonition = new RuntimeElement({
    "data-sphinx-source-line": "30",
    "data-sphinx-source-end-line": "34",
  }, admonitionHarness.windowState, 100, 80, "aside");
  const title = new RuntimeElement({}, admonitionHarness.windowState, 100, 20, "p");
  admonition.appendChild(title);
  admonitionHarness.dispatchDocument("click", {
    target: title,
    preventDefault: () => undefined,
  });
  const admonitionRequest = admonitionHarness.messages.at(-1);
  assert.equal(admonitionRequest?.type, "previewEditOpen");
  assert.equal(admonitionRequest?.line, 30);
  assert.equal(admonitionRequest?.endLine, 34);
});

test("frontmatter name cells open a schema-suggesting key editor and save on blur", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterNameCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const keyInput = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter key lifecycle");
  assert.ok(keyInput);
  assert.equal(harness.messages.some((message) => message.type === "previewEditOpen"), false);
  assert.equal(keyInput.value, "lifecycle");
  assert.equal(harness.frontmatterNameDisplay.getAttribute("hidden"), "");
  const datalist = harness.createdElements.find((element) => element.tagName === "DATALIST");
  assert.ok(datalist);
  assert.equal(keyInput.getAttribute("list"), datalist.getAttribute("id"));
  assert.deepEqual(
    datalist.childElements.map((option) => option.getAttribute("value")),
    ["status", "owner"],
  );
  const fieldMenu = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-menu") === "true");
  assert.ok(fieldMenu);
  assert.deepEqual(
    harness.createdElements
      .filter((element) => element.getAttribute("data-okf-frontmatter-operation") !== null)
      .map((element) => element.getAttribute("data-okf-frontmatter-operation")),
    ["add", "remove", "confirm-add"],
  );
  keyInput.value = "stage";
  keyInput.dispatch("blur");

  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewFrontmatterSave");
  assert.equal(save?.fieldName, "lifecycle");
  assert.equal(save?.newFieldName, "stage");
  assert.equal(save?.fieldValue, "draft");
  assert.equal(harness.refreshButton.disabled, true);
});

test("Escape cancels an unsaved frontmatter key edit", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterNameCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const keyInput = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter key lifecycle");
  assert.ok(keyInput);
  keyInput.value = "stage";
  let prevented = false;
  keyInput.dispatch("keydown", {
    key: "Escape",
    preventDefault: () => { prevented = true; },
  });
  keyInput.dispatch("blur");

  assert.equal(prevented, true);
  assert.equal(harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);
  assert.equal(harness.frontmatterNameDisplay.getAttribute("hidden"), null);
  assert.equal(harness.frontmatterNameCell.getAttribute("data-okf-key-editing"), null);
  assert.equal(harness.refreshButton.disabled, false);
});

test("edit mode exposes schema enum controls and saves the selected value", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  assert.equal(harness.frontmatterNameCell.getAttribute("tabindex"), null);
  assert.equal(harness.frontmatterValueCell.getAttribute("tabindex"), null);
  harness.editModeButton.dispatch("click");
  assert.equal(harness.frontmatterNameCell.getAttribute("tabindex"), "0");
  assert.equal(harness.frontmatterValueCell.getAttribute("tabindex"), "0");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const select = harness.createdElements.find((element) => element.tagName === "SELECT");
  assert.ok(select);
  assert.equal(select.parentElement?.parentElement, harness.frontmatterValueCell);
  assert.deepEqual(select.childElements.map((option) => option.value), ["", "draft", "active"]);
  assert.equal(select.getAttribute("data-okf-empty-select"), "false");
  assert.equal(harness.frontmatterValueDisplay.getAttribute("hidden"), "");
  assert.ok(harness.createdElements.some((element) =>
    element.getAttribute("data-okf-frontmatter-operation") === "remove"));
  select.value = "active";
  select.dispatch("blur");

  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewFrontmatterSave");
  assert.equal(save?.fieldName, "lifecycle");
  assert.equal(save?.fieldValue, "active");
  assert.equal(harness.refreshButton.disabled, true);
  harness.dispatchMessage({
    type: "previewFrontmatterResult",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: save?.editId,
    saved: true,
  });
  assert.equal(
    harness.createdElements.find((element) => element.getAttribute("role") === "status")?.textContent,
    "Saved. Refreshing preview…",
  );
});

test("boolean frontmatter values use a checkbox and save on change", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.frontmatterRow.setAttribute("data-okf-type", "checkbox");
  harness.frontmatterRow.setAttribute("data-okf-value", "false");
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "false\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("keydown", {
    key: "Enter",
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
  });

  const checkbox = harness.createdElements.find((element) => element.type === "checkbox");
  assert.ok(checkbox);
  assert.equal(checkbox.checked, false);
  assert.equal(checkbox.className, "okf-value-checkbox");
  assert.equal(checkbox.disabled, false);
  const checkboxValueLabel = harness.createdElements.find((element) =>
    element.className === "okf-boolean-value");
  assert.ok(checkboxValueLabel);
  assert.equal(checkboxValueLabel.textContent, "false");
  checkbox.checked = true;
  checkbox.dispatch("change");
  assert.equal(checkboxValueLabel.textContent, "true");

  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewFrontmatterSave");
  assert.equal(save?.fieldValue, true);
});

test("one click on a boolean value cell toggles and saves it", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.frontmatterRow.setAttribute("data-okf-type", "checkbox");
  harness.frontmatterRow.setAttribute("data-okf-value", "false");
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "false\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewFrontmatterSave");
  assert.equal(save?.fieldValue, true);
  const label = harness.createdElements.find((element) => element.className === "okf-boolean-value");
  assert.equal(label?.textContent, "true");
  const status = harness.createdElements.find((element) =>
    element.getAttribute("role") === "status" && element.textContent === "Saving frontmatter\u2026");
  assert.ok(status);
});

test("one click on a true boolean value cell saves false", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.frontmatterRow.setAttribute("data-okf-type", "checkbox");
  harness.frontmatterRow.setAttribute("data-okf-value", "true");
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "true\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  assert.equal(harness.messages.at(-1)?.fieldValue, false);
});

test("clicking a boolean name cell still opens the key editor and reading mode does nothing", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.frontmatterRow.setAttribute("data-okf-type", "checkbox");
  harness.frontmatterRow.setAttribute("data-okf-value", "false");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  assert.equal(harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);

  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterNameCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  assert.ok(harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter key lifecycle"));
  assert.equal(harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);
});

test("frontmatter list editor supports add, reorder, remove, and direct array saves", () => {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "list");
  harness.frontmatterRow.setAttribute("data-okf-value", '["one","two","three"]');
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "- one\n- two\n- three\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") === "true");
  assert.ok(editor);
  const listEditor = editor.childElements.find((element) =>
    element.className === "okf-list-editor");
  assert.ok(listEditor);
  const itemList = listEditor.childElements.find((element) =>
    element.className === "okf-list-editor-items");
  assert.ok(itemList);
  assert.equal(itemList.childElements.length, 3);
  const firstHandle = itemList.childElements[0]?.childElements[0];
  assert.equal(firstHandle?.getAttribute("draggable"), "true");

  const inputs = () => itemList.childElements.map((row) =>
    row.querySelector("[data-okf-list-item-input]"));
  inputs()[0]!.value = "one updated";
  firstHandle?.dispatch("keydown", {
    key: "ArrowDown",
    preventDefault: () => undefined,
  });
  assert.deepEqual(inputs().map((input) => input?.value), ["two", "one updated", "three"]);

  const addButton = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Add list item");
  assert.ok(addButton);
  addButton.dispatch("click");
  const addedInput = inputs().at(-1);
  assert.ok(addedInput);
  addedInput.value = "four";
  assert.equal(harness.createdElements.some((element) =>
    element.textContent === "Save" || element.textContent === "Cancel"), false);

  editor.dispatch("focusout", { relatedTarget: null });
  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewFrontmatterSave");
  assert.equal(JSON.stringify(save?.fieldValue), '["two","one updated","three","four"]');
});

test("list dragging shows the insertion boundary, reorders items, and suppresses drag blur saves", () => {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "list");
  harness.frontmatterRow.setAttribute("data-okf-value", '["one","two","three"]');
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") === "true");
  const itemList = harness.createdElements.find((element) =>
    element.className === "okf-list-editor-items");
  assert.ok(editor);
  assert.ok(itemList);
  const listEditor = itemList.parentElement;
  assert.ok(listEditor);
  const [first, second, third] = itemList.childElements;
  first.top = 100;
  second.top = 150;
  third.top = 200;
  for (const row of [first, second, third]) row.height = 40;
  harness.windowState.scrollY = 0;
  const handle = first.childElements[0];
  let dragPayload = "";
  const dataTransfer = {
    effectAllowed: "",
    dropEffect: "",
    setData: (_format: string, value: string) => { dragPayload = value; },
  };
  handle.dispatch("dragstart", { dataTransfer });
  assert.equal(dataTransfer.effectAllowed, "move");
  assert.ok(dragPayload);
  assert.equal(first.getAttribute("data-okf-list-dragging"), "true");
  editor.dispatch("focusout", { relatedTarget: null });
  assert.equal(harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);
  assert.equal(handle.disabled, false);

  let acceptedDrop = false;
  const hover = (clientY: number) => ({
    clientY,
    dataTransfer,
    preventDefault: () => { acceptedDrop = true; },
    stopPropagation: () => undefined,
  });
  third.dispatch("dragover", hover(205));
  assert.equal(acceptedDrop, true);
  assert.equal(dataTransfer.dropEffect, "move");
  assert.equal(third.getAttribute("data-okf-list-drop"), "before");
  third.dispatch("dragover", hover(235));
  assert.equal(third.getAttribute("data-okf-list-drop"), "after");
  third.dispatch("drop", hover(235));
  handle.dispatch("dragend");
  const values = () => itemList.childElements.map((row) =>
    row.querySelector("[data-okf-list-item-input]")?.value);
  assert.deepEqual(values(), ["two", "three", "one"]);
  assert.ok(itemList.childElements.every((row) => row.getAttribute("data-okf-list-drop") === null));
  assert.equal(first.getAttribute("data-okf-list-dragging"), null);

  handle.dispatch("dragstart", { dataTransfer });
  harness.windowState.scrollY = 0;
  second.dispatch("dragover", hover(155));
  assert.equal(second.getAttribute("data-okf-list-drop"), "before");
  second.dispatch("drop", hover(155));
  handle.dispatch("dragend");
  assert.deepEqual(values(), ["one", "two", "three"]);

  handle.dispatch("dragstart", { dataTransfer });
  harness.windowState.scrollY = 0;
  listEditor.dispatch("dragover", hover(195));
  assert.equal(third.getAttribute("data-okf-list-drop"), "before");
  listEditor.dispatch("dragleave", { relatedTarget: third.childElements[1] });
  assert.equal(third.getAttribute("data-okf-list-drop"), "before");
  listEditor.dispatch("dragleave", { relatedTarget: null });
  assert.ok(itemList.childElements.every((row) => row.getAttribute("data-okf-list-drop") === null));
  third.dispatch("dragover", hover(235));
  handle.dispatch("dragend");
  assert.deepEqual(values(), ["one", "two", "three"]);
  assert.ok(itemList.childElements.every((row) => row.getAttribute("data-okf-list-drop") === null));
  acceptedDrop = false;
  listEditor.dispatch("dragover", hover(195));
  assert.equal(acceptedDrop, false);

  handle.dispatch("dragstart", { dataTransfer });
  harness.windowState.scrollY = 0;
  third.dispatch("drop", hover(235));
  handle.dispatch("dragend");
  editor.dispatch("focusout", { relatedTarget: null });
  assert.equal(JSON.stringify(harness.messages.at(-1)?.fieldValue), '["two","three","one"]');
});

test("nullable list editor can set its value as null", () => {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "list");
  harness.frontmatterRow.setAttribute("data-okf-nullable", "true");
  harness.frontmatterRow.setAttribute("data-okf-value", '["one"]');
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "- one\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const setNullButton = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-list-set-null") === "true");
  assert.ok(setNullButton);
  assert.equal(setNullButton.textContent, "Set to null");
  setNullButton.dispatch("click", { stopPropagation: () => undefined });

  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewFrontmatterSave");
  assert.equal(Object.prototype.hasOwnProperty.call(save ?? {}, "fieldValue"), true);
  assert.equal(save?.fieldValue, null);
});

test("nullable scalar editor can set its value to null", () => {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "text");
  harness.frontmatterRow.setAttribute("data-okf-nullable", "true");
  harness.frontmatterRow.setAttribute("data-okf-value", '"reason"');
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "reason\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const setNullButton = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-set-null") === "true");
  assert.ok(setNullButton);
  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") === "true");
  assert.ok(editor?.childElements.includes(setNullButton));
  assert.equal(setNullButton.textContent, "Set to null");
  setNullButton.dispatch("click", { stopPropagation: () => undefined });

  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewFrontmatterSave");
  assert.equal(save?.fieldValue, null);
});

test("frontmatter list editor adds from empty and saves after removing every item", () => {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "list");
  harness.frontmatterRow.setAttribute("data-okf-value", "[]");
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "[]\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") === "true");
  assert.ok(editor);
  const listEditor = editor.childElements.find((element) =>
    element.className === "okf-list-editor");
  assert.ok(listEditor);
  const itemList = listEditor.childElements.find((element) =>
    element.className === "okf-list-editor-items");
  assert.ok(itemList);
  assert.equal(itemList.childElements.length, 0);
  const addButton = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Add list item");
  assert.ok(addButton);

  addButton.dispatch("click");
  assert.equal(itemList.childElements.length, 1);
  const firstRemoveButton = itemList.childElements[0]?.childElements[2];
  assert.ok(firstRemoveButton);
  let clickStopped = false;
  let mouseDownPrevented = false;
  firstRemoveButton.dispatch("mousedown", { preventDefault: () => { mouseDownPrevented = true; } });
  assert.equal(mouseDownPrevented, true);
  firstRemoveButton.dispatch("click", { stopPropagation: () => { clickStopped = true; } });
  assert.equal(clickStopped, true);
  assert.equal(itemList.childElements.length, 0);

  editor.dispatch("focusout", { relatedTarget: null });
  assert.equal(harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);

  const removeHarness = createRuntimeHarness();
  removeHarness.frontmatterRow.setAttribute("data-okf-type", "list");
  removeHarness.frontmatterRow.setAttribute("data-okf-value", '["only"]');
  removeHarness.frontmatterRow.setAttribute("data-okf-value-yaml", "- only\n");
  removeHarness.editModeButton.dispatch("click");
  removeHarness.dispatchDocument("click", {
    target: removeHarness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const removeEditor = removeHarness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") === "true");
  assert.ok(removeEditor);
  const removeListEditor = removeEditor.childElements.find((element) =>
    element.className === "okf-list-editor");
  assert.ok(removeListEditor);
  const removeItemList = removeListEditor.childElements.find((element) =>
    element.className === "okf-list-editor-items");
  assert.ok(removeItemList);
  removeItemList.childElements[0]?.childElements[2]?.dispatch("click");
  removeEditor.dispatch("focusout", { relatedTarget: null });
  const removeSave = removeHarness.messages.at(-1);
  assert.equal(JSON.stringify(removeSave?.fieldValue), "[]");
});

test("frontmatter list editor keeps invalid edits open and Escape cancels them", () => {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "list");
  harness.frontmatterRow.setAttribute("data-okf-value", '["one"]');
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "- one\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") === "true");
  assert.ok(editor);
  const listEditor = editor.childElements.find((element) =>
    element.className === "okf-list-editor");
  assert.ok(listEditor);
  const itemList = listEditor.childElements.find((element) =>
    element.className === "okf-list-editor-items");
  assert.ok(itemList);
  const input = itemList.childElements[0]?.querySelector("[data-okf-list-item-input]");
  assert.ok(input);
  input.value = "invalid";
  editor.dispatch("focusout", { relatedTarget: null });
  const save = harness.messages.at(-1);
  const status = harness.createdElements.find((element) => element.getAttribute("role") === "status");
  assert.ok(status);
  harness.dispatchMessage({
    type: "previewFrontmatterResult",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: save?.editId,
    error: "Schema validation failed: invalid list item",
  });
  assert.equal(status.getAttribute("data-visible"), "true");
  assert.equal(input.disabled, false);
  const listControl = editor.childElements.find((element) =>
    element.className === "okf-list-editor");
  assert.ok(listControl);
  listControl.dispatch("keydown", {
    key: "Escape",
    preventDefault: () => undefined,
  });
  assert.equal(harness.messages.filter((message) => message.type === "previewFrontmatterSave").length, 1);
  assert.equal(harness.frontmatterValueDisplay.getAttribute("hidden"), null);
});

test("frontmatter validation errors show an explicit error state", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const select = harness.createdElements.find((element) => element.tagName === "SELECT");
  assert.ok(select);
  select.value = "invalid";
  select.dispatch("blur");
  const save = harness.messages.at(-1);
  const status = harness.createdElements.find((element) => element.getAttribute("role") === "status");
  assert.ok(status);

  harness.dispatchMessage({
    type: "previewFrontmatterResult",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: save?.editId,
    error: "Schema validation failed: must NOT have fewer than 1 characters",
  });
  assert.equal(status.getAttribute("data-state"), "error");
  assert.equal(status.getAttribute("data-visible"), "true");
  assert.equal(status.textContent, "Schema validation failed: must NOT have fewer than 1 characters");
});

test("frontmatter field actions render inside the edited row", () => {
  for (const fieldCell of ["name", "value"] as const) {
    const harness = createRuntimeHarness({ mapFrontmatter: true, viewportWidth: 460, viewportHeight: 600 });
    const anchor = fieldCell === "name" ? harness.frontmatterNameCell : harness.frontmatterValueCell;
    harness.editModeButton.dispatch("click");
    harness.dispatchDocument("click", {
      target: anchor,
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
    });
    const menu = harness.createdElements.find((element) => element.getAttribute("data-okf-frontmatter-menu") === "true");
    assert.ok(menu, fieldCell);
    const editor = harness.createdElements.find((element) => element.getAttribute("data-okf-frontmatter-editor") !== null);
    assert.ok(editor, fieldCell);
    assert.equal(menu.parentElement, editor, fieldCell);
    assert.equal(editor.childElements[editor.childElements.length - 1], menu, fieldCell);
    assert.notEqual(menu.parentElement, harness.body, fieldCell);
    assert.equal(menu.getAttribute("data-placement"), null, fieldCell);
    assert.equal(menu.style.getPropertyValue("--sphinx-preview-frontmatter-menu-top"), "", fieldCell);
    assert.equal(menu.style.getPropertyValue("--sphinx-preview-frontmatter-menu-left"), "", fieldCell);
    const labels = harness.createdElements
      .filter((element) => element.className === "sphinx-preview-frontmatter-menu-label")
      .map((element) => element.textContent);
    assert.deepEqual(labels, ["Add field", "Remove field", "Add"], fieldCell);
    harness.windowState.scrollY = 50;
    harness.dispatchWindow("scroll");
    harness.dispatchWindow("resize");
    assert.equal(menu.style.getPropertyValue("--sphinx-preview-frontmatter-menu-top"), "", fieldCell);
    assert.equal(menu.parentElement, editor, fieldCell);
  }
});

test("frontmatter blur toward the field actions does not save", () => {
  type Harness = ReturnType<typeof createRuntimeHarness>;
  const saves = (harness: Harness) =>
    harness.messages.filter((message) => message.type === "previewFrontmatterSave");
  const open = (harness: Harness, target: unknown) => {
    harness.editModeButton.dispatch("click");
    harness.dispatchDocument("click", {
      target,
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
    });
  };
  const operation = (harness: Harness, name: string) =>
    harness.createdElements.find((element) =>
      element.getAttribute("data-okf-frontmatter-operation") === name);

  // value editor
  const valueHarness = createRuntimeHarness({ mapFrontmatter: true });
  valueHarness.frontmatterRow.setAttribute("data-okf-type", "text");
  valueHarness.frontmatterRow.setAttribute("data-okf-value", '"Core"');
  open(valueHarness, valueHarness.frontmatterValueCell);
  const valueControl = valueHarness.createdElements.find((element) => element.tagName === "TEXTAREA");
  const valueEditor = valueHarness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") !== null);
  const valueAdd = operation(valueHarness, "add");
  assert.ok(valueControl && valueEditor && valueAdd);
  valueControl.value = "Changed";
  valueControl.dispatch("blur", { relatedTarget: valueAdd });
  assert.equal(saves(valueHarness).length, 0);
  assert.equal(valueAdd.parentElement?.parentElement, valueEditor);
  valueControl.dispatch("blur", { relatedTarget: null });
  assert.equal(saves(valueHarness).length, 1);

  // key editor
  const keyHarness = createRuntimeHarness({ mapFrontmatter: true });
  open(keyHarness, keyHarness.frontmatterNameCell);
  const keyInput = keyHarness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter key lifecycle");
  const keyAdd = operation(keyHarness, "add");
  assert.ok(keyInput && keyAdd);
  keyInput.value = "stage";
  keyInput.dispatch("blur", { relatedTarget: keyAdd });
  assert.equal(saves(keyHarness).length, 0);
  keyInput.dispatch("blur", { relatedTarget: null });
  assert.equal(saves(keyHarness).length, 1);

  // list editor: focusout toward the picker
  const listHarness = createRuntimeHarness({ mapFrontmatter: true });
  listHarness.frontmatterRow.setAttribute("data-okf-type", "list");
  listHarness.frontmatterRow.setAttribute("data-okf-value", '["one","two"]');
  listHarness.frontmatterRow.setAttribute("data-okf-value-yaml", "- one\n- two\n");
  open(listHarness, listHarness.frontmatterValueCell);
  const listEditor = listHarness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") !== null);
  const picker = listHarness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter field to add");
  const firstItem = listHarness.createdElements.find((element) =>
    element.getAttribute("data-okf-list-item-input") !== null);
  assert.ok(listEditor && picker && firstItem);
  firstItem.value = "one updated";
  listEditor.dispatch("focusout", { relatedTarget: picker });
  assert.equal(saves(listHarness).length, 0);
  listEditor.dispatch("focusout", { relatedTarget: null });
  assert.equal(saves(listHarness).length, 1);
});

test("frontmatter text values open a one-row textarea", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.frontmatterRow.setAttribute("data-okf-type", "text");
  harness.frontmatterRow.setAttribute("data-okf-value", '"Core"');
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  assert.equal(textarea.getAttribute("data-okf-text-value"), "true");
  assert.equal(textarea.rows, 1);
});

test("frontmatter field toolbar adds and removes fields", () => {
  const addHarness = createRuntimeHarness({ mapFrontmatter: true });
  addHarness.editModeButton.dispatch("click");
  addHarness.dispatchDocument("click", {
    target: addHarness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const addButton = addHarness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-operation") === "add");
  assert.ok(addButton);
  assert.equal(addButton.getAttribute("title"), "Add frontmatter field");
  assert.equal(addButton.getAttribute("data-tooltip"), "Add frontmatter field");
  const menu = addHarness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-menu") === "true");
  assert.ok(menu);
  assert.equal(menu.getAttribute("data-placement"), null);
  assert.equal(menu.style.getPropertyValue("--sphinx-preview-frontmatter-menu-top"), "");
  const fieldPicker = addHarness.createdElements.find((element) =>
    element.className === "sphinx-preview-frontmatter-picker");
  assert.ok(fieldPicker);
  assert.equal(fieldPicker.getAttribute("hidden"), "");
  addButton.dispatch("click");
  assert.equal(fieldPicker.getAttribute("hidden"), null);
  const fieldControl = addHarness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter field to add");
  assert.ok(fieldControl);
  assert.equal(fieldControl.tagName, "SELECT");
  assert.deepEqual(fieldControl.childElements.map((option) => option.value), ["", "status", "owner", "__custom__"]);
  fieldControl.value = "status";
  fieldControl.dispatch("change");
  const confirmAdd = addHarness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-operation") === "confirm-add");
  assert.ok(confirmAdd);
  assert.equal(confirmAdd.getAttribute("title"), "Add selected frontmatter field");
  assert.equal(confirmAdd.getAttribute("data-tooltip"), "Add selected frontmatter field");
  assert.equal(confirmAdd.disabled, false);
  confirmAdd.dispatch("click");
  const addMessage = addHarness.messages.at(-1);
  assert.equal(addMessage?.frontmatterAction, "add");
  assert.equal(addMessage?.fieldName, "status");
  assert.equal(addMessage?.fieldValue, "draft");

  const removeHarness = createRuntimeHarness({ mapFrontmatter: true });
  removeHarness.editModeButton.dispatch("click");
  removeHarness.dispatchDocument("click", {
    target: removeHarness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const removeButton = removeHarness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-operation") === "remove");
  assert.ok(removeButton);
  assert.equal(removeButton.getAttribute("title"), "Remove frontmatter field");
  assert.equal(removeButton.getAttribute("data-tooltip"), "Remove frontmatter field");
  removeButton.dispatch("click");
  const removeMessage = removeHarness.messages.at(-1);
  assert.equal(removeMessage?.frontmatterAction, "remove");
  assert.equal(removeMessage?.fieldName, "lifecycle");
  assert.equal(Object.prototype.hasOwnProperty.call(removeMessage ?? {}, "fieldValue"), false);
});

test("empty enum values show an explicit placeholder", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.frontmatterRow.setAttribute("data-okf-value", "null");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const select = harness.createdElements.find((element) => element.tagName === "SELECT");
  assert.ok(select);
  assert.equal(select.getAttribute("data-okf-empty-select"), "true");
  assert.equal(select.childElements[0]?.textContent, "Choose a value...");
});

test("schema-free frontmatter values use a generic YAML editor", () => {
  const harness = createRuntimeHarness();
  const valueYaml = "owner: platform\nlabels:\n  - alpha\n";
  harness.frontmatterRow.setAttribute("data-okf-schema-found", "false");
  harness.frontmatterRow.setAttribute("data-okf-type", "unknown");
  harness.frontmatterRow.setAttribute("data-okf-value", '{"owner":"platform","labels":["alpha"]}');
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", valueYaml);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  assert.equal(textarea.value, valueYaml);
  assert.equal(textarea.rows, 4);
  assert.ok(harness.createdElements.some((element) =>
    element.getAttribute("data-okf-frontmatter-operation") === "add"));
  let enterPrevented = false;
  textarea.dispatch("keydown", {
    key: "Enter",
    preventDefault: () => { enterPrevented = true; },
  });
  assert.equal(enterPrevented, false);
  assert.equal(harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);
  textarea.value = "owner: experience\nlabels:\n  - beta\n";
  textarea.dispatch("blur");

  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewFrontmatterSave");
  assert.equal(save?.fieldValueFormat, "yaml");
  assert.equal(save?.fieldValue, textarea.value);

  let prevented = false;
  harness.dispatchDocument("keydown", {
    key: "Enter",
    target: textarea,
    preventDefault: () => { prevented = true; },
  });
  assert.equal(prevented, false);
});

test("text frontmatter values use a wrapping textarea that grows with its content", () => {
  const harness = createRuntimeHarness();
  const longValue = "A long frontmatter value that needs to wrap. ".repeat(20);
  harness.frontmatterRow.setAttribute("data-okf-type", "text");
  harness.frontmatterRow.setAttribute("data-okf-value", JSON.stringify(longValue));
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", `${longValue}\n`);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  assert.equal(textarea.value, longValue);
  assert.equal(textarea.getAttribute("data-okf-text-value"), "true");
  assert.equal(textarea.style.height, `${textarea.scrollHeight}px`);

  textarea.scrollHeight = 3_000;
  textarea.dispatch("input");
  assert.equal(textarea.style.height, "3000px");

  textarea.scrollHeight = 4_000;
  harness.dispatchWindow("resize");
  harness.flushFrames();
  assert.equal(textarea.style.height, "4000px");
});

function openTextFieldEditor(value: string): {
  harness: ReturnType<typeof createRuntimeHarness>;
  textarea: ReturnType<typeof createRuntimeHarness>["createdElements"][number];
} {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "text");
  harness.frontmatterRow.setAttribute("data-okf-value", JSON.stringify(value));
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", `${value}\n`);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  return { harness, textarea };
}

function frontmatterSaves(harness: ReturnType<typeof createRuntimeHarness>): Array<Record<string, unknown>> {
  return harness.messages.filter((message) => message.type === "previewFrontmatterSave");
}

test("Enter saves a one-line frontmatter text field and Shift+Enter does not", () => {
  const { harness, textarea } = openTextFieldEditor("Alpha");
  assert.equal(textarea.getAttribute("aria-keyshortcuts"), "Enter Shift+Enter");
  assert.equal(textarea.getAttribute("title"), "Enter saves \u00b7 Shift+Enter adds a line");

  textarea.value = "Beta";
  let shiftPrevented = false;
  textarea.dispatch("keydown", {
    key: "Enter",
    shiftKey: true,
    preventDefault: () => { shiftPrevented = true; },
  });
  assert.equal(shiftPrevented, false);
  assert.equal(frontmatterSaves(harness).length, 0);

  let prevented = false;
  textarea.dispatch("keydown", {
    key: "Enter",
    preventDefault: () => { prevented = true; },
  });
  assert.equal(prevented, true);
  const saves = frontmatterSaves(harness);
  assert.equal(saves.length, 1);
  assert.equal(saves[0]?.fieldValue, "Beta");
});

test("Enter in a multi-line frontmatter text value inserts a line; Cmd/Ctrl+Enter saves", () => {
  const { harness, textarea } = openTextFieldEditor("Alpha");
  textarea.value = "a\nb";
  let prevented = false;
  textarea.dispatch("keydown", {
    key: "Enter",
    preventDefault: () => { prevented = true; },
  });
  assert.equal(prevented, false);
  assert.equal(frontmatterSaves(harness).length, 0);

  textarea.dispatch("keydown", { key: "Enter", metaKey: true, preventDefault: () => undefined });
  const saves = frontmatterSaves(harness);
  assert.equal(saves.length, 1);
  assert.equal(saves[0]?.fieldValue, "a\nb");
});

test("saving a frontmatter text field strips trailing line breaks unless the original had one", () => {
  const { harness, textarea } = openTextFieldEditor("Alpha");
  textarea.value = "Beta\n";
  textarea.dispatch("blur", {});
  const saves = frontmatterSaves(harness);
  assert.equal(saves.length, 1);
  assert.equal(saves[0]?.fieldValue, "Beta");

  const kept = openTextFieldEditor("Alpha\n");
  kept.textarea.value = "Beta\n";
  kept.textarea.dispatch("blur", {});
  assert.equal(frontmatterSaves(kept.harness)[0]?.fieldValue, "Beta\n");
});

test("Enter in the YAML frontmatter editor inserts a line; Cmd/Ctrl+Enter saves", () => {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "unknown");
  harness.frontmatterRow.setAttribute("data-okf-value", JSON.stringify({ a: 1 }));
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "a: 1\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.value = "a: 2\n";
  let prevented = false;
  textarea.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(frontmatterSaves(harness).length, 0);

  textarea.dispatch("keydown", { key: "Enter", ctrlKey: true, preventDefault: () => undefined });
  const saves = frontmatterSaves(harness);
  assert.equal(saves.length, 1);
  assert.equal(saves[0]?.fieldValueFormat, "yaml");
});

test("Escape cancels an unsaved frontmatter value edit", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });

  const select = harness.createdElements.find((element) => element.tagName === "SELECT");
  assert.ok(select);
  select.value = "active";
  select.dispatch("change");
  assert.equal(harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);
  let prevented = false;
  select.dispatch("keydown", {
    key: "Escape",
    preventDefault: () => { prevented = true; },
  });
  select.dispatch("blur");

  assert.equal(prevented, true);
  assert.equal(harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);
  assert.equal(harness.frontmatterValueDisplay.getAttribute("hidden"), null);
  assert.equal(harness.refreshButton.disabled, false);
});

test("frontmatter cells open their field editor with the keyboard in edit mode", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.editModeButton.dispatch("click");
  let prevented = false;
  harness.dispatchDocument("keydown", {
    key: "Enter",
    target: harness.frontmatterNameCell,
    preventDefault: () => { prevented = true; },
  });

  assert.equal(prevented, true);
  assert.ok(harness.createdElements.some((element) =>
    element.getAttribute("aria-label") === "Frontmatter key lifecycle"));
});

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
  harness.dispatchDocument("dblclick", { target: harness.mappings[1] });
  assert.equal(harness.messages.at(-1)?.activation, "click");

  const enabledHarness = createRuntimeHarness({ doubleClickToSwitchToEditor: true });
  enabledHarness.dispatchDocument("dblclick", { target: enabledHarness.mappings[1] });
  assert.equal(enabledHarness.messages.at(-1)?.activation, "double-click");

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

interface ClickEvent {
  target: RuntimeElement;
  defaultPrevented: boolean;
  immediatePropagationStopped: boolean;
  preventDefault(): void;
  stopImmediatePropagation(): void;
}

function clickEvent(target: RuntimeElement): ClickEvent {
  return {
    target,
    defaultPrevented: false,
    immediatePropagationStopped: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopImmediatePropagation() {
      this.immediatePropagationStopped = true;
    },
  };
}

test("clicking a checkbox posts a source toggle instead of revealing the block", () => {
  const harness = createRuntimeHarness();
  const messageCount = harness.messages.length;
  harness.checkbox.checked = true; // the browser flips the box before dispatching the click
  const event = clickEvent(harness.checkbox);
  harness.dispatchDocument("click", event);

  assert.equal(event.defaultPrevented, false);
  assert.equal(event.immediatePropagationStopped, true);
  const posted = harness.messages.slice(messageCount);
  assert.deepEqual(posted.map((message) => message.type), ["previewCheckboxToggle"]);
  assert.equal(posted[0].line, 51);
  assert.equal(posted[0].endLine, 51);
  assert.equal(posted[0].column, 2);
  assert.equal(posted[0].checked, true);
  assert.equal(posted[0].revision, 7);
  assert.equal(harness.checkbox.getAttribute("aria-busy"), "true");

  harness.dispatchMessage({
    type: "previewCheckboxResult",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: posted[0].editId,
    saved: true,
  });
  assert.equal(harness.checkbox.getAttribute("aria-busy"), null);
  assert.equal(harness.checkbox.checked, true);
});

test("a rejected checkbox toggle reverts the box and explains why", () => {
  const harness = createRuntimeHarness();
  harness.checkbox.checked = true;
  harness.dispatchDocument("click", clickEvent(harness.checkbox));
  harness.dispatchMessage({
    type: "previewCheckboxResult",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    error: "The preview is out of date. Try again once it has refreshed.",
  });
  assert.equal(harness.checkbox.checked, false);
  assert.equal(harness.checkbox.getAttribute("aria-busy"), null);
  assert.match(harness.checkbox.getAttribute("title") ?? "", /out of date/u);
});

test("in edit mode a checkbox click toggles the box without opening a block editor", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  const messageCount = harness.messages.length;
  harness.checkbox.checked = true;
  harness.dispatchDocument("click", clickEvent(harness.checkbox));
  assert.deepEqual(harness.messages.slice(messageCount).map((message) => message.type), ["previewCheckboxToggle"]);
  assert.equal(
    harness.createdElements.some((element) => element.getAttribute("data-sphinx-preview-block-editor") !== null),
    false,
  );
});

test("a checkbox click is refused while a block editor is open", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  const messageCount = harness.messages.length;
  harness.checkbox.checked = true;
  const event = clickEvent(harness.checkbox);
  harness.dispatchDocument("click", event);
  assert.equal(event.defaultPrevented, true, "the browser must undo the visual toggle");
  assert.equal(harness.messages.length, messageCount);
  const status = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-preview-edit-status") !== null);
  assert.match(status?.textContent ?? "", /before toggling a checkbox/u);
});

test("checkboxes are disabled when the preview cannot edit the document", () => {
  const harness = createRuntimeHarness({ editingEnabled: false });
  assert.equal(harness.checkbox.disabled, true);
  assert.match(harness.checkbox.getAttribute("title") ?? "", /trusted workspace/u);
  const messageCount = harness.messages.length;
  const event = clickEvent(harness.checkbox);
  harness.dispatchDocument("click", event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(harness.messages.length, messageCount);
});

test("typing is saved once after the autosave delay, carrying the last text", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  for (const text of ["S", "Se", "Sec", "Seco", "Second"]) {
    textarea.value = text;
    textarea.dispatch("input");
  }
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewEditSave"), false);
  harness.flushTimers();
  const saves = harness.messages.slice(before).filter((message) => message.type === "previewEditSave");
  assert.equal(saves.length, 1);
  assert.equal(saves[0].final, false);
  assert.equal(saves[0].editedText, "Second\n");
});

test("pagehide flushes a pending autosave without waiting for the timer", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  textarea.value = "Typed";
  textarea.dispatch("input");
  harness.dispatchWindow("pagehide");
  const saves = harness.messages.slice(before).filter((message) => message.type === "previewEditSave");
  assert.equal(saves.length, 1);
  assert.equal(saves[0].final, false);
  assert.equal(saves[0].editedText, "Typed\n");
  assert.equal(harness.pendingTimerCount(), 0);
});

test("visibilitychange to hidden flushes a pending autosave without waiting for the timer", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  textarea.value = "Typed";
  textarea.dispatch("input");
  harness.setVisibilityState("hidden");
  harness.dispatchDocument("visibilitychange", {});
  const saves = harness.messages.slice(before).filter((message) => message.type === "previewEditSave");
  assert.equal(saves.length, 1);
  assert.equal(saves[0].final, false);
  assert.equal(saves[0].editedText, "Typed\n");
  assert.equal(harness.pendingTimerCount(), 0);
});

test("hide events post nothing when no edit is pending or the page stays visible", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  harness.dispatchWindow("pagehide");
  harness.setVisibilityState("hidden");
  harness.dispatchDocument("visibilitychange", {});
  textarea.value = "Typed";
  textarea.dispatch("input");
  harness.setVisibilityState("visible");
  harness.dispatchDocument("visibilitychange", {});
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewEditSave"), false);
  harness.flushTimers();
});

test("blur after typing posts one final save and clears the autosave timer", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  textarea.value = "Typed";
  textarea.dispatch("input");
  textarea.dispatch("blur");
  assert.equal(harness.pendingTimerCount(), 0);
  harness.flushTimers();
  const saves = harness.messages.slice(before).filter((message) => message.type === "previewEditSave");
  assert.equal(saves.length, 1);
  assert.equal(saves[0].final, true);
  assert.equal(saves[0].editedText, "Typed\n");
});

test("switching table cells posts the pending change immediately", () => {
  const harness = createRuntimeHarness();
  const table = new RuntimeElement({
    "data-sphinx-source-end-line": "23",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
  }, harness.windowState, 100, 100, "table");
  const cells = [0, 1, 2].map((rowIndex) => {
    const row = new RuntimeElement({}, harness.windowState, 100, 30, "tr");
    row.rowIndex = rowIndex;
    table.appendChild(row);
    return [0, 1].map((columnIndex) => {
      const cell = new RuntimeElement({}, harness.windowState, 100, 30, rowIndex === 0 ? "th" : "td");
      cell.cellIndex = columnIndex;
      row.appendChild(cell);
      return cell;
    });
  });
  const click = (cell: RuntimeElement): void => harness.dispatchDocument("click", {
    target: cell,
    preventDefault: () => undefined,
  });
  const input = (): RuntimeElement => {
    const control = harness.createdElements.filter((element) =>
      element.getAttribute("aria-label") === "Markdown table cell").at(-1);
    assert.ok(control);
    return control;
  };
  harness.editModeButton.dispatch("click");
  click(cells[1][0]);
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "| A | B |\n| --- | --- |\n| x | y |\n| p | q |\n",
  });
  input().value = "edited x";
  input().dispatch("input");
  const before = harness.messages.length;
  click(cells[2][1]);
  const saves = harness.messages.slice(before).filter((message) => message.type === "previewEditSave");
  assert.equal(saves.length, 1);
  assert.equal(saves[0].final, false);
  assert.match(String(saves[0].editedText), /\| edited x \| y \|/u);
  assert.equal(harness.pendingTimerCount(), 0);
});

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

function addOkfLink(harness: RuntimeHarness): RuntimeElement {
  const link = new RuntimeElement(
    { "data-sphinx-preview-navigation": "okf-link:abc", class: "okf-frontmatter-link" },
    harness.windowState, 0, 20, "a");
  harness.frontmatterValueDisplay.appendChild(link);
  return link;
}

function t21ClickEvent(target: RuntimeElement, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const event: Record<string, unknown> = {
    target,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
    stopImmediatePropagation: () => { event.immediatePropagationStopped = true; },
    ...extra,
  };
  return event;
}

function openedFrontmatterEditors(harness: RuntimeHarness): RuntimeElement[] {
  return harness.createdElements.filter((element) =>
    element.getAttribute("data-okf-frontmatter-editor") === "true");
}

test("T21: in edit mode a plain click on an okf link opens the field editor and does not navigate", () => {
  const harness = createRuntimeHarness();
  const link = addOkfLink(harness);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", t21ClickEvent(link));
  assert.equal(openedFrontmatterEditors(harness).length, 1);
  assert.equal(harness.messages.some((message) => message.type === "previewLink"), false);
});

test("T21: Cmd or Ctrl click on an okf link in edit mode still navigates", () => {
  for (const modifier of [{ metaKey: true }, { ctrlKey: true }]) {
    const harness = createRuntimeHarness();
    const link = addOkfLink(harness);
    harness.editModeButton.dispatch("click");
    harness.dispatchDocument("click", t21ClickEvent(link, modifier));
    assert.equal(openedFrontmatterEditors(harness).length, 0);
    assert.equal(harness.messages.filter((message) => message.type === "previewLink").length, 1);
  }
});

test("T21: in reading mode a click on an okf link navigates", () => {
  const harness = createRuntimeHarness();
  const link = addOkfLink(harness);
  harness.dispatchDocument("click", t21ClickEvent(link));
  assert.equal(openedFrontmatterEditors(harness).length, 0);
  const posted = harness.messages.find((message) => message.type === "previewLink");
  assert.equal(posted?.request, "okf-link:abc");
});

interface ListHarness {
  harness: RuntimeHarness;
  rows: () => RuntimeElement[];
  inputs: () => RuntimeElement[];
  editor: RuntimeElement;
  addButton: RuntimeElement;
}

function openListEditor(values: string, suggestions?: string): ListHarness {
  const harness = createRuntimeHarness();
  if (suggestions !== undefined) harness.frontmatterRow.setAttribute("data-okf-link-suggestions", suggestions);
  harness.frontmatterRow.setAttribute("data-okf-type", "list");
  harness.frontmatterRow.setAttribute("data-okf-value", values);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", t21ClickEvent(harness.frontmatterValueCell));
  const editor = openedFrontmatterEditors(harness)[0];
  assert.ok(editor);
  const itemList = harness.createdElements.find((element) => element.className === "okf-list-editor-items");
  assert.ok(itemList);
  const addButton = harness.createdElements.find((element) => element.getAttribute("aria-label") === "Add list item");
  assert.ok(addButton);
  return {
    harness,
    editor,
    addButton,
    rows: () => itemList.childElements,
    inputs: () => itemList.childElements.map((row) => row.querySelector("[data-okf-list-item-input]")!),
  };
}

function recordFocus<T>(body: (focused: RuntimeElement[]) => T): T {
  const focused: RuntimeElement[] = [];
  const original = RuntimeElement.prototype.focus;
  RuntimeElement.prototype.focus = function (this: RuntimeElement, options?: FocusOptions): void {
    focused.push(this);
    original.call(this, options);
  };
  try {
    return body(focused);
  } finally {
    RuntimeElement.prototype.focus = original;
  }
}

const noop = (): void => undefined;

test("T21: Enter in a list item inserts an empty item after it, focuses it, and does not save", () => {
  recordFocus((focused) => {
    const list = openListEditor('["one","two"]');
    focused.length = 0;
    list.inputs()[0]!.dispatch("keydown", { key: "Enter", preventDefault: noop });
    assert.deepEqual(list.inputs().map((input) => input.value), ["one", "", "two"]);
    assert.equal(focused.at(-1), list.inputs()[1]);
    assert.equal(list.harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);
    assert.equal(list.inputs()[1]!.getAttribute("aria-label"), "List item 2");
    assert.equal(list.inputs()[2]!.getAttribute("aria-label"), "List item 3");
  });
});

test("T21: Enter in an empty last list item removes it and saves the list", () => {
  const list = openListEditor('["one"]');
  list.inputs()[0]!.dispatch("keydown", { key: "Enter", preventDefault: noop });
  list.inputs()[1]!.value = "two";
  list.inputs()[1]!.dispatch("keydown", { key: "Enter", preventDefault: noop });
  assert.equal(list.inputs().length, 3);
  list.inputs()[2]!.dispatch("keydown", { key: "Enter", preventDefault: noop });
  const save = list.harness.messages.at(-1);
  assert.equal(save?.type, "previewFrontmatterSave");
  assert.equal(JSON.stringify(save?.fieldValue), '["one","two"]');
});

test("T21: Backspace in an empty middle list item removes it and focuses the previous input", () => {
  recordFocus((focused) => {
    const list = openListEditor('["one","","three"]');
    const [first, middle, last] = list.inputs();
    focused.length = 0;
    middle!.selectionStart = 0;
    middle!.dispatch("keydown", { key: "Backspace", preventDefault: noop });
    assert.deepEqual(list.inputs().map((input) => input.value), ["one", "three"]);
    assert.equal(focused[0], first);
    assert.deepEqual(first!.selectionRange, [3, 3]);
    assert.equal(list.harness.messages.some((message) => message.type === "previewFrontmatterSave"), false);
    assert.equal(list.inputs()[1], last);
  });
});

test("T21: Backspace in an empty first item focuses the next input, and in the only item the add button", () => {
  recordFocus((focused) => {
    const list = openListEditor('["","two"]');
    const [first, second] = list.inputs();
    focused.length = 0;
    first!.dispatch("keydown", { key: "Backspace", preventDefault: noop });
    assert.equal(focused[0], second);
    second!.value = "";
    focused.length = 0;
    second!.dispatch("keydown", { key: "Backspace", preventDefault: noop });
    assert.equal(focused[0], list.addButton);
    assert.equal(list.inputs().length, 0);
  });
});

test("T21: Backspace in a non-empty list item is left to the browser", () => {
  const list = openListEditor('["one","two"]');
  let prevented = false;
  list.inputs()[1]!.dispatch("keydown", { key: "Backspace", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(list.inputs().length, 2);
});

test("T21: Cmd or Ctrl+Enter in a list item saves the list", () => {
  for (const modifier of [{ metaKey: true }, { ctrlKey: true }]) {
    const list = openListEditor('["one"]');
    list.inputs()[0]!.value = "uno";
    list.inputs()[0]!.dispatch("keydown", { key: "Enter", preventDefault: noop, ...modifier });
    const save = list.harness.messages.at(-1);
    assert.equal(save?.type, "previewFrontmatterSave");
    assert.equal(JSON.stringify(save?.fieldValue), '["uno"]');
  }
});

test("T21: Enter while composing or with Shift does not touch the list", () => {
  const list = openListEditor('["one"]');
  list.inputs()[0]!.dispatch("keydown", { key: "Enter", isComposing: true, preventDefault: noop });
  list.inputs()[0]!.dispatch("keydown", { key: "Enter", shiftKey: true, preventDefault: noop });
  assert.equal(list.inputs().length, 1);
});

function listStatus(list: ListHarness): RuntimeElement {
  const status = list.harness.createdElements.find((element) => element.getAttribute("role") === "status");
  assert.ok(status);
  return status;
}

test("T22: list inputs get the datalist of link suggestions, new items included", () => {
  const list = openListEditor('["StRS-A"]', '["StRS-A","StRS-B"]');
  const datalist = list.harness.createdElements.find((element) => element.tagName === "DATALIST"
    && element.getAttribute("id")?.startsWith("okf-frontmatter-link-options-"));
  assert.ok(datalist);
  assert.deepEqual(datalist.childElements.map((option) => option.getAttribute("value")), ["StRS-A", "StRS-B"]);
  assert.equal(list.inputs()[0]!.getAttribute("list"), datalist.getAttribute("id"));
  list.addButton.dispatch("click");
  assert.equal(list.inputs()[1]!.getAttribute("list"), datalist.getAttribute("id"));
});

test("T22: without or with an invalid suggestions attribute the inputs have no list", () => {
  for (const suggestions of [undefined, "not json", "{}", "[]"]) {
    const list = openListEditor('["a"]', suggestions);
    assert.equal(list.inputs()[0]!.getAttribute("list"), null);
  }
});

test("T22: an unknown value warns, a known or empty value clears the warning", () => {
  const list = openListEditor('[""]', '["StRS-B"]');
  const input = list.inputs()[0]!;
  const status = listStatus(list);
  input.value = "StRS-BX";
  input.dispatch("input", {});
  assert.equal(input.getAttribute("aria-invalid"), "true");
  assert.equal(status.getAttribute("data-state"), "warning");
  assert.equal(status.getAttribute("data-visible"), "true");
  assert.equal(status.textContent, 'No Markdown file named "StRS-BX.md" was found. It will be saved as typed.');
  input.value = "StRS-B";
  input.dispatch("input", {});
  assert.equal(input.getAttribute("aria-invalid"), null);
  assert.equal(status.getAttribute("data-state"), null);
  assert.equal(status.getAttribute("data-visible"), null);
  input.value = "X";
  input.dispatch("input", {});
  assert.equal(status.getAttribute("data-state"), "warning");
  input.value = "";
  input.dispatch("input", {});
  assert.equal(input.getAttribute("aria-invalid"), null);
  assert.equal(status.getAttribute("data-state"), null);
});

test("T22: saving a list with an unknown value still posts the save", () => {
  const list = openListEditor('["StRS-B"]', '["StRS-B"]');
  const input = list.inputs()[0]!;
  input.value = "StRS-BX";
  input.dispatch("input", {});
  input.dispatch("keydown", { key: "Enter", metaKey: true, preventDefault: noop });
  const save = list.harness.messages.at(-1);
  assert.equal(save?.type, "previewFrontmatterSave");
  assert.equal(JSON.stringify(save?.fieldValue), '["StRS-BX"]');
});

function openFrontmatterValueEditor(harness: ReturnType<typeof createRuntimeHarness>): void {
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
}

test("T24: Remove field is disabled with a tooltip on a required row", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.frontmatterRow.setAttribute("data-okf-required", "true");
  openFrontmatterValueEditor(harness);
  const removeButton = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-operation") === "remove");
  assert.ok(removeButton);
  const tooltip = "Required by the schema; it cannot be removed";
  assert.equal(removeButton.disabled, true);
  assert.equal(removeButton.getAttribute("title"), tooltip);
  assert.equal(removeButton.getAttribute("aria-label"), tooltip);
  assert.equal(removeButton.getAttribute("data-tooltip"), tooltip);
});

test("T24: Remove field stays enabled on an optional row", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  openFrontmatterValueEditor(harness);
  const removeButton = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-operation") === "remove");
  assert.ok(removeButton);
  assert.notEqual(removeButton.disabled, true);
  assert.equal(removeButton.getAttribute("title"), "Remove frontmatter field");
});

test("T24: choosing a field in the picker adds it right after the open row", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  openFrontmatterValueEditor(harness);
  const select = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter field to add");
  assert.ok(select);
  select.value = "owner";
  select.dispatch("change");
  const message = harness.messages.at(-1);
  assert.equal(message?.type, "previewFrontmatterSave");
  assert.equal(message?.frontmatterAction, "add");
  assert.equal(message?.fieldName, "owner");
  assert.equal(message?.fieldValue, "");
  assert.equal(message?.afterField, "lifecycle");
  const confirm = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-operation") === "confirm-add");
  assert.equal(confirm?.hidden, true);
});

test("T24: the text-input picker adds on Enter with afterField", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.frontmatterRow.closest("[data-okf-properties]")?.setAttribute("data-okf-available-fields", "[]");
  openFrontmatterValueEditor(harness);
  const input = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter field to add");
  assert.ok(input);
  assert.equal(input.tagName, "INPUT");
  input.value = "custom";
  let prevented = false;
  input.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented = true; } });
  const message = harness.messages.at(-1);
  assert.equal(message?.frontmatterAction, "add");
  assert.equal(message?.fieldName, "custom");
  assert.equal(message?.afterField, "lifecycle");
  assert.equal(prevented, true);
});

function customKeyHarness(attributes: Record<string, string> = {}) {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  const section = harness.frontmatterRow.closest("[data-okf-properties]");
  for (const [name, value] of Object.entries(attributes)) section?.setAttribute(name, value);
  openFrontmatterValueEditor(harness);
  const select = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter field to add");
  assert.ok(select);
  const options = () => harness.createdElements.filter((element) =>
    element.tagName === "OPTION" && element.parentElement === select);
  const customInput = () => harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "New field name");
  const status = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-status") !== null
    || element.getAttribute("role") === "status");
  return { harness, select, options, customInput, status };
}

test("T25: the picker offers Custom key only when additional properties are allowed", () => {
  const allowed = customKeyHarness();
  assert.deepEqual(allowed.options().map((option) => option.value).slice(-1), ["__custom__"]);
  assert.equal(allowed.options().at(-1)?.textContent, "Custom key\u2026");
  const forbidden = customKeyHarness({ "data-okf-additional-properties": "false" });
  assert.equal(forbidden.options().some((option) => option.value === "__custom__"), false);
});

test("T25: choosing Custom key shows the name input and posts nothing", () => {
  const { harness, select, customInput } = customKeyHarness();
  const before = harness.messages.length;
  select.value = "__custom__";
  select.dispatch("change");
  assert.ok(customInput());
  assert.equal(harness.messages.length, before);
});

test("T25: Enter in the custom key input adds the field with an empty value", () => {
  const { harness, select, customInput } = customKeyHarness();
  select.value = "__custom__";
  select.dispatch("change");
  const input = customInput()!;
  input.value = "reviewer";
  input.dispatch("keydown", { key: "Enter", preventDefault: noop });
  const message = harness.messages.at(-1);
  assert.equal(message?.type, "previewFrontmatterSave");
  assert.equal(message?.frontmatterAction, "add");
  assert.equal(message?.fieldName, "reviewer");
  assert.equal(message?.fieldValue, "");
  assert.equal(message?.afterField, "lifecycle");
  assert.equal(JSON.stringify(harness.getWebviewState().pendingFrontmatterEdit), '{"fieldName":"reviewer","requestId":11}');
});

test("T25: an invalid custom key shows an error and posts nothing", () => {
  for (const name of ["", "  ", " lead", "trail ", "two\nlines", "lifecycle"]) {
    const { harness, select, customInput } = customKeyHarness();
    select.value = "__custom__";
    select.dispatch("change");
    const before = harness.messages.length;
    const input = customInput()!;
    input.value = name;
    input.dispatch("keydown", { key: "Enter", preventDefault: noop });
    assert.equal(harness.messages.length, before, JSON.stringify(name));
    const errors = harness.createdElements.filter((element) =>
      element.getAttribute("data-state") === "error" && element.textContent.length > 0);
    assert.equal(errors.length, 1, JSON.stringify(name));
    assert.equal(harness.getWebviewState().pendingFrontmatterEdit, undefined);
  }
});

test("T25: a pending frontmatter edit opens the editor of the new field and clears the state once it closes", () => {
  const harness = createRuntimeHarness({
    mapFrontmatter: true,
    savedState: { editMode: true, pendingFrontmatterEdit: { fieldName: "lifecycle" } },
  });
  const select = harness.createdElements.find((element) => element.tagName === "SELECT"
    && element.getAttribute("aria-label") !== "Frontmatter field to add");
  assert.ok(select, "the editor of the new field is open");
  assert.equal(JSON.stringify(harness.getWebviewState().pendingFrontmatterEdit), '{"fieldName":"lifecycle"}',
    "kept while the editor is open, so that a repeated load of the same render opens it again");
  select.dispatch("keydown", { key: "Escape", preventDefault: noop });
  select.dispatch("blur");
  assert.equal(harness.getWebviewState().pendingFrontmatterEdit, undefined);
});

test("T25: a pending frontmatter edit outside edit mode or for a missing row is dropped", () => {
  for (const savedState of [
    { editMode: false, pendingFrontmatterEdit: { fieldName: "lifecycle" } },
    { editMode: true, pendingFrontmatterEdit: { fieldName: "missing" } },
  ]) {
    const harness = createRuntimeHarness({ mapFrontmatter: true, savedState });
    assert.equal(harness.createdElements.some((element) =>
      element.getAttribute("data-okf-frontmatter-editor") !== null), false);
    assert.equal(harness.getWebviewState().pendingFrontmatterEdit, undefined);
  }
});

test("T25: an error result clears the pending frontmatter edit", () => {
  const { harness, select, customInput } = customKeyHarness();
  select.value = "__custom__";
  select.dispatch("change");
  const input = customInput()!;
  input.value = "reviewer";
  input.dispatch("keydown", { key: "Enter", preventDefault: noop });
  const message = harness.messages.at(-1)!;
  harness.dispatchMessage({
    type: "previewFrontmatterResult",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: message.editId,
    saved: false,
    error: "nope",
  });
  assert.equal(harness.getWebviewState().pendingFrontmatterEdit, undefined);
});

test("T25: a reload of the render that posted the add keeps the pending edit for the next render", () => {
  const harness = createRuntimeHarness({
    mapFrontmatter: true,
    savedState: { editMode: true, pendingFrontmatterEdit: { fieldName: "lifecycle", requestId: 11 } },
  });
  assert.equal(harness.createdElements.some((element) =>
    element.getAttribute("data-okf-frontmatter-editor") !== null), false);
  assert.equal(JSON.stringify(harness.getWebviewState().pendingFrontmatterEdit),
    '{"fieldName":"lifecycle","requestId":11}');
});

test("T25: saving a value from the pending edit's editor consumes the pending edit", () => {
  const harness = createRuntimeHarness({
    mapFrontmatter: true,
    savedState: { editMode: true, pendingFrontmatterEdit: { fieldName: "lifecycle", requestId: "old" } },
  });
  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") !== null);
  assert.ok(editor, "the editor of the new field is open");
  const control = harness.createdElements.find((element) => element.tagName === "SELECT"
    && element.getAttribute("aria-label") !== "Frontmatter field to add")!;
  control.value = "active";
  control.dispatch("blur");
  assert.ok(harness.messages.some((message) => message.type === "previewFrontmatterSave"),
    "the value was posted");
  assert.equal(harness.getWebviewState().pendingFrontmatterEdit, undefined);
});

test("T25: a later render does not reopen an editor that was already opened for the pending edit", () => {
  const first = createRuntimeHarness({
    mapFrontmatter: true,
    savedState: { editMode: true, pendingFrontmatterEdit: { fieldName: "lifecycle", requestId: "old" } },
  });
  assert.ok(first.createdElements.some((element) =>
    element.getAttribute("data-okf-frontmatter-editor") !== null), "opened on the new render");
  const state = first.getWebviewState();
  const second = createRuntimeHarness({
    mapFrontmatter: true,
    savedState: state,
    requestId: 99,
  });
  assert.equal(second.createdElements.some((element) =>
    element.getAttribute("data-okf-frontmatter-editor") !== null), false);
  assert.equal(second.getWebviewState().pendingFrontmatterEdit, undefined);
});

// T28: block insertion points.
const INSERT_POINT_CLASS = "sphinx-preview-insert-point";

function insertPointsOf(harness: RuntimeHarness): RuntimeElement[] {
  return harness.createdElements.filter((element) =>
    element.className.split(" ").includes(INSERT_POINT_CLASS) && !element.removed);
}

function insertPointAfterLine(harness: RuntimeHarness, line: number): RuntimeElement {
  const point = insertPointsOf(harness).find((element) =>
    element.getAttribute("data-sphinx-insert-after-line") === String(line));
  assert.ok(point, `an insertion point after line ${line}`);
  return point;
}

function sourceReply(harness: RuntimeHarness, originalText: string, extra: Record<string, unknown> = {}) {
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText,
    ...extra,
  });
}

test("T28: edit mode adds one insertion point after each top-level block, reading mode none", () => {
  const harness = createRuntimeHarness();
  assert.equal(insertPointsOf(harness).length, 0);
  harness.editModeButton.dispatch("click");
  assert.deepEqual(
    insertPointsOf(harness).map((point) => point.getAttribute("data-sphinx-insert-after-line")),
    ["1", "52", "100"],
  );
  harness.mappings.forEach((block, index) => {
    assert.equal(block.insertedElements.length, 1);
    assert.equal(block.insertedElements[0], insertPointsOf(harness)[index]);
  });
  const button = insertPointAfterLine(harness, 52).childElements[0];
  assert.equal(button.tagName, "BUTTON");
  assert.equal(button.getAttribute("aria-label"), "Insert a block here");
  assert.equal(button.getAttribute("type"), "button");
  assert.equal(button.textContent, "+");
  const first = insertPointsOf(harness);
  harness.editModeButton.dispatch("click");
  assert.equal(insertPointsOf(harness).length, 0);
  assert.ok(first.every((point) => point.removed));
  harness.editModeButton.dispatch("click");
  assert.equal(insertPointsOf(harness).length, 3, "recreated, not duplicated");
});

// T36: move a block up or down from its insertion bar.
const MOVE_LABELS = ["Move the block above up", "Move the block above down"];

function moveButton(harness: RuntimeHarness, afterLine: number, direction: "up" | "down"): RuntimeElement {
  const button = insertPointAfterLine(harness, afterLine).childElements.find((element) =>
    element.getAttribute("data-sphinx-move") === direction);
  assert.ok(button, `a ${direction} button after line ${afterLine}`);
  return button;
}

const plainClick = () => ({ preventDefault: () => undefined, stopPropagation: () => undefined });

test("T36: every body insertion point has up and down buttons, disabled at the ends", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  for (const line of [1, 52, 100]) {
    const buttons = insertPointAfterLine(harness, line).childElements;
    assert.deepEqual(buttons.map((button) => button.textContent), ["+", "\u2191", "\u2193"]);
    assert.deepEqual(buttons.slice(1).map((button) => button.getAttribute("aria-label")), MOVE_LABELS);
    assert.ok(buttons.slice(1).every((button) => button.getAttribute("type") === "button"));
  }
  const disabled = (line: number, direction: "up" | "down") =>
    moveButton(harness, line, direction).getAttribute("disabled") !== null;
  assert.deepEqual([disabled(1, "up"), disabled(1, "down")], [true, false]);
  assert.deepEqual([disabled(52, "up"), disabled(52, "down")], [false, false]);
  assert.deepEqual([disabled(100, "up"), disabled(100, "down")], [false, true]);
});

test("T36: the properties point and the Start writing point have no move buttons", () => {
  const withProperties = createRuntimeHarness({
    mapFrontmatter: true, propertiesMapped: true, savedState: { editMode: true },
  });
  assert.equal(insertPointAfterLine(withProperties, 0).childElements.length, 1);
  const empty = createRuntimeHarness({ emptyBody: true, previewStatus: "success", savedState: { editMode: true } });
  assert.equal(insertPointAfterLine(empty, 0).childElements.length, 1);
});

test("T36: a block from an included file disables its own buttons and the ones toward it", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  harness.mappings[1].setAttribute("data-sphinx-preview-included", "true");
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  const disabled = (line: number, direction: "up" | "down") =>
    moveButton(harness, line, direction).getAttribute("disabled") !== null;
  assert.deepEqual([disabled(1, "down"), disabled(52, "up"), disabled(52, "down"), disabled(100, "up")],
    [true, true, true, true]);
});

test("T36: a click posts the ranges of the block above the bar and of its neighbour", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  moveButton(harness, 52, "down").dispatch("click", plainClick());
  moveButton(harness, 52, "up").dispatch("click", plainClick());
  const moves = harness.messages.slice(before).filter((message) => message.type === "previewBlockMove");
  assert.equal(moves.length, 2);
  assert.deepEqual(
    { ...moves[0], pinViewportTop: typeof moves[0].pinViewportTop },
    {
      type: "previewBlockMove", documentId: "file:///active.md", revision: 7, requestId: 11,
      line: 50, endLine: 52, neighbourLine: 100, neighbourEndLine: 100, direction: "down",
      pinViewportTop: "number",
    },
  );
  assert.equal(moves[0].pinViewportTop, 500);
  assert.deepEqual(
    [moves[1].line, moves[1].endLine, moves[1].neighbourLine, moves[1].neighbourEndLine, moves[1].direction],
    [50, 52, 1, 1, "up"],
  );
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewEditOpen"), false);
});

test("T36: a disabled button posts nothing, and the buttons stand down while an editor is open", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  moveButton(harness, 1, "up").dispatch("click", plainClick());
  moveButton(harness, 100, "down").dispatch("click", plainClick());
  assert.equal(harness.messages.length, before);
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-block-editing"), null);
  insertPointAfterLine(harness, 52).childElements[0].dispatch("click", plainClick());
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-block-editing"), "true");
  const opened = harness.messages.length;
  moveButton(harness, 52, "down").dispatch("click", plainClick());
  assert.equal(harness.messages.slice(opened).some((message) => message.type === "previewBlockMove"), false);
});

test("T36: a refused move says why next to the bar; a result of another context is ignored", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  moveButton(harness, 52, "down").dispatch("click", plainClick());
  const result = {
    type: "previewBlockMoveResult", documentId: "file:///active.md", revision: 7, requestId: 11,
    ok: false, reason: "Text between the two blocks prevents the move.",
  };
  harness.dispatchMessage({ ...result, requestId: 99 });
  const statusOf = () => insertPointAfterLine(harness, 52).childElements.find((element) =>
    element.className.split(" ").includes("sphinx-preview-move-status"));
  assert.equal(statusOf(), undefined);
  harness.dispatchMessage(result);
  assert.equal(statusOf()?.textContent, result.reason);
  assert.equal(statusOf()?.getAttribute("role"), "status");
});

// T37: Alt+Up/Down moves the focused block; Cmd/Ctrl+Alt+Up/Down moves it from the text box.
const MOVE_IDENTIFIERS = { documentId: "file:///active.md", revision: 7, requestId: 11 };

function moveMessages(harness: RuntimeHarness, from = 0): Array<Record<string, unknown>> {
  return harness.messages.slice(from).filter((message) => message.type === "previewBlockMove");
}

function altKey(key: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { key, altKey: true, preventDefault: () => undefined, stopPropagation: () => undefined, ...extra };
}

function openMoveTextarea(harness: RuntimeHarness, original: string): RuntimeElement {
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource", ...MOVE_IDENTIFIERS, editId: harness.messages.at(-1)?.editId, originalText: original,
  });
  return harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1)!;
}

test("T37: Alt+ArrowDown on a focused block and Alt+ArrowUp on its bar button post the move", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  let prevented = 0;
  const handled = altKey("ArrowDown", { target: harness.mappings[1], preventDefault: () => { prevented += 1; } });
  harness.dispatchDocument("keydown", handled);
  const moves = moveMessages(harness, before);
  assert.equal(moves.length, 1);
  assert.deepEqual(
    [moves[0].line, moves[0].endLine, moves[0].neighbourLine, moves[0].neighbourEndLine, moves[0].direction],
    [50, 52, 100, 100, "down"],
  );
  assert.equal(prevented, 1);
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: false, reason: "no" });
  const button = insertPointAfterLine(harness, 52).childElements[0];
  harness.dispatchDocument("keydown", altKey("ArrowUp", { target: button }));
  const up = moveMessages(harness, before).at(-1)!;
  assert.deepEqual([up.line, up.neighbourLine, up.direction], [50, 1, "up"]);
});

test("T37: other chords and other targets do not move a block", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  const target = harness.mappings[1];
  harness.dispatchDocument("keydown", { key: "ArrowDown", target, preventDefault: () => undefined });
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target, ctrlKey: true }));
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target, metaKey: true }));
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target, shiftKey: true }));
  harness.dispatchDocument("keydown", altKey("ArrowLeft", { target }));
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target: harness.createdElements[0] }));
  harness.dispatchDocument("keydown", altKey("ArrowUp", { target: harness.mappings[0] }));
  assert.deepEqual(moveMessages(harness, before), []);
});

test("T37: a key repeat during the round trip does not move twice; the block takes the focus", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  const target = harness.mappings[1];
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target }));
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target, repeat: true }));
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target, repeat: true }));
  assert.equal(moveMessages(harness, before).length, 1);
  // The result arrives before the render: still no second move.
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: true, line: 100 });
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target, repeat: true }));
  assert.equal(moveMessages(harness, before).length, 1);
  assert.equal((harness.mappings[2] as RuntimeElement).focusOptions === undefined, true);
  harness.dispatchMessage(patchMessage());
  assert.equal((harness.mappings[2] as RuntimeElement).focusOptions?.preventScroll, true, "the moved block has the focus");
  assert.equal(harness.mappings[2].getAttribute("tabindex"), "-1");
  harness.dispatchDocument("keydown", altKey("ArrowUp", { target: harness.mappings[2] }));
  assert.equal(moveMessages(harness, before).length, 2, "once the render is in, the next move goes through");
});

test("T37: a refused keyboard move can be retried", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const target = harness.mappings[1];
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target }));
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: false, reason: "no" });
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target }));
  assert.equal(moveMessages(harness).length, 2);
});

test("T37: plain Alt+Arrow in the text box stays native; the shortcut chord is the only one handled", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  textarea.value = "Current block, changed\n";
  textarea.dispatch("input");
  const before = harness.messages.length;
  let prevented = false;
  textarea.dispatch("keydown", altKey("ArrowDown", { preventDefault: () => { prevented = true; } }));
  textarea.dispatch("keydown", altKey("ArrowDown", { metaKey: true, preventDefault: () => { prevented = true; } }));
  assert.equal(prevented, false);
  assert.equal(harness.messages.length, before);
});

test("T37: Ctrl+Alt+ArrowDown saves, moves, then reopens the editor with the caret in place", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  textarea.value = "Current block, changed\n";
  textarea.dispatch("input");
  textarea.setSelectionRange(7, 7);
  const before = harness.messages.length;
  let prevented = false;
  textarea.dispatch("keydown", altKey("ArrowDown", { ctrlKey: true, preventDefault: () => { prevented = true; } }));
  assert.equal(prevented, true);
  const save = harness.messages.slice(before).find((message) => message.type === "previewEditSave");
  assert.equal(save?.final, true);
  assert.deepEqual(moveMessages(harness, before), [], "the move waits for the saved render");
  // A repeat while the save is in flight does nothing.
  textarea.dispatch("keydown", altKey("ArrowDown", { ctrlKey: true, repeat: true }));
  assert.equal(harness.messages.slice(before).filter((m) => m.type === "previewEditSave").length, 1);
  harness.dispatchMessage(patchMessage());
  const moves = moveMessages(harness, before);
  assert.equal(moves.length, 1);
  assert.deepEqual([moves[0].line, moves[0].neighbourLine, moves[0].direction], [50, 100, "down"]);
  assert.equal(moves[0].revision, 8);
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...NEXT_IDENTIFIERS, ok: true, line: 100 });
  assert.equal(
    harness.messages.slice(before).some((message) => message.type === "previewEditOpen"),
    false, "the editor waits for the render of the move",
  );
  harness.dispatchMessage(patchMessage({
    revision: 8, requestId: 12, next: { revision: 9, requestId: 13 },
  }));
  const open = harness.messages.slice(before).find((message) => message.type === "previewEditOpen");
  assert.ok(open, "the editor reopens on the moved block");
  assert.equal(open.line, 100);
  harness.dispatchMessage({
    type: "previewEditSource", documentId: "file:///active.md", revision: 9, requestId: 13,
    editId: open.editId, originalText: "Current block, changed\n",
  });
  const reopened = harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1)!;
  assert.notEqual(reopened, textarea);
  assert.deepEqual(reopened.selectionRange, [7, 7], "the caret is where it was");
});

test("T37: on macOS the chord is Cmd+Alt, and Ctrl+Alt does nothing special", () => {
  const harness = createRuntimeHarness({ platform: "MacIntel", savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  textarea.value = "Current block, changed\n";
  textarea.dispatch("input");
  const before = harness.messages.length;
  textarea.dispatch("keydown", altKey("ArrowUp", { ctrlKey: true }));
  assert.equal(harness.messages.length, before);
  textarea.dispatch("keydown", altKey("ArrowUp", { metaKey: true }));
  assert.equal(harness.messages.slice(before).find((message) => message.type === "previewEditSave")?.final, true);
});

test("T37: with nothing to save the chord closes the editor and moves at once", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  textarea.setSelectionRange(3, 3);
  const before = harness.messages.length;
  textarea.dispatch("keydown", altKey("ArrowUp", { ctrlKey: true }));
  const sent = harness.messages.slice(before).map((message) => message.type);
  assert.deepEqual(sent, ["previewEditCancel", "previewBlockMove"]);
});

test("T28: a render that starts in edit mode builds the insertion points at init", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  assert.equal(insertPointsOf(harness).length, 3);
});

test("T28: the properties section gets an insertion point after line 0", () => {
  const harness = createRuntimeHarness({
    mapFrontmatter: true,
    propertiesMapped: true,
    savedState: { editMode: true },
  });
  assert.deepEqual(
    insertPointsOf(harness).map((point) => point.getAttribute("data-sphinx-insert-after-line")),
    ["0", "1", "52", "100"],
  );
});

test("T28: an empty body shows a single Start writing point after line 0", () => {
  const harness = createRuntimeHarness({
    emptyBody: true,
    previewStatus: "success",
    savedState: { editMode: true },
  });
  const points = insertPointsOf(harness);
  assert.equal(points.length, 1);
  assert.equal(points[0].getAttribute("data-sphinx-insert-after-line"), "0");
  assert.equal(points[0].childElements[0].textContent, "Start writing");
  assert.equal(points[0].parentElement, harness.previewContent);
  harness.editModeButton.dispatch("click");
  assert.equal(insertPointsOf(harness).length, 0, "reading mode removes it");
});

test("T28: a frontmatter-only document gets one Start writing point", () => {
  const harness = createRuntimeHarness({
    emptyBody: true,
    mapFrontmatter: true,
    propertiesMapped: true,
    previewStatus: "success",
    savedState: { editMode: true },
  });
  const points = insertPointsOf(harness);
  assert.equal(points.length, 1);
  assert.equal(points[0].getAttribute("data-sphinx-insert-after-line"), "0");
  assert.equal(points[0].childElements[0].textContent, "Start writing");
});

test("T28: a failed render offers no Start writing point", () => {
  const harness = createRuntimeHarness({
    emptyBody: true,
    previewStatus: "error",
    savedState: { editMode: true },
  });
  assert.equal(insertPointsOf(harness).length, 0);
});

test("T28: clicking a point posts previewEditOpen with insertAfterLine", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  insertPointAfterLine(harness, 52).childElements[0].dispatch("click", {
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const open = harness.messages.at(-1);
  assert.equal(open?.type, "previewEditOpen");
  assert.equal(open?.line, 52);
  assert.equal(open?.endLine, 52);
  assert.equal(open?.insertAfterLine, 52);
});

test("T28: Start writing opens at line 1 with insertAfterLine 0", () => {
  const harness = createRuntimeHarness({
    emptyBody: true,
    previewStatus: "success",
    savedState: { editMode: true },
  });
  insertPointAfterLine(harness, 0).childElements[0].dispatch("click", {
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const open = harness.messages.at(-1);
  assert.equal(open?.type, "previewEditOpen");
  assert.equal(open?.line, 1);
  assert.equal(open?.endLine, 1);
  assert.equal(open?.insertAfterLine, 0);
});

test("T28: document-level click and keydown on an insertion point never open a block editor", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const point = insertPointAfterLine(harness, 52);
  const button = point.childElements[0];
  const before = harness.messages.length;
  harness.dispatchDocument("click", { target: button, preventDefault: () => undefined });
  harness.dispatchDocument("keydown", { key: "Enter", target: point, preventDefault: () => undefined });
  harness.dispatchDocument("keydown", { key: " ", target: button, preventDefault: () => undefined });
  assert.equal(
    harness.messages.slice(before).some((message) =>
      message.type === "previewEditOpen" || message.type === "revealSource"),
    false,
  );
  assert.equal(harness.createdElements.some((element) =>
    element.getAttribute("data-sphinx-preview-block-editor") !== null), false);
});

test("T28: an empty source reply opens an empty textarea with a placeholder; Done saves the insertion", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  insertPointAfterLine(harness, 52).childElements[0].dispatch("click", {
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  sourceReply(harness, "", { insertAfterLine: 52 });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  assert.equal(textarea.value, "");
  assert.equal(
    textarea.getAttribute("placeholder"),
    'Type Markdown, for example "## Heading" or "- item"',
  );
  const done = harness.createdElements.find((element) =>
    element.tagName === "BUTTON" && element.textContent === "Done");
  const cancel = harness.createdElements.find((element) =>
    element.tagName === "BUTTON" && element.textContent === "Cancel");
  assert.ok(done && cancel);
  assert.ok(harness.createdElements.some((element) =>
    element.tagName === "P" && /Enter: new line/u.test(element.textContent)), "hint is shown");
  textarea.value = "## New section";
  textarea.dispatch("input");
  done.dispatch("click");
  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewEditSave");
  assert.equal(save?.insertAfterLine, 52);
  assert.equal(save?.originalText, "");
  assert.equal(save?.editedText, "## New section");
  assert.equal(save?.final, true);
});

test("T28: Done on an untouched empty insertion closes without saving", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  insertPointAfterLine(harness, 1).childElements[0].dispatch("click", {
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  sourceReply(harness, "", { insertAfterLine: 1 });
  const done = harness.createdElements.find((element) =>
    element.tagName === "BUTTON" && element.textContent === "Done");
  assert.ok(done);
  done.dispatch("click");
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave"), false);
});

test("T28: autosave and Cancel carry insertAfterLine", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  insertPointAfterLine(harness, 100).childElements[0].dispatch("click", {
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  sourceReply(harness, "", { insertAfterLine: 100 });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.value = "- check logs";
  textarea.dispatch("input");
  harness.flushTimers();
  const autosave = harness.messages.at(-1);
  assert.equal(autosave?.type, "previewEditSave");
  assert.equal(autosave?.final, false);
  assert.equal(autosave?.insertAfterLine, 100);
  const cancelButton = harness.createdElements.find((element) =>
    element.tagName === "BUTTON" && element.textContent === "Cancel");
  assert.ok(cancelButton);
  cancelButton.dispatch("click");
  const cancel = harness.messages.at(-1);
  assert.equal(cancel?.type, "previewEditCancel");
  assert.equal(cancel?.insertAfterLine, 100);
});

test("T28: ordinary block edits never carry insertAfterLine", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  assert.equal("insertAfterLine" in (harness.messages.at(-1) as object), false);
  sourceReply(harness, "Editable paragraph.\n");
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  assert.equal(textarea.getAttribute("placeholder"), null);
  textarea.value = "Changed.";
  textarea.dispatch("input");
  harness.flushTimers();
  assert.equal("insertAfterLine" in (harness.messages.at(-1) as object), false);
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

const NO_EDITOR_TOOLTIP = "No text editor shows this file";

test("T38: an unpaired preview disables the anchor button and a previewPairing message re-enables it", () => {
  const harness = createRuntimeHarness({ pairedTextEditor: false });
  assert.equal(harness.anchorButton.disabled, true);
  for (const name of ["title", "data-tooltip", "aria-label"]) {
    assert.equal(harness.anchorButton.getAttribute(name), NO_EDITOR_TOOLTIP);
  }
  harness.dispatchMessage({
    type: "previewPairing",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    pairedTextEditor: true,
  });
  assert.equal(harness.anchorButton.disabled, false);
  assert.equal(harness.anchorButton.getAttribute("title"), "Preview and text editor scroll together");
  harness.dispatchMessage({
    type: "previewPairing",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    pairedTextEditor: false,
  });
  assert.equal(harness.anchorButton.disabled, true);
  assert.equal(harness.anchorButton.getAttribute("title"), NO_EDITOR_TOOLTIP);
});

test("a page whose pairing and theme messages were lost while it loaded gets both from the host's answer to its ready report", () => {
  // The page loaded with the context of a render made before a text editor showed the file. The
  // host's previewPairing and themeChanged reached the document before its runtime listened (VS
  // Code delivers queued messages a fixed delay after writing the document), so the page never saw
  // them: this harness never dispatches them.
  const harness = createRuntimeHarness({ pairedTextEditor: false });
  assert.equal(harness.anchorButton.disabled, true);
  const ready = harness.messages.find((message) => message.type === "previewReady") as PageIdentity | undefined;
  assert.ok(ready, "the page reports ready once it listens");
  for (const message of pageLiveStateMessages(ready, { pairedTextEditor: true, themeKind: 2 })) {
    harness.dispatchMessage(message);
  }
  assert.equal(harness.anchorButton.disabled, false);
  assert.equal(harness.anchorButton.getAttribute("title"), "Preview and text editor scroll together");
  assert.equal(harness.anchorButton.getAttribute("aria-label"), "Anchor preview to text editor");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-theme"), "2");
});

test("T38: a paired preview keeps the anchor button enabled, and a foreign previewPairing is ignored", () => {
  const harness = createRuntimeHarness();
  assert.equal(harness.anchorButton.disabled, false);
  harness.dispatchMessage({
    type: "previewPairing",
    documentId: "file:///other.md",
    revision: 7,
    requestId: 11,
    pairedTextEditor: false,
  });
  assert.equal(harness.anchorButton.disabled, false);
});

test("T38: edit mode starts from the workspace choice unless the webview has saved state", () => {
  const remembered = createRuntimeHarness({ initialEditMode: true });
  assert.equal(remembered.documentElement.getAttribute("data-sphinx-preview-edit-mode"), "on");
  assert.equal(remembered.editModeButton.getAttribute("aria-pressed"), "true");

  const saved = createRuntimeHarness({ initialEditMode: true, savedState: { editMode: false } });
  assert.equal(saved.documentElement.getAttribute("data-sphinx-preview-edit-mode"), "off");

  const plain = createRuntimeHarness();
  assert.equal(plain.documentElement.getAttribute("data-sphinx-preview-edit-mode"), "off");
});

test("T38: a read-only preview never starts in edit mode", () => {
  const harness = createRuntimeHarness({ initialEditMode: true, editingEnabled: false });
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-edit-mode"), "off");
});

test("T38: toggling edit mode posts previewEditModeChanged", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  const on = harness.messages.filter((message) => message.type === "previewEditModeChanged").at(-1);
  assert.equal(on?.editMode, true);
  assert.equal(on?.documentId, "file:///active.md");
  harness.editModeButton.dispatch("click");
  const off = harness.messages.filter((message) => message.type === "previewEditModeChanged").at(-1);
  assert.equal(off?.editMode, false);
});

function newCustomKeyHarness() {
  const harness = createRuntimeHarness({
    mapFrontmatter: true,
    savedState: { editMode: true, pendingFrontmatterEdit: { fieldName: "approver", requestId: "old" } },
    frontmatterRowAttributes: {
      class: "okf-unknown",
      "data-okf-field": "approver",
      "data-okf-type": "unknown",
      "data-okf-value": '""',
      "data-okf-value-yaml": '""\n',
    },
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea, "the editor of the new custom key is a text area");
  return { harness, textarea };
}

test("T41: a new custom key opens a one-line text editor, not the YAML editor", () => {
  const { textarea } = newCustomKeyHarness();
  assert.equal(textarea.getAttribute("data-okf-text-value"), "true");
  assert.equal(textarea.getAttribute("aria-keyshortcuts"), "Enter Shift+Enter");
  assert.equal(textarea.value, "");
});

test("T41: Enter saves a new custom key as plain text and Shift+Enter adds a line", () => {
  const { harness, textarea } = newCustomKeyHarness();
  textarea.value = "Ann";
  let shiftPrevented = false;
  textarea.dispatch("keydown", {
    key: "Enter",
    shiftKey: true,
    preventDefault: () => { shiftPrevented = true; },
  });
  assert.equal(shiftPrevented, false);
  assert.equal(frontmatterSaves(harness).length, 0);
  let prevented = false;
  textarea.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  const saves = frontmatterSaves(harness);
  assert.equal(saves.length, 1);
  assert.equal(saves[0]?.fieldName, "approver");
  assert.equal(saves[0]?.fieldValue, "Ann");
  assert.equal(saves[0]?.fieldValueFormat, undefined);
  assert.equal(saves[0]?.fieldValueStyle, "plain");
});

test("T41: an existing field's save does not ask for a plain scalar", () => {
  const { harness, textarea } = openTextFieldEditor("Alpha");
  textarea.value = "Beta";
  textarea.dispatch("keydown", { key: "Enter", preventDefault: noop });
  assert.equal(frontmatterSaves(harness)[0]?.fieldValueStyle, undefined);
});

test("T41: Escape on the field picker cancels the open frontmatter edit", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  openFrontmatterValueEditor(harness);
  const control = harness.createdElements.find((element) => element.tagName === "SELECT"
    && element.getAttribute("aria-label") !== "Frontmatter field to add");
  assert.ok(control);
  const addButton = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-operation") === "add")!;
  addButton.dispatch("click", {});
  const picker = harness.createdElements.find((element) =>
    element.getAttribute("aria-label") === "Frontmatter field to add")!;
  const before = harness.messages.length;
  let prevented = false;
  harness.dispatchDocument("keydown", {
    key: "Escape",
    target: picker,
    preventDefault: () => { prevented = true; },
  });
  assert.equal(prevented, true);
  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") !== null);
  assert.equal(editor?.parentElement, undefined, "the editor is removed");
  // A blur of the removed control must not save anything.
  control.value = "active";
  control.dispatch("blur", {});
  assert.equal(harness.messages.length, before);
});

test("T41: Escape outside the properties section does not touch an open frontmatter edit", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  openFrontmatterValueEditor(harness);
  const outside = harness.createdElements.find((element) => element.tagName === "SELECT"
    && element.getAttribute("aria-label") !== "Frontmatter field to add")!;
  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") !== null)!;
  harness.dispatchDocument("keydown", { key: "Escape", target: harness.editModeButton, preventDefault: noop });
  assert.ok(editor.parentElement, "the editor stays open");
  assert.ok(outside);
});

function overlayMessage(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: "previewPendingOverlay",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    visible: true,
    label: "Preview pending",
    message: "Rendering the active buffer.",
    ...extra,
  };
}

function pendingOverlays(harness: RuntimeHarness): RuntimeElement[] {
  return harness.createdElements.filter((element) =>
    element.getAttribute("data-sphinx-preview-pending-overlay") !== null && !element.removed);
}

test("T43: the pending overlay message creates one overlay, outside the content", () => {
  const harness = createRuntimeHarness();
  const contentBefore = [...harness.previewContent.childElements];
  harness.dispatchMessage(overlayMessage());
  const overlays = pendingOverlays(harness);
  assert.equal(overlays.length, 1);
  const overlay = overlays[0]!;
  assert.equal(overlay.getAttribute("role"), "status");
  assert.equal(overlay.getAttribute("aria-live"), "polite");
  assert.equal(overlay.parentElement, harness.body);
  assert.equal(overlay.childElements[0]?.tagName, "STRONG");
  assert.equal(overlay.childElements[0]?.textContent, "Preview pending");
  assert.equal(overlay.childElements[1]?.tagName, "SPAN");
  assert.equal(overlay.childElements[1]?.textContent, "Rendering the active buffer.");
  assert.deepEqual(harness.previewContent.childElements, contentBefore, "content children are unchanged");
  assert.equal(harness.previewContent.insertedElements.length, 0);
});

test("T43: a second pending overlay message updates the overlay instead of duplicating it", () => {
  const harness = createRuntimeHarness();
  harness.dispatchMessage(overlayMessage());
  harness.dispatchMessage(overlayMessage({ message: "Waiting for the latest edit." }));
  const overlays = pendingOverlays(harness);
  assert.equal(overlays.length, 1);
  assert.equal(overlays[0]!.childElements[1]?.textContent, "Waiting for the latest edit.");
});

test("T43: visible false removes the pending overlay", () => {
  const harness = createRuntimeHarness();
  harness.dispatchMessage(overlayMessage());
  harness.dispatchMessage(overlayMessage({ visible: false }));
  assert.equal(pendingOverlays(harness).length, 0);
  // Showing it again after a removal creates a fresh one.
  harness.dispatchMessage(overlayMessage());
  assert.equal(pendingOverlays(harness).length, 1);
});

test("T43: invalid or foreign pending overlay messages are ignored", () => {
  const harness = createRuntimeHarness();
  harness.dispatchMessage(overlayMessage({ requestId: 12 }));
  harness.dispatchMessage(overlayMessage({ revision: 8 }));
  harness.dispatchMessage(overlayMessage({ visible: "yes" }));
  harness.dispatchMessage(overlayMessage({ label: 3 }));
  harness.dispatchMessage(overlayMessage({ message: undefined }));
  harness.dispatchMessage(overlayMessage({ label: "x".repeat(501) }));
  assert.equal(pendingOverlays(harness).length, 0);
  harness.dispatchMessage(overlayMessage());
  harness.dispatchMessage(overlayMessage({ requestId: 12, visible: false }));
  harness.dispatchMessage(overlayMessage({ visible: 0 }));
  assert.equal(pendingOverlays(harness).length, 1, "invalid hides do not remove the overlay");
});

function propertiesMessage(markup: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: "previewPropertiesTable",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    markup,
    ...extra,
  };
}

function cellMarkup(label: string): string {
  return '<section data-okf-properties><td data-okf-edit-cell="value">' + label + "</td></section>";
}

test("T30: previewPropertiesTable replaces the properties section in place", () => {
  const harness = createRuntimeHarness();
  const old = harness.currentProperties();
  assert.ok(old);
  assert.equal(old, harness.frontmatterProperties);
  const contentBefore = [...harness.previewContent.childElements];
  harness.dispatchMessage(propertiesMessage(cellMarkup("fresh")));
  const current = harness.currentProperties();
  assert.ok(current && current !== old, "a new section replaced the old one");
  assert.equal(old.removed, true);
  assert.deepEqual(harness.htmlInsertions.map((entry) => entry.position), ["beforebegin"]);
  assert.equal(current.innerHTML, cellMarkup("fresh"));
  assert.deepEqual(harness.previewContent.childElements, contentBefore, "nothing else in the content moved");
});

test("T30: previewPropertiesTable inserts the section when it is absent and removes it on empty markup", () => {
  const harness = createRuntimeHarness();
  harness.dispatchMessage(propertiesMessage(""));
  assert.equal(harness.currentProperties(), null, "an empty markup removes the section");
  assert.equal(harness.frontmatterProperties.removed, true);
  assert.equal(harness.htmlInsertions.length, 0, "nothing is inserted for an empty markup");
  harness.dispatchMessage(propertiesMessage(""));
  assert.equal(harness.currentProperties(), null, "removing an absent section is harmless");
  harness.dispatchMessage(propertiesMessage(cellMarkup("again")));
  assert.deepEqual(harness.htmlInsertions.map((entry) => entry.position), ["afterbegin"]);
  assert.equal(harness.currentProperties()?.innerHTML, cellMarkup("again"));
});

test("T30: previewPropertiesTable is ignored for another request, version, document or a non-string markup", () => {
  const harness = createRuntimeHarness();
  const old = harness.currentProperties();
  harness.dispatchMessage(propertiesMessage(cellMarkup("x"), { requestId: 12 }));
  harness.dispatchMessage(propertiesMessage(cellMarkup("x"), { revision: 8 }));
  harness.dispatchMessage(propertiesMessage(cellMarkup("x"), { documentId: "file:///other.md" }));
  harness.dispatchMessage(propertiesMessage(cellMarkup("x"), { markup: 3 }));
  harness.dispatchMessage(propertiesMessage(cellMarkup("x"), { markup: undefined }));
  assert.equal(harness.currentProperties(), old);
  assert.equal(harness.htmlInsertions.length, 0);
});

test("T30: previewPropertiesTable is deferred while a frontmatter editor is open, then applied on close", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  openFrontmatterValueEditor(harness);
  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") !== null)!;
  assert.ok(editor.parentElement, "the editor is open");
  harness.dispatchMessage(propertiesMessage(cellMarkup("first")));
  harness.dispatchMessage(propertiesMessage(cellMarkup("second")));
  assert.equal(harness.currentProperties(), harness.frontmatterProperties, "the section is not touched");
  assert.equal(harness.htmlInsertions.length, 0);
  harness.dispatchDocument("keydown", {
    key: "Escape",
    target: harness.frontmatterValueCell,
    preventDefault: noop,
  });
  assert.equal(editor.parentElement, undefined, "Escape closed the editor");
  const current = harness.currentProperties();
  assert.ok(current && current !== harness.frontmatterProperties, "the latest deferred markup was applied");
  assert.equal(current.innerHTML, cellMarkup("second"));
  assert.deepEqual(harness.htmlInsertions.map((entry) => entry.position), ["beforebegin"]);
});

test("T30: a replaced section gets edit-cell tabindex in edit mode and none outside it", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchMessage(propertiesMessage(
    cellMarkup("a").replace("</section>", '<th data-okf-edit-cell="name">n</th></section>')));
  const cells = harness.currentProperties()?.childElements ?? [];
  assert.equal(cells.length, 2);
  for (const cell of cells) assert.equal(cell.getAttribute("tabindex"), "0");
  harness.editModeButton.dispatch("click");
  harness.dispatchMessage(propertiesMessage(cellMarkup("c")));
  for (const cell of harness.currentProperties()?.childElements ?? []) {
    assert.equal(cell.getAttribute("tabindex"), null);
  }
});

test("T30: a replacement closes the link tooltip, re-measures and keeps the description state", () => {
  const harness = createRuntimeHarness({ viewportWidth: 900 });
  harness.dispatchDocument("click", { target: harness.descriptionButton });
  assert.equal(harness.documentElement.getAttribute("data-okf-descriptions-collapsed"), "true");
  const link = new RuntimeElement({
    class: "okf-frontmatter-link", "data-okf-link-status": "valid", title: "target\ndescription: x",
  }, harness.windowState, 0, 10, "a");
  harness.dispatchDocument("mouseover", { target: link });
  const tooltips = () => harness.createdElements.filter((element) =>
    element.className === "sphinx-preview-link-tooltip" && element.parentElement !== undefined);
  assert.equal(tooltips().length, 1, "the tooltip is open");
  const rectReads = harness.mappings.reduce((count, mapping) => count + mapping.rectReadCount, 0);
  harness.dispatchMessage(propertiesMessage(cellMarkup("fresh")));
  assert.equal(tooltips().length, 0, "the tooltip closed");
  assert.equal(link.getAttribute("title"), "target\ndescription: x", "the title was restored");
  assert.ok(harness.mappings.reduce((count, mapping) => count + mapping.rectReadCount, 0) > rectReads,
    "the layout was measured again");
  assert.equal(harness.documentElement.getAttribute("data-okf-descriptions-collapsed"), "true");
  assert.equal(harness.descriptionButton.getAttribute("aria-expanded"), "false");
});

// T33: the startup sequence of the runtime. The content-bound initialization moves into a function
// that a later task calls again on replaced content; the order of observable effects at startup
// (element mutations, then the messages posted) must not change. Listener registration on the
// toolbar buttons and the theme attributes of the root element do not depend on the content, so
// they are left out of the trace.
function traceStartup(
  configuration: Parameters<typeof createRuntimeHarness>[0],
  savedAnchorMode?: boolean,
): { effects: string[]; messageTypes: unknown[]; scrollY: number } {
  const entries: Array<{ element: RuntimeElement; method: string; args: unknown[]; text: string }> = [];
  const prototype = RuntimeElement.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
  const original = new Map<string, (...args: unknown[]) => unknown>();
  const describe = (element: RuntimeElement): string => {
    const identity = element.getAttribute("data-okf-field") ?? element.getAttribute("class")
      ?? element.getAttribute("data-sphinx-source-line") ?? element.className;
    return element.tagName.toLowerCase() + (identity ? "[" + identity + "]" : "");
  };
  const format = (value: unknown): string => (
    value instanceof RuntimeElement ? "<" + describe(value) + ">"
      : typeof value === "function" ? "fn" : String(value)
  );
  for (const method of ["setAttribute", "removeAttribute", "addEventListener", "appendChild",
    "insertBefore", "insertAdjacentElement", "insertAdjacentHTML", "remove", "focus"]) {
    const before = prototype[method];
    original.set(method, before);
    prototype[method] = function traced(this: RuntimeElement, ...args: unknown[]): unknown {
      entries.push({
        element: this,
        method,
        args,
        text: describe(this) + "." + method + "(" + args.map(format).join(",") + ")",
      });
      return before.apply(this, args);
    };
  }
  try {
    // The trace was recorded with the theme mode "current" stored for the workspace (pinned since
    // the fresh default became cream).
    const harness = createRuntimeHarness(configuration, undefined, "current", savedAnchorMode);
    const toolbar = [harness.themeButton, harness.refreshButton, harness.anchorButton, harness.editModeButton];
    const themeAttributes = ["data-sphinx-preview-theme", "data-sphinx-preview-reduced-motion",
      "data-sphinx-preview-zoom", "data-sphinx-preview-width", "data-sphinx-preview-toc",
      "data-okf-show-comments", "data-sphinx-preview-incoming", "data-sphinx-preview-toolbar-state"];
    // The zoom buttons and the zoom of the root do not depend on the content (T08); the Diff
    // button of row 2 does not either (T17).
    // The collapse button and its rows are content-independent too (P8).
    const zoomButtons = [harness.zoomOutButton, harness.zoomInButton, harness.widthButton, harness.diffButton,
      harness.collapseButton, harness.moreRows];
    return {
      effects: entries
        .filter((entry) => !(entry.method === "addEventListener" && toolbar.includes(entry.element)))
        .filter((entry) => !zoomButtons.includes(entry.element))
        // The TOC column is runtime UI that does not depend on the content (T12).
        .filter((entry) => entry.element.tagName !== "NAV"
          && !(entry.method === "appendChild" && (entry.args[0] as RuntimeElement | undefined)?.tagName === "NAV"))
        .filter((entry) => !(entry.element === harness.documentElement
          && entry.method === "setAttribute" && themeAttributes.includes(String(entry.args[0]))))
        .map((entry) => entry.text),
      messageTypes: harness.messages.map((message) => message.type),
      scrollY: harness.windowState.scrollY,
    };
  } finally {
    for (const [method, before] of original) prototype[method] = before;
  }
}

test("T33: the startup sequence of effects and messages is stable", () => {
  const scenarios: Array<[string, Parameters<typeof createRuntimeHarness>[0], boolean | undefined]> = [
    ["reading mode", {}, undefined],
    ["edit mode", { savedState: { editMode: true }, mapFrontmatter: true, frontmatterHeight: 30 }, undefined],
    ["untrusted workspace", { editingEnabled: false }, undefined],
    ["saved anchor mode differs from the setting", {}, false],
    ["pinned position", { initialPin: { line: 50, viewportTop: 120 } }, undefined],
    ["pending block navigation", {
      previewStatus: "success",
      savedState: { editMode: true, pendingBlockNavigation: { sourceLine: 50, caretPosition: "end" } },
    }, undefined],
    ["pending new field", {
      previewStatus: "success",
      savedState: { editMode: true, pendingFrontmatterEdit: { fieldName: "lifecycle" } },
    }, undefined],
  ];
  const observed: Record<string, unknown> = {};
  for (const [name, configuration, savedAnchorMode] of scenarios) {
    observed[name] = traceStartup(configuration, savedAnchorMode);
  }
  assert.deepEqual(observed, EXPECTED_STARTUP_TRACE);
});

const EXPECTED_STARTUP_TRACE: Record<string, unknown> = {
  "reading mode": {
    effects: [
      "div[50].appendChild(<input[myst-checkbox]>)",
      "th.appendChild(<span[okf-name-cell]>)",
      "td.appendChild(<span>)",
      "tr[lifecycle].appendChild(<th>)",
      "tr[lifecycle].appendChild(<td>)",
      "section.appendChild(<table>)",
      "table.appendChild(<tbody>)",
      "tbody.appendChild(<tr[lifecycle]>)",
      "div.setAttribute(data-sphinx-preview-document-id,file:///active.md)",
      "div.setAttribute(data-sphinx-preview-document-version,7)",
      "div.setAttribute(data-sphinx-preview-request-id,11)",
      "div.setAttribute(data-sphinx-preview-comments,on)",
      "button.addEventListener(click,fn)",
      "button.addEventListener(click,fn)",
      "div.setAttribute(data-sphinx-preview-theme-mode,current)",
      "div.setAttribute(data-theme-mode,current)",
      "div.setAttribute(aria-label,Preview theme: Current theme)",
      "div.setAttribute(title,Current theme (click for dark theme))",
      "div.setAttribute(data-tooltip,Current theme (click for dark theme))",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(aria-label,Anchor preview to text editor)",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(data-sphinx-preview-edit-mode,off)",
      "div.setAttribute(data-edit-mode,off)",
      "div.setAttribute(aria-pressed,false)",
      "div.setAttribute(title,Edit mode)",
      "div.setAttribute(data-tooltip,Edit mode)",
      "th.removeAttribute(tabindex)",
      "td.removeAttribute(tabindex)",
      "body.removeAttribute(data-sphinx-preview-sticky-headings-active)",
      "div.setAttribute(data-okf-descriptions-collapsed,true)",
      "button.setAttribute(aria-expanded,false)",
      "button.setAttribute(aria-label,Expand Description column)",
      "button.setAttribute(title,Expand Description column)",
      "div.addEventListener(load,fn,[object Object])",
    ],
    messageTypes: ["previewReady"],
    scrollY: 0,
  },
  "edit mode": {
    effects: [
      "div[50].appendChild(<input[myst-checkbox]>)",
      "th.appendChild(<span[okf-name-cell]>)",
      "td.appendChild(<span>)",
      "tr[lifecycle].appendChild(<th>)",
      "tr[lifecycle].appendChild(<td>)",
      "section[1].appendChild(<table>)",
      "table.appendChild(<tbody>)",
      "tbody.appendChild(<tr[lifecycle]>)",
      "div.setAttribute(data-sphinx-preview-document-id,file:///active.md)",
      "div.setAttribute(data-sphinx-preview-document-version,7)",
      "div.setAttribute(data-sphinx-preview-request-id,11)",
      "div.setAttribute(data-sphinx-preview-comments,on)",
      "button.addEventListener(click,fn)",
      "button.addEventListener(click,fn)",
      "div.setAttribute(data-sphinx-preview-theme-mode,current)",
      "div.setAttribute(data-theme-mode,current)",
      "div.setAttribute(aria-label,Preview theme: Current theme)",
      "div.setAttribute(title,Current theme (click for dark theme))",
      "div.setAttribute(data-tooltip,Current theme (click for dark theme))",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(aria-label,Anchor preview to text editor)",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(data-sphinx-preview-edit-mode,on)",
      "div.setAttribute(data-edit-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Exit edit mode)",
      "div.setAttribute(data-tooltip,Exit edit mode)",
      "th.setAttribute(tabindex,0)",
      "td.setAttribute(tabindex,0)",
      "div[sphinx-preview-insert-point].setAttribute(data-sphinx-insert-after-line,1)",
      "button.setAttribute(type,button)",
      "button.setAttribute(aria-label,Insert a block here)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button>)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(aria-label,Move the block above up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(data-sphinx-move,up)",
      "button[sphinx-preview-move sphinx-preview-move--up].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--up]>)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(aria-label,Move the block above down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(data-sphinx-move,down)",
      "button[sphinx-preview-move sphinx-preview-move--down].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--down]>)",
      "div[1].insertAdjacentElement(afterend,<div[sphinx-preview-insert-point]>)",
      "div[sphinx-preview-insert-point].setAttribute(data-sphinx-insert-after-line,52)",
      "button.setAttribute(type,button)",
      "button.setAttribute(aria-label,Insert a block here)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button>)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(aria-label,Move the block above up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(data-sphinx-move,up)",
      "button[sphinx-preview-move sphinx-preview-move--up].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--up]>)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(aria-label,Move the block above down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(data-sphinx-move,down)",
      "button[sphinx-preview-move sphinx-preview-move--down].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--down]>)",
      "div[50].insertAdjacentElement(afterend,<div[sphinx-preview-insert-point]>)",
      "div[sphinx-preview-insert-point].setAttribute(data-sphinx-insert-after-line,100)",
      "button.setAttribute(type,button)",
      "button.setAttribute(aria-label,Insert a block here)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button>)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(aria-label,Move the block above up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(data-sphinx-move,up)",
      "button[sphinx-preview-move sphinx-preview-move--up].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--up]>)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(aria-label,Move the block above down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(data-sphinx-move,down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(disabled,)",
      "button[sphinx-preview-move sphinx-preview-move--down].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--down]>)",
      "div[100].insertAdjacentElement(afterend,<div[sphinx-preview-insert-point]>)",
      "body.removeAttribute(data-sphinx-preview-sticky-headings-active)",
      "div.setAttribute(data-okf-descriptions-collapsed,true)",
      "button.setAttribute(aria-expanded,false)",
      "button.setAttribute(aria-label,Expand Description column)",
      "button.setAttribute(title,Expand Description column)",
      "div.addEventListener(load,fn,[object Object])",
    ],
    messageTypes: ["previewReady"],
    scrollY: 0,
  },
  "untrusted workspace": {
    effects: [
      "div[50].appendChild(<input[myst-checkbox]>)",
      "th.appendChild(<span[okf-name-cell]>)",
      "td.appendChild(<span>)",
      "tr[lifecycle].appendChild(<th>)",
      "tr[lifecycle].appendChild(<td>)",
      "section.appendChild(<table>)",
      "table.appendChild(<tbody>)",
      "tbody.appendChild(<tr[lifecycle]>)",
      "div.setAttribute(data-sphinx-preview-document-id,file:///active.md)",
      "div.setAttribute(data-sphinx-preview-document-version,7)",
      "div.setAttribute(data-sphinx-preview-request-id,11)",
      "div.setAttribute(data-sphinx-preview-comments,on)",
      "button.addEventListener(click,fn)",
      "button.addEventListener(click,fn)",
      "div.setAttribute(data-sphinx-preview-theme-mode,current)",
      "div.setAttribute(data-theme-mode,current)",
      "div.setAttribute(aria-label,Preview theme: Current theme)",
      "div.setAttribute(title,Current theme (click for dark theme))",
      "div.setAttribute(data-tooltip,Current theme (click for dark theme))",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(aria-label,Anchor preview to text editor)",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(data-sphinx-preview-edit-mode,off)",
      "th.removeAttribute(tabindex)",
      "td.removeAttribute(tabindex)",
      "input[myst-checkbox].setAttribute(title,Editing requires a trusted workspace.)",
      "body.removeAttribute(data-sphinx-preview-sticky-headings-active)",
      "div.setAttribute(data-okf-descriptions-collapsed,true)",
      "button.setAttribute(aria-expanded,false)",
      "button.setAttribute(aria-label,Expand Description column)",
      "button.setAttribute(title,Expand Description column)",
      "div.addEventListener(load,fn,[object Object])",
    ],
    messageTypes: ["previewReady"],
    scrollY: 0,
  },
  "saved anchor mode differs from the setting": {
    effects: [
      "div[50].appendChild(<input[myst-checkbox]>)",
      "th.appendChild(<span[okf-name-cell]>)",
      "td.appendChild(<span>)",
      "tr[lifecycle].appendChild(<th>)",
      "tr[lifecycle].appendChild(<td>)",
      "section.appendChild(<table>)",
      "table.appendChild(<tbody>)",
      "tbody.appendChild(<tr[lifecycle]>)",
      "div.setAttribute(data-sphinx-preview-document-id,file:///active.md)",
      "div.setAttribute(data-sphinx-preview-document-version,7)",
      "div.setAttribute(data-sphinx-preview-request-id,11)",
      "div.setAttribute(data-sphinx-preview-comments,on)",
      "button.addEventListener(click,fn)",
      "button.addEventListener(click,fn)",
      "div.setAttribute(data-sphinx-preview-theme-mode,current)",
      "div.setAttribute(data-theme-mode,current)",
      "div.setAttribute(aria-label,Preview theme: Current theme)",
      "div.setAttribute(title,Current theme (click for dark theme))",
      "div.setAttribute(data-tooltip,Current theme (click for dark theme))",
      "div.setAttribute(data-anchor-mode,off)",
      "div.setAttribute(aria-pressed,false)",
      "div.setAttribute(title,Preview and text editor scroll independently)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll independently)",
      "div.setAttribute(aria-label,Anchor preview to text editor)",
      "div.setAttribute(data-anchor-mode,off)",
      "div.setAttribute(aria-pressed,false)",
      "div.setAttribute(title,Preview and text editor scroll independently)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll independently)",
      "div.setAttribute(data-sphinx-preview-edit-mode,off)",
      "div.setAttribute(data-edit-mode,off)",
      "div.setAttribute(aria-pressed,false)",
      "div.setAttribute(title,Edit mode)",
      "div.setAttribute(data-tooltip,Edit mode)",
      "th.removeAttribute(tabindex)",
      "td.removeAttribute(tabindex)",
      "body.removeAttribute(data-sphinx-preview-sticky-headings-active)",
      "div.setAttribute(data-okf-descriptions-collapsed,true)",
      "button.setAttribute(aria-expanded,false)",
      "button.setAttribute(aria-label,Expand Description column)",
      "button.setAttribute(title,Expand Description column)",
      "div.addEventListener(load,fn,[object Object])",
    ],
    messageTypes: ["previewAnchorModeChanged", "previewReady"],
    scrollY: 0,
  },
  "pinned position": {
    effects: [
      "div[50].appendChild(<input[myst-checkbox]>)",
      "th.appendChild(<span[okf-name-cell]>)",
      "td.appendChild(<span>)",
      "tr[lifecycle].appendChild(<th>)",
      "tr[lifecycle].appendChild(<td>)",
      "section.appendChild(<table>)",
      "table.appendChild(<tbody>)",
      "tbody.appendChild(<tr[lifecycle]>)",
      "div.setAttribute(data-sphinx-preview-document-id,file:///active.md)",
      "div.setAttribute(data-sphinx-preview-document-version,7)",
      "div.setAttribute(data-sphinx-preview-request-id,11)",
      "div.setAttribute(data-sphinx-preview-comments,on)",
      "button.addEventListener(click,fn)",
      "button.addEventListener(click,fn)",
      "div.setAttribute(data-sphinx-preview-theme-mode,current)",
      "div.setAttribute(data-theme-mode,current)",
      "div.setAttribute(aria-label,Preview theme: Current theme)",
      "div.setAttribute(title,Current theme (click for dark theme))",
      "div.setAttribute(data-tooltip,Current theme (click for dark theme))",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(aria-label,Anchor preview to text editor)",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(data-sphinx-preview-edit-mode,off)",
      "div.setAttribute(data-edit-mode,off)",
      "div.setAttribute(aria-pressed,false)",
      "div.setAttribute(title,Edit mode)",
      "div.setAttribute(data-tooltip,Edit mode)",
      "th.removeAttribute(tabindex)",
      "td.removeAttribute(tabindex)",
      "body.removeAttribute(data-sphinx-preview-sticky-headings-active)",
      "div.setAttribute(data-okf-descriptions-collapsed,true)",
      "button.setAttribute(aria-expanded,false)",
      "button.setAttribute(aria-label,Expand Description column)",
      "button.setAttribute(title,Expand Description column)",
      "div.addEventListener(load,fn,[object Object])",
    ],
    messageTypes: ["previewReady"],
    scrollY: 380,
  },
  "pending block navigation": {
    effects: [
      "div[50].appendChild(<input[myst-checkbox]>)",
      "th.appendChild(<span[okf-name-cell]>)",
      "td.appendChild(<span>)",
      "tr[lifecycle].appendChild(<th>)",
      "tr[lifecycle].appendChild(<td>)",
      "section.appendChild(<table>)",
      "table.appendChild(<tbody>)",
      "tbody.appendChild(<tr[lifecycle]>)",
      "div.setAttribute(data-sphinx-preview-document-id,file:///active.md)",
      "div.setAttribute(data-sphinx-preview-document-version,7)",
      "div.setAttribute(data-sphinx-preview-request-id,11)",
      "div.setAttribute(data-sphinx-preview-comments,on)",
      "button.addEventListener(click,fn)",
      "button.addEventListener(click,fn)",
      "div.setAttribute(data-sphinx-preview-theme-mode,current)",
      "div.setAttribute(data-theme-mode,current)",
      "div.setAttribute(aria-label,Preview theme: Current theme)",
      "div.setAttribute(title,Current theme (click for dark theme))",
      "div.setAttribute(data-tooltip,Current theme (click for dark theme))",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(aria-label,Anchor preview to text editor)",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(data-sphinx-preview-edit-mode,on)",
      "div.setAttribute(data-edit-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Exit edit mode)",
      "div.setAttribute(data-tooltip,Exit edit mode)",
      "th.setAttribute(tabindex,0)",
      "td.setAttribute(tabindex,0)",
      "div[sphinx-preview-insert-point].setAttribute(data-sphinx-insert-after-line,1)",
      "button.setAttribute(type,button)",
      "button.setAttribute(aria-label,Insert a block here)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button>)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(aria-label,Move the block above up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(data-sphinx-move,up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(disabled,)",
      "button[sphinx-preview-move sphinx-preview-move--up].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--up]>)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(aria-label,Move the block above down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(data-sphinx-move,down)",
      "button[sphinx-preview-move sphinx-preview-move--down].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--down]>)",
      "div[1].insertAdjacentElement(afterend,<div[sphinx-preview-insert-point]>)",
      "div[sphinx-preview-insert-point].setAttribute(data-sphinx-insert-after-line,52)",
      "button.setAttribute(type,button)",
      "button.setAttribute(aria-label,Insert a block here)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button>)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(aria-label,Move the block above up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(data-sphinx-move,up)",
      "button[sphinx-preview-move sphinx-preview-move--up].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--up]>)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(aria-label,Move the block above down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(data-sphinx-move,down)",
      "button[sphinx-preview-move sphinx-preview-move--down].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--down]>)",
      "div[50].insertAdjacentElement(afterend,<div[sphinx-preview-insert-point]>)",
      "div[sphinx-preview-insert-point].setAttribute(data-sphinx-insert-after-line,100)",
      "button.setAttribute(type,button)",
      "button.setAttribute(aria-label,Insert a block here)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button>)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(aria-label,Move the block above up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(data-sphinx-move,up)",
      "button[sphinx-preview-move sphinx-preview-move--up].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--up]>)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(aria-label,Move the block above down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(data-sphinx-move,down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(disabled,)",
      "button[sphinx-preview-move sphinx-preview-move--down].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--down]>)",
      "div[100].insertAdjacentElement(afterend,<div[sphinx-preview-insert-point]>)",
      "body.removeAttribute(data-sphinx-preview-sticky-headings-active)",
      "div.setAttribute(data-okf-descriptions-collapsed,true)",
      "button.setAttribute(aria-expanded,false)",
      "button.setAttribute(aria-label,Expand Description column)",
      "button.setAttribute(title,Expand Description column)",
      "div.addEventListener(load,fn,[object Object])",
      "div[sphinx-preview-block-editor].setAttribute(data-sphinx-preview-block-editor,true)",
      "div[sphinx-preview-block-editor].setAttribute(role,region)",
      "div[sphinx-preview-block-editor].setAttribute(aria-label,Raw Markdown editor)",
      "p.setAttribute(data-sphinx-preview-edit-status,)",
      "p.setAttribute(role,status)",
      "div[sphinx-preview-block-editor].addEventListener(click,fn)",
      "div[50].setAttribute(data-sphinx-preview-editing,true)",
      "div[50].insertAdjacentElement(afterend,<div[sphinx-preview-block-editor]>)",
      "div.setAttribute(data-sphinx-preview-block-editing,true)",
    ],
    messageTypes: ["previewEditOpen", "previewReady"],
    scrollY: 480,
  },
  "pending new field": {
    effects: [
      "div[50].appendChild(<input[myst-checkbox]>)",
      "th.appendChild(<span[okf-name-cell]>)",
      "td.appendChild(<span>)",
      "tr[lifecycle].appendChild(<th>)",
      "tr[lifecycle].appendChild(<td>)",
      "section.appendChild(<table>)",
      "table.appendChild(<tbody>)",
      "tbody.appendChild(<tr[lifecycle]>)",
      "div.setAttribute(data-sphinx-preview-document-id,file:///active.md)",
      "div.setAttribute(data-sphinx-preview-document-version,7)",
      "div.setAttribute(data-sphinx-preview-request-id,11)",
      "div.setAttribute(data-sphinx-preview-comments,on)",
      "button.addEventListener(click,fn)",
      "button.addEventListener(click,fn)",
      "div.setAttribute(data-sphinx-preview-theme-mode,current)",
      "div.setAttribute(data-theme-mode,current)",
      "div.setAttribute(aria-label,Preview theme: Current theme)",
      "div.setAttribute(title,Current theme (click for dark theme))",
      "div.setAttribute(data-tooltip,Current theme (click for dark theme))",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(aria-label,Anchor preview to text editor)",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(data-sphinx-preview-edit-mode,on)",
      "div.setAttribute(data-edit-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Exit edit mode)",
      "div.setAttribute(data-tooltip,Exit edit mode)",
      "th.setAttribute(tabindex,0)",
      "td.setAttribute(tabindex,0)",
      "div[sphinx-preview-insert-point].setAttribute(data-sphinx-insert-after-line,1)",
      "button.setAttribute(type,button)",
      "button.setAttribute(aria-label,Insert a block here)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button>)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(aria-label,Move the block above up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(data-sphinx-move,up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(disabled,)",
      "button[sphinx-preview-move sphinx-preview-move--up].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--up]>)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(aria-label,Move the block above down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(data-sphinx-move,down)",
      "button[sphinx-preview-move sphinx-preview-move--down].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--down]>)",
      "div[1].insertAdjacentElement(afterend,<div[sphinx-preview-insert-point]>)",
      "div[sphinx-preview-insert-point].setAttribute(data-sphinx-insert-after-line,52)",
      "button.setAttribute(type,button)",
      "button.setAttribute(aria-label,Insert a block here)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button>)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(aria-label,Move the block above up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(data-sphinx-move,up)",
      "button[sphinx-preview-move sphinx-preview-move--up].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--up]>)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(aria-label,Move the block above down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(data-sphinx-move,down)",
      "button[sphinx-preview-move sphinx-preview-move--down].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--down]>)",
      "div[50].insertAdjacentElement(afterend,<div[sphinx-preview-insert-point]>)",
      "div[sphinx-preview-insert-point].setAttribute(data-sphinx-insert-after-line,100)",
      "button.setAttribute(type,button)",
      "button.setAttribute(aria-label,Insert a block here)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button>)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(aria-label,Move the block above up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(data-sphinx-move,up)",
      "button[sphinx-preview-move sphinx-preview-move--up].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--up]>)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(aria-label,Move the block above down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(data-sphinx-move,down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(disabled,)",
      "button[sphinx-preview-move sphinx-preview-move--down].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--down]>)",
      "div[100].insertAdjacentElement(afterend,<div[sphinx-preview-insert-point]>)",
      "body.removeAttribute(data-sphinx-preview-sticky-headings-active)",
      "div.setAttribute(data-okf-descriptions-collapsed,true)",
      "button.setAttribute(aria-expanded,false)",
      "button.setAttribute(aria-label,Expand Description column)",
      "button.setAttribute(title,Expand Description column)",
      "div.addEventListener(load,fn,[object Object])",
      "div[sphinx-preview-frontmatter-editor sphinx-preview-frontmatter-value-editor].setAttribute(data-okf-frontmatter-editor,true)",
      "select.setAttribute(aria-label,Frontmatter lifecycle)",
      "select.appendChild(<option>)",
      "select.setAttribute(data-okf-empty-select,false)",
      "select.appendChild(<option>)",
      "select.appendChild(<option>)",
      "p.setAttribute(role,status)",
      "p.setAttribute(aria-live,polite)",
      "select.addEventListener(keydown,fn)",
      "select.addEventListener(blur,fn)",
      "div[sphinx-preview-frontmatter-editor sphinx-preview-frontmatter-value-editor].appendChild(<select>)",
      "div[sphinx-preview-frontmatter-editor sphinx-preview-frontmatter-value-editor].appendChild(<p>)",
      "td.setAttribute(data-okf-editing,true)",
      "span.setAttribute(hidden,)",
      "td.appendChild(<div[sphinx-preview-frontmatter-editor sphinx-preview-frontmatter-value-editor]>)",
      "div[sphinx-preview-frontmatter-menu].setAttribute(role,toolbar)",
      "div[sphinx-preview-frontmatter-menu].setAttribute(aria-label,Frontmatter field actions)",
      "div[sphinx-preview-frontmatter-menu].setAttribute(data-okf-frontmatter-menu,true)",
      "button.setAttribute(aria-label,Add frontmatter field)",
      "button.setAttribute(title,Add frontmatter field)",
      "button.setAttribute(data-tooltip,Add frontmatter field)",
      "button.setAttribute(data-okf-frontmatter-operation,add)",
      "button.appendChild(<span[sphinx-preview-frontmatter-menu-label]>)",
      "div[sphinx-preview-frontmatter-menu].appendChild(<button>)",
      "button.setAttribute(aria-label,Remove frontmatter field)",
      "button.setAttribute(title,Remove frontmatter field)",
      "button.setAttribute(data-tooltip,Remove frontmatter field)",
      "button.setAttribute(data-okf-frontmatter-operation,remove)",
      "button.appendChild(<span[sphinx-preview-frontmatter-menu-label]>)",
      "div[sphinx-preview-frontmatter-menu].appendChild(<button>)",
      "div[sphinx-preview-frontmatter-picker].setAttribute(hidden,)",
      "div[sphinx-preview-frontmatter-picker].setAttribute(role,group)",
      "div[sphinx-preview-frontmatter-picker].setAttribute(aria-label,Add frontmatter field)",
      "select.setAttribute(aria-label,Frontmatter field to add)",
      "select.appendChild(<option>)",
      "select.appendChild(<option>)",
      "select.appendChild(<option>)",
      "select.appendChild(<option>)",
      "button.setAttribute(aria-label,Add selected frontmatter field)",
      "button.setAttribute(title,Add selected frontmatter field)",
      "button.setAttribute(data-tooltip,Add selected frontmatter field)",
      "button.setAttribute(data-okf-frontmatter-operation,confirm-add)",
      "button.appendChild(<span[sphinx-preview-frontmatter-menu-label]>)",
      "select.addEventListener(change,fn)",
      "select.addEventListener(input,fn)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-frontmatter-picker].appendChild(<select>)",
      "div[sphinx-preview-frontmatter-picker].appendChild(<button>)",
      "div[sphinx-preview-frontmatter-menu].appendChild(<div[sphinx-preview-frontmatter-picker]>)",
      "button.addEventListener(click,fn)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-frontmatter-editor sphinx-preview-frontmatter-value-editor].appendChild(<div[sphinx-preview-frontmatter-menu]>)",
      "select.focus([object Object])",
    ],
    messageTypes: ["previewReady"],
    scrollY: 0,
  },
};

// T34: the host replaces the content of the loaded page with a message instead of loading a new
// document. The page keeps its runtime; the identifiers move to the new render.
function patchMessage(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: "previewContentPatch",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    next: { revision: 8, requestId: 12 },
    contentHtml: "<p>fresh</p>",
    status: "success",
    label: "Preview ready",
    diagnostics: [],
    ...extra,
  };
}

const NEXT_IDENTIFIERS = { documentId: "file:///active.md", revision: 8, requestId: 12 };

function messagesAfter(harness: RuntimeHarness, count: number): Array<Record<string, unknown>> {
  return harness.messages.slice(count);
}

test("T34: a content patch replaces the content, moves the identifiers and posts previewReady", () => {
  const harness = createRuntimeHarness();
  const before = harness.messages.length;
  harness.dispatchMessage(patchMessage());
  assert.equal(harness.previewContent.innerHTML, "<p>fresh</p>");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-document-version"), "8");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-request-id"), "12");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-document-id"), "file:///active.md");
  const ready = messagesAfter(harness, before).filter((message) => message.type === "previewReady");
  assert.equal(ready.length, 1, "exactly one previewReady");
  assert.deepEqual(
    { documentId: ready[0]!.documentId, revision: ready[0]!.revision, requestId: ready[0]!.requestId },
    NEXT_IDENTIFIERS,
  );
  assert.equal(typeof ready[0]!.descriptionsCollapsed, "boolean");
  assert.ok(harness.dispatchedEvents.includes("studio:content-replaced"), "Mermaid is told to render the new content");
});

test("CR 046: a patch that follows an outside change or an undo makes the updated blocks glow", () => {
  const harness = createRuntimeHarness();
  harness.mappings[0]!.setAttribute("data-line", "1");
  harness.mappings[1]!.setAttribute("data-line", "3");
  harness.dispatchMessage(patchMessage({ updatedRanges: [{ start: 3, end: 3 }] }));
  assert.equal(harness.mappings[1]!.getAttribute("data-sphinx-preview-updated"), "true");
  assert.equal(harness.mappings[0]!.getAttribute("data-sphinx-preview-updated"), null, "an unchanged block does not glow");
  harness.mappings[1]!.dispatch("animationend", { target: harness.mappings[1] });
  assert.equal(harness.mappings[1]!.getAttribute("data-sphinx-preview-updated"), null, "the glow goes when it has played");
});

test("CR 046: a patch of the preview's own edit, without updated ranges, glows nowhere", () => {
  const harness = createRuntimeHarness();
  harness.mappings[1]!.setAttribute("data-line", "3");
  harness.dispatchMessage(patchMessage());
  assert.equal(harness.mappings[1]!.getAttribute("data-sphinx-preview-updated"), null);
});

test("CR 046: the theme button fades the colours, a patch holds the soft appearance back", () => {
  const harness = createRuntimeHarness();
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-theme-switching"), null, "no transition on load");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-motion"), null, "no soft appearance on load");
  harness.dispatchWindow("pointerdown");
  harness.themeButton.dispatch("click");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-theme-switching"), "true");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-motion"), "on");
  harness.dispatchMessage(patchMessage());
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-motion"), null);
});

test("STAB-02: previewReady reports that no block editor is open on a fresh page", () => {
  const harness = createRuntimeHarness();
  const ready = harness.messages.find((message) => message.type === "previewReady");
  assert.ok(ready);
  assert.equal(ready.blockEditOpen, false);
});

test("STAB-02: a patch that closes an open block editor reports blockEditOpen false", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "- a\n",
  });
  assert.ok(harness.createdElements.some((element) => element.tagName === "TEXTAREA"), "an editor is open");
  const before = harness.messages.length;
  harness.dispatchMessage(patchMessage());
  const ready = messagesAfter(harness, before).filter((message) => message.type === "previewReady");
  assert.equal(ready.length, 1);
  assert.equal(ready[0]!.blockEditOpen, false, "the patch closed the editor before reporting ready");
});

test("T34: after a patch the page answers to the new identifiers only", () => {
  const harness = createRuntimeHarness();
  harness.dispatchMessage(patchMessage());
  harness.windowState.scrollY = 300;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  const scroll = harness.messages.at(-1)!;
  assert.deepEqual(
    { documentId: scroll.documentId, revision: scroll.revision, requestId: scroll.requestId },
    NEXT_IDENTIFIERS,
  );
  harness.dispatchMessage(propertiesMessage(cellMarkup("old identifiers")));
  assert.equal(harness.htmlInsertions.length, 0, "a message of the previous render is ignored");
  harness.dispatchMessage(propertiesMessage(cellMarkup("new identifiers"), {
    revision: 8,
    requestId: 12,
  }));
  assert.equal(harness.htmlInsertions.length, 1, "a message of the new render is applied");
  // The next patch is addressed to the identifiers the previous one introduced.
  harness.dispatchMessage(patchMessage({ contentHtml: "<p>stale</p>" }));
  assert.equal(harness.previewContent.innerHTML, "<p>fresh</p>", "a repeated patch for the old render is ignored");
  harness.dispatchMessage(patchMessage({
    revision: 8,
    requestId: 12,
    next: { revision: 9, requestId: 13 },
    contentHtml: "<p>third</p>",
  }));
  assert.equal(harness.previewContent.innerHTML, "<p>third</p>");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-request-id"), "13");
});

test("T34: a patch with stale or malformed fields is ignored", () => {
  const variants: Array<[string, Record<string, unknown>]> = [
    ["another request", { requestId: 12 }],
    ["another version", { revision: 8 }],
    ["another document", { documentId: "file:///other.md" }],
    ["numeric content", { contentHtml: 3 }],
    ["missing content", { contentHtml: undefined }],
    ["oversized content", { contentHtml: "x".repeat(20 * 1024 * 1024 + 1) }],
    ["missing next", { next: undefined }],
    ["null next", { next: null }],
    ["string next version", { next: { revision: "8", requestId: 12 } }],
    ["fractional next request", { next: { revision: 8, requestId: 12.5 } }],
    ["unsafe next version", { next: { revision: 2 ** 60, requestId: 12 } }],
    ["string anchor", { next: { revision: 8, requestId: 12, initialAnchor: "3" } }],
    ["infinite anchor", { next: { revision: 8, requestId: 12, initialAnchor: Infinity } }],
    ["malformed pin", { next: { revision: 8, requestId: 12, initialPin: { line: "1", viewportTop: 2 } } }],
    ["unknown status", { status: "weird" }],
    ["numeric label", { label: 3 }],
    ["long label", { label: "x".repeat(501) }],
    ["numeric message", { message: 3 }],
    ["non-array diagnostics", { diagnostics: "none" }],
    ["diagnostic without text", { diagnostics: [{ severity: "error" }] }],
    ["diagnostic with numeric severity", { diagnostics: [{ severity: 1, text: "a" }] }],
    ["too many diagnostics", { diagnostics: Array.from({ length: 501 }, () => ({ severity: "error", text: "a" })) }],
  ];
  for (const [name, extra] of variants) {
    const harness = createRuntimeHarness();
    const before = harness.messages.length;
    harness.dispatchMessage(patchMessage(extra));
    assert.equal(harness.previewContent.innerHTML, "", name + ": the content is untouched");
    assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-request-id"), "11", name);
    assert.equal(harness.messages.length, before, name + ": nothing is posted");
    assert.equal(harness.dispatchedEvents.length, 0, name + ": nothing is announced");
  }
});

test("T34: an open block editor is closed without a cancel or a save", () => {
  const harness = createRuntimeHarness();
  const textarea = openRawEditor(harness);
  assert.ok(textarea.parentElement, "the editor is open");
  const before = harness.messages.length;
  harness.dispatchMessage(patchMessage());
  const posted = messagesAfter(harness, before).map((message) => message.type);
  assert.deepEqual(posted, ["previewReady"], "only the ready report is posted");
  const editors = harness.createdElements.filter((element) =>
    element.getAttribute("data-sphinx-preview-block-editor") !== null);
  assert.ok(editors.length > 0 && editors.every((element) => element.removed), "the editor is gone");
  assert.equal(harness.refreshButton.disabled, false, "the refresh button works again");
  assert.equal(harness.previewContent.innerHTML, "<p>fresh</p>");
});

test("T34: an open frontmatter editor is closed and a deferred properties update is dropped", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  openFrontmatterValueEditor(harness);
  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") !== null)!;
  assert.ok(editor.parentElement, "the editor is open");
  harness.dispatchMessage(propertiesMessage(cellMarkup("deferred")));
  const before = harness.messages.length;
  harness.dispatchMessage(patchMessage());
  assert.equal(editor.parentElement, undefined, "the editor closed");
  assert.equal(harness.htmlInsertions.length, 0, "the deferred markup was not applied to the old section");
  assert.deepEqual(messagesAfter(harness, before).map((message) => message.type), ["previewReady"]);
  harness.dispatchMessage(propertiesMessage(cellMarkup("late"), { revision: 8, requestId: 12 }));
  assert.equal(harness.htmlInsertions.length, 1, "the next update is applied at once, nothing is deferred");
});

test("T34: the patch removes the pending overlay and the link tooltip", () => {
  const harness = createRuntimeHarness();
  harness.dispatchMessage(overlayMessage());
  assert.equal(pendingOverlays(harness).length, 1);
  const link = new RuntimeElement({
    class: "okf-frontmatter-link", "data-okf-link-status": "valid", title: "target",
  }, harness.windowState, 0, 10, "a");
  harness.dispatchDocument("mouseover", { target: link });
  const tooltips = () => harness.createdElements.filter((element) =>
    element.className === "sphinx-preview-link-tooltip" && element.parentElement !== undefined);
  assert.equal(tooltips().length, 1);
  harness.dispatchMessage(patchMessage());
  assert.equal(pendingOverlays(harness).length, 0, "the overlay is gone");
  assert.equal(tooltips().length, 0, "the tooltip is gone");
  assert.equal(link.getAttribute("title"), "target", "the link title was restored");
});

test("CR 050: a patch keeps the code of each status line and refuses a malformed one", () => {
  const harness = createRuntimeHarness({ previewStatus: "success" });
  harness.dispatchMessage(patchMessage({
    diagnostics: [
      { severity: "warning", text: "active.md:3: Warning: dollar math", code: "myst-extension" },
      { severity: "warning", text: "plain" },
    ],
  }));
  const region = harness.body.childElements.find((child) =>
    child.getAttribute("data-sphinx-preview-status") !== null && !child.removed)!;
  const list = region.childElements.find((child) => child.tagName === "UL")!;
  assert.deepEqual(list.childElements.map((item) => item.getAttribute("data-sphinx-preview-diagnostic-code")),
    ["myst-extension", null]);
  assert.equal(harness.previewContent.innerHTML, "<p>fresh</p>");
  harness.dispatchMessage(patchMessage({
    revision: 8,
    requestId: 12,
    next: { revision: 9, requestId: 13 },
    contentHtml: "<p>refused</p>",
    diagnostics: [{ severity: "warning", text: "x", code: 7 }],
  }));
  assert.equal(harness.previewContent.innerHTML, "<p>fresh</p>", "a code that is not a string refuses the patch");
});

test("T34: the patch rebuilds the status region from plain text", () => {
  const harness = createRuntimeHarness({ previewStatus: "success" });
  const old = harness.statusRegion!;
  assert.ok(old);
  harness.dispatchMessage(patchMessage({
    status: "stale",
    label: "Preview is stale",
    message: "Render <b>failed</b>",
    diagnostics: [
      { severity: "error", text: "inline.md:3:1: bad <script>alert(1)</script>" },
      { severity: "warning", text: "second" },
    ],
  }));
  assert.equal(old.removed, true, "the previous region was replaced");
  const region = harness.body.childElements.find((child) =>
    child.getAttribute("data-sphinx-preview-status") !== null)!;
  assert.ok(region, "a new region is in the body");
  assert.equal(region.tagName, "ASIDE");
  assert.equal(region.getAttribute("data-sphinx-preview-status"), "stale");
  assert.equal(region.getAttribute("role"), "status");
  assert.equal(region.getAttribute("aria-live"), "polite");
  const [label, message, list] = region.childElements;
  assert.equal(label?.tagName, "STRONG");
  assert.equal(label?.textContent, "Preview is stale");
  assert.equal(message?.tagName, "SPAN");
  assert.notEqual(message?.getAttribute("data-sphinx-preview-status-message"), null);
  assert.equal(message?.textContent, "Render <b>failed</b>");
  assert.equal(list?.tagName, "UL");
  assert.notEqual(list?.getAttribute("data-sphinx-preview-diagnostics"), null);
  assert.deepEqual(list?.childElements.map((item) => [
    item.tagName,
    item.getAttribute("data-sphinx-preview-diagnostic-severity"),
    item.textContent,
  ]), [
    ["LI", "error", "inline.md:3:1: bad <script>alert(1)</script>"],
    ["LI", "warning", "second"],
  ]);
  for (const element of harness.createdElements) {
    assert.equal(element.innerHTML, "", "no status field goes through innerHTML");
  }
  // A status without message and diagnostics has neither element.
  harness.dispatchMessage(patchMessage({
    revision: 8,
    requestId: 12,
    next: { revision: 9, requestId: 13 },
    status: "success",
    label: "Preview ready",
  }));
  assert.equal(region.removed, true);
  const next = harness.body.childElements.find((child) =>
    child.getAttribute("data-sphinx-preview-status") !== null && !child.removed)!;
  assert.equal(next.getAttribute("data-sphinx-preview-status"), "success");
  assert.deepEqual(next.childElements.map((child) => child.tagName), ["STRONG"]);
});

test("T34: a page loaded without a status region gets one as the first child of the body", () => {
  const harness = createRuntimeHarness();
  assert.equal(harness.statusRegion, null);
  harness.dispatchMessage(patchMessage({ status: "recovery", label: "Preview recovered" }));
  const regions = harness.body.childElements.filter((child) =>
    child.getAttribute("data-sphinx-preview-status") !== null);
  assert.equal(regions.length, 1);
  assert.equal(regions[0]!.getAttribute("data-sphinx-preview-status"), "recovery");
});

test("T34: open disclosures of the old content are open again in the new content", () => {
  const harness = createRuntimeHarness();
  const make = (): RuntimeElement[] => [0, 1, 2].map(() => {
    const element = new RuntimeElement({}, harness.windowState, 0, 10, "details");
    (element as unknown as { open: boolean }).open = false;
    return element;
  });
  const asOpen = (element: RuntimeElement): boolean => (element as unknown as { open: boolean }).open;
  const old = make();
  (old[0] as unknown as { open: boolean }).open = true;
  (old[2] as unknown as { open: boolean }).open = true;
  harness.details.push(...old);
  const fresh = make();
  Object.defineProperty(harness.previewContent, "innerHTML", {
    configurable: true,
    get: () => "",
    set: () => { harness.details.splice(0, harness.details.length, ...fresh); },
  });
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(fresh.map(asOpen), [true, false, true]);
});

test("T34: a patch with an anchor or a pin positions the page like a loaded page", () => {
  const anchored = createRuntimeHarness({ initialAnchor: 50 });
  assert.ok(anchored.windowState.scrollY > 0, "the reference page scrolls to the anchor");
  const patched = createRuntimeHarness();
  assert.equal(patched.windowState.scrollY, 0);
  patched.dispatchMessage(patchMessage({ next: { revision: 8, requestId: 12, initialAnchor: 50 } }));
  assert.equal(patched.windowState.scrollY, anchored.windowState.scrollY);

  const pinned = createRuntimeHarness({ initialPin: { line: 50, viewportTop: 120 } });
  const pinnedReady = pinned.messages.find((message) => message.type === "previewReady")!;
  assert.equal(typeof pinnedReady.anchorLine, "number", "the reference page reports the pinned anchor");
  const patchedPin = createRuntimeHarness();
  const before = patchedPin.messages.length;
  patchedPin.dispatchMessage(patchMessage({
    next: { revision: 8, requestId: 12, initialPin: { line: 50, viewportTop: 120 } },
  }));
  assert.equal(patchedPin.windowState.scrollY, pinned.windowState.scrollY);
  const ready = messagesAfter(patchedPin, before).find((message) => message.type === "previewReady")!;
  assert.equal(ready.anchorLine, pinnedReady.anchorLine);

  // The pin is for one render: the next patch without one does not report a pinned anchor.
  const before2 = patchedPin.messages.length;
  patchedPin.dispatchMessage(patchMessage({
    revision: 8,
    requestId: 12,
    next: { revision: 9, requestId: 13 },
  }));
  const ready2 = messagesAfter(patchedPin, before2).find((message) => message.type === "previewReady")!;
  assert.equal(ready2.anchorLine, undefined);
});

test("T34: a patch keeps the scroll position when the host sends no anchor", () => {
  const harness = createRuntimeHarness();
  harness.windowState.scrollY = 240;
  harness.dispatchMessage(patchMessage());
  assert.equal(harness.windowState.scrollY, 240);
});

test("T34: a pending checkbox toggle of the old content cannot revert the new content", () => {
  const harness = createRuntimeHarness();
  harness.checkbox.checked = true;
  harness.dispatchDocument("click", { target: harness.checkbox, stopImmediatePropagation: noop, preventDefault: noop });
  const toggle = harness.messages.find((message) => message.type === "previewCheckboxToggle")!;
  assert.ok(toggle, "the toggle was posted");
  harness.dispatchMessage(patchMessage());
  harness.dispatchMessage({
    type: "previewCheckboxResult",
    ...NEXT_IDENTIFIERS,
    editId: toggle.editId,
    error: "late failure",
  });
  assert.equal(harness.checkbox.checked, true, "the late result did not touch a checkbox");
});

function linkElement(harness: RuntimeHarness, request: string, attributes: Record<string, string> = {}): RuntimeElement {
  return new RuntimeElement({ "data-sphinx-preview-navigation": request, ...attributes },
    harness.windowState, 0, 10, "a");
}

test("T34: links of the new content keep known target hints and discover new targets", () => {
  const harness = createRuntimeHarness({ intersectionObserver: true });
  const known = linkElement(harness, "Known", {
    "data-sphinx-preview-link-state": "available",
    title: "/ws/Known.md",
  });
  const unavailable = linkElement(harness, "Missing", {
    "data-sphinx-preview-link-state": "unavailable",
    title: "not found",
  });
  harness.contentLinks.push(known, unavailable);
  const freshKnown = linkElement(harness, "Known");
  const freshMissing = linkElement(harness, "Missing");
  const typed = linkElement(harness, "Typed");
  Object.defineProperty(harness.previewContent, "innerHTML", {
    configurable: true,
    get: () => "",
    set: () => { harness.contentLinks.splice(0, harness.contentLinks.length, freshKnown, freshMissing, typed); },
  });
  harness.dispatchMessage(patchMessage());
  assert.equal(freshKnown.getAttribute("data-sphinx-preview-link-state"), "available");
  assert.equal(freshKnown.getAttribute("title"), "/ws/Known.md");
  assert.equal(freshMissing.getAttribute("data-sphinx-preview-link-state"), "unavailable");
  assert.equal(freshMissing.getAttribute("title"), "not found");
  assert.equal(typed.getAttribute("data-sphinx-preview-link-state"), null, "a new link has no hint yet");
  assert.ok(harness.observedLinks.includes(typed), "the new link is observed for discovery");

  const before = harness.messages.length;
  harness.intersect(typed);
  harness.flushMicrotasks();
  const discover = messagesAfter(harness, before).find((message) => message.type === "previewLinkDiscover")!;
  assert.ok(discover, "entering the viewport asks the host for the target");
  assert.deepEqual(Array.from(discover.requests as string[]), ["Typed"]);
  assert.equal(discover.revision, 8);
  assert.equal(discover.requestId, 12);
  harness.dispatchMessage({
    type: "previewLinkTargets",
    ...NEXT_IDENTIFIERS,
    targets: [{ request: "Typed", kind: "local", path: "/ws/Typed.md" }],
  });
  assert.equal(typed.getAttribute("data-sphinx-preview-link-state"), "local");
  assert.equal(typed.getAttribute("title"), "/ws/Typed.md");
});

test("T34: edit mode rebuilds the insertion points for the new content", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  const insertedBefore = harness.mappings.reduce((count, mapping) => count + mapping.insertedElements.length, 0);
  assert.ok(insertedBefore > 0, "edit mode has insertion points");
  harness.dispatchMessage(patchMessage());
  const insertedAfter = harness.mappings.reduce((count, mapping) => count + mapping.insertedElements.length, 0);
  assert.equal(insertedAfter, insertedBefore * 2, "the points were built again for the (new) blocks");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-edit-mode"), "on", "edit mode stays on");
});

test("T34: pending block navigation resumes after a content patch", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: noop });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "Current block\n",
  });
  const textarea = harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1)!;
  assert.ok(textarea);
  // A changed block is saved before the editing moves on, so the navigation has to wait for the render.
  textarea.value = "Current block, changed\n";
  textarea.dispatch("input");
  const end = textarea.value.length;
  textarea.setSelectionRange(end, end);
  let prevented = false;
  textarea.dispatch("keydown", { key: "ArrowDown", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(harness.messages.at(-1)?.type, "previewEditSave");
  assert.equal(harness.messages.at(-1)?.final, true);
  const pending = harness.getWebviewState().pendingBlockNavigation as Record<string, unknown> | undefined;
  assert.equal(pending?.sourceLine, 100);
  assert.equal(pending?.caretPosition, "start");

  // The render of the saved block arrives as a patch.
  const before = harness.messages.length;
  harness.dispatchMessage(patchMessage());
  const open = messagesAfter(harness, before).find((message) => message.type === "previewEditOpen");
  assert.ok(open, "the next block is opened after the patch");
  assert.equal(open.line, 100);
  assert.deepEqual(
    { documentId: open.documentId, revision: open.revision, requestId: open.requestId },
    NEXT_IDENTIFIERS,
  );
  assert.equal(harness.getWebviewState().pendingBlockNavigation, undefined, "the navigation is spent");
  harness.dispatchMessage({
    type: "previewEditSource",
    ...NEXT_IDENTIFIERS,
    editId: open.editId,
    originalText: "Next block\n",
  });
  const next = harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1)!;
  assert.notEqual(next, textarea, "a new editor is open");
  assert.deepEqual(next.selectionRange, [0, 0], "the caret is at the start");
});

test("T34: patches sent before the page acknowledged the previous one apply in order", () => {
  const harness = createRuntimeHarness();
  const before = harness.messages.length;
  // The host addresses the second patch to the identifiers the first one introduces.
  harness.dispatchMessage(patchMessage({ contentHtml: "<p>one</p>" }));
  harness.dispatchMessage(patchMessage({
    revision: 8,
    requestId: 12,
    next: { revision: 9, requestId: 13 },
    contentHtml: "<p>two</p>",
  }));
  harness.dispatchMessage(patchMessage({
    revision: 9,
    requestId: 13,
    next: { revision: 10, requestId: 14 },
    contentHtml: "<p>three</p>",
  }));
  assert.equal(harness.previewContent.innerHTML, "<p>three</p>");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-request-id"), "14");
  const ready = messagesAfter(harness, before).filter((message) => message.type === "previewReady");
  assert.deepEqual(ready.map((message) => message.requestId), [12, 13, 14], "one ready report per patch, in order");
});

test("T34: when a patch of a chain is rejected, the later ones are ignored and nothing is acknowledged", () => {
  const harness = createRuntimeHarness();
  const before = harness.messages.length;
  harness.dispatchMessage(patchMessage({ status: "weird", contentHtml: "<p>rejected</p>" }));
  harness.dispatchMessage(patchMessage({
    revision: 8,
    requestId: 12,
    next: { revision: 9, requestId: 13 },
    contentHtml: "<p>orphan</p>",
  }));
  assert.equal(harness.previewContent.innerHTML, "");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-request-id"), "11");
  assert.equal(messagesAfter(harness, before).length, 0, "no ready report, so the host's 2 s fallback loads the page");
});


// Editor keyboard bugs (hotkey-editing backlog): wrapped-line Up/Down, undo, wrapping markers.

function arrowAt(
  control: RuntimeElement,
  key: string,
  position: number,
): { prevented: boolean } {
  control.setSelectionRange(position, position);
  const result = { prevented: false };
  control.dispatch("keydown", { key, preventDefault: () => { result.prevented = true; } });
  return result;
}

test("ArrowUp/ArrowDown inside a wrapped logical line move the caret instead of leaving the block", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "one very long paragraph that wraps over several visual lines in the editor";
  let probed: RuntimeElement | undefined;
  harness.window.okfCaretLineProbe = (control: RuntimeElement) => {
    probed = control;
    return { first: false, last: false };
  };
  const count = harness.messages.length;
  assert.equal(arrowAt(textarea, "ArrowUp", 40).prevented, false);
  assert.equal(arrowAt(textarea, "ArrowDown", 40).prevented, false);
  assert.equal(arrowAt(textarea, "ArrowUp", 0).prevented, false, "first logical line, not first visual line");
  assert.equal(arrowAt(textarea, "ArrowDown", textarea.value.length).prevented, false);
  assert.equal(probed, textarea);
  assert.equal(harness.messages.length, count, "no navigation message");
  assert.equal(harness.messages.some((message) => message.type === "previewEditOpen" && message.line === 1), false);
});

test("ArrowUp/ArrowDown leave the block only on the first/last visual line", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "one very long paragraph that wraps over several visual lines in the editor";
  harness.window.okfCaretLineProbe = () => ({ first: true, last: false });
  const up = arrowAt(textarea, "ArrowUp", 10);
  assert.equal(up.prevented, true);
  assert.equal(harness.messages.at(-1)?.type, "previewEditSave", "the unchanged block moves on");
});

test("a table cell arrow inside a wrapped cell does not move to another cell", () => {
  const harness = createRuntimeHarness();
  const { cells, input } = openTableCellEditorForTab(harness);
  input().value = "a long cell that wraps";
  harness.window.okfCaretLineProbe = () => ({ first: false, last: false });
  const count = harness.messages.length;
  assert.equal(arrowAt(input(), "ArrowDown", 22).prevented, false);
  assert.equal(arrowAt(input(), "ArrowUp", 0).prevented, false);
  assert.equal(cellEditorOf(harness).parentElement, cells[1][0]);
  assert.equal(harness.messages.length, count);
  harness.window.okfCaretLineProbe = () => ({ first: false, last: true });
  assert.equal(arrowAt(input(), "ArrowDown", 22).prevented, true);
  assert.equal(cellEditorOf(harness).parentElement, cells[2][0]);
});

type ExecCall = { command: string; text?: string };

/** Emulates the browser's insertText/delete on the textarea in focus, recording the calls. */
function stubExecCommand(harness: ReturnType<typeof createRuntimeHarness>, control: RuntimeElement): ExecCall[] {
  const calls: ExecCall[] = [];
  harness.document.execCommand = (command: string, _ui: boolean, text?: string): boolean => {
    calls.push({ command, text });
    const start = control.selectionStart;
    const end = control.selectionEnd;
    const inserted = command === "delete" ? "" : String(text);
    control.value = control.value.slice(0, start) + inserted + control.value.slice(end);
    control.setSelectionRange(start + inserted.length, start + inserted.length);
    control.dispatch("input");
    return true;
  };
  return calls;
}

function typeKey(control: RuntimeElement, key: string, init: Record<string, unknown> = {}): boolean {
  let prevented = false;
  control.dispatch("keydown", { key, ...init, preventDefault: () => { prevented = true; } });
  return prevented;
}

test("typing * or _ on a selection wraps it, keeps it selected and wraps again on a second press", () => {
  for (const marker of ["*", "_", "`", "~"]) {
    const harness = createRuntimeHarness();
    const textarea = openBlockEditorWithSource(harness);
    const calls = stubExecCommand(harness, textarea);
    textarea.value = "say foo now";
    textarea.setSelectionRange(4, 7);
    assert.equal(typeKey(textarea, marker), true, marker);
    assert.equal(textarea.value, "say " + marker + "foo" + marker + " now");
    assert.deepEqual(textarea.selectionRange, [5, 8], "foo stays selected");
    assert.equal(typeKey(textarea, marker), true);
    assert.equal(textarea.value, "say " + marker + marker + "foo" + marker + marker + " now");
    assert.deepEqual(textarea.selectionRange, [6, 9]);
    assert.equal(calls.length, 2, "one undoable native edit per wrap");
    assert.equal(calls[0].command, "insertText");
  }
});

test("marker wrapping falls back to a direct edit and autosaves when execCommand is unavailable", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "foo";
  textarea.setSelectionRange(0, 3);
  assert.equal(typeKey(textarea, "*"), true);
  assert.equal(textarea.value, "*foo*");
  assert.deepEqual(textarea.selectionRange, [1, 4]);
  harness.flushTimers();
  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewEditSave");
  assert.equal(save?.editedText, "*foo*\n");
});

test("marker keys stay native without a selection, with modifiers or during IME composition", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "foo";
  textarea.setSelectionRange(1, 1);
  assert.equal(typeKey(textarea, "*"), false, "caret only");
  textarea.setSelectionRange(0, 3);
  assert.equal(typeKey(textarea, "*", { isComposing: true }), false);
  assert.equal(typeKey(textarea, "*", { ctrlKey: true }), false);
  assert.equal(typeKey(textarea, "*", { metaKey: true }), false);
  assert.equal(typeKey(textarea, "a"), false);
  assert.equal(typeKey(textarea, "Dead"), false);
  assert.equal(textarea.value, "foo");
});

test("a table cell wraps its selection with the marker too", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  const calls = stubExecCommand(harness, input());
  input().value = "a foo b";
  input().setSelectionRange(2, 5);
  assert.equal(typeKey(input(), "_"), true);
  assert.equal(input().value, "a _foo_ b");
  assert.deepEqual(input().selectionRange, [3, 6]);
  assert.equal(calls.length, 1);
  harness.flushTimers();
  assert.match(String(harness.messages.at(-1)?.editedText ?? ""), /_foo_/u);
});

test("Cmd/Ctrl+B, Cmd/Ctrl+I and Ctrl+/ edit the block text box in one native step without saving", () => {
  const cases: [Record<string, unknown>, string, [number, number], string][] = [
    [{ ctrlKey: true, code: "KeyB", key: "b" }, "say foo now", [4, 7], "say **foo** now"],
    [{ ctrlKey: true, code: "KeyI", key: "i" }, "say foo now", [4, 7], "say *foo* now"],
    [{ ctrlKey: true, code: "Slash", key: "/" }, "say foo", [0, 0], "<!-- TODO: say foo -->"],
    [{ metaKey: true, code: "Slash", key: "/" }, "say foo", [0, 0], "<!-- TODO: say foo -->"],
  ];
  for (const [init, value, [start, end], expected] of cases) {
    const harness = createRuntimeHarness();
    const textarea = openBlockEditorWithSource(harness);
    const calls = stubExecCommand(harness, textarea);
    textarea.value = value;
    textarea.setSelectionRange(start, end);
    const count = harness.messages.length;
    let stopped = false;
    let prevented = false;
    textarea.dispatch("keydown", {
      ...init,
      preventDefault: () => { prevented = true; },
      stopPropagation: () => { stopped = true; },
    });
    assert.equal(prevented, true, JSON.stringify(init));
    assert.equal(stopped, true, "the shortcut stays out of the host editor");
    assert.equal(textarea.value, expected);
    assert.equal(calls.length, 1, "one undoable native edit");
    assert.equal(calls[0].command, "insertText");
    assert.equal(harness.messages.length, count, "no immediate save or commit");
    harness.flushTimers();
    const save = harness.messages.at(-1);
    assert.equal(save?.type, "previewEditSave");
    assert.equal(String(save?.editedText).startsWith(expected), true, "autosave carries the edit");
  }
});

test("editing shortcuts are ignored while composing, with AltGr or with Shift", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  textarea.value = "foo";
  textarea.setSelectionRange(0, 3);
  for (const init of [
    { metaKey: true, code: "KeyB", key: "b", isComposing: true },
    { ctrlKey: true, altKey: true, code: "Slash", key: "/" },
    { ctrlKey: true, shiftKey: true, code: "KeyI", key: "i" },
    { metaKey: true, code: "KeyB", key: "b" },
  ]) {
    assert.equal(typeKey(textarea, String(init.key), init), false, JSON.stringify(init));
  }
  assert.equal(textarea.value, "foo");
  assert.equal(calls.length, 0);
});

test("the editing shortcuts do not touch the table cell editor", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  const calls = stubExecCommand(harness, input());
  input().value = "a foo b";
  input().setSelectionRange(2, 5);
  assert.equal(typeKey(input(), "b", { metaKey: true, code: "KeyB" }), false);
  assert.equal(input().value, "a foo b");
  assert.equal(calls.length, 0);
});

test("Enter continuation and Tab indentation use the undo-preserving execCommand path", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  textarea.value = "- a";
  textarea.setSelectionRange(3, 3);
  assert.equal(typeKey(textarea, "Enter"), true);
  assert.equal(textarea.value, "- a\n- ");
  assert.equal(typeKey(textarea, "Tab"), true);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.command === "insertText"));
});

test("undo and redo keys stop at the table cell editor and reach no window listener", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  let windowSaw = 0;
  (harness.window.addEventListener as (type: string, listener: () => void) => void)("keydown", () => { windowSaw += 1; });
  for (const init of [
    { key: "z", keyCode: 90, metaKey: true },
    { key: "Z", keyCode: 90, ctrlKey: true, shiftKey: true },
    { key: "y", ctrlKey: true },
  ]) {
    let stopped = 0;
    let prevented = 0;
    input().dispatch("keydown", {
      ...init,
      stopPropagation: () => { stopped += 1; },
      preventDefault: () => { prevented += 1; },
    });
    assert.equal(stopped, 1, JSON.stringify(init));
    assert.equal(prevented, 0, JSON.stringify(init));
  }
  assert.equal(windowSaw, 0);
});

test("AltGr (ctrlKey and altKey with AltGraph) still wraps the selection, plain Ctrl+Alt does not", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "foo";
  textarea.setSelectionRange(0, 3);
  assert.equal(typeKey(textarea, "~", { ctrlKey: true, altKey: true }), false);
  assert.equal(typeKey(textarea, "~", { ctrlKey: true, altKey: true, getModifierState: () => false }), false);
  assert.equal(textarea.value, "foo");
  assert.equal(typeKey(textarea, "~", {
    ctrlKey: true,
    altKey: true,
    getModifierState: (name: string) => name === "AltGraph",
  }), true);
  assert.equal(textarea.value, "~foo~");
});

const FIRST_EDITOR_CLASS = "sphinx-preview-block-editor--first";
const FIRST_START_CLASS = "sphinx-preview-insert-point--first";

function openBlockEditorElement(harness: RuntimeHarness): RuntimeElement | undefined {
  return harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-preview-block-editor") === "true" && !element.removed);
}

function openEmptyDocumentEditor(harness: RuntimeHarness): void {
  harness.dispatchDocument("keydown", {
    key: "Enter",
    target: harness.previewContent,
    preventDefault: () => undefined,
  });
}

test("top spacing: the editor of the first block of the document carries the first-block class", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  harness.dispatchDocument("click", { target: harness.mappings[0], preventDefault: () => undefined });
  sourceReply(harness, "# Title\n");
  const editor = openBlockEditorElement(harness);
  assert.ok(editor);
  assert.ok(editor.className.split(" ").includes(FIRST_EDITOR_CLASS), editor.className);
});

test("top spacing: the editor of a later block does not carry the first-block class", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  sourceReply(harness, "Editable paragraph.\n");
  const editor = openBlockEditorElement(harness);
  assert.ok(editor);
  assert.equal(editor.className.split(" ").includes(FIRST_EDITOR_CLASS), false);
});

test("top spacing: an insertion editor below another block is not the first-block editor", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  insertPointAfterLine(harness, 52).childElements[0].dispatch("click", {
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  sourceReply(harness, "", { insertAfterLine: 52 });
  const editor = openBlockEditorElement(harness);
  assert.ok(editor);
  assert.equal(editor.className.split(" ").includes(FIRST_EDITOR_CLASS), false);
});

test("top spacing: the first body block below a properties table is not the first-block editor", () => {
  const harness = createRuntimeHarness({
    mapFrontmatter: true,
    propertiesMapped: true,
    savedState: { editMode: true },
  });
  const properties = harness.mappings.find((block) => block.getAttribute("data-okf-properties") !== null);
  const first = harness.mappings.find((block) => block !== properties);
  assert.ok(first);
  harness.dispatchDocument("click", { target: first, preventDefault: () => undefined });
  sourceReply(harness, "First block.\n");
  const editor = openBlockEditorElement(harness);
  assert.ok(editor);
  assert.equal(editor.className.split(" ").includes(FIRST_EDITOR_CLASS), false);
});

test("top spacing: Start writing of an empty document carries the first class, below properties not", () => {
  const empty = createRuntimeHarness({
    emptyBody: true,
    previewStatus: "success",
    savedState: { editMode: true },
  });
  assert.ok(insertPointsOf(empty)[0].className.split(" ").includes(FIRST_START_CLASS));
  const withProperties = createRuntimeHarness({
    emptyBody: true,
    mapFrontmatter: true,
    propertiesMapped: true,
    previewStatus: "success",
    savedState: { editMode: true },
  });
  assert.equal(insertPointsOf(withProperties)[0].className.split(" ").includes(FIRST_START_CLASS), false);
});

test("top spacing: the editor opened from Start writing carries the first-block class", () => {
  const harness = createRuntimeHarness({
    emptyBody: true,
    previewStatus: "success",
    savedState: { editMode: true },
  });
  insertPointAfterLine(harness, 0).childElements[0].dispatch("click", {
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  sourceReply(harness, "", { insertAfterLine: 0 });
  const editor = openBlockEditorElement(harness);
  assert.ok(editor);
  assert.ok(editor.className.split(" ").includes(FIRST_EDITOR_CLASS), editor.className);
});

test("empty document: Enter in edit mode opens the new-block editor like Start writing", () => {
  const harness = createRuntimeHarness({
    emptyBody: true,
    previewStatus: "success",
    savedState: { editMode: true },
  });
  let prevented = false;
  harness.dispatchDocument("keydown", {
    key: "Enter",
    target: harness.previewContent,
    preventDefault: () => { prevented = true; },
  });
  const open = harness.messages.at(-1);
  assert.equal(open?.type, "previewEditOpen");
  assert.equal(open?.line, 1);
  assert.equal(open?.endLine, 1);
  assert.equal(open?.insertAfterLine, 0);
  assert.equal(prevented, true);
});

test("empty document: Enter with a modifier, in a field, outside edit mode or on a filled document does nothing", () => {
  const opens = (harness: RuntimeHarness, event: Record<string, unknown>): boolean => {
    const before = harness.messages.length;
    harness.dispatchDocument("keydown", {
      key: "Enter",
      target: harness.previewContent,
      preventDefault: () => undefined,
      ...event,
    });
    return harness.messages.slice(before).some((message) => message.type === "previewEditOpen");
  };
  const emptyOptions = { emptyBody: true, previewStatus: "success", savedState: { editMode: true } };
  for (const modifier of ["shiftKey", "altKey", "metaKey", "ctrlKey"]) {
    assert.equal(opens(createRuntimeHarness(emptyOptions), { [modifier]: true }), false, modifier);
  }
  assert.equal(opens(createRuntimeHarness(emptyOptions), { isComposing: true }), false);
  assert.equal(opens(createRuntimeHarness(emptyOptions), { target: new RuntimeElement({}, { scrollY: 0 }, 0, 20, "textarea") }), false);
  assert.equal(opens(createRuntimeHarness(emptyOptions), { target: new RuntimeElement({}, { scrollY: 0 }, 0, 20, "input") }), false);
  assert.equal(opens(createRuntimeHarness({ emptyBody: true, previewStatus: "success" }), {}), false, "reading mode");
  assert.equal(opens(createRuntimeHarness({ emptyBody: true, previewStatus: "error", savedState: { editMode: true } }), {}), false, "failed render");
  assert.equal(opens(createRuntimeHarness({ savedState: { editMode: true } }), {}), false, "document with blocks");
  const harness = createRuntimeHarness(emptyOptions);
  assert.equal(opens(harness, {}), true);
  assert.equal(opens(harness, {}), false, "an editor is already open");
});

test("empty document: Cmd/Ctrl+Enter saves the new block and Escape cancels back to Start writing", () => {
  const save = createRuntimeHarness({
    emptyBody: true,
    previewStatus: "success",
    savedState: { editMode: true },
  });
  openEmptyDocumentEditor(save);
  sourceReply(save, "", { insertAfterLine: 0 });
  const textarea = save.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.value = "# Hello";
  textarea.dispatch("input");
  textarea.dispatch("keydown", { key: "Enter", metaKey: true, preventDefault: () => undefined });
  const saved = save.messages.at(-1);
  assert.equal(saved?.type, "previewEditSave");
  assert.equal(saved?.final, true);
  assert.equal(saved?.insertAfterLine, 0);
  assert.equal(saved?.editedText, "# Hello");

  const cancel = createRuntimeHarness({
    emptyBody: true,
    previewStatus: "success",
    savedState: { editMode: true },
  });
  openEmptyDocumentEditor(cancel);
  sourceReply(cancel, "", { insertAfterLine: 0 });
  const field = cancel.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(field);
  field.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(cancel.messages.some((message) => message.type === "previewEditSave"), false);
  const point = insertPointsOf(cancel)[0];
  assert.ok(point, "Start writing is still there");
  assert.equal(point.getAttribute("data-sphinx-preview-editing"), null);
  assert.equal(openBlockEditorElement(cancel), undefined);
});

test("ArrowUp from the first body block under a properties table keeps the editor open", () => {
  const harness = createRuntimeHarness({
    firstMappedSourceLine: 5,
    mapFrontmatter: true,
    propertiesMapped: true,
    savedState: { editMode: true },
  });
  const first = harness.mappings[0];
  harness.dispatchDocument("click", { target: first, preventDefault: () => undefined });
  const request = harness.messages.at(-1);
  assert.equal(request?.type, "previewEditOpen");
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: request?.editId,
    originalText: "Current block\n",
  });
  const textarea = harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1);
  assert.ok(textarea);
  textarea.setSelectionRange(0, 0);
  const before = harness.messages.length;
  textarea.dispatch("keydown", { key: "ArrowUp", preventDefault: () => undefined });
  assert.equal(harness.messages.slice(before).some((message) => message.final === true), false);
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewEditOpen"), false);
  assert.equal(harness.messages.length, before, "no message is posted");
  assert.equal(first.getAttribute("data-sphinx-preview-editing"), "true", "the editor stays open");
});

test("T08: zoom buttons set the zoom variable, post the preference and keep the state", () => {
  const harness = createRuntimeHarness();
  const root = harness.documentElement;
  assert.equal(root.style.getPropertyValue("--sphinx-preview-zoom"), "1");
  assert.equal(root.getAttribute("data-sphinx-preview-zoom"), "100");
  assert.equal(harness.zoomInButton.getAttribute("data-tooltip"), "Zoom in (110 %)");
  assert.equal(harness.zoomOutButton.getAttribute("data-tooltip"), "Zoom out (90 %)");

  const before = harness.messages.length;
  harness.zoomInButton.dispatch("click");
  assert.equal(root.style.getPropertyValue("--sphinx-preview-zoom"), "1.1");
  assert.equal(root.getAttribute("data-sphinx-preview-zoom"), "110");
  assert.equal(harness.zoomOutButton.getAttribute("data-tooltip"), "Zoom out (100 %)");
  const posted = harness.messages.slice(before).filter((m) => m.type === "previewViewPreferenceChanged");
  assert.equal(posted.length, 1);
  assert.equal(posted[0].preference, "zoom");
  assert.equal(posted[0].value, 110);
  assert.equal(posted[0].documentId, "file:///active.md");
  assert.equal(harness.getWebviewState().viewZoom, 110);
  harness.zoomOutButton.dispatch("click");
  harness.zoomOutButton.dispatch("click");
  assert.equal(root.getAttribute("data-sphinx-preview-zoom"), "90");
  assert.equal(harness.messages.at(-1)?.value, 90);
});

test("T08: the zoom limits disable the buttons and post nothing more", () => {
  const low = createRuntimeHarness({ initialViewPreferences: { zoom: 80, widthMode: "margin", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: false } });
  assert.equal(low.zoomOutButton.disabled, false);
  low.zoomOutButton.dispatch("click");
  assert.equal(low.documentElement.getAttribute("data-sphinx-preview-zoom"), "70");
  assert.equal(low.zoomOutButton.disabled, true);
  assert.equal(low.zoomInButton.disabled, false);
  const count = low.messages.length;
  low.zoomOutButton.dispatch("click");
  assert.equal(low.documentElement.getAttribute("data-sphinx-preview-zoom"), "70");
  assert.equal(low.messages.length, count);

  const high = createRuntimeHarness({ initialViewPreferences: { zoom: 200, widthMode: "margin", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: false } });
  assert.equal(high.zoomInButton.disabled, true);
  assert.equal(high.zoomOutButton.disabled, false);
  assert.equal(high.documentElement.style.getPropertyValue("--sphinx-preview-zoom"), "2");
});

test("T08: saved webview state wins over the initial context", () => {
  const harness = createRuntimeHarness({
    initialViewPreferences: { zoom: 150, widthMode: "margin", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: false },
    savedState: { viewZoom: 120 },
  });
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-zoom"), "120");
  const initialOnly = createRuntimeHarness({
    initialViewPreferences: { zoom: 150, widthMode: "margin", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: false },
  });
  assert.equal(initialOnly.documentElement.getAttribute("data-sphinx-preview-zoom"), "150");
});

function widthModeFixture(initial?: string) {
  const harness = createRuntimeHarness(initial
    ? { initialViewPreferences: { zoom: 100, widthMode: initial as "auto", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: false } }
    : {});
  harness.previewContent.clientWidth = 700;
  harness.documentElement.clientWidth = 1000;
  const make = (tag: string, scrollWidth: number): RuntimeElement => {
    const element = new RuntimeElement({}, harness.windowState, 0, 40, tag);
    element.scrollWidth = scrollWidth;
    harness.previewContent.appendChild(element);
    return element;
  };
  return { harness, wide: make("table", 900), small: make("table", 400), huge: make("pre", 1600) };
}

test("T10: the width button cycles margin, auto, full width and posts widthMode", () => {
  const { harness } = widthModeFixture();
  const root = harness.documentElement;
  assert.equal(root.getAttribute("data-sphinx-preview-width"), "margin");
  assert.equal(harness.widthButton.getAttribute("aria-label"), "Width: Margin");
  const before = harness.messages.length;
  const seen: string[] = [];
  for (let click = 0; click < 3; click += 1) {
    harness.widthButton.dispatch("click");
    seen.push(String(root.getAttribute("data-sphinx-preview-width")));
  }
  assert.deepEqual(seen, ["auto", "full", "margin"]);
  const posted = harness.messages.slice(before).filter((m) => m.type === "previewViewPreferenceChanged");
  assert.deepEqual(posted.map((m) => [m.preference, m.value]),
    [["widthMode", "auto"], ["widthMode", "full"], ["widthMode", "margin"]]);
  assert.equal(posted[0].documentId, "file:///active.md");
  harness.widthButton.dispatch("click");
  assert.equal(harness.widthButton.getAttribute("aria-label"), "Width: Auto");
  assert.equal(harness.widthButton.getAttribute("data-tooltip"), "Width: Auto");
  harness.widthButton.dispatch("click");
  assert.equal(harness.widthButton.getAttribute("aria-label"), "Width: Full width");
  assert.equal(harness.getWebviewState().viewWidthMode, "full");
});

test("T10: only elements wider than the column are flagged, and only in Auto", () => {
  const { harness, wide, small, huge } = widthModeFixture();
  assert.equal(wide.getAttribute("data-sphinx-preview-wide"), null, "margin: nothing flagged");
  harness.widthButton.dispatch("click");
  assert.equal(wide.getAttribute("data-sphinx-preview-wide"), "");
  assert.equal(wide.style.getPropertyValue("--sphinx-preview-breakout"), "200px");
  assert.equal(small.getAttribute("data-sphinx-preview-wide"), null);
  // Never wider than the pane minus a 16 px gutter on each side.
  assert.equal(huge.style.getPropertyValue("--sphinx-preview-breakout"), "268px");
  harness.widthButton.dispatch("click");
  assert.equal(wide.getAttribute("data-sphinx-preview-wide"), null, "full: cleared");
  harness.widthButton.dispatch("click");
  harness.widthButton.dispatch("click");
  assert.equal(wide.getAttribute("data-sphinx-preview-wide"), "");
  harness.widthButton.dispatch("click");
  assert.equal(huge.getAttribute("data-sphinx-preview-wide"), null);
});

test("T10b: a wide element is centred on the available area, not on the column", () => {
  const { harness, wide, huge } = widthModeFixture();
  // The column starts 120 px right of the pane edge, so it is 30 px off the pane centre (500).
  harness.previewContent.rectProvider = () => ({ top: 0, height: 100, left: 120, width: 700 });
  harness.widthButton.dispatch("click");
  // column centre 470, available-area centre 500: shift 30.
  assert.equal(wide.style.getPropertyValue("--sphinx-preview-breakout-shift"), "30px");
  assert.equal(wide.style.getPropertyValue("--sphinx-preview-breakout"), "200px");
  assert.equal(huge.style.getPropertyValue("--sphinx-preview-breakout"), "268px");
});

test("T10b: with the TOC open the available area, its centre and the cap exclude the TOC column", () => {
  const harness = createRuntimeHarness({
    tocReserve: 256,
    initialViewPreferences: { zoom: 100, widthMode: "auto", toc: true, incomingChanges: true, comments: true, toolbarCollapsed: false },
  });
  harness.previewContent.clientWidth = 400;
  harness.documentElement.clientWidth = 1000;
  harness.previewContent.rectProvider = () => ({ top: 0, height: 100, left: 100, width: 400 });
  const table = new RuntimeElement({}, harness.windowState, 0, 40, "table");
  table.scrollWidth = 1600;
  harness.previewContent.appendChild(table);
  harness.dispatchWindow("resize");
  harness.flushFrames();
  // available = 1000 - 256 - 32 = 712 -> breakout 312; centre (1000 - 256) / 2 = 372 vs column 300.
  assert.equal(table.style.getPropertyValue("--sphinx-preview-breakout"), "312px");
  assert.equal(table.style.getPropertyValue("--sphinx-preview-breakout-shift"), "72px");
});

test("T10b: a narrow element is not flagged and the shift is cleared outside Auto", () => {
  const { harness, wide, small } = widthModeFixture();
  harness.previewContent.rectProvider = () => ({ top: 0, height: 100, left: 150, width: 700 });
  harness.widthButton.dispatch("click");
  assert.equal(small.getAttribute("data-sphinx-preview-wide"), null);
  assert.equal(small.style.getPropertyValue("--sphinx-preview-breakout-shift"), "");
  harness.widthButton.dispatch("click");
  assert.equal(wide.style.getPropertyValue("--sphinx-preview-breakout-shift"), "");
});

test("T10b: a paragraph holding only an image is marked as a figure in every width mode", () => {
  const { harness } = widthModeFixture();
  const paragraph = new RuntimeElement({}, harness.windowState, 0, 40, "p");
  const image = new RuntimeElement({}, harness.windowState, 0, 40, "img");
  paragraph.appendChild(image);
  harness.previewContent.appendChild(paragraph);
  harness.dispatchWindow("resize");
  harness.flushFrames();
  assert.equal(paragraph.getAttribute("data-sphinx-preview-figure"), "", "margin");
  harness.widthButton.dispatch("click");
  assert.equal(paragraph.getAttribute("data-sphinx-preview-figure"), "", "auto");
});

test("T10b: a wide table gets its fractional max-content width rounded up, so no cell wraps", () => {
  const { harness, wide } = widthModeFixture();
  // scrollWidth is an integer (900); the real box is 900.4 px wide: 900 px would squeeze the cells.
  wide.rectProvider = () => ({ top: 0, height: 40, left: 0, width: 900.4 });
  harness.widthButton.dispatch("click");
  assert.equal(wide.style.getPropertyValue("--sphinx-preview-breakout"), "201px");
});

test("T10: the saved width mode applies at startup and an edited element keeps the column", () => {
  const { harness, wide } = widthModeFixture("auto");
  harness.dispatchMessage({ type: "noop" });
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-width"), "auto");
  harness.dispatchWindow("resize");
  harness.flushFrames();
  assert.equal(wide.getAttribute("data-sphinx-preview-wide"), "");
  wide.setAttribute("data-sphinx-preview-editing", "true");
  harness.dispatchWindow("resize");
  harness.flushFrames();
  assert.equal(wide.getAttribute("data-sphinx-preview-wide"), null);
});

test("T11: Back and Next post previewHistoryGo and follow previewHistoryState", () => {
  const harness = createRuntimeHarness();
  const ids = { documentId: "file:///active.md", revision: 7, requestId: 11 };
  harness.dispatchMessage({ type: "previewHistoryState", ...ids, canBack: true, canForward: false });
  assert.equal(harness.backButton.disabled, false);
  assert.equal(harness.nextButton.disabled, true);
  const before = harness.messages.length;
  harness.backButton.dispatch("click");
  const posted = harness.messages.slice(before).filter((m) => m.type === "previewHistoryGo");
  assert.equal(posted.length, 1);
  assert.equal(posted[0].direction, "back");
  assert.equal(posted[0].documentId, "file:///active.md");
  harness.dispatchMessage({ type: "previewHistoryState", ...ids, canBack: false, canForward: true });
  assert.equal(harness.backButton.disabled, true);
  assert.equal(harness.nextButton.disabled, false);
  harness.nextButton.dispatch("click");
  assert.equal(harness.messages.at(-1)?.direction, "forward");
});

test("T15: previewShowComments sets the show-comments attribute of the page, stale ids are ignored", () => {
  const harness = createRuntimeHarness();
  const ids = { documentId: "file:///active.md", revision: 7, requestId: 11 };
  assert.equal(harness.documentElement.getAttribute("data-okf-show-comments"), "true");
  harness.dispatchMessage({ type: "previewShowComments", ...ids, showComments: false });
  assert.equal(harness.documentElement.getAttribute("data-okf-show-comments"), "false");
  harness.dispatchMessage({ type: "previewShowComments", ...ids, requestId: 3, showComments: true });
  assert.equal(harness.documentElement.getAttribute("data-okf-show-comments"), "false");
  harness.dispatchMessage({ type: "previewShowComments", ...ids, showComments: true });
  assert.equal(harness.documentElement.getAttribute("data-okf-show-comments"), "true");
});

test("T16: previewIncomingChanges marks blocks and reports enabled, stale ids are ignored", () => {
  const harness = createRuntimeHarness();
  const ids = { documentId: "file:///active.md", revision: 7, requestId: 11 };
  assert.equal(harness.documentElement.getAttribute("data-okf-incoming-changes"), null);
  harness.dispatchMessage({ type: "previewIncomingChanges", ...ids, requestId: 3, enabled: false, ranges: [] });
  assert.equal(harness.documentElement.getAttribute("data-okf-incoming-changes"), null);
  harness.dispatchMessage({ type: "previewIncomingChanges", ...ids, enabled: false, ranges: [] });
  assert.equal(harness.documentElement.getAttribute("data-okf-incoming-changes"), "false");
  harness.dispatchMessage({ type: "previewIncomingChanges", ...ids, enabled: true, ranges: [{ start: 1, end: 2 }] });
  assert.equal(harness.documentElement.getAttribute("data-okf-incoming-changes"), "true");
});

test("T17: the Diff button flips the marks, posts the preference and keeps the state", () => {
  const harness = createRuntimeHarness();
  const root = harness.documentElement;
  assert.equal(root.getAttribute("data-sphinx-preview-incoming"), "on");
  assert.equal(harness.diffButton.getAttribute("aria-pressed"), "true");
  assert.equal(harness.diffButton.getAttribute("data-tooltip"), "Hide changes since last commit");
  const before = harness.messages.length;
  harness.diffButton.dispatch("click");
  assert.equal(root.getAttribute("data-sphinx-preview-incoming"), "off");
  assert.equal(harness.diffButton.getAttribute("aria-pressed"), "false");
  assert.equal(harness.diffButton.getAttribute("title"), "Show changes since last commit");
  assert.equal(harness.diffButton.getAttribute("data-tooltip"), "Show changes since last commit");
  const posted = harness.messages.slice(before).filter((m) => m.type === "previewViewPreferenceChanged");
  assert.equal(posted.length, 1);
  assert.equal(posted[0].preference, "incomingChanges");
  assert.equal(posted[0].value, false);
  assert.equal(posted[0].documentId, "file:///active.md");
  assert.equal(harness.getWebviewState().viewIncomingChanges, false);
  harness.diffButton.dispatch("click");
  assert.equal(root.getAttribute("data-sphinx-preview-incoming"), "on");
  assert.equal(harness.messages.at(-1)?.value, true);
});

test("T17: the initial preference and the saved webview state decide the pressed state", () => {
  const off = createRuntimeHarness({
    initialViewPreferences: { zoom: 100, widthMode: "margin", toc: false, incomingChanges: false, comments: true, toolbarCollapsed: false },
  });
  assert.equal(off.documentElement.getAttribute("data-sphinx-preview-incoming"), "off");
  assert.equal(off.diffButton.getAttribute("aria-pressed"), "false");
  const saved = createRuntimeHarness({
    initialViewPreferences: { zoom: 100, widthMode: "margin", toc: false, incomingChanges: false, comments: true, toolbarCollapsed: false },
    savedState: { viewIncomingChanges: true },
  });
  assert.equal(saved.documentElement.getAttribute("data-sphinx-preview-incoming"), "on");
});

test("the Comments toggle is installed with the page: on by default, off from the saved preference", () => {
  const on = createRuntimeHarness();
  assert.equal(on.documentElement.getAttribute("data-sphinx-preview-comments"), "on");
  const off = createRuntimeHarness({
    initialViewPreferences: { zoom: 100, widthMode: "margin", toc: false, incomingChanges: true, comments: false, toolbarCollapsed: false },
  });
  assert.equal(off.documentElement.getAttribute("data-sphinx-preview-comments"), "off");
  const saved = createRuntimeHarness({
    initialViewPreferences: { zoom: 100, widthMode: "margin", toc: false, incomingChanges: true, comments: false, toolbarCollapsed: false },
    savedState: { viewComments: true },
  });
  assert.equal(saved.documentElement.getAttribute("data-sphinx-preview-comments"), "on");
});

test("T17: the Diff button is hidden through the document attribute when the setting is off", () => {
  const harness = createRuntimeHarness();
  const ids = { documentId: "file:///active.md", revision: 7, requestId: 11 };
  harness.dispatchMessage({ type: "previewIncomingChanges", ...ids, enabled: false, ranges: [] });
  assert.equal(harness.documentElement.getAttribute("data-okf-incoming-changes"), "false");
  assert.match(PREVIEW_THEME_CSS,
    /html\[data-okf-incoming-changes="false"\] \[data-sphinx-preview-diff-toggle\] \{\s*display: none;/u);
  assert.match(PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-incoming="off"\] \[data-sphinx-preview-change-layer\] \{\s*display: none;/u);
});

test("P8: the collapse button hides rows 2-3, posts the preference and keeps the state", () => {
  // A workspace that stored the expanded toolbar (the fresh default is collapsed).
  const harness = createRuntimeHarness({
    initialViewPreferences: { zoom: 100, widthMode: "margin", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: false },
  });
  const button = harness.collapseButton;
  assert.equal(harness.moreRows.hidden, false, "expanded as stored");
  assert.equal(button.getAttribute("aria-expanded"), "true");
  assert.equal(button.getAttribute("aria-label"), "Hide view controls");
  assert.equal(button.getAttribute("title"), "Hide view controls");
  const before = harness.messages.length;
  button.dispatch("click");
  assert.equal(harness.moreRows.hidden, true);
  assert.equal(button.getAttribute("aria-expanded"), "false");
  assert.equal(button.getAttribute("aria-label"), "Show view controls");
  assert.equal(button.getAttribute("data-tooltip"), "Show view controls");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-toolbar-state"), "collapsed");
  // The root attribute must never match the `[data-sphinx-preview-toolbar]` selector of the toolbar itself.
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-toolbar"), null);
  const posted = harness.messages.slice(before).filter((m) => m.type === "previewViewPreferenceChanged");
  assert.equal(posted.length, 1);
  assert.equal(posted[0].preference, "toolbarCollapsed");
  assert.equal(posted[0].value, true);
  assert.equal(harness.getWebviewState().viewToolbarCollapsed, true);
  button.dispatch("click");
  assert.equal(harness.moreRows.hidden, false);
  assert.equal(button.getAttribute("aria-expanded"), "true");
  assert.equal(harness.messages.at(-1)?.value, false);
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-toolbar-state"), "expanded");
});

test("P8: the stored preference and the saved webview state decide the collapsed state", () => {
  const stored = createRuntimeHarness({
    initialViewPreferences: { zoom: 100, widthMode: "margin", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: true },
  });
  assert.equal(stored.moreRows.hidden, true);
  assert.equal(stored.collapseButton.getAttribute("aria-expanded"), "false");
  const saved = createRuntimeHarness({
    initialViewPreferences: { zoom: 100, widthMode: "margin", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: true },
    savedState: { viewToolbarCollapsed: false },
  });
  assert.equal(saved.moreRows.hidden, false);
});

test("fresh workspace: the toolbar starts collapsed and the preview theme starts in cream", () => {
  const fresh = createRuntimeHarness();
  assert.equal(fresh.moreRows.hidden, true, "rows 2 and 3 are hidden without a stored choice");
  assert.equal(fresh.collapseButton.getAttribute("aria-expanded"), "false");
  assert.equal(fresh.collapseButton.getAttribute("aria-label"), "Show view controls");
  assert.equal(fresh.documentElement.getAttribute("data-sphinx-preview-toolbar-state"), "collapsed");
  assert.equal(fresh.documentElement.getAttribute("data-sphinx-preview-theme-mode"), "cream");
  assert.equal(fresh.themeButton.getAttribute("data-theme-mode"), "cream");
  assert.equal(fresh.themeButton.getAttribute("aria-label"), "Preview theme: Cream theme");
  assert.equal(fresh.themeButton.getAttribute("data-tooltip"), "Cream theme (click for current theme)");
  // Nothing is posted: the defaults are not stored as if the user had chosen them.
  assert.deepEqual(fresh.messages.filter((message) =>
    message.type === "previewThemeModeChanged" || message.type === "previewViewPreferenceChanged"), []);
});

test("stored choice wins: a stored expanded toolbar and a stored theme mode are kept", () => {
  for (const mode of ["current", "dark", "white"] as const) {
    const stored = createRuntimeHarness({
      initialViewPreferences: { zoom: 100, widthMode: "margin", toc: false, incomingChanges: true, comments: true, toolbarCollapsed: false },
    }, undefined, mode);
    assert.equal(stored.moreRows.hidden, false, mode);
    assert.equal(stored.documentElement.getAttribute("data-sphinx-preview-toolbar-state"), "expanded");
    assert.equal(stored.documentElement.getAttribute("data-sphinx-preview-theme-mode"), mode);
  }
  // The webview state of a restored panel wins over the fresh default too.
  const restored = createRuntimeHarness({ savedState: { viewToolbarCollapsed: false } }, "white");
  assert.equal(restored.moreRows.hidden, false);
  assert.equal(restored.documentElement.getAttribute("data-sphinx-preview-theme-mode"), "white");
});

test("T11: a previewHistoryState of another document version is ignored", () => {
  const harness = createRuntimeHarness();
  harness.dispatchMessage({
    type: "previewHistoryState", documentId: "file:///active.md", revision: 99, requestId: 11,
    canBack: true, canForward: true,
  });
  assert.equal(harness.backButton.disabled, true);
  assert.equal(harness.nextButton.disabled, true);
});

test("T13: a state snapshot keeps the TOC visibility and the folded sections", () => {
  const harness = createRuntimeHarness({
    viewportWidth: 900,
    initialViewPreferences: { zoom: 100, widthMode: "margin", toc: true, incomingChanges: true, comments: true, toolbarCollapsed: false },
  });
  harness.dispatchDocument("click", { target: harness.descriptionButton });
  const state = harness.getWebviewState();
  assert.equal(state.viewToc, true);
  assert.equal((state.tocCollapsed as string[]).length, 0);
  assert.equal(state.viewZoom, 100);
});

// T21: the edition palette above an open block editor.
const PALETTE_CLASS = "sphinx-preview-edit-palette";

function paletteOf(harness: RuntimeHarness): RuntimeElement | undefined {
  return harness.createdElements.find((element) =>
    element.getAttribute("class") === PALETTE_CLASS || element.className === PALETTE_CLASS);
}

function paletteButton(harness: RuntimeHarness, id: string): RuntimeElement {
  const button = harness.createdElements.find((element) =>
    element.tagName === "BUTTON" && element.getAttribute("data-edit-action") === id);
  assert.ok(button, "palette button " + id);
  return button;
}

function paletteMenu(harness: RuntimeHarness): RuntimeElement | undefined {
  return harness.createdElements.find((element) =>
    element.getAttribute("role") === "menu" && !element.removed
    && element.parentElement !== undefined);
}

test("T21: the palette sits in a host above the block editor frame, not inside it", () => {
  const harness = createRuntimeHarness({ initialPaletteMode: "myst" });
  const textarea = openBlockEditorWithSource(harness);
  const palette = paletteOf(harness);
  assert.ok(palette, "a palette exists while editing");
  assert.equal(palette.getAttribute("role"), "toolbar");
  const editor = textarea.parentElement!;
  const host = palette.parentElement!;
  assert.equal(host.getAttribute("data-sphinx-preview-block-editor-host"), "true");
  assert.equal(host.className, "sphinx-preview-block-editor-host");
  assert.deepEqual(host.childElements, [palette, editor], "the bar is on top of the frame, the frame is its sibling");
  assert.equal(editor.contains(palette), false, "the palette is not inside the edit box");
  assert.equal(editor.getAttribute("data-sphinx-preview-block-editor"), "true");
  assert.equal(palette.childElements[0].tagName, "SELECT", "the mode select starts the bar");
  assert.deepEqual(
    palette.childElements.slice(1).map((child) => child.getAttribute("data-edit-action")),
    [
      "heading", "bold", "italic", "strikethrough", "color", "colorCode", "link", "image", "codeFence", "quote", "rule", "table",
      "emoji", "todo", "thread", "alert", "checkbox", "htmlTable", "details", "footnote", "mermaid", "columnAlign", "kbd",
      "admonition", "deflist", "math", "sub", "sup", "label",
      "ref", "doc", "cite", "dropdown", "tableCaption", "listTable", "pipeTable", "figure", "roleKbd",
    ],
  );
});

test("T21: no palette before the source arrives and none after the editor closes", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  assert.equal(paletteOf(harness), undefined, "edit mode alone shows no palette");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  assert.equal(paletteOf(harness), undefined, "still waiting for the source");
  sourceReply(harness, "Second paragraph.\n");
  const palette = paletteOf(harness)!;
  assert.ok(palette);
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA")!;
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(palette.removed, true, "the palette leaves with the editor");
});

test("T21: the palette buttons show the real shortcut in their tooltip", () => {
  const harness = createRuntimeHarness();
  openBlockEditorWithSource(harness);
  assert.equal(paletteButton(harness, "bold").getAttribute("title"), "Bold (Ctrl+B)");
  assert.equal(paletteButton(harness, "italic").getAttribute("title"), "Italic (Ctrl+I)");
  assert.equal(
    paletteButton(harness, "todo").getAttribute("title"),
    "Toggle TODO comment (Ctrl+/)",
  );
  assert.equal(paletteButton(harness, "rule").getAttribute("title"), "Horizontal rule");
  const mac = createRuntimeHarness({ platform: "MacIntel" });
  openBlockEditorWithSource(mac);
  assert.equal(paletteButton(mac, "bold").getAttribute("title"), "Bold (Cmd+B)");
  assert.equal(
    paletteButton(mac, "todo").getAttribute("title"),
    "Toggle TODO comment (Cmd+/)",
  );
});

test("T21: every palette control keeps the focus in the text box on mousedown", () => {
  const harness = createRuntimeHarness({ initialPaletteMode: "myst" });
  openBlockEditorWithSource(harness);
  const controls = harness.createdElements.filter((element) =>
    element.getAttribute("data-edit-action") !== null);
  assert.equal(controls.length, 38);
  for (const control of controls) {
    let prevented = false;
    control.dispatch("mousedown", { preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true, String(control.getAttribute("data-edit-action")));
  }
});

test("T21: clicking Bold edits the text in one native step and keeps the editor open", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  textarea.value = "say foo now";
  textarea.setSelectionRange(4, 7);
  const count = harness.messages.length;
  paletteButton(harness, "bold").dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value, "say **foo** now");
  assert.deepEqual(textarea.selectionRange, [6, 9]);
  assert.equal(calls.length, 1, "one undo step");
  assert.equal(calls[0].command, "insertText");
  assert.equal(harness.messages.length, count, "no commit, no blur save");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  assert.equal(paletteOf(harness)!.removed, false);
  assert.equal(textarea.focusOptions?.preventScroll, true, "focus returns to the text box");
  harness.flushTimers();
  assert.equal(harness.messages.at(-1)?.type, "previewEditSave");
  assert.equal(harness.messages.at(-1)?.final, false, "autosave, not a final save");
});

test("T21: the heading list opens as a menu and choosing a level replaces the prefix", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  textarea.value = "# Title";
  textarea.setSelectionRange(3, 3);
  assert.equal(paletteMenu(harness), undefined);
  paletteButton(harness, "heading").dispatch("click", { preventDefault: () => undefined });
  const menu = paletteMenu(harness);
  assert.ok(menu, "the popover opens");
  assert.equal(menu.parentElement, paletteOf(harness));
  assert.deepEqual(
    menu.childElements.map((item) => item.textContent),
    ["Paragraph", "Heading 1", "Heading 2", "Heading 3", "Heading 4", "Heading 5"],
  );
  let prevented = false;
  menu.childElements[0].dispatch("mousedown", { preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  menu.childElements[3].dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value, "### Title");
  assert.equal(calls.length, 1);
  assert.equal(paletteMenu(harness), undefined, "choosing closes the popover");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
});

test("T21: Escape closes an open popover first and only then cancels the editor", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  paletteButton(harness, "heading").dispatch("click", { preventDefault: () => undefined });
  assert.ok(paletteMenu(harness));
  let prevented = false;
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(paletteMenu(harness), undefined, "the popover is closed");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  assert.equal(paletteOf(harness)!.removed, false, "the editor is still open");
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), null);
  assert.equal(paletteOf(harness)!.removed, true);
});

test("T21: opening one popover closes the other and a second click closes it", () => {
  const harness = createRuntimeHarness();
  openBlockEditorWithSource(harness);
  paletteButton(harness, "heading").dispatch("click", { preventDefault: () => undefined });
  paletteButton(harness, "codeFence").dispatch("click", { preventDefault: () => undefined });
  const open = harness.createdElements.filter((element) =>
    element.getAttribute("role") === "menu" && element.parentElement !== undefined);
  assert.equal(open.length, 1);
  assert.equal(open[0].getAttribute("data-edit-popover"), "language");
  paletteButton(harness, "codeFence").dispatch("click", { preventDefault: () => undefined });
  assert.equal(paletteMenu(harness), undefined);
});

test("T21: the code language list is text plus the highlighter languages and aliases", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  textarea.value = "x = 1";
  textarea.setSelectionRange(0, 5);
  paletteButton(harness, "codeFence").dispatch("click", { preventDefault: () => undefined });
  const menu = paletteMenu(harness)!;
  const shown = menu.childElements.map((item) => item.getAttribute("data-edit-option"));
  assert.deepEqual(shown, ["text", ...highlightLanguageNames()]);
  assert.ok(shown.includes("python") && shown.includes("py") && shown.includes("yaml"));
  const python = menu.childElements.find((item) => item.getAttribute("data-edit-option") === "python")!;
  python.dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value, "```python\nx = 1\n```");
  assert.equal(calls.length, 1);
  assert.equal(paletteMenu(harness), undefined);
});

test("T21: the palette appears in the insertion editor", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  insertPointAfterLine(harness, 52).childElements[0].dispatch("click", {
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  sourceReply(harness, "");
  const palette = paletteOf(harness);
  assert.ok(palette);
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA")!;
  const host = palette.parentElement!;
  assert.deepEqual(host.childElements, [palette, textarea.parentElement!]);
});

test("T21: the table cell editor and the frontmatter editors get no palette", () => {
  const cell = createRuntimeHarness();
  openTableCellEditorForTab(cell);
  assert.equal(paletteOf(cell), undefined);

  const frontmatter = createRuntimeHarness({ mapFrontmatter: true });
  frontmatter.editModeButton.dispatch("click");
  frontmatter.dispatchDocument("click", {
    target: frontmatter.frontmatterNameCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  assert.ok(frontmatter.createdElements.some((element) =>
    element.getAttribute("aria-label") === "Frontmatter key lifecycle"));
  assert.equal(paletteOf(frontmatter), undefined);
});

test("P4: the palette's host wraps the frame and goes with it, also on a content patch", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const palette = paletteOf(harness)!;
  const host = palette.parentElement!;
  assert.equal(host.childElements.includes(textarea.parentElement!), true);
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(host.removed, true, "the host is removed with the editor");
  assert.equal(palette.removed, true);
});

test("T21: the palette root cancels mousedown so a press on its padding keeps the focus", () => {
  const harness = createRuntimeHarness();
  openBlockEditorWithSource(harness);
  let prevented = false;
  paletteOf(harness)!.dispatch("mousedown", { preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
});

test("P4: the host takes the first-block clearance class and swallows clicks like the frame", () => {
  const harness = createRuntimeHarness();
  openBlockEditorWithSource(harness);
  const host = paletteOf(harness)!.parentElement!;
  let stopped = false;
  host.dispatch("click", { stopPropagation: () => { stopped = true; } });
  assert.equal(stopped, true, "a click on the palette does not reach the page's block handling");
  const frame = host.childElements[1];
  assert.equal(frame.className.includes("--first"), host.className.includes("--first"));
});

test("P4: focus moving from the text box into the palette does not save", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const palette = paletteOf(harness)!;
  const before = harness.messages.length;
  textarea.dispatch("blur", { relatedTarget: palette.childElements[0] });
  assert.equal(messagesAfter(harness, before).some((message) => message.type === "previewEditSave"), false);
  assert.equal(palette.removed, false, "the editor stays open");
});

test("P4: a palette taller than 40% of the viewport is not sticky; a small one is", () => {
  const harness = createRuntimeHarness();
  openBlockEditorWithSource(harness);
  const palette = paletteOf(harness)!;
  const host = palette.parentElement!;
  assert.equal(host.getAttribute("data-sphinx-palette-static"), null, "40 px of a 100 px viewport is small enough");
  palette.height = 60;
  harness.dispatchWindow("resize");
  assert.equal(host.getAttribute("data-sphinx-palette-static"), "true");
  palette.height = 30;
  harness.dispatchWindow("resize");
  assert.equal(host.getAttribute("data-sphinx-palette-static"), null);
});

function openCompensatedEditor(harness: RuntimeHarness): RuntimeElement {
  harness.windowState.scrollY = 200;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  harness.windowState.paletteHeight = 44;
  return openBlockEditorWithSource(harness);
}

test("T21: opening scrolls down by the bar height and every close path scrolls back", () => {
  const closers: [string, (harness: RuntimeHarness, textarea: RuntimeElement) => void][] = [
    ["Escape", (_harness, textarea) => {
      textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
    }],
    ["Cancel button", (harness) => {
      findButton(harness, "Cancel editing and restore the original text").dispatch("click");
    }],
    ["Done without a change", (harness) => {
      findButton(harness, "Done editing").dispatch("click");
    }],
    ["Cmd+Enter without a change", (_harness, textarea) => {
      textarea.dispatch("keydown", { key: "Enter", metaKey: true, preventDefault: () => undefined });
    }],
    ["blur without a change", (_harness, textarea) => {
      textarea.dispatch("blur");
    }],
    ["Escape after an autosave", (harness, textarea) => {
      textarea.value = "Second paragraph. more";
      textarea.dispatch("input");
      harness.flushTimers();
      textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
    }],
  ];
  for (const [name, close] of closers) {
    const harness = createRuntimeHarness();
    const textarea = openCompensatedEditor(harness);
    assert.equal(harness.windowState.scrollY, 244, name + ": the page scrolled by the bar height");
    close(harness, textarea);
    harness.flushFrames();
    assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), null, name);
    assert.equal(harness.windowState.scrollY, 200, name + ": the scroll is restored");
  }
});

// T22: the link panel opened by the Link button and Cmd/Ctrl+K.
function linkPanelOf(harness: RuntimeHarness): RuntimeElement | undefined {
  return harness.createdElements.find((element) =>
    element.getAttribute("role") === "dialog" && !element.removed);
}

function linkField(harness: RuntimeHarness, name: "text" | "url"): RuntimeElement {
  const field = harness.createdElements.find((element) =>
    element.tagName === "INPUT" && element.getAttribute("data-link-field") === name);
  assert.ok(field, "link field " + name);
  return field;
}

function linkButton(harness: RuntimeHarness, name: "insert" | "cancel"): RuntimeElement {
  const button = harness.createdElements.find((element) =>
    element.tagName === "BUTTON" && element.getAttribute("data-link-action") === name);
  assert.ok(button, "link button " + name);
  return button;
}

/** Records which element took the focus last, since the fake has no active element. */
function trackFocus(harness: RuntimeHarness): { last: () => RuntimeElement | undefined } {
  let last: RuntimeElement | undefined;
  const wrap = (element: RuntimeElement): void => {
    const original = element.focus.bind(element);
    element.focus = (options?: FocusOptions): void => {
      last = element;
      original(options);
    };
  };
  harness.createdElements.forEach(wrap);
  const create = harness.document.createElement as (tagName: string) => RuntimeElement;
  harness.document.createElement = (tagName: string): RuntimeElement => {
    const element = create(tagName);
    wrap(element);
    return element;
  };
  return { last: () => last };
}

const linkModifier = new WeakMap<RuntimeHarness, Record<string, boolean>>();

function openLinkPanel(harness: RuntimeHarness, textarea: RuntimeElement, selection: [number, number], value = "say foo now") {
  textarea.value = value;
  textarea.setSelectionRange(selection[0], selection[1]);
  const key = linkModifier.get(harness) ?? { ctrlKey: true };
  let prevented = false;
  let stopped = false;
  textarea.dispatch("keydown", {
    key: "k",
    code: "KeyK",
    ...key,
    preventDefault: () => { prevented = true; },
    stopPropagation: () => { stopped = true; },
  });
  return { prevented, stopped };
}

function linkHarness(platform?: string) {
  const harness = createRuntimeHarness(platform === undefined ? {} : { platform });
  const focus = trackFocus(harness);
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  linkModifier.set(harness, platform === undefined ? { ctrlKey: true } : { metaKey: true });
  return { harness, textarea, calls, focus };
}

test("T22: Ctrl+K opens the link panel under the palette with the selection as the text", () => {
  const { harness, textarea, focus } = linkHarness();
  const result = openLinkPanel(harness, textarea, [4, 7]);
  assert.equal(result.prevented, true);
  assert.equal(result.stopped, true);
  const panel = linkPanelOf(harness);
  assert.ok(panel, "the panel opens");
  assert.equal(panel.getAttribute("aria-label"), "Insert link");
  const frame = textarea.parentElement!;
  assert.equal(panel.parentElement, frame);
  assert.equal(frame.childElements.indexOf(panel), frame.childElements.indexOf(paletteOf(harness)!) + 1);
  assert.equal(linkField(harness, "text").value, "foo");
  assert.equal(linkField(harness, "url").value, "");
  assert.equal(focus.last(), linkField(harness, "url"), "focus goes to the first empty field");
});

test("T22: Cmd+K on macOS opens the panel and Ctrl+K there does not", () => {
  const mac = linkHarness("MacIntel");
  assert.equal(openLinkPanel(mac.harness, mac.textarea, [4, 7]).prevented, true);
  assert.ok(linkPanelOf(mac.harness));
  const other = linkHarness("MacIntel");
  linkModifier.set(other.harness, { ctrlKey: true });
  assert.equal(openLinkPanel(other.harness, other.textarea, [4, 7]).prevented, false);
  assert.equal(linkPanelOf(other.harness), undefined);
});

test("T22: a selected URL fills the URL field and focus goes to the empty text", () => {
  const { harness, textarea, focus } = linkHarness();
  openLinkPanel(harness, textarea, [4, 23], "see https://example.org ok");
  assert.equal(linkField(harness, "url").value, "https://example.org");
  assert.equal(linkField(harness, "text").value, "");
  assert.equal(focus.last(), linkField(harness, "text"));
});

test("T22: with no selection both fields are empty and the text takes the focus", () => {
  const { harness, textarea, focus } = linkHarness();
  openLinkPanel(harness, textarea, [4, 4]);
  assert.equal(linkField(harness, "text").value, "");
  assert.equal(linkField(harness, "url").value, "");
  assert.equal(focus.last(), linkField(harness, "text"));
});

test("T22: the Link button opens the same panel and keeps the focus rule", () => {
  const { harness, textarea } = linkHarness();
  textarea.value = "say foo now";
  textarea.setSelectionRange(4, 7);
  const button = paletteButton(harness, "link");
  assert.equal(button.getAttribute("title"), "Link (Ctrl+K)");
  assert.equal(button.getAttribute("aria-label"), "Link");
  button.dispatch("click", { preventDefault: () => undefined });
  assert.ok(linkPanelOf(harness));
  assert.equal(linkField(harness, "text").value, "foo");
  // A second click on the button leaves a single panel.
  button.dispatch("click", { preventDefault: () => undefined });
  assert.equal(harness.createdElements.filter((e) => e.getAttribute("role") === "dialog" && !e.removed).length, 1);
});

test("T22: the panel has labelled fields, Insert and Cancel in the tab order", () => {
  const { harness, textarea } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  assert.equal(linkField(harness, "text").getAttribute("aria-label"), "Text");
  assert.equal(linkField(harness, "url").getAttribute("aria-label"), "URL");
  assert.equal(linkButton(harness, "insert").textContent, "Insert");
  assert.equal(linkButton(harness, "cancel").textContent, "Cancel");
  const order = linkPanelOf(harness)!.childElements.flatMap((child) => [child, ...child.childElements])
    .filter((e) => e.tagName === "INPUT" || e.tagName === "BUTTON");
  assert.deepEqual(order.map((e) => e.getAttribute("data-link-field") ?? e.getAttribute("data-link-action")),
    ["text", "url", "insert", "cancel"]);
});

test("T22: Enter in the URL field inserts [text](url) as one undo step and returns to the text box", () => {
  const { harness, textarea, calls, focus } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  linkField(harness, "url").value = "https://x.org";
  const before = harness.messages.length;
  let prevented = false;
  linkField(harness, "url").dispatch("keydown", { key: "Enter", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(textarea.value, "say [foo](https://x.org) now");
  assert.equal(textarea.selectionStart, 24, "caret after the link");
  assert.equal(textarea.selectionEnd, 24);
  assert.equal(calls.length, 1, "one native step");
  assert.equal(focus.last(), textarea);
  assert.equal(linkPanelOf(harness), undefined, "the panel closes");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  assert.equal(harness.messages.length, before, "no save yet");
  harness.flushTimers();
  assert.equal(harness.messages.filter((m) => m.type === "previewEditSave" && m.final === true).length, 0);
  assert.equal(harness.messages.filter((m) => m.type === "previewEditSave").length, 1, "one autosave");
});

test("T22: Enter in the Text field and the Insert button also insert", () => {
  const viaText = linkHarness();
  openLinkPanel(viaText.harness, viaText.textarea, [4, 7]);
  linkField(viaText.harness, "text").value = "bar";
  linkField(viaText.harness, "url").value = "u";
  linkField(viaText.harness, "text").dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(viaText.textarea.value, "say [bar](u) now");

  const viaButton = linkHarness();
  openLinkPanel(viaButton.harness, viaButton.textarea, [4, 7]);
  linkField(viaButton.harness, "url").value = "u";
  linkButton(viaButton.harness, "insert").dispatch("click", { preventDefault: () => undefined });
  assert.equal(viaButton.textarea.value, "say [foo](u) now");
  assert.equal(linkPanelOf(viaButton.harness), undefined);
});

test("T22: an empty URL inserts [text]() with the caret inside the parentheses", () => {
  const { harness, textarea } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  linkField(harness, "text").dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(textarea.value, "say [foo]() now");
  assert.equal(textarea.selectionStart, 10);
  assert.equal(textarea.selectionEnd, 10);
});

test("T22: an IME composition Enter does not insert", () => {
  const { harness, textarea } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  linkField(harness, "url").dispatch("keydown", { key: "Enter", isComposing: true, preventDefault: () => undefined });
  assert.equal(textarea.value, "say foo now");
  assert.ok(linkPanelOf(harness));
});

test("T22: a selection inside an existing link prefills both fields and replaces that link", () => {
  const { harness, textarea } = linkHarness();
  openLinkPanel(harness, textarea, [8, 8], "a [label](https://old.org) b");
  assert.equal(linkField(harness, "text").value, "label");
  assert.equal(linkField(harness, "url").value, "https://old.org");
  linkField(harness, "url").value = "https://new.org";
  linkField(harness, "url").dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(textarea.value, "a [label](https://new.org) b");
});

test("T22: Escape in the panel returns to the text box without any change and keeps the editor", () => {
  const { harness, textarea, calls, focus } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  linkField(harness, "url").value = "typed";
  textarea.setSelectionRange(0, 0);
  let prevented = false;
  let stopped = false;
  linkField(harness, "url").dispatch("keydown", {
    key: "Escape",
    preventDefault: () => { prevented = true; },
    stopPropagation: () => { stopped = true; },
  });
  assert.equal(prevented, true);
  assert.equal(stopped, true, "the editor does not see this Escape");
  assert.equal(textarea.value, "say foo now");
  assert.deepEqual(textarea.selectionRange, [4, 7], "the selection is restored");
  assert.equal(calls.length, 0);
  assert.equal(focus.last(), textarea);
  assert.equal(linkPanelOf(harness), undefined);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  assert.equal(harness.messages.some((m) => m.type === "previewEditSave" || m.type === "previewEditCancel"), false);
  harness.flushTimers();
  assert.equal(harness.messages.some((m) => m.type === "previewEditSave"), false, "nothing changed, nothing saved");
});

test("T22: Cancel behaves like Escape", () => {
  const { harness, textarea, focus } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  linkButton(harness, "cancel").dispatch("click", { preventDefault: () => undefined });
  assert.equal(linkPanelOf(harness), undefined);
  assert.equal(focus.last(), textarea);
  assert.deepEqual(textarea.selectionRange, [4, 7]);
  assert.equal(textarea.value, "say foo now");
});

test("T22: Tab cycles Text, URL, Insert, Cancel and back, and Shift+Tab goes the other way", () => {
  const { harness, textarea, focus } = linkHarness();
  openLinkPanel(harness, textarea, [4, 4]);
  const text = linkField(harness, "text");
  const url = linkField(harness, "url");
  const insert = linkButton(harness, "insert");
  const cancel = linkButton(harness, "cancel");
  let prevented = false;
  cancel.dispatch("keydown", { key: "Tab", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(focus.last(), text, "Tab on Cancel wraps to Text");
  prevented = false;
  text.dispatch("keydown", { key: "Tab", shiftKey: true, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(focus.last(), cancel, "Shift+Tab on Text wraps to Cancel");
  prevented = false;
  url.dispatch("keydown", { key: "Tab", preventDefault: () => { prevented = true; } });
  insert.dispatch("keydown", { key: "Tab", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false, "the browser moves between the inner stops");
});

test("T22: a press on the panel's padding or buttons keeps the focus, a press on a field focuses it", () => {
  const { harness, textarea } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  const press = (target: RuntimeElement | undefined): boolean => {
    let prevented = false;
    linkPanelOf(harness)!.dispatch("mousedown", { target, preventDefault: () => { prevented = true; } });
    return prevented;
  };
  assert.equal(press(undefined), true, "padding");
  assert.equal(press(linkButton(harness, "insert")), true, "button");
  assert.equal(press(linkField(harness, "url")), false, "the field needs its default so it takes the focus");
});

test("T22: moving the focus from the text box into the panel does not save", () => {
  const { harness, textarea } = linkHarness();
  textarea.value = "say foo now";
  textarea.setSelectionRange(4, 7);
  openLinkPanel(harness, textarea, [4, 7]);
  const before = harness.messages.length;
  textarea.dispatch("blur", { relatedTarget: linkField(harness, "url") });
  textarea.dispatch("blur", { relatedTarget: paletteButton(harness, "bold") });
  assert.equal(harness.messages.length, before);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
});

test("T22: the text box blur with no target or a target outside the frame still saves", () => {
  for (const outside of ["none", "null", "body"]) {
    const harness = createRuntimeHarness();
    const relatedTarget = outside === "none" ? undefined : outside === "null" ? null : harness.body;
    const textarea = openBlockEditorWithSource(harness);
    textarea.value = "Second paragraph. changed";
    textarea.dispatch("blur", { relatedTarget });
    const saves = harness.messages.filter((m) => m.type === "previewEditSave");
    assert.equal(saves.length, 1, outside);
    assert.equal(saves[0].final, true);
  }
});

test("T22: focus leaving the panel for outside the frame runs the final save once", () => {
  const { harness, textarea } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  textarea.value = "say foo now!";
  const before = harness.messages.length;
  linkField(harness, "url").dispatch("blur", { relatedTarget: null });
  const saves = harness.messages.slice(before).filter((m) => m.type === "previewEditSave");
  assert.equal(saves.length, 1);
  assert.equal(saves[0].final, true);
  assert.equal(saves[0].editedText, "say foo now!\n");
});

test("T22: focus moving between the panel fields or back to the text box does not save", () => {
  const { harness, textarea } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  const before = harness.messages.length;
  linkField(harness, "url").dispatch("blur", { relatedTarget: linkField(harness, "text") });
  linkField(harness, "text").dispatch("blur", { relatedTarget: linkButton(harness, "insert") });
  linkButton(harness, "insert").dispatch("blur", { relatedTarget: textarea });
  assert.equal(harness.messages.length, before);
});

test("T22: closing the panel never produces a blur save, whatever blur the browser fires", () => {
  const { harness, textarea } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  const url = linkField(harness, "url");
  url.value = "u";
  const before = harness.messages.length;
  url.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  url.dispatch("blur", { relatedTarget: null });
  textarea.dispatch("blur", { relatedTarget: null });
  // The textarea blur above is a real focus loss and saves once; the panel added no second save.
  const saves = harness.messages.slice(before).filter((m) => m.type === "previewEditSave");
  assert.equal(saves.length, 1);
});

test("T22: the panel is removed with the editor", () => {
  const { harness, textarea } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  const panel = linkPanelOf(harness)!;
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), null);
  assert.equal(panel.removed, true);
});

test("T22: opening and closing the panel keep the edited text in place", () => {
  const harness = createRuntimeHarness();
  const textarea = openCompensatedEditor(harness);
  stubExecCommand(harness, textarea);
  textarea.value = "say foo now";
  textarea.setSelectionRange(4, 7);
  assert.equal(harness.windowState.scrollY, 244);
  harness.windowState.panelHeight = 30;
  paletteButton(harness, "link").dispatch("click", { preventDefault: () => undefined });
  harness.flushFrames();
  assert.equal(harness.windowState.scrollY, 274, "the page scrolled by the panel height");
  linkButton(harness, "cancel").dispatch("click", { preventDefault: () => undefined });
  harness.flushFrames();
  assert.equal(harness.windowState.scrollY, 244, "closing the panel scrolls back");
  paletteButton(harness, "link").dispatch("click", { preventDefault: () => undefined });
  harness.flushFrames();
  assert.equal(harness.windowState.scrollY, 274);
  // Escape in the text box closes the editor and the panel with it; the page returns to 200.
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  harness.flushFrames();
  assert.equal(linkPanelOf(harness), undefined);
  assert.equal(harness.windowState.scrollY, 200);
});

test("T22: typing in the text box closes the panel and a later Insert cannot corrupt the text", () => {
  const { harness, textarea, calls } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  const url = linkField(harness, "url");
  const insert = linkButton(harness, "insert");
  url.value = "https://x.org";
  textarea.value = "NEW say foo now";
  textarea.setSelectionRange(8, 8);
  textarea.dispatch("input");
  assert.equal(linkPanelOf(harness), undefined, "the panel closed on input");
  assert.deepEqual(textarea.selectionRange, [8, 8], "the caret of the text box was not restored over");
  insert.dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value, "NEW say foo now");
  assert.equal(calls.length, 0);
});

test("T22: a mousedown in the text box closes the panel without touching the selection", () => {
  const { harness, textarea } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  textarea.setSelectionRange(1, 1);
  textarea.dispatch("mousedown", {});
  assert.equal(linkPanelOf(harness), undefined);
  assert.deepEqual(textarea.selectionRange, [1, 1]);
});

test("T22: Insert on a text that changed without an input event aborts without editing", () => {
  const { harness, textarea, calls } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  linkField(harness, "url").value = "u";
  textarea.value = "other text";
  linkButton(harness, "insert").dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value, "other text");
  assert.equal(calls.length, 0);
  assert.equal(linkPanelOf(harness), undefined);
});

test("T22: Cmd/Ctrl+K inside a panel field is consumed and moves to the URL field", () => {
  const { harness, textarea, focus } = linkHarness();
  openLinkPanel(harness, textarea, [4, 4]);
  let prevented = false;
  let stopped = false;
  linkField(harness, "text").dispatch("keydown", {
    key: "k",
    ctrlKey: true,
    preventDefault: () => { prevented = true; },
    stopPropagation: () => { stopped = true; },
  });
  assert.equal(prevented && stopped, true);
  assert.equal(focus.last(), linkField(harness, "url"));
  assert.ok(linkPanelOf(harness), "the panel stays open");
});

// T23: the palette mode select, its persistence and its message.
function paletteSelect(harness: RuntimeHarness): RuntimeElement {
  const select = paletteOf(harness)!.childElements.find((child) => child.tagName === "SELECT");
  assert.ok(select, "the palette has a mode select");
  return select;
}

function choosePaletteMode(harness: RuntimeHarness, mode: string): void {
  const select = paletteSelect(harness);
  select.value = mode;
  select.dispatch("change");
}

test("T23: the palette mode starts as GFM without a stored value or saved state", () => {
  const harness = createRuntimeHarness();
  openBlockEditorWithSource(harness);
  assert.equal(paletteOf(harness)!.getAttribute("data-palette-mode"), "gfm");
  assert.equal(paletteSelect(harness).value, "gfm");
});

test("T23: the stored workspace mode is used, and the saved webview state wins over it", () => {
  const stored = createRuntimeHarness({ initialPaletteMode: "strict" });
  openBlockEditorWithSource(stored);
  assert.equal(paletteOf(stored)!.getAttribute("data-palette-mode"), "strict");

  const saved = createRuntimeHarness({ initialPaletteMode: "strict", savedState: { paletteMode: "gfm" } });
  openBlockEditorWithSource(saved);
  assert.equal(paletteOf(saved)!.getAttribute("data-palette-mode"), "gfm");

  const myst = createRuntimeHarness({ initialPaletteMode: "myst" });
  openBlockEditorWithSource(myst);
  assert.equal(paletteOf(myst)!.getAttribute("data-palette-mode"), "myst", "a stored MyST mode wins over the GFM default");

  const invalid = createRuntimeHarness({ initialPaletteMode: "bogus" as "strict", savedState: { paletteMode: 3 } });
  openBlockEditorWithSource(invalid);
  assert.equal(paletteOf(invalid)!.getAttribute("data-palette-mode"), "gfm");
});

test("T23: choosing a mode posts previewPaletteModeChanged once and keeps the editor open", () => {
  const harness = createRuntimeHarness({ initialPaletteMode: "myst" });
  const textarea = openBlockEditorWithSource(harness);
  const count = harness.messages.length;
  choosePaletteMode(harness, "gfm");
  const posted = harness.messages.slice(count);
  assert.equal(posted.length, 1);
  assert.equal(posted[0].type, "previewPaletteModeChanged");
  assert.equal(posted[0].mode, "gfm");
  assert.equal(posted[0].documentId, "file:///active.md");
  assert.equal(posted[0].revision, 7);
  assert.equal(posted[0].requestId, 11);
  assert.equal(paletteOf(harness)!.getAttribute("data-palette-mode"), "gfm");
  assert.equal(harness.getWebviewState().paletteMode, "gfm");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  assert.equal(textarea.focusOptions?.preventScroll, true, "focus returns to the text box");
  choosePaletteMode(harness, "gfm");
  assert.equal(harness.messages.length, count + 1, "choosing the same mode again posts nothing");
});

test("T23: a mode change does not save the block, and the next editor opens in the new mode", () => {
  const harness = createRuntimeHarness();
  openBlockEditorWithSource(harness);
  choosePaletteMode(harness, "strict");
  harness.flushTimers();
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave"), false);
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA")!;
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  sourceReply(harness, "Second paragraph.\n");
  const palettes = harness.createdElements.filter((element) =>
    element.className === PALETTE_CLASS && !element.removed);
  assert.equal(palettes.at(-1)?.getAttribute("data-palette-mode"), "strict");
});

test("T23: a read-only preview has no palette and never posts the message", () => {
  const harness = createRuntimeHarness({ editingEnabled: false, initialPaletteMode: "strict" });
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  assert.equal(paletteOf(harness), undefined);
  assert.equal(harness.messages.some((message) => message.type === "previewPaletteModeChanged"), false);
});

// T23 round 2: the select must never strand the focus.
function finalSaves(harness: RuntimeHarness): number {
  return harness.messages.filter((message) =>
    message.type === "previewEditSave" && message.final === true).length;
}

test("T23: opening and dismissing the select without a change hands the focus back", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const select = paletteSelect(harness);
  textarea.value = "Second paragraph, changed.";
  const count = harness.messages.length;
  select.dispatch("blur", { relatedTarget: select });
  textarea.dispatch("blur", { relatedTarget: select });
  select.dispatch("focus");
  select.dispatch("click");
  textarea.focusOptions = undefined;
  assert.equal(textarea.focusOptions, undefined, "the open list keeps the focus in the select");
  select.dispatch("click");
  assert.equal((textarea.focusOptions as FocusOptions | undefined)?.preventScroll, true, "closing the list returns to the text box");
  assert.equal(harness.messages.length, count, "nothing posted, nothing saved");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  // Back in the text box, leaving the frame saves as usual: the editor is not stuck.
  textarea.dispatch("blur", { relatedTarget: null });
  assert.equal(finalSaves(harness), 1);
});

test("T23: focus leaving the frame from the select runs one final save; moving inside does not", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const select = paletteSelect(harness);
  textarea.value = "Second paragraph, changed.";
  select.dispatch("focus");
  select.dispatch("blur", { relatedTarget: textarea });
  assert.equal(finalSaves(harness), 0, "focus moving to the text box keeps the editor open");
  select.dispatch("blur", { relatedTarget: null });
  assert.equal(finalSaves(harness), 1, "focus leaving the frame saves once");
});

test("T23: Escape on the select returns to the text box, Cmd/Ctrl+Enter finishes the edit", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const select = paletteSelect(harness);
  textarea.value = "Second paragraph, changed.";
  select.dispatch("focus");
  textarea.focusOptions = undefined;
  let prevented = false;
  select.dispatch("keydown", { key: "Escape", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal((textarea.focusOptions as FocusOptions | undefined)?.preventScroll, true);
  assert.equal(finalSaves(harness), 0);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  textarea.focusOptions = undefined;
  select.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal((textarea.focusOptions as FocusOptions | undefined)?.preventScroll, true, "plain Enter returns to the text box");
  assert.equal(finalSaves(harness), 0);
  select.dispatch("keydown", { key: "Enter", ctrlKey: true, preventDefault: () => undefined });
  assert.equal(finalSaves(harness), 1);
});

test("T23: Ctrl+Shift+M focuses the select, Cmd+Shift+M on macOS, and the tooltip shows it", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const select = paletteSelect(harness);
  textarea.value = "Second paragraph, changed.";
  assert.equal(select.getAttribute("title"), "Palette buttons (Ctrl+Shift+M)");
  select.focusOptions = undefined;
  textarea.dispatch("keydown", { key: "M", code: "KeyM", ctrlKey: true, shiftKey: true, preventDefault: () => undefined });
  assert.equal((select.focusOptions as FocusOptions | undefined)?.preventScroll, true);
  const mac = createRuntimeHarness({ platform: "MacIntel" });
  const macArea = openBlockEditorWithSource(mac);
  const macSelect = paletteSelect(mac);
  assert.equal(macSelect.getAttribute("title"), "Palette buttons (Cmd+Shift+M)");
  macArea.dispatch("keydown", { key: "M", code: "KeyM", ctrlKey: true, shiftKey: true, preventDefault: () => undefined });
  assert.equal(macSelect.focusOptions, undefined, "Ctrl does nothing on macOS");
  macArea.dispatch("keydown", { key: "M", code: "KeyM", metaKey: true, shiftKey: true, preventDefault: () => undefined });
  assert.equal((macSelect.focusOptions as FocusOptions | undefined)?.preventScroll, true);
});

// T24: the size grid and the emoji picker in the real page script.
function gridCell(menu: RuntimeElement, row: number, col: number): RuntimeElement {
  const found = allDescendants(menu).find((e) =>
    e.getAttribute("data-grid-row") === String(row) && e.getAttribute("data-grid-col") === String(col));
  assert.ok(found);
  return found;
}

function allDescendants(element: RuntimeElement): RuntimeElement[] {
  return element.childElements.flatMap((child) => [child, ...allDescendants(child)]);
}

function litCells(menu: RuntimeElement): number {
  return allDescendants(menu).filter((e) => e.getAttribute("data-grid-on") === "true").length;
}

test("T24: the Table button opens the grid; hovering lights rows x columns and shows the size", () => {
  const harness = createRuntimeHarness();
  openBlockEditorWithSource(harness);
  paletteButton(harness, "table").dispatch("click", { preventDefault: () => undefined });
  const menu = paletteMenu(harness)!;
  assert.equal(menu.getAttribute("data-edit-popover"), "grid");
  assert.equal(allDescendants(menu).filter((e) => e.getAttribute("data-grid-row") !== null).length, 81);
  menu.dispatch("mouseover", { target: gridCell(menu, 3, 4) });
  assert.equal(litCells(menu), 12);
  const label = allDescendants(menu).find((e) => e.className === "sphinx-preview-edit-grid-label")!;
  assert.equal(label.textContent, "3 \u00d7 4");
  menu.dispatch("mouseover", { target: gridCell(menu, 9, 9) });
  assert.equal(litCells(menu), 81);
});

test("T24: one click on a grid cell inserts the table as one undo step and keeps the editor open", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  textarea.value = "Intro";
  textarea.setSelectionRange(5, 5);
  const count = harness.messages.length;
  paletteButton(harness, "table").dispatch("click", { preventDefault: () => undefined });
  const menu = paletteMenu(harness)!;
  menu.dispatch("click", { preventDefault: () => undefined, stopPropagation: () => undefined, target: gridCell(menu, 3, 4) });
  assert.equal(
    textarea.value,
    "Intro\n\n| Column 1 | Column 2 | Column 3 | Column 4 |\n| --- | --- | --- | --- |\n|  |  |  |  |\n|  |  |  |  |",
  );
  assert.equal(calls.length, 1, "one undo step");
  assert.equal(paletteMenu(harness), undefined, "the grid closes");
  assert.equal(harness.messages.length, count, "no commit, no blur save");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  assert.equal(textarea.focusOptions?.preventScroll, true, "focus is in the text box");
  assert.equal(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd), "Column 1");
});

test("T24: Escape closes the grid first; arrows and Enter drive it from the text box", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  stubExecCommand(harness, textarea);
  textarea.value = "";
  textarea.setSelectionRange(0, 0);
  paletteButton(harness, "table").dispatch("click", { preventDefault: () => undefined });
  const menu = paletteMenu(harness)!;
  assert.equal(typeKey(textarea, "ArrowDown"), true);
  typeKey(textarea, "ArrowRight");
  assert.equal(litCells(menu), 2, "1 x 2");
  typeKey(textarea, "Enter");
  assert.equal(textarea.value, "| Column 1 | Column 2 |\n| --- | --- |");
  assert.equal(paletteMenu(harness), undefined);
  paletteButton(harness, "table").dispatch("click", { preventDefault: () => undefined });
  assert.ok(paletteMenu(harness));
  typeKey(textarea, "Escape");
  assert.equal(paletteMenu(harness), undefined);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true", "the editor stays");
});

test("T24: typing in the text box closes the grid without losing the editor", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  paletteButton(harness, "table").dispatch("click", { preventDefault: () => undefined });
  assert.ok(paletteMenu(harness));
  textarea.dispatch("input");
  assert.equal(paletteMenu(harness), undefined);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
});

function emojiField(harness: RuntimeHarness): RuntimeElement {
  const field = harness.createdElements.find((e) =>
    e.tagName === "INPUT" && e.getAttribute("data-emoji-filter") !== null && !e.removed);
  assert.ok(field);
  return field;
}

test("T24: the emoji filter takes focus without saving; leaving the frame from it saves once", () => {
  const harness = createRuntimeHarness();
  const focus = trackFocus(harness);
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Second paragraph, changed.";
  const count = harness.messages.length;
  paletteButton(harness, "emoji").dispatch("click", { preventDefault: () => undefined });
  assert.equal(focus.last(), emojiField(harness));
  // The text box loses focus to the filter: inside the frame, so nothing is saved.
  textarea.dispatch("blur", { relatedTarget: emojiField(harness) });
  assert.equal(harness.messages.length, count, "no save when focus moves into the picker");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  emojiField(harness).dispatch("blur", { relatedTarget: null });
  const saves = harness.messages.slice(count).filter((m) => m.type === "previewEditSave");
  assert.equal(saves.length, 1, "one final save");
  assert.equal(saves[0].final, true);
});

test("T24: choosing an emoji inserts it in the text box and returns the focus there", () => {
  const harness = createRuntimeHarness();
  const focus = trackFocus(harness);
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  textarea.value = "say foo now";
  textarea.setSelectionRange(4, 7);
  paletteButton(harness, "emoji").dispatch("click", { preventDefault: () => undefined });
  const field = emojiField(harness);
  field.value = "check mark button";
  field.dispatch("input");
  field.dispatch("keydown", { key: "Enter", preventDefault: () => undefined, stopPropagation: () => undefined });
  assert.equal(textarea.value, "say \u2705 now");
  assert.equal(calls.length, 1);
  assert.equal(paletteMenu(harness), undefined);
  assert.equal(focus.last(), textarea);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
});

test("T24: Shift+click on an emoji keeps the picker open, a plain click closes it", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  stubExecCommand(harness, textarea);
  textarea.value = "";
  textarea.setSelectionRange(0, 0);
  paletteButton(harness, "emoji").dispatch("click", { preventDefault: () => undefined });
  const menu = paletteMenu(harness)!;
  const emojis = allDescendants(menu).filter((e) => e.getAttribute("data-emoji") !== null);
  emojis[0].dispatch("click", { preventDefault: () => undefined, shiftKey: true });
  emojis[1].dispatch("click", { preventDefault: () => undefined, shiftKey: true });
  assert.equal(textarea.value, emojis[0].textContent + emojis[1].textContent);
  assert.ok(paletteMenu(harness), "still open after the input events");
  emojis[2].dispatch("click", { preventDefault: () => undefined });
  assert.equal(paletteMenu(harness), undefined);
});

test("T24: Escape in the filter closes the picker, focuses the text box and keeps the editor", () => {
  const harness = createRuntimeHarness();
  const focus = trackFocus(harness);
  const textarea = openBlockEditorWithSource(harness);
  const count = harness.messages.length;
  paletteButton(harness, "emoji").dispatch("click", { preventDefault: () => undefined });
  emojiField(harness).dispatch("keydown", {
    key: "Escape", preventDefault: () => undefined, stopPropagation: () => undefined,
  });
  assert.equal(paletteMenu(harness), undefined);
  assert.equal(focus.last(), textarea);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  assert.equal(harness.messages.length, count);
});

test("T24: a mouse press in the text box closes the picker and the editor stays usable", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  paletteButton(harness, "emoji").dispatch("click", { preventDefault: () => undefined });
  textarea.dispatch("mousedown");
  assert.equal(paletteMenu(harness), undefined);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  paletteButton(harness, "emoji").dispatch("click", { preventDefault: () => undefined });
  assert.ok(paletteMenu(harness), "the picker opens again");
});

test("T24: an emoji chosen after the text changed is inserted at the live caret, never a stale one", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  stubExecCommand(harness, textarea);
  textarea.value = "abcdef";
  textarea.setSelectionRange(2, 2);
  paletteButton(harness, "emoji").dispatch("click", { preventDefault: () => undefined });
  // The text changes and the caret moves while the picker is open (an incoming edit).
  textarea.value = "XY";
  textarea.setSelectionRange(2, 2);
  const emoji = allDescendants(paletteMenu(harness)!).find((e) => e.getAttribute("data-emoji") !== null)!;
  emoji.dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value, "XY" + emoji.textContent);
});

// T25: the Alert dropdown in the real page script.
function withCaretMarker(harness: RuntimeHarness, textarea: RuntimeElement): void {
  // The page measures the caret with a hidden mirror: give its marker span a layout.
  const create = harness.document.createElement as (tagName: string) => RuntimeElement;
  harness.document.createElement = (tagName: string): RuntimeElement => {
    const element = create(tagName);
    if (tagName === "span") {
      Object.assign(element, { offsetLeft: 120, offsetTop: 18, offsetHeight: 18 });
    }
    return element;
  };
  textarea.rectProvider = () => ({ top: 200, left: 40, height: 60, bottom: 260, width: 400 });
}

function menuOption(menu: RuntimeElement, value: string): RuntimeElement {
  const found = allDescendants(menu).find((e) => e.getAttribute("data-edit-option") === value);
  assert.ok(found, value);
  return found;
}

test("T25: strict mode shows no GitHub buttons; GFM shows Alert, Checkbox and HTML table", () => {
  const strict = createRuntimeHarness({ initialPaletteMode: "strict" });
  openBlockEditorWithSource(strict);
  assert.equal(strict.createdElements.some((e) => e.getAttribute("data-edit-action") === "alert"), false);
  const gfm = createRuntimeHarness({ initialPaletteMode: "gfm" });
  openBlockEditorWithSource(gfm);
  for (const id of ["alert", "checkbox", "htmlTable"]) assert.ok(paletteButton(gfm, id), id);
});

test("T25: Alert writes the head, opens the type list near the caret and picking changes the type", () => {
  const harness = createRuntimeHarness({ initialPaletteMode: "gfm" });
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  withCaretMarker(harness, textarea);
  textarea.value = "Mind the gap";
  textarea.setSelectionRange(4, 4);
  const count = harness.messages.length;
  paletteButton(harness, "alert").dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value, "> [!NOTE]\n> Mind the gap");
  const menu = paletteMenu(harness)!;
  assert.ok(menu, "the list survives the insertion's input event");
  assert.equal(menu.getAttribute("data-edit-popover"), "alert");
  assert.equal(menu.getAttribute("data-edit-popover-at"), "caret");
  assert.equal(menu.style.getPropertyValue("inset-inline-start"), "160px", "40 + 120");
  const barTop = paletteOf(harness)!.getBoundingClientRect().top;
  assert.equal(menu.style.getPropertyValue("inset-block-start"), String(236 - barTop + 2) + "px", "caret bottom 236, in the bar's coordinates");
  menuOption(menu, "WARNING").dispatch("click", { preventDefault: () => undefined, stopPropagation: () => undefined });
  assert.equal(textarea.value, "> [!WARNING]\n> Mind the gap");
  assert.equal(calls.length, 2, "one undo step for the alert, one for the type");
  assert.equal(paletteMenu(harness), undefined);
  assert.equal(harness.messages.length, count, "no commit");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  assert.equal(textarea.focusOptions?.preventScroll, true);
  assert.equal(textarea.selectionStart, "> [!WARNING]\n> Mind".length, "the caret stayed on its text");
});

test("T25: dismissing the type list leaves NOTE, the focus in the text box and the editor open", () => {
  const harness = createRuntimeHarness({ initialPaletteMode: "gfm" });
  const focus = trackFocus(harness);
  const textarea = openBlockEditorWithSource(harness);
  stubExecCommand(harness, textarea);
  textarea.value = "";
  textarea.setSelectionRange(0, 0);
  paletteButton(harness, "alert").dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value, "> [!NOTE]\n> ");
  assert.ok(paletteMenu(harness));
  assert.equal(typeKey(textarea, "Escape"), true);
  assert.equal(paletteMenu(harness), undefined);
  assert.equal(focus.last(), textarea);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true", "Escape closed the list only");
  // Clicking into the text instead also dismisses it.
  paletteButton(harness, "alert").dispatch("click", { preventDefault: () => undefined });
  assert.ok(paletteMenu(harness));
  textarea.dispatch("mousedown");
  assert.equal(paletteMenu(harness), undefined);
  assert.equal(textarea.value, "> [!NOTE]\n> ", "the second click only opened the list on the existing alert");
});

test("T25: Checkbox and HTML table edit the text box as one undo step each", () => {
  const harness = createRuntimeHarness({ initialPaletteMode: "gfm" });
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  textarea.value = "buy milk";
  textarea.setSelectionRange(3, 3);
  paletteButton(harness, "checkbox").dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value, "- [ ] buy milk");
  assert.equal(calls.length, 1);
  paletteButton(harness, "checkbox").dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value, "- buy milk");
  textarea.value = "| a | b |\n| :--- | ---: |\n| 1 | 2 |";
  textarea.setSelectionRange(2, 2);
  calls.length = 0;
  paletteButton(harness, "htmlTable").dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value.startsWith("<table>\n  <thead>"), true);
  assert.equal(textarea.value.includes('<td align="right">2</td>'), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "insertText");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
});

test("T28: the MyST buttons show in MyST mode only", () => {
  const ids = ["admonition", "deflist", "math", "sub", "sup", "label"];
  for (const mode of ["strict", "gfm"] as const) {
    const harness = createRuntimeHarness({ initialPaletteMode: mode });
    openBlockEditorWithSource(harness);
    for (const id of ids) {
      assert.equal(harness.createdElements.some((e) => e.getAttribute("data-edit-action") === id), false, mode + " " + id);
    }
  }
  const myst = createRuntimeHarness({ initialPaletteMode: "myst" });
  openBlockEditorWithSource(myst);
  for (const id of ids) assert.ok(paletteButton(myst, id), id);
});

test("T30: the editor stays open while the host's file dialog has the focus, and the answer is inserted", () => {
  const harness = createRuntimeHarness({ initialPaletteMode: "myst" });
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Read ";
  textarea.selectionStart = 5;
  textarea.selectionEnd = 5;
  paletteButton(harness, "doc").dispatch("click", { preventDefault: () => undefined, stopPropagation: () => undefined });
  const request = harness.messages.at(-1)!;
  assert.equal(request.type, "previewPickDocument");
  assert.equal(typeof request.editId, "string");
  assert.equal(request.documentId, "file:///active.md");
  // The native dialog takes the focus: the blur of the text box is not leaving.
  textarea.dispatch("blur");
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave" && message.final === true), false);
  harness.dispatchMessage({
    type: "previewPickDocumentResult", editId: request.editId, ok: true, path: "../guide/setup",
    revision: 99, requestId: 99,
  });
  assert.equal(textarea.value, "Read {doc}`../guide/setup`");
  // Once answered, a real departure saves again.
  textarea.dispatch("blur");
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave" && message.final === true), true);
});

test("T30: a cancelled file dialog inserts nothing and the blur saves again", () => {
  const harness = createRuntimeHarness({ initialPaletteMode: "myst" });
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Second paragraph. changed";
  textarea.dispatch("input");
  paletteButton(harness, "doc").dispatch("click", { preventDefault: () => undefined, stopPropagation: () => undefined });
  const request = harness.messages.at(-1)!;
  harness.dispatchMessage({ type: "previewPickDocumentResult", editId: request.editId, ok: true, cancelled: true });
  assert.equal(textarea.value.includes("{doc}"), false);
  textarea.dispatch("blur");
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave" && message.final === true), true);
});

const paletteClick = { preventDefault: () => undefined, stopPropagation: () => undefined };

test("T31: Image keeps the editor open while the file dialog has the focus, then inserts the reference", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "See ";
  textarea.selectionStart = 4;
  textarea.selectionEnd = 4;
  paletteButton(harness, "image").dispatch("click", paletteClick);
  const request = harness.messages.at(-1)!;
  assert.equal(request.type, "previewPickImage");
  assert.equal(typeof request.editId, "string");
  textarea.dispatch("blur");
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave" && message.final === true), false);
  harness.dispatchMessage({
    type: "previewPickImageResult", editId: request.editId, ok: true, path: "img/my logo.png",
    revision: 99, requestId: 99,
  });
  assert.equal(textarea.value, "See ![my logo](<img/my logo.png>)");
  assert.equal(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd), "my logo");
  textarea.dispatch("blur");
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave" && message.final === true), true);
});

test("T31: a stale image answer, a refusal and a cancel insert nothing", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "See ";
  textarea.selectionStart = 4;
  textarea.selectionEnd = 4;
  paletteButton(harness, "image").dispatch("click", paletteClick);
  const request = harness.messages.at(-1)!;
  harness.dispatchMessage({ type: "previewPickImageResult", editId: "other-edit", ok: true, path: "a.png" });
  assert.equal(textarea.value, "See ", "an answer for another edit id is ignored");
  harness.dispatchMessage({ type: "previewPickImageResult", editId: request.editId, ok: false, reason: "Outside the workspace." });
  assert.equal(textarea.value, "See ");
  paletteButton(harness, "image").dispatch("click", paletteClick);
  const second = harness.messages.at(-1)!;
  harness.dispatchMessage({ type: "previewPickImageResult", editId: second.editId, ok: true, cancelled: true });
  assert.equal(textarea.value, "See ");
});

test("T31: Done saves while the file dialog is still open, so the editor is never stuck", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Second paragraph. edited";
  textarea.dispatch("input");
  paletteButton(harness, "image").dispatch("click", paletteClick);
  textarea.dispatch("keydown", { key: "Enter", metaKey: true, preventDefault: () => undefined });
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave" && message.final === true), true);
});

// T32: the figure editor (form above the text box, palette Figure inside a figure, hover button).
const figureSource = [
  ":::{figure} images/chip.png",
  ":alt: A chip",
  ":width: 60%",
  ":class: with-border",
  "",
  "The chip.",
  ":::",
].join("\n");

function figureHarness(source: string, caret: number) {
  const harness = createRuntimeHarness({ initialPaletteMode: "myst" });
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: source + "\n",
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA")!;
  assert.ok(textarea);
  textarea.setSelectionRange(caret, caret);
  const calls = stubExecCommand(harness, textarea);
  return { harness, textarea, calls };
}

function figurePanelOf(harness: RuntimeHarness): RuntimeElement | undefined {
  return harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-figure-panel") !== null && !element.removed);
}

function figureField(harness: RuntimeHarness, name: string): RuntimeElement {
  const field = harness.createdElements.find((element) =>
    element.getAttribute("data-figure-field") === name && !element.removed);
  assert.ok(field, "figure field " + name);
  return field;
}

function figureAction(harness: RuntimeHarness, name: string): RuntimeElement {
  const button = harness.createdElements.find((element) =>
    element.getAttribute("data-figure-action") === name && !element.removed);
  assert.ok(button, "figure action " + name);
  return button;
}

test("T32: the Figure button with the caret inside a figure opens the form, not the file dialog", () => {
  const { harness, textarea } = figureHarness(figureSource, 5);
  const before = harness.messages.length;
  paletteButton(harness, "figure").dispatch("click", paletteClick);
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewPickImage"), false);
  const panel = figurePanelOf(harness);
  assert.ok(panel, "the form opens");
  const frame = textarea.parentElement!;
  assert.equal(panel.parentElement, frame);
  assert.equal(frame.childElements.indexOf(panel), frame.childElements.indexOf(paletteOf(harness)!) + 1);
  assert.equal(figureField(harness, "source").value, "images/chip.png");
  assert.equal(figureField(harness, "alt").value, "A chip");
  assert.equal(figureField(harness, "width").value, "60%");
  assert.equal(figureField(harness, "caption").value, "The chip.");
  assert.equal(figureField(harness, "align").value, "");
});

test("T32: the Figure button outside any figure still picks an image", () => {
  const { harness } = figureHarness("Just a paragraph.\n\n" + figureSource, 3);
  const before = harness.messages.length;
  paletteButton(harness, "figure").dispatch("click", paletteClick);
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewPickImage"), true);
  assert.equal(figurePanelOf(harness), undefined);
});

test("T32: Apply rewrites the directive in one edit and keeps untouched options byte for byte", () => {
  const { harness, textarea, calls } = figureHarness(figureSource, 5);
  paletteButton(harness, "figure").dispatch("click", paletteClick);
  figureField(harness, "width").value = "300px";
  figureField(harness, "caption").value = "The chip, from above.";
  figureField(harness, "align").value = "center";
  figureAction(harness, "apply").dispatch("click", { preventDefault: () => undefined });
  assert.equal(calls.length, 1, "one native edit, so one undo step");
  assert.equal(calls[0].command, "insertText");
  assert.equal(textarea.value, [
    ":::{figure} images/chip.png",
    ":alt: A chip",
    ":width: 300px",
    ":class: with-border",
    ":align: center",
    "",
    "The chip, from above.",
    ":::",
  ].join("\n"));
  assert.equal(figurePanelOf(harness), undefined, "the form closes");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true", "the editor stays open");
});

test("T32: Apply without a change writes nothing", () => {
  const { harness, textarea, calls } = figureHarness(figureSource, 5);
  paletteButton(harness, "figure").dispatch("click", paletteClick);
  figureAction(harness, "apply").dispatch("click", { preventDefault: () => undefined });
  assert.equal(calls.length, 0);
  assert.equal(textarea.value, figureSource);
  assert.equal(figurePanelOf(harness), undefined);
});

test("T32: an invalid width shows an inline error and keeps the form open without editing", () => {
  const { harness, textarea, calls } = figureHarness(figureSource, 5);
  paletteButton(harness, "figure").dispatch("click", paletteClick);
  figureField(harness, "width").value = "wide";
  figureAction(harness, "apply").dispatch("click", { preventDefault: () => undefined });
  assert.equal(calls.length, 0);
  assert.ok(figurePanelOf(harness), "still open");
  const error = harness.createdElements.find((element) =>
    element.getAttribute("data-figure-error") === "width")!;
  assert.equal(error.hidden, false);
  assert.match(error.textContent, /px, %, em or rem/u);
  assert.equal(textarea.value, figureSource);
  figureField(harness, "width").value = "40%";
  figureAction(harness, "apply").dispatch("click", { preventDefault: () => undefined });
  assert.equal(calls.length, 1);
  assert.match(textarea.value, /:width: 40%/u);
});

test("T32: focus moves inside the editor frame keep the editor open; leaving it saves", () => {
  const { harness, textarea } = figureHarness(figureSource, 5);
  textarea.value = figureSource + "\nmore";
  textarea.dispatch("input");
  textarea.setSelectionRange(5, 5);
  paletteButton(harness, "figure").dispatch("click", paletteClick);
  const saved = () => harness.messages.some((message) => message.type === "previewEditSave" && message.final === true);
  figureField(harness, "alt").dispatch("blur", { relatedTarget: figureField(harness, "width") });
  figureField(harness, "width").dispatch("blur", { relatedTarget: textarea });
  assert.equal(saved(), false);
  figureField(harness, "width").dispatch("blur", { relatedTarget: null });
  assert.equal(saved(), true);
});

test("T32: Escape in the form closes it and gives the focus back to the text box", () => {
  const { harness, textarea, calls } = figureHarness(figureSource, 5);
  paletteButton(harness, "figure").dispatch("click", paletteClick);
  let prevented = false;
  figureField(harness, "alt").dispatch("keydown", { key: "Escape", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(figurePanelOf(harness), undefined);
  assert.equal(calls.length, 0);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  assert.deepEqual(textarea.selectionRange, [5, 5]);
});

test("T32: Browse asks the host for an image, keeps the editor open, and fills Source", () => {
  const { harness, textarea } = figureHarness(figureSource, 5);
  paletteButton(harness, "figure").dispatch("click", paletteClick);
  figureAction(harness, "browse").dispatch("click", { preventDefault: () => undefined });
  const request = harness.messages.at(-1)!;
  assert.equal(request.type, "previewPickImage");
  figureField(harness, "source").dispatch("blur", { relatedTarget: null });
  textarea.dispatch("blur");
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave" && message.final === true), false);
  harness.dispatchMessage({
    type: "previewPickImageResult", editId: request.editId, ok: true, path: "img/other.png",
    revision: 99, requestId: 99,
  });
  assert.equal(figureField(harness, "source").value, "img/other.png");
  assert.ok(figurePanelOf(harness));
  figureAction(harness, "apply").dispatch("click", { preventDefault: () => undefined });
  assert.match(textarea.value, /^:::\{figure\} img\/other\.png\n/u);
});

test("T32: typing in the text box closes the form", () => {
  const { harness, textarea } = figureHarness(figureSource, 5);
  paletteButton(harness, "figure").dispatch("click", paletteClick);
  textarea.dispatch("input");
  assert.equal(figurePanelOf(harness), undefined);
});

test("T32: a Markdown image alone in its paragraph converts to a figure", () => {
  const { harness, textarea, calls } = figureHarness("![A chip](images/chip.png)", 4);
  paletteButton(harness, "figure").dispatch("click", paletteClick);
  assert.ok(figurePanelOf(harness));
  assert.equal(figureField(harness, "alt").value, "A chip");
  assert.equal(figureAction(harness, "apply").textContent, "Convert to figure");
  figureField(harness, "caption").value = "Top view.";
  figureAction(harness, "apply").dispatch("click", { preventDefault: () => undefined });
  assert.equal(calls.length, 1);
  assert.equal(textarea.value, ":::{figure} images/chip.png\n:alt: A chip\n\nTop view.\n:::");
});

function hoverFigure(harness: RuntimeHarness): RuntimeElement {
  const figure = new RuntimeElement({
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "20",
    "data-sphinx-source-end-line": "26",
  }, harness.windowState, 100, 80, "figure");
  harness.dispatchDocument("mouseover", { target: figure });
  return figure;
}

function editFigureButton(harness: RuntimeHarness): RuntimeElement | undefined {
  return harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-figure-edit") !== null);
}

test("T32: hovering a figure in edit mode shows Edit figure; outside edit mode it does not", () => {
  const off = createRuntimeHarness();
  hoverFigure(off);
  assert.equal(editFigureButton(off), undefined);
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  const figure = hoverFigure(harness);
  const button = editFigureButton(harness)!;
  assert.ok(button);
  assert.equal(button.getAttribute("hidden"), null);
  let prevented = false;
  button.dispatch("mousedown", { preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true, "a press does not move the focus");
  // Moving from the figure onto the button is not leaving the figure.
  harness.dispatchDocument("mouseout", { target: figure, relatedTarget: button });
  assert.equal(button.getAttribute("hidden"), null);
  harness.dispatchDocument("mouseout", { target: figure, relatedTarget: harness.body });
  assert.notEqual(button.getAttribute("hidden"), null);
});

test("T32: Edit figure opens the block editor and, once the source arrives, the form", () => {
  const harness = createRuntimeHarness({ initialPaletteMode: "myst" });
  harness.editModeButton.dispatch("click");
  const figure = hoverFigure(harness);
  editFigureButton(harness)!.dispatch("click", { preventDefault: () => undefined, stopPropagation: () => undefined });
  const open = harness.messages.at(-1)!;
  assert.equal(open.type, "previewEditOpen");
  assert.equal(open.line, 20);
  assert.equal(figure.getAttribute("data-sphinx-preview-editing"), "true");
  assert.equal(figurePanelOf(harness), undefined, "nothing before the source arrives");
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: open.editId,
    originalText: figureSource + "\n",
  });
  assert.ok(figurePanelOf(harness), "the form opens with the editor");
  assert.equal(figureField(harness, "source").value, "images/chip.png");
});

// T34: the colour picker and the colour-code swatch in the real page script.
test("T34: the code swatch appears and disappears as the caret moves into and out of a colour code", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Use #c00 or plain text";
  textarea.setSelectionRange(0, 0);
  textarea.dispatch("keyup", { key: "Home" });
  const swatch = paletteButton(harness, "colorCode");
  assert.equal(swatch.getAttribute("hidden"), "true");
  textarea.setSelectionRange(6, 6);
  textarea.dispatch("keyup", { key: "ArrowRight" });
  assert.equal(swatch.getAttribute("hidden"), null, "caret inside #c00");
  textarea.setSelectionRange(15, 15);
  textarea.dispatch("mouseup");
  assert.equal(swatch.getAttribute("hidden"), "true", "caret in plain text");
  textarea.value = "Use #c00 or #00f";
  textarea.setSelectionRange(16, 16);
  textarea.dispatch("input");
  assert.equal(swatch.getAttribute("hidden"), null, "typing next to a code shows it");
});

test("T34: the picker edits the text box as one undo step and keeps the editor open", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  textarea.value = "say foo now";
  textarea.setSelectionRange(4, 7);
  const count = harness.messages.length;
  paletteButton(harness, "color").dispatch("click", { preventDefault: () => undefined });
  const menu = paletteMenu(harness)!;
  assert.equal(menu.getAttribute("data-edit-popover"), "color");
  const swatches = allDescendants(menu).filter((e) => e.getAttribute("data-color-swatch") !== null);
  assert.equal(swatches.length, 16);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  swatches[0].dispatch("click", { preventDefault: () => undefined, stopPropagation: () => undefined });
  assert.equal(textarea.value, `say <span style="color:${swatches[0].getAttribute("data-color-swatch")}">foo</span> now`);
  assert.equal(calls.length, 1);
  assert.equal(paletteMenu(harness), undefined);
  assert.equal(harness.messages.length, count, "no commit");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  assert.equal(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd), "foo", "the text stays selected");
});

test("T34: the hex field takes the focus without saving, and the code swatch replaces a code in place", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  stubExecCommand(harness, textarea);
  textarea.value = "Use #c00 here";
  textarea.setSelectionRange(6, 6);
  textarea.dispatch("keyup");
  paletteButton(harness, "colorCode").dispatch("click", { preventDefault: () => undefined });
  const menu = paletteMenu(harness)!;
  const field = allDescendants(menu).find((e) => e.getAttribute("data-color-hex") !== null)!;
  assert.equal(field.value, "#c00");
  textarea.dispatch("blur", { relatedTarget: field });
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave" && message.final === true), false,
    "focus moved inside the frame");
  field.value = "#00ff88";
  field.dispatch("input");
  field.dispatch("keydown", { key: "Enter", preventDefault: () => undefined, stopPropagation: () => undefined });
  assert.equal(textarea.value, "Use #00ff88 here");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
});

// T35: the inline palette group merged into the table cell bar.
function cellBar(harness: RuntimeHarness): RuntimeElement {
  const bar = harness.createdElements.find((element) =>
    element.getAttribute("data-sphinx-table-menu") === "true");
  assert.ok(bar, "the table bar exists");
  return bar;
}

function cellGroup(harness: RuntimeHarness): RuntimeElement | undefined {
  return cellBar(harness).childElements.find((child) =>
    child.getAttribute("data-sphinx-edit-palette") === "cell");
}

function openCellEditorWithPalette(platform?: string) {
  // The inline group was written for a workspace that stored the MyST palette mode.
  const harness = createRuntimeHarness(platform === undefined ? { initialPaletteMode: "myst" } : { platform, initialPaletteMode: "myst" });
  const opened = openTableCellEditorForTab(harness);
  const control = opened.input();
  const calls = stubExecCommand(harness, control);
  return { harness, ...opened, control, calls };
}

test("T35: the cell bar keeps the table operations and adds the inline group after a separator", () => {
  const { harness } = openCellEditorWithPalette();
  const bar = cellBar(harness);
  assert.deepEqual(
    bar.childElements.filter((child) => child.tagName === "BUTTON")
      .map((button) => button.getAttribute("data-sphinx-table-operation")),
    ["Insert row after selected row", "Delete selected row", "Insert column after selected column",
      "Delete selected column", "Convert to list-table"],
  );
  const group = cellGroup(harness);
  assert.ok(group, "the inline group is inside the table bar");
  const separator = bar.childElements.find((child) => child.getAttribute("role") === "separator");
  assert.ok(separator, "a separator");
  assert.equal(bar.childElements.indexOf(separator) + 1, bar.childElements.indexOf(group));
  assert.equal(group.childElements.some((child) => child.tagName === "SELECT"), false, "no mode select");
  const ids = group.childElements.map((child) => child.getAttribute("data-edit-action"));
  for (const id of ["bold", "italic", "strikethrough", "link", "emoji", "color", "kbd", "sub", "sup"]) {
    assert.ok(ids.includes(id), id);
  }
  for (const id of ["heading", "quote", "rule", "table", "image", "codeFence", "alert", "todo", "details"]) {
    assert.equal(ids.includes(id), false, "block action " + id + " is not in a cell");
  }
  assert.equal(paletteOf(harness), undefined, "no separate palette bar");
});

test("T35: every inline cell button keeps the focus in the cell on mousedown", () => {
  const { harness } = openCellEditorWithPalette();
  const controls = cellGroup(harness)!.childElements.filter((child) =>
    child.getAttribute("data-edit-action") !== null);
  assert.ok(controls.length >= 9);
  for (const control of controls) {
    let prevented = false;
    control.dispatch("mousedown", { preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true, String(control.getAttribute("data-edit-action")));
  }
});

test("T35: Bold in a cell is one native edit, keeps the cell open and Enter still saves it", () => {
  const { harness, control, calls } = openCellEditorWithPalette();
  control.value = "say foo now";
  control.setSelectionRange(4, 7);
  const count = harness.messages.length;
  paletteButton(harness, "bold").dispatch("click", { preventDefault: () => undefined });
  assert.equal(control.value, "say **foo** now");
  assert.equal(calls.length, 1);
  assert.equal(harness.messages.length, count, "no commit");
  typeKey(control, "Enter");
  const save = harness.messages.at(-1);
  assert.equal(save?.type, "previewEditSave");
  assert.equal(save?.final, true);
  assert.match(String(save?.editedText), /\| say \*\*foo\*\* now \| y \|/u);
});

test("T35: the bold shortcut works in a cell and stays out of the browser", () => {
  const { control } = openCellEditorWithPalette();
  control.value = "foo";
  control.setSelectionRange(0, 3);
  let stopped = false;
  control.dispatch("keydown", {
    key: "b", code: "KeyB", ctrlKey: true,
    preventDefault: () => undefined, stopPropagation: () => { stopped = true; },
  });
  assert.equal(control.value, "**foo**");
  assert.equal(stopped, true);
});

test("T35: block-only shortcuts do nothing in a cell", () => {
  const { control } = openCellEditorWithPalette();
  control.value = "foo";
  control.setSelectionRange(0, 3);
  control.dispatch("keydown", {
    key: "/", code: "Slash", ctrlKey: true, preventDefault: () => undefined, stopPropagation: () => undefined,
  });
  assert.equal(control.value, "foo", "the TODO comment toggle is a block action");
});

test("T35: link text and URL with a pipe are escaped and newlines become spaces in a cell", () => {
  const { harness, control } = openCellEditorWithPalette();
  control.value = "see a|b";
  control.setSelectionRange(4, 7);
  control.dispatch("keydown", {
    key: "k", code: "KeyK", ctrlKey: true,
    preventDefault: () => undefined, stopPropagation: () => undefined,
  });
  assert.ok(linkPanelOf(harness), "the link panel opens from the cell");
  assert.equal(linkField(harness, "text").value, "a|b");
  linkField(harness, "text").value = "a|b\nc";
  linkField(harness, "url").value = "https://x.org/?a|b";
  linkField(harness, "url").dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(control.value, "see [a\\|b c](https://x.org/?a\\|b)");
  assert.equal(control.selectionStart, control.value.length, "caret after the link");
  assert.equal(linkPanelOf(harness), undefined);
});

test("T35: already escaped pipes stay single and a colour span has no pipe to break", () => {
  const { harness, control } = openCellEditorWithPalette();
  control.value = "x a\\|b y";
  control.setSelectionRange(2, 6);
  paletteButton(harness, "bold").dispatch("click", { preventDefault: () => undefined });
  assert.equal(control.value, "x **a\\|b** y");
  control.value = "foo";
  control.setSelectionRange(0, 3);
  paletteButton(harness, "color").dispatch("click", { preventDefault: () => undefined });
  const menu = paletteMenu(harness)!;
  const swatch = allDescendants(menu).find((e) => e.getAttribute("data-color-swatch") !== null)!;
  swatch.dispatch("click", { preventDefault: () => undefined, stopPropagation: () => undefined });
  assert.match(control.value, /^<span style="color:#[0-9a-f]+">foo<\/span>$/u);
});

test("T35: a popover opened from the cell bar keeps the editor open, outside focus still commits", () => {
  const { harness, control } = openCellEditorWithPalette();
  control.value = "foo";
  control.dispatch("input");
  control.setSelectionRange(0, 3);
  paletteButton(harness, "emoji").dispatch("click", { preventDefault: () => undefined });
  const menu = paletteMenu(harness)!;
  assert.ok(menu, "the emoji picker opens");
  assert.equal(cellBar(harness).childElements.includes(cellGroup(harness)!), true);
  const filter = allDescendants(menu).find((e) => e.tagName === "INPUT")!;
  const doc = harness.document as unknown as { activeElement?: unknown };
  doc.activeElement = filter;
  control.dispatch("blur", { relatedTarget: filter });
  harness.flushTimers();
  assert.equal(harness.messages.some((m) => m.final === true), false, "focus moved into the bar");
  doc.activeElement = undefined;
  filter.dispatch("blur", { relatedTarget: null });
  harness.flushTimers();
  assert.equal(harness.messages.at(-1)?.final, true, "focus left to nowhere: the cell commits");
});

test("T35: the link panel opened from the cell keeps the editor open and clicking outside commits", () => {
  const { harness, control } = openCellEditorWithPalette();
  control.value = "foo";
  control.dispatch("input");
  control.setSelectionRange(0, 3);
  paletteButton(harness, "link").dispatch("click", { preventDefault: () => undefined });
  const panel = linkPanelOf(harness)!;
  assert.ok(panel);
  const doc = harness.document as unknown as { activeElement?: unknown };
  doc.activeElement = linkField(harness, "url");
  control.dispatch("blur", { relatedTarget: linkField(harness, "url") });
  harness.flushTimers();
  assert.equal(harness.messages.some((m) => m.final === true), false);
  doc.activeElement = undefined;
  linkField(harness, "url").dispatch("blur", { relatedTarget: null });
  harness.flushTimers();
  assert.equal(harness.messages.at(-1)?.final, true);
});

test("T35: table operations keep the inline group in the rebuilt bar", () => {
  const { harness } = openCellEditorWithPalette();
  const group = cellGroup(harness)!;
  harness.createdElements.filter((element) =>
    element.getAttribute("aria-label") === "Insert row after selected row").at(-1)?.dispatch("click");
  // The fake DOM does not empty a parent on `textContent = ""`, so check identity, not counts.
  assert.equal(cellGroup(harness), group, "the same group is moved into the rebuilt bar");
  assert.equal(group.parentElement, cellBar(harness));
  assert.equal(group.removed, false);
});

test("T35: the cell group leaves with the editor", () => {
  const { harness, control } = openCellEditorWithPalette();
  const group = cellGroup(harness)!;
  control.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(group.removed || group.parentElement === undefined || cellBar(harness).removed === true, true);
});

function pasteEvent(items: Array<Record<string, unknown>>, text = "") {
  let prevented = false;
  return {
    event: {
      clipboardData: { getData: (type: string) => (type === "text/plain" ? text : ""), items },
      preventDefault: () => { prevented = true; },
    },
    wasPrevented: () => prevented,
  };
}

function imageItem(type = "image/png", size = 8): Record<string, unknown> {
  const file = { type, size, dataUrl: "data:" + type + ";base64,aGVsbG8=" };
  return { kind: "file", type, getAsFile: () => file };
}

test("T38: pasting an image posts it to the host with the selection remembered", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "See  here";
  textarea.selectionStart = 4;
  textarea.selectionEnd = 4;
  const paste = pasteEvent([imageItem()]);
  textarea.dispatch("paste", paste.event);
  assert.equal(paste.wasPrevented(), true);
  const request = harness.messages.at(-1)!;
  assert.equal(request.type, "previewPasteImage");
  assert.equal(request.mime, "image/png");
  assert.equal(request.dataBase64, "aGVsbG8=");
  assert.equal(typeof request.editId, "string");
  const status = harness.createdElements.find((element) => element.getAttribute("data-sphinx-preview-edit-status") !== null);
  assert.equal(status?.textContent, "Saving image…");
  harness.dispatchMessage({ type: "previewPasteImageResult", editId: request.editId, ok: true, fileName: "image.png" });
  // CR 050: the image is a paragraph of its own; the spaces around the caret go with the breaks.
  assert.equal(textarea.value, "See\n\n![image.png](image.png)\n\nhere");
  assert.equal(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd), "image.png");
});

test("T38: text on the clipboard wins over an image, and other items are ignored", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  const both = pasteEvent([imageItem()], "some text");
  textarea.dispatch("paste", both.event);
  assert.equal(both.wasPrevented(), false, "the native text paste stays");
  const svg = pasteEvent([imageItem("image/svg+xml")]);
  textarea.dispatch("paste", svg.event);
  assert.equal(svg.wasPrevented(), false, "SVG is not an allowed type");
  const none = pasteEvent([]);
  textarea.dispatch("paste", none.event);
  assert.equal(none.wasPrevented(), false);
  assert.equal(harness.messages.length, before, "nothing was posted");
});

test("T38: an image over 10 MB is refused in the editor without a message to the host", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  const paste = pasteEvent([imageItem("image/png", 10 * 1024 * 1024 + 1)]);
  textarea.dispatch("paste", paste.event);
  assert.equal(paste.wasPrevented(), true);
  assert.equal(harness.messages.length, before);
  const status = harness.createdElements.find((element) => element.getAttribute("data-sphinx-preview-edit-status") !== null);
  assert.match(String(status?.textContent), /larger than 10 MB/u);
});

test("T38: a reply for another edit is ignored and a refusal shows its reason", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "See ";
  textarea.selectionStart = 4;
  textarea.selectionEnd = 4;
  textarea.dispatch("paste", pasteEvent([imageItem()]).event);
  const request = harness.messages.at(-1)!;
  harness.dispatchMessage({ type: "previewPasteImageResult", editId: "other-edit", ok: true, fileName: "image.png" });
  assert.equal(textarea.value, "See ");
  harness.dispatchMessage({ type: "previewPasteImageResult", editId: request.editId, ok: false, reason: "Save the document before pasting an image." });
  assert.equal(textarea.value, "See ");
  const status = harness.createdElements.find((element) => element.getAttribute("data-sphinx-preview-edit-status") !== null);
  assert.equal(status?.textContent, "Save the document before pasting an image.");
});

function htmlPasteEvent(html: string, text = "") {
  let prevented = false;
  return {
    event: {
      clipboardData: {
        getData: (type: string) => (type === "text/html" ? html : type === "text/plain" ? text : ""),
        items: [],
      },
      preventDefault: () => { prevented = true; },
    },
    wasPrevented: () => prevented,
  };
}

test("T1: pasting rich text asks the host for Markdown and inserts the answer over the selection", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "See  here";
  textarea.selectionStart = 4;
  textarea.selectionEnd = 4;
  const paste = htmlPasteEvent("<b>bold</b>", "bold");
  textarea.dispatch("paste", paste.event);
  assert.equal(paste.wasPrevented(), true);
  const request = harness.messages.at(-1)!;
  assert.equal(request.type, "previewPasteHtml");
  assert.equal(request.html, "<b>bold</b>");
  assert.equal(textarea.value, "See  here", "nothing is inserted before the answer");
  harness.dispatchMessage({ type: "previewPasteHtmlResult", editId: request.editId, ok: true, markdown: "**bold**" });
  assert.equal(textarea.value, "See **bold** here");
  assert.equal(textarea.selectionStart, 12);
  assert.equal(textarea.selectionEnd, 12);
});

test("T1: a failed or empty conversion inserts the plain text of the clipboard", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "A: ";
  textarea.selectionStart = 3;
  textarea.selectionEnd = 3;
  textarea.dispatch("paste", htmlPasteEvent("<b>x</b>", "plain x").event);
  harness.dispatchMessage({ type: "previewPasteHtmlResult", editId: harness.messages.at(-1)!.editId, ok: false, reason: "boom" });
  assert.equal(textarea.value, "A: plain x");
});

test("T1: Cmd+Shift+V, an image paste and a clipboard without HTML stay untouched", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  textarea.dispatch("keydown", { key: "v", shiftKey: true, metaKey: true });
  const plain = htmlPasteEvent("<b>bold</b>", "bold");
  textarea.dispatch("paste", plain.event);
  assert.equal(plain.wasPrevented(), false, "paste as plain text stays native");
  const next = htmlPasteEvent("<b>bold</b>", "bold");
  textarea.dispatch("paste", next.event);
  assert.equal(next.wasPrevented(), true, "the next ordinary paste is converted again");
  const before2 = harness.messages.length;
  const noHtml = htmlPasteEvent("", "text only");
  textarea.dispatch("paste", noHtml.event);
  assert.equal(noHtml.wasPrevented(), false);
  assert.equal(harness.messages.length, before2);
  assert.equal(before2, before + 1);
  const image = pasteEvent([imageItem()]);
  textarea.dispatch("paste", image.event);
  assert.equal(harness.messages.at(-1)!.type, "previewPasteImage");
});

// T39: block selection with Shift+click and Shift+Arrow (edit mode, contiguous, no Delete in v1).
const SELECTED = "data-sphinx-preview-block-selected";

function selectedLines(harness: RuntimeHarness): number[] {
  return harness.mappings
    .filter((block) => block.getAttribute(SELECTED) !== null)
    .map((block) => Number(block.getAttribute("data-sphinx-source-line")));
}

function selectionAnnouncement(harness: RuntimeHarness): string | undefined {
  return harness.createdElements.find((element) =>
    element.className.split(" ").includes("sphinx-preview-selection-status"))?.textContent;
}

function shiftClick(harness: RuntimeHarness, block: RuntimeElement, extra: Record<string, unknown> = {}): { prevented: number } {
  const counts = { prevented: 0 };
  harness.dispatchDocument("click", {
    target: block, shiftKey: true, preventDefault: () => { counts.prevented += 1; }, stopPropagation: () => undefined, ...extra,
  });
  return counts;
}

function shiftKey(key: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { key, shiftKey: true, preventDefault: () => undefined, stopPropagation: () => undefined, ...extra };
}

test("T39: Shift+click on two blocks selects the run between them without opening an editor", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  const first = shiftClick(harness, harness.mappings[0]);
  assert.deepEqual(selectedLines(harness), [1]);
  shiftClick(harness, harness.mappings[2]);
  assert.deepEqual(selectedLines(harness), [1, 50, 100]);
  assert.equal(first.prevented > 0, true, "the click does not go on to the browser");
  assert.equal(selectionAnnouncement(harness), "3 blocks selected");
  assert.equal(harness.messages.slice(before).some((message) => message.type === "previewEditOpen"), false);
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-block-editing"), null);
  shiftClick(harness, harness.mappings[1]);
  assert.deepEqual(selectedLines(harness), [1, 50], "a later Shift+click moves the free end, the anchor stays");
  assert.equal(selectionAnnouncement(harness), "2 blocks selected");
});

test("T39: the selection announcer is a polite live region created by the page script", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[0]);
  const region = harness.createdElements.find((element) =>
    element.className.split(" ").includes("sphinx-preview-selection-status"))!;
  assert.equal(region.getAttribute("aria-live"), "polite");
  assert.equal(region.getAttribute("role"), "status");
  assert.equal(selectionAnnouncement(harness), "1 block selected");
});

test("T39: outside edit mode Shift+click selects nothing", () => {
  const harness = createRuntimeHarness();
  shiftClick(harness, harness.mappings[0]);
  shiftClick(harness, harness.mappings[2]);
  assert.deepEqual(selectedLines(harness), []);
  harness.dispatchDocument("keydown", shiftKey("ArrowDown", { target: harness.mappings[1] }));
  assert.deepEqual(selectedLines(harness), []);
});

test("T39: the range starts at the block that was clicked or opened last", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-block-editing"), "true");
  shiftClick(harness, harness.mappings[2]);
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-block-editing"), null, "the editor is closed");
  assert.deepEqual(selectedLines(harness), [50, 100]);
});

test("T39: an open editor with changes is saved first; the blocks are selected once the patch is in", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  textarea.value = "Current block, changed\n";
  textarea.dispatch("input");
  const before = harness.messages.length;
  shiftClick(harness, harness.mappings[2]);
  const saves = harness.messages.slice(before).filter((message) => message.type === "previewEditSave");
  assert.equal(saves.length, 1);
  assert.equal(saves[0].final, true);
  assert.deepEqual(selectedLines(harness), [], "nothing is selected before the save result");
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), [50, 100]);
  assert.equal(selectionAnnouncement(harness), "2 blocks selected");
});

test("T39: Shift+Arrow from a focused block extends and shrinks the selection and moves the focus", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  let prevented = 0;
  const down = shiftKey("ArrowDown", { target: harness.mappings[1], preventDefault: () => { prevented += 1; } });
  harness.dispatchDocument("keydown", down);
  assert.deepEqual(selectedLines(harness), [50, 100]);
  assert.equal(prevented, 1);
  assert.equal((harness.mappings[2] as RuntimeElement).focusOptions !== undefined, true, "the free end takes the focus");
  harness.dispatchDocument("keydown", shiftKey("ArrowUp", { target: harness.mappings[2] }));
  assert.deepEqual(selectedLines(harness), [50]);
  harness.dispatchDocument("keydown", shiftKey("ArrowUp", { target: harness.mappings[1] }));
  assert.deepEqual(selectedLines(harness), [1, 50]);
  assert.equal(selectionAnnouncement(harness), "2 blocks selected");
  assert.equal(moveMessages(harness, before).length, 0, "a selection key never moves a block");
});

test("T39: Shift+Arrow does not collide with the Alt+Arrow move chords", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const target = harness.mappings[1];
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", shiftKey("ArrowDown", { target, altKey: true }));
  harness.dispatchDocument("keydown", shiftKey("ArrowDown", { target, ctrlKey: true }));
  harness.dispatchDocument("keydown", shiftKey("ArrowDown", { target, metaKey: true }));
  assert.deepEqual(selectedLines(harness), []);
  assert.equal(moveMessages(harness, before).length, 0);
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target }));
  assert.equal(moveMessages(harness, before).length, 1, "Alt+Arrow still moves");
});

test("T39: Shift+Arrow inside the text box, a field or the property table is left alone", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  let prevented = false;
  textarea.dispatch("keydown", shiftKey("ArrowDown", { preventDefault: () => { prevented = true; } }));
  harness.dispatchDocument("keydown", shiftKey("ArrowDown", {
    target: textarea, preventDefault: () => { prevented = true; },
  }));
  assert.equal(prevented, false);
  assert.deepEqual(selectedLines(harness), []);
});

test("T39: Escape or a plain click clears the selection", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[0]);
  shiftClick(harness, harness.mappings[1]);
  harness.dispatchDocument("keydown", { key: "Escape", target: harness.mappings[1], preventDefault: () => undefined });
  assert.deepEqual(selectedLines(harness), []);
  assert.equal(selectionAnnouncement(harness), "");
  shiftClick(harness, harness.mappings[0]);
  shiftClick(harness, harness.mappings[1]);
  harness.dispatchDocument("click", { target: harness.mappings[2], preventDefault: () => undefined });
  assert.deepEqual(selectedLines(harness), []);
});

test("T39: a content patch and leaving edit mode clear the selection", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[0]);
  shiftClick(harness, harness.mappings[2]);
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), []);
  shiftClick(harness, harness.mappings[0]);
  harness.editModeButton.dispatch("click");
  assert.deepEqual(selectedLines(harness), []);
});

test("T39: included blocks stop the range and the properties table is never selected", () => {
  const harness = createRuntimeHarness({
    mapFrontmatter: true, propertiesMapped: true, firstMappedSourceLine: 5, savedState: { editMode: true },
  });
  harness.mappings[2].setAttribute("data-sphinx-preview-included", "true");
  shiftClick(harness, harness.mappings[0]);
  shiftClick(harness, harness.mappings[2]);
  assert.deepEqual(selectedLines(harness), [5, 50], "the selection ends before the included block");
  harness.dispatchDocument("keydown", shiftKey("ArrowDown", { target: harness.mappings[1] }));
  assert.deepEqual(selectedLines(harness), [5, 50], "Shift+Down cannot pass it");
  const properties = harness.currentProperties()!;
  shiftClick(harness, properties);
  assert.equal(properties.getAttribute(SELECTED), null);
  assert.deepEqual(selectedLines(harness), [5, 50]);
  harness.dispatchDocument("keydown", shiftKey("ArrowUp", { target: harness.mappings[0] }));
  harness.dispatchDocument("keydown", shiftKey("ArrowUp", { target: harness.mappings[0] }));
  assert.equal(properties.getAttribute(SELECTED), null, "Shift+Up stops at the first body block");
});

test("T39 r2: blocks are named by position, so an edit that adds lines selects the right blocks", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  textarea.value = "Current block\nwith\ntwo more lines\n";
  textarea.dispatch("input");
  shiftClick(harness, harness.mappings[2]);
  // The save adds two lines: the blocks below the edited one shift down by two.
  harness.mappings[1].setAttribute("data-sphinx-source-end-line", "54");
  harness.mappings[2].setAttribute("data-sphinx-source-line", "102");
  harness.mappings[2].setAttribute("data-sphinx-source-end-line", "102");
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), [50, 102], "the edited block and the clicked one, at their new lines");
  assert.equal(selectionAnnouncement(harness), "2 blocks selected");
});

test("T39 r2: a save that changes the number of blocks selects nothing instead of another block", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  textarea.value = "Current block\n\nsplit\n";
  textarea.dispatch("input");
  shiftClick(harness, harness.mappings[2]);
  harness.mappings.splice(1, 1);
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), []);
});

test("T39 r2: a pending selection does not survive its editor closing without the patch", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  textarea.value = "Current block, changed\n";
  textarea.dispatch("input");
  shiftClick(harness, harness.mappings[2]);
  harness.editModeButton.dispatch("click");
  harness.editModeButton.dispatch("click");
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), [], "a later patch selects nothing");
});

test("T39 r2: Shift+Arrow with a selection leaves toolbar buttons alone", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[0]);
  let prevented = false;
  harness.dispatchDocument("keydown", shiftKey("ArrowDown", {
    target: harness.zoomInButton, preventDefault: () => { prevented = true; },
  }));
  assert.equal(prevented, false);
  assert.deepEqual(selectedLines(harness), [1]);
  harness.dispatchDocument("keydown", shiftKey("ArrowDown", { target: harness.body }));
  assert.deepEqual(selectedLines(harness), [1, 50], "the page itself still extends it");
});

test("T39 r2: Shift+mousedown inside a link keeps the browser default", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const inner = harness.mappings[0];
  const closest = inner.closest.bind(inner);
  inner.closest = (selector: string) => (selector === "a" ? inner : closest(selector));
  let prevented = false;
  harness.dispatchDocument("mousedown", { target: inner, shiftKey: true, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false);
  harness.dispatchDocument("mousedown", { target: harness.mappings[1], shiftKey: true, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true, "on plain block text it is cancelled");
});

test("T39 r2: Shift+click while the property editor is open selects nothing", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell, preventDefault: () => undefined, stopPropagation: () => undefined,
  });
  assert.ok(harness.createdElements.some((element) => element.tagName === "SELECT"), "the property editor is open");
  shiftClick(harness, harness.mappings[0]);
  assert.deepEqual(selectedLines(harness), []);
});

// T40: copy, cut and paste of the selected blocks as Markdown (the host owns clipboard and edit).
function clipboardKey(key: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { key, ctrlKey: true, preventDefault: () => undefined, stopPropagation: () => undefined, ...extra };
}

function blocksMessages(harness: RuntimeHarness, from = 0): Array<Record<string, unknown>> {
  return harness.messages.slice(from).filter((message) =>
    typeof message.type === "string" && message.type.startsWith("previewBlocks") && !message.type.endsWith("Result"));
}

test("T40: Ctrl+C and Ctrl+X on a selection post its source lines; the keys are ours", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[0]);
  shiftClick(harness, harness.mappings[1]);
  const before = harness.messages.length;
  let prevented = 0;
  const target = harness.mappings[1];
  harness.dispatchDocument("keydown", clipboardKey("c", { target, preventDefault: () => { prevented += 1; } }));
  let sent = blocksMessages(harness, before);
  assert.deepEqual(sent.map((message) => [message.type, message.line, message.endLine]), [["previewBlocksCopy", 1, 52]]);
  assert.equal(prevented, 1, "the browser does not copy the rendered text");
  harness.dispatchMessage({ type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "copy", ok: true });
  harness.dispatchDocument("keydown", clipboardKey("x", { target }));
  sent = blocksMessages(harness, before);
  assert.deepEqual(sent.map((message) => [message.type, message.line, message.endLine]), [
    ["previewBlocksCopy", 1, 52], ["previewBlocksCut", 1, 52],
  ]);
  assert.equal(typeof sent[1].pinViewportTop, "number", "a cut holds the screen position");
  assert.equal(sent[0].pinViewportTop, undefined);
});

test("T40: on macOS the chord is Cmd, and Ctrl alone is ignored", () => {
  const harness = createRuntimeHarness({ platform: "MacIntel", savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[1]);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", clipboardKey("c", { target: harness.mappings[1] }));
  assert.equal(blocksMessages(harness, before).length, 0);
  harness.dispatchDocument("keydown", clipboardKey("c", { target: harness.mappings[1], ctrlKey: false, metaKey: true }));
  assert.deepEqual(blocksMessages(harness, before).map((message) => [message.line, message.endLine]), [[50, 52]]);
});

test("T40: without a selection, in reading mode or with Shift/Alt the keys stay native", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  let prevented = false;
  const native = { target: harness.mappings[1], preventDefault: () => { prevented = true; } };
  harness.dispatchDocument("keydown", clipboardKey("c", native));
  harness.dispatchDocument("keydown", clipboardKey("x", native));
  assert.equal(blocksMessages(harness, before).length, 0);
  assert.equal(prevented, false);
  shiftClick(harness, harness.mappings[1]);
  harness.dispatchDocument("keydown", clipboardKey("c", { ...native, shiftKey: true }));
  harness.dispatchDocument("keydown", clipboardKey("c", { ...native, altKey: true }));
  harness.dispatchDocument("keydown", clipboardKey("c", { ...native, ctrlKey: false }));
  assert.equal(blocksMessages(harness, before).length, 0);
  const reading = createRuntimeHarness({ savedState: { editMode: false } });
  reading.dispatchDocument("keydown", clipboardKey("c", { target: reading.mappings[1] }));
  assert.equal(blocksMessages(reading).length, 0);
});

test("T40: the keys are ignored inside a text box, a field and the property table", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const textarea = openMoveTextarea(harness, "Current block\n");
  const before = harness.messages.length;
  let prevented = false;
  for (const key of ["c", "x", "v"]) {
    harness.dispatchDocument("keydown", clipboardKey(key, { target: textarea, preventDefault: () => { prevented = true; } }));
  }
  assert.equal(blocksMessages(harness, before).length, 0);
  assert.equal(prevented, false);
});

test("T40: Ctrl+V pastes after the selection, or after the block of a focused bar", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  shiftClick(harness, harness.mappings[1]);
  shiftClick(harness, harness.mappings[2]);
  harness.dispatchDocument("keydown", clipboardKey("v", { target: harness.mappings[2] }));
  let sent = blocksMessages(harness, before);
  assert.deepEqual(sent.map((message) => [message.type, message.insertAfterLine, message.pinLine]), [
    ["previewBlocksPaste", 100, 100],
  ]);
  harness.dispatchMessage({ type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "paste", ok: true });
  assert.deepEqual(selectedLines(harness), [], "the selection is gone after a paste");
  const bar = insertPointAfterLine(harness, 52);
  harness.dispatchDocument("keydown", clipboardKey("v", { target: bar.childElements[0] }));
  sent = blocksMessages(harness, before);
  assert.deepEqual(sent.at(-1) && [sent.at(-1)!.insertAfterLine, sent.at(-1)!.pinLine], [52, 50]);
  const start = createRuntimeHarness({ savedState: { editMode: true }, emptyBody: true });
  start.dispatchDocument("keydown", clipboardKey("v", { target: start.mappings[0] }));
  assert.equal(blocksMessages(start).length, 0, "plain focus on the page pastes nothing");
});

test("T40: a held key sends one request until the host answers; a refusal is announced", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[1]);
  const before = harness.messages.length;
  const key = clipboardKey("x", { target: harness.mappings[1] });
  harness.dispatchDocument("keydown", key);
  harness.dispatchDocument("keydown", key);
  assert.equal(blocksMessages(harness, before).length, 1);
  harness.dispatchMessage({ type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "cut", ok: false, reason: "Nope." });
  assert.equal(selectionAnnouncement(harness), "Nope.");
  assert.deepEqual(selectedLines(harness), [50], "a refused cut keeps the selection");
  harness.dispatchDocument("keydown", key);
  assert.equal(blocksMessages(harness, before).length, 2, "a new request after the answer");
});

test("T40: a copy answer says so and a cut answer clears the selection", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[1]);
  harness.dispatchDocument("keydown", clipboardKey("c", { target: harness.mappings[1] }));
  harness.dispatchMessage({ type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "copy", ok: true });
  assert.equal(selectionAnnouncement(harness), "Copied as Markdown");
  assert.deepEqual(selectedLines(harness), [50], "copy keeps the selection");
  harness.dispatchDocument("keydown", clipboardKey("x", { target: harness.mappings[1] }));
  harness.dispatchMessage({ type: "previewBlocksResult", ...MOVE_IDENTIFIERS, op: "cut", ok: true });
  assert.deepEqual(selectedLines(harness), []);
});

// T41: Alt+Up/Down (and the bar arrows of the last selected block) move the whole selection.
function selectTwo(harness: RuntimeHarness, from = 0): void {
  shiftClick(harness, harness.mappings[from]);
  shiftClick(harness, harness.mappings[from + 1]);
}

test("T41: Alt+ArrowDown with a two-block selection posts the span; the selection follows the patch", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  selectTwo(harness);
  assert.deepEqual(selectedLines(harness), [1, 50]);
  const before = harness.messages.length;
  let prevented = 0;
  harness.dispatchDocument("keydown", altKey("ArrowDown", {
    target: harness.mappings[1], preventDefault: () => { prevented += 1; },
  }));
  const moves = moveMessages(harness, before);
  assert.equal(moves.length, 1);
  assert.deepEqual(
    [moves[0].line, moves[0].endLine, moves[0].neighbourLine, moves[0].neighbourEndLine, moves[0].direction],
    [1, 52, 100, 100, "down"],
  );
  assert.equal(prevented, 1);
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: true, line: 3 });
  harness.dispatchMessage(patchMessage());
  // Same block count after the patch: the span now covers the second and third blocks.
  assert.deepEqual(selectedLines(harness), [50, 100]);
  assert.equal(selectionAnnouncement(harness), "2 blocks selected");
  assert.equal((harness.mappings[2] as RuntimeElement).focusOptions?.preventScroll, true, "the focus follows the span");
});

test("T41: Alt+ArrowUp with a selection posts the span above its neighbour", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  selectTwo(harness, 1);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", altKey("ArrowUp", { target: harness.mappings[2] }));
  const up = moveMessages(harness, before).at(-1)!;
  assert.deepEqual([up.line, up.endLine, up.neighbourLine, up.neighbourEndLine, up.direction], [50, 100, 1, 1, "up"]);
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: true, line: 1 });
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), [1, 50]);
});

test("T41: at either end of the document the span does not move, and the selection stays", () => {
  const bottom = createRuntimeHarness({ savedState: { editMode: true } });
  selectTwo(bottom, 1);
  const before = bottom.messages.length;
  let prevented = 0;
  bottom.dispatchDocument("keydown", altKey("ArrowDown", {
    target: bottom.mappings[2], preventDefault: () => { prevented += 1; },
  }));
  assert.deepEqual(moveMessages(bottom, before), []);
  assert.equal(prevented, 1, "the key is still ours");
  assert.deepEqual(selectedLines(bottom), [50, 100]);
  const top = createRuntimeHarness({ savedState: { editMode: true } });
  selectTwo(top, 0);
  top.dispatchDocument("keydown", altKey("ArrowUp", { target: top.mappings[1] }));
  assert.deepEqual(moveMessages(top, 0), []);
});

test("T41: a key repeat does not move the span twice; a refusal keeps the selection and can be retried", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  selectTwo(harness);
  const before = harness.messages.length;
  const target = harness.mappings[1];
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target }));
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target, repeat: true }));
  assert.equal(moveMessages(harness, before).length, 1);
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: false, reason: "Text between." });
  assert.deepEqual(selectedLines(harness), [1, 50], "a refused move leaves the selection as it was");
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target }));
  assert.equal(moveMessages(harness, before).length, 2);
});

test("T41: the arrows of the last selected block's bar move the span; other bars move one block", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  selectTwo(harness);
  const before = harness.messages.length;
  moveButton(harness, 52, "down").dispatch("click", plainClick());
  const span = moveMessages(harness, before).at(-1)!;
  assert.deepEqual([span.line, span.endLine, span.neighbourLine, span.direction], [1, 52, 100, "down"]);
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: false, reason: "no" });
  // The bar of a block that is not the end of the selection moves that one block.
  const count = moveMessages(harness, before).length;
  moveButton(harness, 100, "up").dispatch("click", plainClick());
  const moved = moveMessages(harness, before);
  assert.equal(moved.length, count + 1);
  assert.deepEqual([moved.at(-1)!.line, moved.at(-1)!.endLine, moved.at(-1)!.direction], [100, 100, "up"]);
});

test("T41: without a selection Alt+Arrow still moves the one focused block", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target: harness.mappings[1] }));
  const move = moveMessages(harness, before).at(-1)!;
  assert.deepEqual([move.line, move.endLine, move.direction], [50, 52, "down"]);
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: true, line: 100 });
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), [], "a single-block move selects nothing");
});

test("T41: a patch that changes the number of blocks restores nothing instead of another block", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  selectTwo(harness);
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target: harness.mappings[1] }));
  harness.dispatchMessage({ type: "previewBlockMoveResult", ...MOVE_IDENTIFIERS, ok: true, line: 3 });
  harness.mappings.splice(2, 1);
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(selectedLines(harness), []);
});

test("T41: after a full reload the selection is restored from the saved state", () => {
  const savedState = {
    documentId: "file:///active.md",
    editMode: true,
    pendingMoveSelection: { anchor: 1, target: 2, count: 3, documentId: "file:///active.md", version: 6, at: Date.now() },
  };
  const harness = createRuntimeHarness({ savedState, previewStatus: "success" });
  assert.deepEqual(selectedLines(harness), [50, 100]);
  const stale = createRuntimeHarness({
    savedState: { ...savedState, pendingMoveSelection: { ...savedState.pendingMoveSelection, count: 4 } },
    previewStatus: "success",
  });
  assert.deepEqual(selectedLines(stale), [], "a different block count selects nothing");
});

function savedPending(harness: RuntimeHarness): unknown {
  return (harness.getWebviewState() ?? {}).pendingMoveSelection;
}

test("T41 r2: a saved pending selection of the same version, or an old one, selects nothing and is dropped", () => {
  const base = { anchor: 1, target: 2, count: 3, documentId: "file:///active.md" };
  for (const pending of [
    { ...base, version: 7, at: Date.now() },
    { ...base, version: 6, at: Date.now() - 10000 },
    { ...base, version: 6 },
  ]) {
    const harness = createRuntimeHarness({
      savedState: { documentId: "file:///active.md", editMode: true, pendingMoveSelection: pending },
      previewStatus: "success",
    });
    assert.deepEqual(selectedLines(harness), [], JSON.stringify(pending));
    assert.equal(savedPending(harness), undefined, "no pendingMoveSelection is left in the saved state");
  }
});

test("T41 r2: with a selection, Alt+Arrow on a block outside it moves that one block", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  shiftClick(harness, harness.mappings[0]);
  const before = harness.messages.length;
  harness.dispatchDocument("keydown", altKey("ArrowDown", { target: harness.mappings[2] }));
  const single = moveMessages(harness, before);
  assert.equal(single.length, 0, "the last block has no neighbour below");
  harness.dispatchDocument("keydown", altKey("ArrowUp", { target: harness.mappings[2] }));
  const up = moveMessages(harness, before).at(-1)!;
  assert.deepEqual([up.line, up.endLine, up.direction], [100, 100, "up"]);
});

test("T41 r2: the last selected block's arrows are labelled for the selection; a dropped request leaves no pending mark", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  selectTwo(harness, 1);
  const last = moveButton(harness, 100, "down");
  assert.equal(last.getAttribute("aria-label"), "Move the selected blocks down");
  assert.equal(last.getAttribute("title"), "Move the selected blocks down");
  assert.equal(moveButton(harness, 52, "down").getAttribute("aria-label"), "Move the block above down");
  // Nothing below the span: the click posts nothing and marks nothing.
  const before = harness.messages.length;
  const point = insertPointAfterLine(harness, 100);
  point.childElements[2].removeAttribute("disabled");
  point.childElements[2].dispatch("click", plainClick());
  assert.deepEqual(moveMessages(harness, before), []);
  assert.equal(point.getAttribute("data-sphinx-move-pending"), null);
  harness.dispatchDocument("keydown", { key: "Escape", preventDefault: () => undefined, target: harness.mappings[1] });
  assert.equal(moveButton(harness, 100, "down").getAttribute("aria-label"), "Move the block above down");
  assert.equal(moveButton(harness, 100, "down").getAttribute("title"), null);
});

// P11: the / command menu in the page runtime.
function slashMenuOf(harness: RuntimeHarness): RuntimeElement | undefined {
  return harness.createdElements.find((element) =>
    element.getAttribute("data-slash-menu") === "true" && !element.removed);
}

test("P11: typing / in a block editor opens the menu, Enter applies it and Escape keeps the editor", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Second paragraph.\n/h2";
  textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
  textarea.dispatch("input", { data: "/", inputType: "insertText" });
  assert.equal(slashMenuOf(harness), undefined, "the slash must be at a line start or after a space");
  textarea.value = "Second paragraph.\n/";
  textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
  textarea.dispatch("input", { data: "/", inputType: "insertText" });
  assert.ok(slashMenuOf(harness), "opened by the slash after a line break");
  assert.equal(textarea.getAttribute("aria-expanded"), "true");
  textarea.value = "Second paragraph.\n/h2";
  textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
  textarea.dispatch("input", { data: "2", inputType: "insertText" });
  let prevented = 0;
  textarea.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented += 1; } });
  assert.equal(prevented >= 1, true, "Enter is taken by the menu");
  assert.equal(slashMenuOf(harness), undefined);
  assert.equal(textarea.value, "Second paragraph.\n## ");
  assert.equal(textarea.getAttribute("aria-expanded"), null);

  textarea.value = "Second paragraph.\n## /";
  textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
  textarea.dispatch("input", { data: "/", inputType: "insertText" });
  assert.ok(slashMenuOf(harness));
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(slashMenuOf(harness), undefined, "Escape closes the menu");
  assert.equal(textarea.value, "Second paragraph.\n## /", "and keeps the typed text");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true", "the editor stays open");
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), null, "the next Escape cancels the editor");
});

test("P11: the menu closes when the text box loses the focus", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "/";
  textarea.selectionStart = textarea.selectionEnd = 1;
  textarea.dispatch("input", { data: "/", inputType: "insertText" });
  assert.ok(slashMenuOf(harness));
  textarea.dispatch("blur");
  assert.equal(slashMenuOf(harness), undefined);
});

// CR 025: typed text is saved before the preview leaves the document.

function messageTypesSince(harness: RuntimeHarness, count: number): string[] {
  return harness.messages.slice(count).map((message) => message.type as string);
}

test("CR 025: following a link right after typing posts the final save before the link", () => {
  const harness = createRuntimeHarness();
  const link = addOkfLink(harness);
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  textarea.value = "Typed just now";
  textarea.dispatch("input");
  harness.dispatchDocument("click", t21ClickEvent(link, { metaKey: true }));
  assert.deepEqual(messageTypesSince(harness, before), ["previewEditSave", "previewLink"]);
  const save = harness.messages[before];
  assert.equal(save.final, true);
  assert.equal(save.editedText, "Typed just now\n");
  assert.equal(harness.pendingTimerCount(), 0, "the autosave timer is gone");
});

test("CR 025: an anchor link inside the page keeps the open editor", () => {
  const harness = createRuntimeHarness();
  const link = new RuntimeElement({ "data-sphinx-preview-navigation": "#section" }, harness.windowState, 0, 20, "a");
  harness.frontmatterValueDisplay.appendChild(link);
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Typed just now";
  textarea.dispatch("input");
  const before = harness.messages.length;
  harness.dispatchDocument("click", t21ClickEvent(link, { metaKey: true }));
  assert.equal(messageTypesSince(harness, before).includes("previewEditSave"), false);
  harness.flushTimers();
});

test("CR 025: Back right after typing posts the final save before previewHistoryGo", () => {
  const harness = createRuntimeHarness();
  const ids = { documentId: "file:///active.md", revision: 7, requestId: 11 };
  harness.dispatchMessage({ type: "previewHistoryState", ...ids, canBack: true, canForward: false });
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  textarea.value = "Typed just now";
  textarea.dispatch("input");
  harness.backButton.dispatch("click");
  assert.deepEqual(messageTypesSince(harness, before), ["previewEditSave", "previewHistoryGo"]);
  assert.equal(harness.messages[before].final, true);
  assert.equal(harness.messages[before].editedText, "Typed just now\n");
});

test("CR 025: Back with an untouched editor open posts only the navigation", () => {
  const harness = createRuntimeHarness();
  const ids = { documentId: "file:///active.md", revision: 7, requestId: 11 };
  harness.dispatchMessage({ type: "previewHistoryState", ...ids, canBack: true, canForward: false });
  openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  harness.backButton.dispatch("click");
  assert.deepEqual(messageTypesSince(harness, before), ["previewHistoryGo"]);
});

test("CR 025: a host flush request saves the open editor first, then answers", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  textarea.value = "Typed just now";
  textarea.dispatch("input");
  harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-1" });
  assert.deepEqual(messageTypesSince(harness, before), ["previewEditSave", "previewEditFlushed"]);
  assert.equal(harness.messages[before].final, true);
  assert.equal(harness.messages[before].editedText, "Typed just now\n");
  const answer = harness.messages[before + 1];
  assert.equal(answer.flushId, "flush-1");
  assert.equal(answer.flushed, true);
  assert.equal(harness.pendingTimerCount(), 0);
});

test("CR 025: a host flush request without an open editor only answers", () => {
  const harness = createRuntimeHarness();
  const before = harness.messages.length;
  harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-2" });
  assert.deepEqual(messageTypesSince(harness, before), ["previewEditFlushed"]);
  assert.equal(harness.messages[before].flushed, false);
});

test("CR 025: a host flush request saves the typed text of an open table cell", () => {
  const harness = createRuntimeHarness();
  const input = openTableCellEditor(harness);
  const before = harness.messages.length;
  input.value = "typed";
  input.dispatch("input");
  harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-3" });
  assert.deepEqual(messageTypesSince(harness, before), ["previewEditSave", "previewEditFlushed"]);
  assert.equal(harness.messages[before].final, true);
  assert.match(String(harness.messages[before].editedText), /\| typed\s*\|/u);
});

test("CR 025: a host flush request saves an open frontmatter field and marks it as a flush", () => {
  const { harness, textarea } = openTextFieldEditor("Alpha");
  textarea.value = "Beta";
  harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-4" });
  const saves = frontmatterSaves(harness);
  assert.equal(saves.length, 1);
  assert.equal(saves[0].fieldValue, "Beta");
  assert.equal(saves[0].flush, true);
  assert.equal(harness.messages.at(-1)?.type, "previewEditFlushed");
  assert.equal(harness.messages.at(-1)?.flushed, true);
});

test("CR 025: a frontmatter YAML editor with invalid YAML is still sent on a flush", () => {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "object");
  harness.frontmatterRow.setAttribute("data-okf-value", JSON.stringify({ a: 1 }));
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "a: 1\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  textarea.value = "a: [unclosed";
  harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-5" });
  const saves = frontmatterSaves(harness);
  assert.equal(saves.length, 1);
  assert.equal(saves[0].fieldValueFormat, "yaml");
  assert.equal(saves[0].fieldValue, "a: [unclosed");
  assert.equal(saves[0].flush, true);
});

function openObjectYamlEditor(): {
  harness: ReturnType<typeof createRuntimeHarness>;
  textarea: ReturnType<typeof createRuntimeHarness>["createdElements"][number];
} {
  const harness = createRuntimeHarness();
  harness.frontmatterRow.setAttribute("data-okf-type", "object");
  harness.frontmatterRow.setAttribute("data-okf-value", JSON.stringify({ a: 1 }));
  harness.frontmatterRow.setAttribute("data-okf-value-yaml", "a: 1\n");
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  assert.ok(textarea);
  return { harness, textarea };
}

const CR25_IDS = { documentId: "file:///active.md", revision: 7, requestId: 11 };

test("CR 025: a blur save refused before a host flush is saved again as a flush, then answered", () => {
  // The host focusing another editor tab blurs the editor first: the blur posts a plain save that
  // the host refuses (invalid YAML), and the flush request arrives while it is pending.
  const { harness, textarea } = openObjectYamlEditor();
  textarea.value = "[unclosed";
  textarea.dispatch("blur");
  const plain = frontmatterSaves(harness);
  assert.equal(plain.length, 1);
  assert.equal(plain[0].flush, undefined);
  const before = harness.messages.length;
  harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-9" });
  assert.deepEqual(messageTypesSince(harness, before), [], "the answer waits for the pending save");
  harness.dispatchMessage({
    type: "previewFrontmatterResult",
    ...CR25_IDS,
    editId: plain[0].editId,
    error: "Invalid YAML value: unexpected end",
  });
  assert.deepEqual(messageTypesSince(harness, before), ["previewFrontmatterSave", "previewEditFlushed"]);
  const flushSave = harness.messages[before];
  assert.equal(flushSave.fieldValue, "[unclosed");
  assert.equal(flushSave.fieldValueFormat, "yaml");
  assert.equal(flushSave.flush, true);
  assert.equal(harness.messages[before + 1].flushId, "flush-9");
  assert.equal(harness.messages[before + 1].flushed, true);
  assert.equal(harness.pendingTimerCount(), 0);
});

test("CR 025: a blur save accepted before a host flush is not saved twice", () => {
  const { harness, textarea } = openObjectYamlEditor();
  textarea.value = "a: 2";
  textarea.dispatch("blur");
  const plain = frontmatterSaves(harness);
  const before = harness.messages.length;
  harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-10" });
  assert.deepEqual(messageTypesSince(harness, before), []);
  harness.dispatchMessage({ type: "previewFrontmatterResult", ...CR25_IDS, editId: plain[0].editId, saved: true });
  assert.deepEqual(messageTypesSince(harness, before), ["previewEditFlushed"]);
  assert.equal(frontmatterSaves(harness).length, 1);
});

test("CR 025: a host flush whose pending save gets no result still answers after a bounded wait", () => {
  const { harness, textarea } = openObjectYamlEditor();
  textarea.value = "[unclosed";
  textarea.dispatch("blur");
  const before = harness.messages.length;
  harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-11" });
  assert.deepEqual(messageTypesSince(harness, before), []);
  harness.flushTimers();
  assert.deepEqual(messageTypesSince(harness, before), ["previewEditFlushed"]);
});

test("CR 025: Back right after a refused blur save posts the flush save before previewHistoryGo", () => {
  const { harness, textarea } = openObjectYamlEditor();
  harness.dispatchMessage({ type: "previewHistoryState", ...CR25_IDS, canBack: true, canForward: false });
  textarea.value = "just text";
  textarea.dispatch("blur");
  const plain = frontmatterSaves(harness);
  const before = harness.messages.length;
  harness.backButton.dispatch("click");
  assert.deepEqual(messageTypesSince(harness, before), []);
  harness.dispatchMessage({
    type: "previewFrontmatterResult",
    ...CR25_IDS,
    editId: plain[0].editId,
    error: "The frontmatter field is stale or its value does not match the schema.",
  });
  assert.deepEqual(messageTypesSince(harness, before), ["previewFrontmatterSave", "previewHistoryGo"]);
  assert.equal(harness.messages[before].fieldValue, "just text");
  assert.equal(harness.messages[before].flush, true);
});

test("CR 025: a normal frontmatter save does not carry the flush flag", () => {
  const { harness, textarea } = openTextFieldEditor("Alpha");
  textarea.value = "Beta";
  textarea.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(frontmatterSaves(harness)[0].flush, undefined);
});

test("CR 025: a number field with a bad number is refused on Enter but sent as typed on a flush", () => {
  const open = () => {
    const harness = createRuntimeHarness();
    harness.frontmatterRow.setAttribute("data-okf-type", "number");
    harness.frontmatterRow.setAttribute("data-okf-schema-found", "true");
    harness.frontmatterRow.setAttribute("data-okf-value", "3");
    harness.editModeButton.dispatch("click");
    harness.dispatchDocument("click", {
      target: harness.frontmatterValueCell,
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
    });
    const input = harness.createdElements.find((element) => element.tagName === "INPUT"
      && (element as unknown as { type?: string }).type === "number");
    assert.ok(input);
    input.value = "";
    return { harness, input };
  };
  const refused = open();
  refused.input.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(frontmatterSaves(refused.harness).length, 0);
  const flushed = open();
  flushed.harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-6" });
  const saves = frontmatterSaves(flushed.harness);
  assert.equal(saves.length, 1);
  assert.equal(saves[0].fieldValue, "");
  assert.equal(saves[0].flush, true);
});

test("CR 025: pagehide and a hidden page save an open frontmatter editor as a flush", () => {
  for (const hide of ["pagehide", "visibilitychange"] as const) {
    const { harness, textarea } = openTextFieldEditor("Alpha");
    textarea.value = "Beta";
    if (hide === "pagehide") {
      harness.dispatchWindow("pagehide");
    } else {
      harness.setVisibilityState("hidden");
      harness.dispatchDocument("visibilitychange", {});
    }
    const saves = frontmatterSaves(harness);
    assert.equal(saves.length, 1, hide);
    assert.equal(saves[0].fieldValue, "Beta");
    assert.equal(saves[0].flush, true);
  }
});

test("CR 025: pagehide saves the typed text of an open table cell", () => {
  const harness = createRuntimeHarness();
  const input = openTableCellEditor(harness);
  const before = harness.messages.length;
  input.value = "typed";
  input.dispatch("input");
  harness.dispatchWindow("pagehide");
  const saves = harness.messages.slice(before).filter((message) => message.type === "previewEditSave");
  assert.equal(saves.length, 1);
  assert.match(String(saves[0].editedText), /\| typed\s*\|/u);
});

test("CR 025: a flushed block save carries the flush flag, a normal save does not", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Typed";
  textarea.dispatch("input");
  const before = harness.messages.length;
  harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-7" });
  assert.equal(harness.messages[before].flush, true);
  const other = createRuntimeHarness();
  const area = openBlockEditorWithSource(other);
  area.value = "Typed";
  area.dispatch("input");
  other.flushTimers();
  assert.equal(other.messages.filter((m) => m.type === "previewEditSave").at(-1)?.flush, undefined);
});

test("CR 025: a key typed with surrounding spaces is trimmed on a flush and refused otherwise", () => {
  const open = () => {
    const harness = createRuntimeHarness();
    harness.frontmatterRow.setAttribute("data-okf-type", "text");
    harness.frontmatterRow.setAttribute("data-okf-value", JSON.stringify("v"));
    harness.editModeButton.dispatch("click");
    harness.dispatchDocument("click", {
      target: harness.frontmatterNameCell,
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
    });
    const input = harness.createdElements.find((element) => element.tagName === "INPUT");
    assert.ok(input);
    return { harness, input };
  };
  const normal = open();
  normal.input.value = "  renamed ";
  normal.input.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(frontmatterSaves(normal.harness).length, 0);
  const flushed = open();
  flushed.input.value = "  renamed ";
  flushed.harness.dispatchMessage({ type: "previewFlushEdit", flushId: "flush-8" });
  const saves = frontmatterSaves(flushed.harness);
  assert.equal(saves.length, 1);
  assert.equal(saves[0].newFieldName, "renamed");
  assert.equal(saves[0].flush, true);
});

// CR 041: an editor that disappears in CI must say why. The page keeps a small trace of editor
// events (test diagnostics only) and the value control keeps Cmd/Ctrl+A to itself.
function traceOf(harness: ReturnType<typeof createRuntimeHarness>): Array<{ event: string; detail?: string; stack?: string }> {
  const diagnostics = harness.window.__studioDiagnostics as { trace(): Array<{ event: string; detail?: string }> } | undefined;
  assert.ok(diagnostics, "the page exposes its diagnostics");
  return diagnostics.trace();
}

test("CR 041: the trace records the open, the blur and why the unchanged frontmatter editor closed", () => {
  const { harness, textarea } = openTextFieldEditor("Alpha");
  textarea.dispatch("blur", { relatedTarget: null });
  const events = traceOf(harness);
  const names = events.map((entry) => entry.event);
  assert.equal(names[0], "page");
  assert.ok(names.includes("frontmatter editor opened"), JSON.stringify(names));
  const blur = names.indexOf("frontmatter control blur");
  const closed = events.findIndex((entry) => entry.event === "frontmatter editor closed");
  assert.ok(blur >= 0 && closed > blur, JSON.stringify(names));
  assert.match(events[closed]?.detail ?? "", /^save of an unchanged value field=\S+ active=\S+ pageFocus=\S+$/u);
});

test("CR 041: Cmd/Ctrl+A in the frontmatter value control stops at the document; other keys go on", () => {
  for (const [platform, modifier] of [[undefined, { ctrlKey: true }], ["MacIntel", { metaKey: true }]] as const) {
    const harness = createRuntimeHarness(platform === undefined ? {} : { platform });
    harness.frontmatterRow.setAttribute("data-okf-type", "text");
    harness.frontmatterRow.setAttribute("data-okf-value", JSON.stringify("Alpha"));
    openFrontmatterValueEditor(harness);
    const control = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
    assert.ok(control, "the text field opens a textarea");
    let stopped = 0;
    const key = (event: Record<string, unknown>): void => harness.dispatchDocument("keydown", {
      target: control, preventDefault: noop, stopPropagation: () => { stopped += 1; }, ...event,
    });
    key({ key: "a", ...modifier });
    assert.equal(stopped, 1, `${platform ?? "Linux"}: select-all stays in the control`);
    key({ key: "b", ...modifier });
    key({ key: "a" });
    assert.equal(stopped, 1, "other keys keep reaching VS Code");
    assert.ok(traceOf(harness).some((entry) => entry.event === "select-all kept in control"));
  }
});

test("CR 041: Tab handled by the table cell editor stops at the document; Ctrl+Tab goes on", () => {
  const harness = createRuntimeHarness();
  const { input } = openTableCellEditorForTab(harness);
  let stopped = 0;
  // The browser's bubbling order: the control's own listener, then the document's.
  const key = (event: Record<string, unknown>): void => {
    const control = input();
    let prevented = false;
    const keydown = {
      target: control,
      preventDefault: () => { prevented = true; },
      stopPropagation: () => { stopped += 1; },
      ...event,
    };
    control.dispatch("keydown", keydown);
    harness.dispatchDocument("keydown", { ...keydown, defaultPrevented: prevented });
  };
  key({ key: "Tab" });
  assert.equal(input().value, "y", "the page moved to the next cell");
  assert.equal(stopped, 1, "the workbench never receives the Tab the page used");
  key({ key: "Tab", ctrlKey: true });
  assert.equal(stopped, 1, "Ctrl+Tab (VS Code's editor switch) still reaches the workbench");
  assert.ok(traceOf(harness).some((entry) => entry.event === "editor key kept in page"
    && /^Tab in textarea /u.test(entry.detail ?? "")), JSON.stringify(traceOf(harness)));
});

test("CR 041: the trace records the cell editor opening and getting the focus, on a known clock", () => {
  const harness = createRuntimeHarness();
  openTableCellEditorForTab(harness);
  const events = traceOf(harness);
  const opened = events.findIndex((entry) => entry.event === "cell editor opened");
  const focused = events.findIndex((entry) => entry.event === "cell editor focused");
  assert.ok(opened >= 0 && focused > opened, JSON.stringify(events));
  assert.match(events[opened]?.detail ?? "", /^line=20 row=1 column=0 active=\S+ pageFocus=\S+$/u);
  assert.match(events[focused]?.detail ?? "", /^line=20 row=1 column=0 active=\S+ pageFocus=\S+$/u);
  const diagnostics = harness.window.__studioDiagnostics as { startedAt?: () => number } | undefined;
  assert.equal(typeof diagnostics?.startedAt?.(), "number", "the trace's wall-clock start is exposed");
});

test("CR 041: the page echoes the seq of the properties table it applied, also after a deferral", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  harness.dispatchMessage(propertiesMessage(cellMarkup("first"), { seq: 3 }));
  assert.equal(harness.documentElement.getAttribute("data-okf-properties-seq"), "3");
  openFrontmatterValueEditor(harness);
  harness.dispatchMessage(propertiesMessage(cellMarkup("second"), { seq: 4 }));
  assert.equal(harness.documentElement.getAttribute("data-okf-properties-seq"), "3", "deferred while editing");
  harness.dispatchDocument("keydown", { key: "Escape", target: harness.frontmatterValueCell, preventDefault: noop });
  assert.equal(harness.documentElement.getAttribute("data-okf-properties-seq"), "4", "applied on close");
});
