import assert from "node:assert/strict";
import { test } from "node:test";

import { buildHtmlExport, snapshotHasMath, type HtmlExportInputs } from "../../../src/core/export/htmlExport";
import { isExportSnapshot, type ExportSnapshot } from "../../../src/core/export/exportSnapshot";
import { katexExportCss, katexFontUrls } from "../../../src/core/export/exportStyles";
import { THEME_TOKEN_NAMES } from "../../../src/core/preview/themeTokens";

const inputs = (overrides: Partial<HtmlExportInputs> = {}): HtmlExportInputs => ({
  stem: "notes",
  maxContentWidth: 900,
  imageData: (src) => (src === "vscode-webview://abc/pic.png" ? "data:image/png;base64,AAAA" : undefined),
  ...overrides,
});

const snapshot = (contentHtml: string, overrides: Partial<ExportSnapshot> = {}): ExportSnapshot => ({
  contentHtml: `<main id="sphinx-myst-preview-content">${contentHtml}</main>`,
  rootAttributes: { "data-sphinx-preview-theme": "2", "data-sphinx-preview-width": "fixed" },
  tokens: { "editor-background": "#101010", "editor-foreground": "#eeeeee" },
  mathStyles: "",
  shownTabs: [],
  ...overrides,
});

/** The part of the file after the style sheets, where the page content is. */
const bodyOf = (html: string): string => html.slice(html.indexOf("<body"));

const build = (contentHtml: string, overrides: Partial<ExportSnapshot> = {}, extra: Partial<HtmlExportInputs> = {}) =>
  buildHtmlExport(snapshot(contentHtml, overrides), inputs(extra));

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-136
test("the file is one document with no script, no linked file and no import, and no vscode- name", () => {
  const { html } = build("<h1>Title</h1><p>text</p>");
  assert.match(html, /^<!doctype html>/u);
  assert.doesNotMatch(html, /<script|<link|@import|vscode-/iu);
  assert.match(html, /<title>Title<\/title>/u);
  assert.match(html, /<meta charset="utf-8">/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-136
test("the resolved theme tokens replace the host mapping and the theme kind class goes on the body", () => {
  const { html } = build("<p>x</p>");
  assert.match(html, /--studio-editor-background: #101010;/u);
  assert.doesNotMatch(html, /var\(--vscode/u);
  assert.match(html, /<body class="studio-kind-dark">/u);
  assert.match(html, /data-sphinx-preview-width="fixed"/u);
  assert.match(html, /color-scheme: dark/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-136
test("a local image becomes a data URI and an unreadable one is counted and loses its source", () => {
  const { html, missingImages } = build(
    '<img src="vscode-webview://abc/pic.png" alt="a"><img src="vscode-webview://abc/gone.png" alt="b">'
    + '<img src="data:image/svg+xml;base64,PHN2Zz4=" alt="c">',
  );
  assert.equal(missingImages, 1);
  assert.match(html, /<img src="data:image\/png;base64,AAAA" alt="a">/u);
  assert.match(html, /<img alt="b">/u);
  assert.match(html, /src="data:image\/svg\+xml;base64,PHN2Zz4="/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-135
test("links keep external and anchor targets and unwrap the others, reporting them once", () => {
  const { html, removedLinks } = build(
    '<p><a data-sphinx-preview-navigation="https://example.com/x">ext</a> '
    + '<a data-sphinx-preview-navigation="#part">here</a> '
    + '<a data-sphinx-preview-navigation="other.md">rel</a> '
    + '<a data-sphinx-preview-navigation="wiki:Page">wiki</a> '
    + '<a data-sphinx-preview-navigation="other.md">again</a> '
    + '<a data-sphinx-preview-navigation="/abs/path">abs</a></p>',
  );
  assert.match(html, /<a href="https:\/\/example\.com\/x">ext<\/a>/u);
  assert.match(html, /<a href="#part">here<\/a>/u);
  assert.match(html, /rel wiki again abs/u);
  assert.deepEqual(removedLinks, ["other.md", "wiki:Page", "/abs/path"]);
  assert.doesNotMatch(html, /data-sphinx-preview-navigation/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-137
test("folded sections are shown and the fold attributes are gone", () => {
  const { html } = build(
    '<h2 data-okf-fold="1">Head</h2><p data-okf-folded="1" hidden="until-found">was folded</p>',
  );
  assert.match(html, /was folded/u);
  assert.doesNotMatch(bodyOf(html), /hidden|data-okf-fold/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-137
test("review comments, controls and editing chrome are left out, find marks keep their text", () => {
  const { html } = build(
    '<p>keep <span class="okf-comment" data-okf-comment-kind="note"><button class="okf-chip">1</button>'
    + '<span class="okf-comment-body" hidden>secret note</span></span>'
    + '<mark data-sphinx-preview-find="1">found</mark></p>'
    + '<button>Copy</button><textarea>draft</textarea><input type="text" value="v">'
    + '<div class="sphinx-preview-insert-point">+</div>'
    + '<p data-line="3" data-sphinx-source-line="3" contenteditable="true" onclick="x()">after</p>',
  );
  assert.match(html, /keep/u);
  assert.match(html, /found/u);
  assert.match(html, /after/u);
  assert.doesNotMatch(bodyOf(html), /secret note|Copy|draft|<button|<textarea|<input|insert-point|data-line|contenteditable|onclick|<mark/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-137
test("a task list checkbox stays, disabled and without its edit attributes", () => {
  const { html } = build('<li><input type="checkbox" checked data-myst-checkbox-line="4"> done</li>');
  assert.match(html, /<input type="checkbox" checked="" disabled="">/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-137
test("a tab set works without script: radios, labels, and the shown tab is the one the page showed", () => {
  const tabs = '<div class="myst-tab-set"><div class="myst-tab-list" role="tablist">'
    + '<button class="myst-tab" id="t1" aria-controls="p1" aria-selected="true">One</button>'
    + '<button class="myst-tab" id="t2" aria-controls="p2" aria-selected="false">Two</button></div>'
    + '<div class="myst-tab-panel" id="p1">first</div><div class="myst-tab-panel" id="p2" hidden>second</div></div>';
  const { html } = build(tabs, { shownTabs: [1] });
  assert.equal((html.match(/<input type="radio"/gu) ?? []).length, 2);
  assert.match(html, /<input type="radio" class="myst-tab-radio" name="myst-tabset-1" id="myst-tabset-1-2" data-export-tab="2" checked="">/u);
  assert.doesNotMatch(html, /id="myst-tabset-1-1"[^>]*checked/u);
  assert.match(html, /<label class="myst-tab"[^>]* for="myst-tabset-1-1"[^>]*>One<\/label>/u);
  assert.match(html, /<label class="myst-tab" role="tab" for="myst-tabset-1-1"/u, "the labels carry the tab role the list expects");
  assert.doesNotMatch(bodyOf(html), /<button|aria-selected|hidden/u);
  assert.match(html, /\.myst-tab-radio\[data-export-tab="2"\]:checked ~ \.myst-tab-panel\[data-export-tab="2"\]/u);
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-091
test("the properties table becomes a closed details with a summary and no editing data", () => {
  const { html } = build(
    '<section data-okf-properties="1" open><div class="okf-properties-title">Properties '
    + '<button type="button" data-okf-badge>2 issues</button></div>'
    + '<table><tbody><tr data-okf-field="title" data-okf-value="&quot;My page&quot;" data-okf-editable="1">'
    + '<th>title</th><td>My page</td></tr></tbody></table></section><h1>Heading</h1>',
  );
  assert.match(html, /<details data-okf-properties="1">/u);
  assert.match(html, /<summary class="okf-properties-title">Properties <span data-okf-badge="">2 issues<\/span><\/summary>/u);
  assert.doesNotMatch(bodyOf(html), /<details[^>]* open|data-okf-value|data-okf-editable|<button/u);
  assert.match(html, /<title>My page<\/title>/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-136
test("the title falls back to the first heading, then to the file name", () => {
  assert.match(build("<h1>A <em>big</em> one</h1>").html, /<title>A big one<\/title>/u);
  assert.match(build("<p>none</p>").html, /<title>notes<\/title>/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-136
test("the KaTeX sheet and its fonts are inline, and only for a page with math", () => {
  const css = '@font-face{font-family:KaTeX_Main;src:url(fonts/KaTeX_Main.woff2) format("woff2"),url(fonts/KaTeX_Main.woff) format("woff"),url(fonts/KaTeX_Main.ttf) format("truetype")}.katex{font:normal 1.2em KaTeX_Main}';
  assert.deepEqual(katexFontUrls(css), ["fonts/KaTeX_Main.woff2"]);
  assert.equal(
    katexExportCss(css, new Map([["fonts/KaTeX_Main.woff2", "data:font/woff2;base64,QQ=="]])),
    '@font-face{font-family:KaTeX_Main;src:url(data:font/woff2;base64,QQ==) format("woff2")}.katex{font:normal 1.2em KaTeX_Main}',
  );
  const math = snapshot('<span class="katex" data-studio-math-rendered="1">x</span>', { mathStyles: ".m1{margin:0}" });
  assert.equal(snapshotHasMath(math), true);
  const withMath = buildHtmlExport(math, inputs({ katex: { css, fonts: new Map([["fonts/KaTeX_Main.woff2", "data:font/woff2;base64,QQ=="]]) } }));
  assert.match(withMath.html, /\.katex\{font:normal 1\.2em KaTeX_Main\}/u);
  assert.match(withMath.html, /\.m1\{margin:0\}/u);
  assert.doesNotMatch(withMath.html, /url\(fonts\//u);
  const without = build("<p>no math</p>", {}, { katex: { css, fonts: new Map() } });
  assert.doesNotMatch(without.html, /KaTeX_Main/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-136
test("a style value cannot close the style element and a script URL is dropped", () => {
  const hostile = build(
    '<a href="javascript:alert(1)" data-sphinx-preview-navigation="https://e.com">x</a><img src="javascript:1">',
    { tokens: { "editor-background": "red;} </style><script>alert(1)</script>" } },
  );
  assert.doesNotMatch(hostile.html, /<script|javascript:/iu);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-136
test("the snapshot guard accepts the page shape and refuses a malformed one", () => {
  assert.equal(isExportSnapshot(snapshot("<p>x</p>")), true);
  assert.equal(isExportSnapshot({ ...snapshot("x"), shownTabs: [-1] }), false);
  assert.equal(isExportSnapshot({ ...snapshot("x"), tokens: { a: 1 } }), false);
  assert.equal(isExportSnapshot({ ...snapshot("x"), contentHtml: 4 }), false);
  assert.equal(isExportSnapshot(null), false);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-135
test("a mailto link is kept and a file: link, an invalid anchor and a query-only link are unwrapped and reported", () => {
  const { html, removedLinks } = build(
    '<p><a data-sphinx-preview-navigation="mailto:a@b.c">mail</a> <a data-sphinx-preview-navigation="file:///etc/x">file</a> '
    + '<a data-sphinx-preview-navigation="#bad anchor">bad</a> <a data-sphinx-preview-navigation="?q=1">query</a></p>',
  );
  assert.match(bodyOf(html), /<a href="mailto:a@b\.c">mail<\/a>/u);
  assert.match(bodyOf(html), /file bad query/u);
  assert.deepEqual(removedLinks, ["file:///etc/x", "#bad anchor", "?q=1"]);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-136
test("every candidate of a srcset is embedded and an unreadable one is dropped", () => {
  const { html, missingImages } = build(
    '<img src="vscode-webview://abc/pic.png" srcset="vscode-webview://abc/pic.png 1x, vscode-webview://abc/big.png 2x" alt="p">',
  );
  assert.match(bodyOf(html), /srcset="data:image\/png;base64,AAAA 1x"/u);
  assert.equal(missingImages, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-136
test("the width mode, the width rule and the theme mode go on the file, the zoom and clearance do not", () => {
  const { html } = build("<p>x</p>", {
    rootAttributes: {
      "data-sphinx-preview-theme-mode": "cream", "data-okf-code-dark-background": "true",
      "data-sphinx-preview-width": "auto", "data-sphinx-preview-theme": "1",
      "data-sphinx-preview-zoom": "150", "--sphinx-preview-zoom": "1.5",
    },
  });
  const root = html.slice(html.indexOf("<html"), html.indexOf(">", html.indexOf("<html")));
  assert.match(root, /data-sphinx-preview-theme-mode="cream"/u);
  assert.match(root, /data-okf-code-dark-background="true"/u);
  assert.match(root, /data-sphinx-preview-width="auto"/u);
  assert.doesNotMatch(root, /zoom/u);
  assert.match(html, /--sphinx-preview-content-max-width: 900px;/u);
  assert.match(html, /<body class="studio-kind-light">/u);
  assert.match(html, /color-scheme: light/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-136
test("the token rule follows the preview sheet and names every resolved token", () => {
  const tokens = Object.fromEntries(THEME_TOKEN_NAMES.map((name) => [name, `#${name.length}00`]));
  const { html } = build("<p>x</p>", { tokens });
  const rule = html.slice(html.indexOf("<style data-studio-export-tokens>"));
  for (const name of THEME_TOKEN_NAMES) assert.ok(rule.includes(`--studio-${name}: `), `missing ${name}`);
  assert.ok(html.indexOf("data-studio-export-preview") < html.indexOf("data-studio-export-tokens"));
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-137
test("nested tab sets get their own radio names and a dropdown keeps its open state", () => {
  const set = (id: string, inner: string): string => `<div class="myst-tab-set"><div class="myst-tab-list">`
    + `<button class="myst-tab" id="${id}a" aria-selected="true">A</button><button class="myst-tab" id="${id}b" aria-selected="false">B</button></div>`
    + `<div class="myst-tab-panel" id="${id}pa">${inner}</div><div class="myst-tab-panel" id="${id}pb" hidden>b</div></div>`;
  const { html } = build(`${set("o", set("i", "inner"))}<details open><summary>Open</summary>x</details><details><summary>Shut</summary>y</details>`,
    { shownTabs: [1, 0] });
  const names = [...html.matchAll(/name="(myst-tabset-\d+)"/gu)].map((match) => match[1]);
  assert.deepEqual([...new Set(names)], ["myst-tabset-1", "myst-tabset-2"]);
  assert.match(html, /name="myst-tabset-1" id="myst-tabset-1-2" data-export-tab="2" checked=""/u);
  assert.match(html, /name="myst-tabset-2" id="myst-tabset-2-1" data-export-tab="1" checked=""/u);
  assert.match(bodyOf(html), /<details open="">/u);
  assert.match(bodyOf(html), /<details><summary>Shut/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-137
test("a THREAD chip with its popover, a TODO chip, source-mapping attributes and the tabindex of mapped blocks are left out", () => {
  const { html } = build(
    '<p data-sphinx-source-file="a.md" data-sphinx-source-line="3" data-sphinx-preview-block="1" tabindex="0">mapped</p>'
    + '<span class="okf-comment" data-okf-comment-kind="todo"><span class="okf-chip">TODO</span></span>'
    + '<span data-okf-comment-thread="t1">highlighted</span>'
    + '<div data-okf-comment-popover="1">popover</div><div data-okf-comment-badge="1">2</div>'
    + '<pre><code>x</code><button class="copy">Copy</button></pre>'
    + '<h2>Heading<button data-okf-fold-toggle>fold</button></h2>',
  );
  const body = bodyOf(html);
  assert.match(body, /mapped/u);
  assert.match(body, /highlighted/u);
  assert.doesNotMatch(body, /data-sphinx-source|data-sphinx-preview-block|tabindex|TODO|popover|<button|fold<|data-okf-comment/u);
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-091
test("the Description column stays and the editing data goes, whatever the toggle state of the page", () => {
  const { html } = build(
    '<section data-okf-properties data-okf-available-keys="a,b" data-okf-available-fields="x"><div class="okf-properties-title">Frontmatter properties'
    + '<button type="button" data-okf-frontmatter-toggle>v</button></div>'
    + '<table class="okf-properties okf-properties-docs"><thead><tr><th>Name</th><th>Value</th><th class="okf-description-column">Description</th></tr></thead>'
    + '<tbody><tr data-okf-field="status" data-okf-value="&quot;draft&quot;" data-okf-value-yaml="draft" data-okf-enums="[]" data-okf-edit-cell="value">'
    + '<td>status</td><td data-okf-link-status="pending">draft</td><td class="okf-description-column">The state.</td></tr></tbody></table></section>',
    { rootAttributes: { "data-okf-descriptions-collapsed": "true" } },
  );
  const body = bodyOf(html);
  assert.match(body, /<summary class="okf-properties-title">Frontmatter properties<\/summary>/u);
  assert.match(body, /Description<\/th>/u);
  assert.match(body, /The state\./u);
  assert.doesNotMatch(html.slice(0, html.indexOf("<head>")), /data-okf-descriptions-collapsed/u);
  assert.doesNotMatch(body, /data-okf-(value|enums|link-|available|edit-cell)|<button/u);
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-091
test("a properties table without a schema keeps its two columns inside the closed details", () => {
  const { html } = build(
    '<section data-okf-properties><div class="okf-properties-title">Frontmatter properties</div>'
    + '<table class="okf-properties"><thead><tr><th>Name</th><th>Value</th></tr></thead>'
    + '<tbody><tr data-okf-field="status"><td>status</td><td>draft</td></tr></tbody></table></section>',
  );
  const body = bodyOf(html);
  assert.match(body, /<details data-okf-properties="">/u);
  assert.doesNotMatch(body, /Description|okf-description-column/u);
  assert.equal((body.match(/<th>/gu) ?? []).length, 2);
});
