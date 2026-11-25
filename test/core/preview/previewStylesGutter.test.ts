import assert from "node:assert/strict";
import { test } from "node:test";
import { PREVIEW_ACCESSIBILITY_CSS, PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";
import { renderPreviewToolbar } from "../../../src/core/preview/previewToolbar";

test("T28: insertion points are zero-height, hover-revealed gutter buttons", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-insert-point\s*\{\s*position: relative;\s*height: 0;\s*margin: 0;\s*padding: 0;\s*border: 0;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-insert-point button\s*\{[^}]*position: absolute;[^}]*left: -1\.6em;[^}]*top: -0\.8em;[^}]*width: 1\.4em;[^}]*height: 1\.4em;[^}]*border-radius: 50%;[^}]*opacity: 0;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-sphinx-source-line\]:hover \+ \.sphinx-preview-insert-point button,[^{]*\.sphinx-preview-insert-point button:hover,[^{]*\.sphinx-preview-insert-point button:focus-visible\s*\{\s*opacity: 1;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-insert-point--start\s*\{\s*height: auto;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-insert-point--start button\s*\{[^}]*position: static;[^}]*opacity: 1;/u,
  );
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-007#S5
test("first-element gap: 40px on the first child, clearance only on the first editor and the Start writing button", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content > :first-child\s*\{\s*margin-top: 40px;/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /\[data-okf-properties\]:first-child,[^{]*\.sphinx-preview-block-editor--first,[^{]*\.sphinx-preview-insert-point--first\s*\{\s*margin-top: calc\(40px \+ var\(--sphinx-preview-first-clearance, 0px\)\);/u,
  );
  // P3: the first-block editor keeps the gap and yields the toolbar's width through its inline-end margin.
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-block-editor--first\s*\{\s*margin-inline-end: var\(--sphinx-preview-first-inset, 0px\);/u,
  );
  // The gap is a margin: padding on the column would move its content box and the scroll anchoring.
  assert.doesNotMatch(
    PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content \{[^}]*padding: 40px/u,
  );
});

test("status titles and messages are block-level only on status pages and non-pending banners", () => {
  const selectors: string[] = [];
  for (const match of PREVIEW_ACCESSIBILITY_CSS.matchAll(/([^{}]+)\{([^}]*)\}/gu)) {
    if (/display:\s*block/u.test(match[2]) && /data-sphinx-preview-status/u.test(match[1])) {
      selectors.push(...match[1].split(",").map((selector) => selector.trim()));
    }
  }
  assert.ok(selectors.length >= 4, "block rules exist: " + selectors.join(" | "));
  for (const selector of selectors) {
    assert.ok(
      selector.includes("[data-sphinx-preview-status-page]")
        || selector.includes(':not([data-sphinx-preview-status="pending"])'),
      "unscoped status block rule: " + selector,
    );
  }
  assert.match(PREVIEW_ACCESSIBILITY_CSS,
    /\[data-sphinx-preview-status-page\] \[data-sphinx-preview-status\] > strong/u);
  assert.match(PREVIEW_ACCESSIBILITY_CSS,
    /\[data-sphinx-preview-status\]:not\(\[data-sphinx-preview-status="pending"\]\) > strong/u);
  assert.match(PREVIEW_ACCESSIBILITY_CSS,
    /\[data-sphinx-preview-status-message\][^{]*\{[^}]*margin-block-start: 0\.25em;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-049
test("T43: the pending overlay is fixed, pointer-transparent and never in flow", () => {
  const rule = /\[data-sphinx-preview-pending-overlay\]\s*\{([^}]*)\}/u.exec(PREVIEW_THEME_CSS);
  assert.ok(rule, "the pending overlay rule exists");
  assert.match(rule[1]!, /position: fixed;/u);
  assert.match(rule[1]!, /pointer-events: none;/u);
  assert.match(rule[1]!, /max-width: [^;]*;/u);
  assert.match(PREVIEW_THEME_CSS,
    /\[data-sphinx-preview-pending-overlay\] > (strong|span)[^{]*\{[^}]*display: block;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-THEME-043#S2
test("T08: zoom scales the content font size and the column width together", () => {
  assert.match(PREVIEW_THEME_CSS, /--sphinx-preview-zoom: 1;/u);
  assert.match(
    PREVIEW_THEME_CSS,
    /--sphinx-preview-zoomed-font-size: calc\(var\(--sphinx-preview-font-size\) \* var\(--sphinx-preview-zoom, 1\)\);/u,
  );
  assert.match(
    PREVIEW_THEME_CSS,
    /--sphinx-preview-column-width: calc\(var\(--sphinx-preview-content-max-width\) \* var\(--sphinx-preview-zoom, 1\)\);/u,
  );
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-toolbar-row\]\s*\{[^}]*display: flex;/u);
  assert.match(PREVIEW_THEME_CSS, /\[data-sphinx-preview-pending-overlay\]\s*\{[^}]*inset-block-start: 160px;/u);
  assert.match(PREVIEW_THEME_CSS, /html\[data-sphinx-preview-toolbar-state="collapsed"\]:not\(\[data-sphinx-preview-toolbar-hint\]\) \[data-sphinx-preview-pending-overlay\]\s*\{[^}]*inset-block-start: 62px;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-081#S1
// @tests_req SwRS-MDOKFSTUDIO-MYST-081#S7
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-001
test("the warning banner keeps clear of the four-button-wide toolbar, expanded or collapsed", () => {
  assert.match(PREVIEW_THEME_CSS,
    /\[data-sphinx-preview-warning-banner\]\s*\{[^}]*--sphinx-preview-warning-banner-reserve: calc\(4 \* 30px \+ 3 \* 2px \+ 8px \+ 14px \+ 8px\);/u);
  // The collapsed toolbar is as wide as the expanded one: no second reserve.
  assert.doesNotMatch(PREVIEW_THEME_CSS, /toolbar-state="collapsed"\] \[data-sphinx-preview-warning-banner\]/u);
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-022#S2
// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-022#S3
test("P7: full width uses the 16 px gutter a broken-out table keeps in auto", () => {
  assert.match(PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-width="full"\]\s*\{[^}]*--sphinx-preview-content-gutter: 16px;/u);
});

test("T10: full width lifts the column limit and auto lets flagged elements break out", () => {
  assert.match(PREVIEW_THEME_CSS,
    /html\[data-sphinx-preview-width="full"\]\s*\{[^}]*--sphinx-preview-column-width: 100000px;/u);
  const rule = /html\[data-sphinx-preview-width="auto"\] #sphinx-myst-preview-content > \[data-sphinx-preview-wide\][^{]*\{([^}]*)\}/u
    .exec(PREVIEW_THEME_CSS);
  assert.ok(rule, "the auto breakout rule exists");
  assert.match(rule[1]!, /width: calc\(100% \+ var\(--sphinx-preview-breakout, 0px\)\);/u);
  assert.match(rule[1]!, /max-width: none;/u);
  assert.match(PREVIEW_THEME_CSS,
    /\[data-sphinx-preview-width-toggle\]\[data-width-mode="auto"\] \[data-width-icon="auto"\]/u);
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023#S6
// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023#S7
test("T10: the auto measure lifts every cap, the row-handle one included", () => {
  // The row-handle cap is !important: a weaker uncap would measure the capped table, flip the
  // breakout at every resize and pull the scroll back on every frame.
  assert.match(PREVIEW_THEME_CSS,
    /\[data-sphinx-preview-measuring\]\s*\{\s*max-width: none !important;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-037
test("the TOC column is hidden by default, reserves 256px when open and hides on narrow panes", () => {
  const css = PREVIEW_THEME_CSS;
  assert.match(css, /nav\[data-sphinx-preview-toc\] \{\s*display: none;/u);
  const media = css.match(/@media \(min-width: 760px\) \{[\s\S]*?\n\}\n/u)?.[0] ?? "";
  assert.match(media, /html\[data-sphinx-preview-toc="open"\] \{\s*--sphinx-preview-toc-reserve: 256px;/u);
  assert.match(media, /html\[data-sphinx-preview-toc="open"\] body \{\s*padding-inline-end: var\(--sphinx-preview-toc-reserve\)/u);
  assert.match(media, /nav\[data-sphinx-preview-toc\] \{[^}]*position: fixed;[^}]*inset-block-start: var\(--sphinx-preview-toc-top[^}]*inset-block-end: 16px;[^}]*width: 240px;/u);
  assert.match(css, /\[data-sphinx-preview-sticky-headings\] \{[^}]*max-width: calc\(100% - var\(--sphinx-preview-toc-reserve, 0px\)\)/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-037
test("a narrow pane with the TOC on shows a rail and opens the column as an overlay", () => {
  const css = PREVIEW_THEME_CSS;
  const media = css.match(/@media \(max-width: 759px\) \{[\s\S]*?\n\}\n/u)?.[0] ?? "";
  assert.match(css, /\[data-sphinx-preview-toc-rail\] \{\s*display: none;/u);
  assert.match(media, /html\[data-sphinx-preview-toc="open"\] \[data-sphinx-preview-toc-rail\] \{[^}]*position: fixed;[^}]*display: flex;/u);
  assert.match(media, /nav\[data-sphinx-preview-toc\]\[data-sphinx-preview-toc-overlay="open"\] \{[^}]*position: fixed;[^}]*display: block;/u);
  assert.doesNotMatch(media, /animation|transition/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-037
test("a narrow pane with the TOC on pads the content for the 16px rail and keeps the overlay under the toolbar tooltip", () => {
  const css = PREVIEW_THEME_CSS;
  const media = css.match(/@media \(max-width: 759px\) \{[\s\S]*?\n\}\n/u)?.[0] ?? "";
  assert.match(media, /html\[data-sphinx-preview-toc="open"\] \{\s*--sphinx-preview-toc-reserve: 16px;/u);
  assert.match(media, /html\[data-sphinx-preview-toc="open"\] body \{\s*padding-inline-end: var\(--sphinx-preview-toc-reserve\)/u);
  assert.match(media, /nav\[data-sphinx-preview-toc\]\[data-sphinx-preview-toc-overlay="open"\] \{[^}]*inset-block-start: calc\(var\(--sphinx-preview-toc-top, 96px\) \+ 40px\);/u);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-143
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-152
test("T15: an open comment is an admonition-like box and showComments off hides the gray chips only", () => {
  const css = PREVIEW_THEME_CSS;
  assert.match(css, /\.okf-comment > \.okf-comment-body:not\(\[hidden\]\) \{[^}]*border-inline-start: 4px solid/u);
  assert.match(css, /\.okf-comment\[data-okf-comment-kind="todo"\] > \.okf-comment-body:not\(\[hidden\]\)::before \{\s*content: "TODO";/u);
  assert.match(css, /html\[data-okf-show-comments="false"\] #sphinx-myst-preview-content \.okf-comment\[data-okf-comment-kind="comment"\] \{\s*display: none;/u);
  assert.doesNotMatch(css, /data-okf-show-comments="false"\][^{]*kind="todo"/u);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-003
test("edit mode titles an open comment with its literal tag in code font", () => {
  const css = PREVIEW_THEME_CSS;
  assert.match(css, /html\[data-sphinx-preview-edit-mode="on"\] #sphinx-myst-preview-content \.okf-comment > \.okf-comment-body\[data-okf-tag\]:not\(\[hidden\]\)::before \{\s*content: attr\(data-okf-tag\);\s*font-family: var\(--studio-editor-font-family/u);
  // Read mode keeps the words.
  assert.match(css, /\.okf-comment > \.okf-comment-body:not\(\[hidden\]\)::before \{\s*content: "Comment";/u);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-071
test("README HTML: align, per-theme picture images and the edit-mode frame titled with the tag", () => {
  const css = PREVIEW_THEME_CSS;
  assert.match(css, /\[align="center"\], #sphinx-myst-preview-content center \{ text-align: center; \}/u);
  // The theme, not the system, picks the image of a picture.
  assert.doesNotMatch(css, /prefers-color-scheme[^{]*img\.okf-theme/u);
  assert.match(css, /img\.okf-theme-dark \{ display: none; \}/u);
  assert.match(css, /data-sphinx-preview-theme-mode="current"\] body:is\(\.vscode-dark, \.vscode-high-contrast\) #sphinx-myst-preview-content img\.okf-theme-dark \{ display: inline; \}/u);
  assert.match(css, /html\[data-sphinx-preview-edit-mode="on"\] #sphinx-myst-preview-content \.okf-html-block\[data-okf-tag\]::before \{\s*content: attr\(data-okf-tag\);/u);
  // Read mode paints no frame: every okf-html-block rule is scoped to edit mode.
  for (const rule of css.split("}").filter((part) => part.includes(".okf-html-block"))) {
    assert.match(rule, /data-sphinx-preview-edit-mode="on"/u);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-152
test("the Comments toolbar button hides the gray and thread chips at once and goes away with the setting", () => {
  const css = PREVIEW_THEME_CSS;
  assert.match(css, /html\[data-sphinx-preview-comments="off"\] #sphinx-myst-preview-content \.okf-comment\[data-okf-comment-kind="comment"\],\s*html\[data-sphinx-preview-comments="off"\] #sphinx-myst-preview-content \.okf-comment\[data-okf-comment-kind="thread"\] \{\s*display: none;/u);
  assert.doesNotMatch(css, /data-sphinx-preview-comments="off"\][^{]*kind="todo"/u);
  assert.match(css, /html\[data-okf-show-comments="false"\] \[data-sphinx-preview-comments-toggle\] \{\s*display: none;/u);
  const toolbar = renderPreviewToolbar();
  assert.match(toolbar, /data-sphinx-preview-comments-toggle aria-pressed="true" aria-label="Hide comments" title="Hide comments" data-tooltip="Hide comments"/u);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-152
test("comments hidden by the button or the setting: highlights lose their paint, badges and the orphan box go", () => {
  const css = PREVIEW_THEME_CSS;
  const ruleOf = (selector: string): string => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    return new RegExp(`${escaped}[,\\s][^{]*\\{([^}]*)\\}`, "u").exec(css)?.[1] ?? "";
  };
  for (const off of ['html[data-sphinx-preview-comments="off"]', 'html[data-okf-show-comments="false"]']) {
    const mark = ruleOf(`${off} #sphinx-myst-preview-content mark[data-okf-comment-thread]`);
    assert.ok(mark, `${off}: a rule for the highlights`);
    assert.match(mark, /background: transparent;/u, `${off}: no highlight colour`);
    assert.match(mark, /text-decoration: none;/u, `${off}: no dotted underline of a resolved thread`);
    assert.match(mark, /border-radius: 0;/u, `${off}: no rounded paint`);
    assert.match(mark, /cursor: inherit;/u, `${off}: no pointer cursor`);
    assert.doesNotMatch(mark, /display: none/u, `${off}: the quoted text stays`);
    assert.match(ruleOf(`${off} #sphinx-myst-preview-content button[data-okf-comment-badge]`), /display: none;/u,
      `${off}: badges hidden`);
    assert.match(ruleOf(`${off} [data-okf-orphans]`), /display: none;/u, `${off}: Orphaned comments box hidden`);
  }
  // The hiding rules come after the paint rules and are more specific than the resolved underline.
  assert.ok(css.indexOf('html[data-okf-show-comments="false"] #sphinx-myst-preview-content mark[data-okf-comment-thread]')
    > css.indexOf('mark[data-okf-comment-thread][data-okf-comment-resolved="true"]'));
});

test("the comment boxes (compose, thread popover, open comment) have square corners", () => {
  const block = (selector: string): string => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    return new RegExp(`(?:^|\\n)${escaped} \\{([^}]*)\\}`, "u").exec(PREVIEW_THEME_CSS)?.[1] ?? "";
  };
  for (const selector of [
    "[data-okf-comment-compose]",
    "[data-okf-comment-popover]",
    "#sphinx-myst-preview-content .okf-comment > .okf-comment-body:not([hidden])",
  ]) {
    const rules = block(selector);
    assert.ok(rules, `${selector} rule`);
    assert.match(rules, /border-radius: 0;/u, selector);
    assert.doesNotMatch(rules, /border-radius: [1-9]/u, selector);
  }
  // Buttons and text inputs inside the boxes keep their small radius.
  assert.match(PREVIEW_THEME_CSS, /\[data-okf-comment-compose\] button,[^{]*\{[^}]*border-radius: 3px;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-207
test("T16: the change bars sit in one column of a layer, square, with no layout shift", () => {
  const css = PREVIEW_THEME_CSS;
  // The bar is no longer an inset shadow against the text edge, nor a pseudo-element of the block.
  assert.doesNotMatch(css, /inset 3px 0 0 var\(--studio-editorGutter-addedBackground/u);
  assert.doesNotMatch(css, /\[data-sphinx-preview-changed\][^{]*(?:::before|\{[^}]*box-shadow)/u);
  assert.match(css, /\[data-sphinx-preview-change-layer\] \{[^}]*position: absolute;[^}]*inset-inline: 0;[^}]*height: 0;[^}]*pointer-events: none;/u);
  // One column for every bar: a fixed inline-start offset, 3px wide, square ends, the gutter colour.
  assert.match(css, /\[data-sphinx-preview-change-layer\] > span \{[^}]*position: absolute;[^}]*inset-inline-start: 8px;[^}]*width: 3px;[^}]*border-radius: 0;[^}]*background: var\(--studio-editorGutter-addedBackground, #2ea043\);/u);
  // The Diff toggle off hides the layer.
  assert.match(css, /data-sphinx-preview-incoming="off"\] \[data-sphinx-preview-change-layer\] \{\s*display: none;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-045
test("T16b: only the current TOC entry loses its rounded corners", () => {
  const css = PREVIEW_THEME_CSS;
  assert.match(css, /li\[data-sphinx-preview-toc-current\] > button:not\(\[data-sphinx-preview-toc-twisty\]\) \{[^}]*border-radius: 0;[^}]*box-shadow: inset 3px 0 0 var\(--studio-focusBorder, Highlight\)/u);
  assert.match(css, /nav\[data-sphinx-preview-toc\] li button \{[^}]*border-radius: 4px;/u);
});

test("T21: the edition palette is a wrapping pill bar with an in-frame popover and no inline style", () => {
  const bar = /\.sphinx-preview-edit-palette\s*\{[^}]*\}/u.exec(PREVIEW_THEME_CSS)?.[0] ?? "";
  assert.match(bar, /position: relative;/u);
  assert.match(bar, /flex-wrap: wrap;/u);
  assert.match(bar, /max-width: 100%;/u);
  assert.match(bar, /border-radius: 18px;/u);
  assert.doesNotMatch(bar, /position: fixed/u);
  const menu = /\.sphinx-preview-edit-palette-menu\s*\{[^}]*\}/u.exec(PREVIEW_THEME_CSS)?.[0] ?? "";
  assert.match(menu, /position: absolute;/u);
  assert.match(menu, /max-height: 15em;/u);
  assert.match(menu, /overflow-y: auto;/u);
});

test("P4: the palette sits on top of the frame and sticks below the sticky band and the toolbar", () => {
  const css = PREVIEW_THEME_CSS;
  const bar = /\.sphinx-preview-block-editor-host > \.sphinx-preview-edit-palette\s*\{([^}]*)\}/u.exec(css)?.[1] ?? "";
  assert.match(bar, /position: sticky;/u, "pure CSS sticky, no scroll handler");
  assert.match(bar, /inset-block-start: calc\(max\(var\(--sphinx-preview-reading-offset, 0px\), var\(--sphinx-preview-toolbar-bottom, 0px\)\) \+ 4px\);/u);
  assert.match(bar, /z-index: 3;/u, "above the frame (z-index 1), below the sticky band (999)");
  assert.doesNotMatch(bar, /position: (?:fixed|absolute)/u);
  // The host (palette + frame) bounds the sticky range, takes the spacing of the bare frame and
  // leaves the frame without margins of its own.
  assert.match(css, /\.sphinx-preview-block-editor-host \{\s*margin: 0;\s*\}/u);
  assert.match(css,
    /#sphinx-myst-preview-content p\[data-sphinx-preview-editing="true"\] \+ \.sphinx-preview-block-editor-host \{\s*margin: 0 0 1em;/u);
  assert.match(css,
    /#sphinx-myst-preview-content \.sphinx-preview-block-editor-host > \.sphinx-preview-block-editor \{\s*margin: 0;/u);
  assert.match(css,
    /p\[data-sphinx-preview-editing="true"\] \+ \.sphinx-preview-block-editor-host\.sphinx-preview-block-editor--first,/u,
    "the first-element clearance moves to the host");
  assert.doesNotMatch(css, /sphinx-preview-edit-palette[^{]*\{[^}]*style=/u);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-021
test("CR 123: the frame reserves the distance the sticky palette rides down, as a top margin", () => {
  assert.match(PREVIEW_THEME_CSS,
    /#sphinx-myst-preview-content \.sphinx-preview-block-editor-host > \.sphinx-preview-block-editor \{\s*margin-top: var\(--sphinx-preview-palette-reserve, 0px\);/u);
});

test("P4: the palette stays in the flow in short panes and when the runtime says it is too tall", () => {
  const css = PREVIEW_THEME_CSS;
  assert.match(css,
    /@media \(max-height: 520px\) \{\s*\.sphinx-preview-block-editor-host > \.sphinx-preview-edit-palette \{\s*position: relative;/u);
  assert.match(css,
    /\.sphinx-preview-block-editor-host\[data-sphinx-palette-static="true"\] > \.sphinx-preview-edit-palette \{\s*position: relative;/u);
});

test("CR 034: a narrow pane keeps the palette sticky; it wraps inside the pane instead of leaving the flow", () => {
  const css = PREVIEW_THEME_CSS;
  assert.doesNotMatch(css, /@media \(max-width: 480px\)[^{]*\{\s*\.sphinx-preview-block-editor-host/u,
    "no width query drops the sticky bar");
  const bar = /\.sphinx-preview-edit-palette \{([^}]*)\}/u.exec(css)?.[1] ?? "";
  assert.match(bar, /flex-wrap: wrap;/u);
  assert.match(bar, /max-width: 100%;/u);
});

test("CR 034: the table toolbar rides down with a scrolling table by a transform, not by layout", () => {
  const css = PREVIEW_THEME_CSS;
  const rule = /\.sphinx-preview-table-menu\[data-sphinx-table-menu-stuck="true"\]\s*\{([^}]*)\}/u.exec(css)?.[1] ?? "";
  assert.match(rule, /transform: translateY\(var\(--sphinx-preview-table-menu-shift, 0px\)\);/u);
  assert.match(rule, /z-index: 3;/u);
  assert.doesNotMatch(rule, /position: (?:fixed|absolute)|inset-block|top:/u);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-028
test("T44: the Orphaned comments box sits in the content's bottom padding and adds no scroll height", () => {
  const padding = /#sphinx-myst-preview-content \{[^}]*padding: 0 var\(--sphinx-preview-content-gutter\) (min\(80vh[^;]*\));/u
    .exec(PREVIEW_THEME_CSS);
  assert.ok(padding, "the content keeps its bottom padding");
  const box = /\n\[data-okf-orphans\] \{([^}]*)\}/u.exec(PREVIEW_THEME_CSS);
  assert.ok(box, "the box has a rule");
  assert.ok(box[1].includes(`margin: calc(-1 * ${padding[1]}) auto 0;`),
    "the negative top margin repeats the content's bottom padding exactly");
  assert.match(box[1], /pointer-events: none;/u, "the empty space below the content stays clickable as before");
});

test("P11: the slash menu floats above the toolbar and the palette popovers and is placed by the runtime", () => {
  const menu = /\.sphinx-preview-slash-menu\s*\{([^}]*)\}/u.exec(PREVIEW_THEME_CSS)?.[1] ?? "";
  assert.match(menu, /position: fixed;/u);
  assert.match(menu, /z-index: 1400;/u, "above the toolbar (1100) and the palette popovers (1300)");
  assert.match(menu, /max-height: 320px;/u);
  assert.match(menu, /overflow-y: auto;/u);
  assert.doesNotMatch(menu, /\b(?:top|left):/u, "top and left come from the caret, through the CSSOM");
  assert.match(
    /\.sphinx-preview-slash-option\[data-active="true"\]\s*\{([^}]*)\}/u.exec(PREVIEW_THEME_CSS)?.[1] ?? "",
    /list-activeSelectionBackground/u,
  );
  const live = /\.sphinx-preview-slash-live\s*\{([^}]*)\}/u.exec(PREVIEW_THEME_CSS)?.[1] ?? "";
  assert.match(live, /clip: rect\(0 0 0 0\);/u, "the live region is visually hidden");
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-034
// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-001#S2
test("K1: long words and bare URLs wrap inside text blocks, links and table cells", () => {
  const rule = /#sphinx-myst-preview-content :is\(([^)]*)\)\s*\{[^}]*overflow-wrap: anywhere;/u.exec(PREVIEW_THEME_CSS);
  assert.ok(rule, "expected an overflow-wrap: anywhere rule for text blocks");
  const selectors = rule[1].split(",").map((token) => token.trim());
  for (const tag of ["p", "li", "td", "th", "a", "blockquote", "dd", "dt", "h1", "h2", "figcaption"]) {
    assert.ok(selectors.includes(tag), `expected ${tag} to wrap long words`);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-167
test("an inline thread is a green chip with a bubble, a green titled box, and goes with the gray chips", () => {
  const css = PREVIEW_THEME_CSS;
  assert.match(css, /\.okf-chip--thread \{[^}]*border-color: var\(--studio-charts-green/u);
  assert.match(css, /\.okf-chip--thread::before \{[^}]*mask: url\("data:image\/svg\+xml/u);
  assert.match(css, /\.okf-comment\[data-okf-comment-kind="thread"\] > \.okf-comment-body:not\(\[hidden\]\)::before \{\s*content: "Thread";/u);
  assert.match(css, /html\[data-okf-show-comments="false"\] #sphinx-myst-preview-content \.okf-comment\[data-okf-comment-kind="thread"\] \{\s*display: none;/u);
  assert.doesNotMatch(css, /style=/u);
});
