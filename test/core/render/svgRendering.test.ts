import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { renderPreviewDocument } from "../../../src/core/render/renderPipeline";
import { PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";
import { attribute, findElement, findElements, hasClass, parseHtml, textContent } from "./dom";

async function render(text: string) {
  const workspaceRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "svg-render-")));
  const result = await renderPreviewDocument({
    document: { uri: { scheme: "file", fsPath: path.join(workspaceRoot, "page.md") }, languageId: "markdown", version: 1, getText: () => text },
    workspaceRoot,
    requestId: 1,
    isWorkspaceTrusted: () => true,
    allowUntrusted: true,
    plantUmlEngine: "builtin",
  });
  return { ...result, dom: parseHtml(result.html) };
}

const PICTURE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" width="240"><rect width="120" height="40" rx="6" fill="var(--surface)" stroke="var(--border)"/><text x="60" y="25" text-anchor="middle" fill="var(--text)">Box</text></svg>';
const figures = (dom: ReturnType<typeof parseHtml>) => findElements(dom, (element) => hasClass(element, "myst-svg-figure"));
const svgs = (dom: ReturnType<typeof parseHtml>) => findElements(dom, (element) => element.tagName === "svg");

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("an svg fence is drawn inline as a picture with its source lines", async () => {
  const { dom, diagnostics } = await render(`# T\n\n\`\`\`svg\n${PICTURE}\n\`\`\`\n\nAfter.\n`);
  assert.equal(diagnostics.length, 0);
  const [figure] = figures(dom);
  assert.ok(figure, "a figure holds the picture");
  assert.equal(attribute(figure, "data-line"), "3");
  assert.equal(attribute(figure, "data-end-line"), "5");
  const [svg] = svgs(dom);
  assert.equal(attribute(svg!, "viewBox"), "0 0 120 40");
  assert.equal(attribute(svg!, "width"), "240");
  assert.equal(attribute(svg!, "role"), "img");
  const rect = findElement(dom, (element) => element.tagName === "rect");
  assert.equal(attribute(rect!, "fill"), "var(--surface)");
  assert.equal(findElements(dom, (element) => element.tagName === "pre").length, 0, "no code block is left");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("a raw svg that fills a block is drawn inline, one line or many, with the lines of the document", async () => {
  const many = "<svg viewBox=\"0 0 10 10\">\n\n  <circle r=\"4\" cx=\"5\" cy=\"5\" fill=\"var(--accent)\"/>\n</svg>";
  const { dom, diagnostics } = await render(`# T\n\n${PICTURE}\n\nMiddle paragraph.\n\n${many}\n\nEnd.\n`);
  const found = figures(dom);
  assert.equal(found.length, 2);
  assert.equal(attribute(found[0]!, "data-line"), "3");
  assert.equal(attribute(found[0]!, "data-end-line"), "3");
  assert.equal(attribute(found[1]!, "data-line"), "7");
  assert.equal(attribute(found[1]!, "data-end-line"), "10");
  assert.ok(findElement(dom, (element) => element.tagName === "circle"));
  assert.equal(diagnostics.filter((entry) => entry.severity === "error").length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("an svg inside a sentence stays dropped", async () => {
  const { dom } = await render(`A sentence with ${PICTURE} inside, then more text.\n`);
  assert.equal(svgs(dom).length, 0);
  assert.equal(figures(dom).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("an svg line that opens a paragraph's continuation or sits in a code block is not a raw block", async () => {
  const { dom } = await render(`Some text\n${PICTURE}\n\n\`\`\`\n\n${PICTURE}\n\`\`\`\n`);
  assert.equal(figures(dom).length, 0);
  assert.equal(svgs(dom).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("hostile content of a picture never reaches the page", async () => {
  const hostile = '<svg viewBox="0 0 10 10" onload="alert(1)"><script>alert(2)</script><foreignObject><div>x</div></foreignObject><a href="https://example.com"><rect width="3" height="3" onclick="x()"/></a><style>rect{fill:red}</style><use href="https://example.com/a.svg#b"/><rect width="4" height="4" fill="url(javascript:alert(3))"/></svg>';
  const { html, dom, diagnostics } = await render(`\`\`\`svg\n${hostile}\n\`\`\`\n`);
  assert.equal(figures(dom).length, 1);
  assert.doesNotMatch(html.replace(/<style[\s\S]*?<\/style>/gu, ""), /alert\(|foreignObject|example\.com|<a |onclick|onload|javascript:/iu);
  assert.ok(diagnostics.some((entry) => /removed from the SVG: .*<script>/u.test(entry.message) && entry.severity === "warning"));
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("two pictures with the same ids keep distinct ids and their own references", async () => {
  const source = '<svg viewBox="0 0 10 10"><defs><linearGradient id="g"><stop offset="0" stop-color="var(--blue)"/></linearGradient></defs><rect width="9" height="9" fill="url(#g)"/></svg>';
  const { dom } = await render(`\`\`\`svg\n${source}\n\`\`\`\n\n${source}\n`);
  const ids = findElements(dom, (element) => element.tagName.toLowerCase() === "lineargradient").map((element) => attribute(element, "id"));
  assert.equal(ids.length, 2);
  assert.notEqual(ids[0], ids[1]);
  const fills = findElements(dom, (element) => element.tagName === "rect").map((element) => attribute(element, "fill"));
  assert.deepEqual(fills, ids.map((id) => `url(#${id})`));
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("an svg fence with no svg element stays a code block and warns", async () => {
  const { dom, diagnostics } = await render("```svg\nnot a picture\n```\n");
  assert.equal(figures(dom).length, 0);
  assert.ok(findElement(dom, (element) => element.tagName === "pre"));
  assert.ok(diagnostics.some((entry) => /holds no <svg> element/u.test(entry.message)));
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-126
test("the preview stylesheet gives a picture the theme vocabulary, from the --studio tokens", () => {
  const rule = /figure\.myst-svg-figure \{([^}]*)\}/u.exec(PREVIEW_THEME_CSS)?.[1] ?? "";
  for (const name of ["surface", "background", "bg", "border", "text", "foreground", "fg", "muted", "accent", "primary", "red", "green", "blue", "orange"]) {
    assert.match(rule, new RegExp(`--${name}: var\\(--studio-`, "u"), name);
  }
  for (const mode of ["dark", "white", "cream"]) {
    assert.match(PREVIEW_THEME_CSS, new RegExp(`theme-mode="${mode}"[\\s\\S]*--studio-charts-red`, "u"), mode);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("a raw svg inside an HTML comment or a math block is left alone", async () => {
  const { dom, html } = await render(`Before\n\n<!--\n\n${PICTURE}\n\n-->\n\nAfter\n\n$$\n\n${PICTURE}\n$$\n\nEnd\n`);
  assert.equal(figures(dom).length, 0);
  assert.equal(svgs(dom).length, 0);
  assert.doesNotMatch(html, /okf-svg:/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("a document cannot forge the placeholder of a picture", async () => {
  const { dom } = await render(`<!--okf-svg:0-->\n\n${PICTURE}\n\n<!--okf-svg:abc:0-->\n`);
  assert.equal(figures(dom).length, 1, "only the real block is a picture");
  assert.equal(findElements(dom, (element) => hasClass(element, "okf-comment")).length, 2, "both forged comments stay comments");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("an unclosed svg never swallows a later fence", async () => {
  const { dom } = await render(`<svg viewBox="0 0 1 1">\n<rect/>\n\n\`\`\`js\nlet a = 1;\n\`\`\`\n\nTail paragraph.\n\n</svg>\n\n\`\`\`svg\n${PICTURE}\n\`\`\`\n`);
  assert.ok(findElement(dom, (element) => element.tagName === "pre"), "the js fence stays code");
  assert.equal(figures(dom).length, 1, "the fenced picture after it is still drawn");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("a raw svg in a table cell stays dropped (SwRS-GFM-031)", async () => {
  const { dom } = await render(`<table><tr><td>\n\n${PICTURE}\n\n</td></tr></table>\n\nAfter.\n`);
  assert.equal(figures(dom).length, 0);
  assert.equal(svgs(dom).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("a <!-- or $$ inside a sentence or a code span never hides a later code block's svg line", async () => {
  const sources = [
    "Write `<!--` to open.\n\n```html\n<!-- note -->\n```\n\n```\nText\n\n<svg viewBox=\"0 0 1 1\"><rect/></svg>\n```\n",
    "Pay $$ now.\n\n```\nx $$ y\n```\n\n```\nText\n\n<svg viewBox=\"0 0 1 1\"><rect/></svg>\n```\n",
  ];
  for (const source of sources) {
    const { dom, html } = await render(source);
    assert.doesNotMatch(html, /okf-svg:/u, "no placeholder reaches the page");
    const code = findElements(dom, (element) => element.tagName === "pre").map((pre) => textContent(pre));
    assert.ok(code.some((text) => text.includes("svg viewBox")), "the code block shows its svg line");
    assert.equal(figures(dom).length, 0);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("an inline $$ or a code span holding <!-- does not stop a later raw svg block", async () => {
  for (const before of ["Costs $$5 here.", "Write `<!--` to start a comment.", "<!-- one line -->", "$$ x = 1 $$"]) {
    const { dom } = await render(`${before}\n\n${PICTURE}\n`);
    assert.equal(figures(dom).length, 1, `drawn after: ${before}`);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("an author's aria-label with parentheses is kept on the picture", async () => {
  const { dom } = await render(`<svg viewBox="0 0 1 1" aria-label="Revenue (EUR) &quot;Q1&quot; &amp; <more>"><rect width="1" height="1"/></svg>\n`);
  const [svg] = svgs(dom);
  assert.equal(attribute(svg!, "aria-label"), 'Revenue (EUR) "Q1" & <more>');
});
