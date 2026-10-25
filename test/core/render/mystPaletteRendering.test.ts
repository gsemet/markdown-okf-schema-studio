/** What the edition palette writes renders as the matching MyST and GFM constructs (T25 and on). */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { renderPreviewDocument } from "../../../src/core/render/renderPipeline";
import { createEditActions } from "../../../src/page/modules/editActions";
import { isSafeOkfColor } from "../../../src/core/security/spanColors";
import { createMarkdownTableTools } from "../../../src/page/modules/markdownTable";
import { renderMathHtml } from "../../../src/core/render/mathRenderer";
import { rewriteSphinxHtml } from "../../../src/core/security/html-sanitizer";
import { ResourcePolicy } from "../../../src/core/security/resource-policy";
import {
  attribute,
  findElement,
  findElements,
  hasClass,
  parseHtml,
  textContent,
  type HtmlElement,
} from "./dom";
import { inlineDocument, isTag, workspaceRoot } from "./mystFeaturesSupport";

// T25: what the GFM group of the palette writes renders as an alert, checkboxes and a table.
function paletteInsert(id: string, value: string, at: number, arg?: string): string {
  const edit = createEditActions([], createMarkdownTableTools()).byId.get(id)!.apply({
    value, selectionStart: at, selectionEnd: at, scope: "block", ...(arg === undefined ? {} : { arg }),
  })!;
  return value.slice(0, edit.start) + edit.text + value.slice(edit.end);
}

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("an alert inserted by the edition palette renders as an admonition of the chosen type", async () => {
  const written = paletteInsert("alert", "Mind the gap", 4, "WARNING");
  assert.equal(written, "> [!WARNING]\n> Mind the gap");
  const document = inlineDocument(written + "\n\nAfter.\n");
  const result = await renderPreviewDocument({ document, workspaceRoot, requestId: 1,
    documentIdentity: document.uri.fsPath, isWorkspaceTrusted: () => true });
  const admonition = findElement(parseHtml(result.html), (element) =>
    hasClass(element, "admonition") && hasClass(element, "warning"));
  assert.ok(admonition, "the inserted alert was not rendered as an admonition");
  assert.equal(textContent(findElement(admonition, (e) => hasClass(e, "admonition-title"))!), "Warning");
  assert.match(textContent(admonition), /Mind the gap/u);
});

test("checkboxes written by the edition palette render as checkbox inputs", async () => {
  let text = "buy milk\nbake bread";
  text = paletteInsert("checkbox", text, 0);
  const first = text.indexOf("bake");
  text = paletteInsert("checkbox", text, first);
  assert.equal(text, "- [ ] buy milk\n- [ ] bake bread");
  const document = inlineDocument(text + "\n");
  const result = await renderPreviewDocument({ document, workspaceRoot, requestId: 1,
    documentIdentity: document.uri.fsPath, isWorkspaceTrusted: () => true });
  const boxes = findElements(parseHtml(result.html), (element) =>
    element.tagName === "input" && hasClass(element, "myst-checkbox"));
  assert.equal(boxes.length, 2);
});

test("a pipe table converted by the edition palette renders as a table with the same text", async () => {
  const source = "| Name | Qty |\n| :--- | ---: |\n| a & b | <3 |\n| c | 4 |";
  const html = paletteInsert("htmlTable", source, 3);
  assert.equal(html.startsWith("<table>"), true);
  const document = inlineDocument("Intro\n\n" + html + "\n\nAfter.\n");
  const result = await renderPreviewDocument({ document, workspaceRoot, requestId: 1,
    documentIdentity: document.uri.fsPath, isWorkspaceTrusted: () => true });
  const tables = findElements(parseHtml(result.html), isTag("table"));
  assert.equal(tables.length, 1);
  assert.deepEqual(
    findElements(tables[0], isTag("th")).map((cell) => textContent(cell).trim()),
    ["Name", "Qty"],
  );
  assert.deepEqual(
    findElements(tables[0], isTag("td")).map((cell) => textContent(cell).trim()),
    ["a & b", "<3", "c", "4"],
  );
  assert.equal(findElements(tables[0], isTag("tr")).length, 3);
});

test("a new HTML table inserted by the edition palette renders as a 2 x 2 table", async () => {
  const html = paletteInsert("htmlTable", "Intro", 5);
  const document = inlineDocument(html + "\n\nAfter.\n");
  const result = await renderPreviewDocument({ document, workspaceRoot, requestId: 1,
    documentIdentity: document.uri.fsPath, isWorkspaceTrusted: () => true });
  const tables = findElements(parseHtml(result.html), isTag("table"));
  assert.equal(tables.length, 1);
  assert.equal(findElements(tables[0], isTag("th")).length, 2);
  assert.equal(findElements(tables[0], isTag("td")).length, 2);
  assert.match(result.html, /After\./u);
});

// T26: what the details, footnote, mermaid, alignment and kbd actions write renders.
async function renderPalette(markdown: string) {
  const document = inlineDocument(markdown + "\n");
  const result = await renderPreviewDocument({ document, workspaceRoot, requestId: 1,
    documentIdentity: document.uri.fsPath, isWorkspaceTrusted: () => true });
  return { html: parseHtml(result.html), raw: result.html };
}

// @tests_req SwRS-MDOKFSTUDIO-GFM-029
test("a collapsible section inserted by the edition palette renders as details with a summary", async () => {
  const { html } = await renderPalette(paletteInsert("details", "Intro", 5));
  const details = findElement(html, isTag("details"));
  assert.ok(details, "no details element");
  assert.equal(textContent(findElement(details, isTag("summary"))!).trim(), "Summary");
  assert.match(textContent(details), /Content/u);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-008
test("a footnote inserted by the edition palette renders a reference and a definition", async () => {
  const written = paletteInsert("footnote", "A claim.", 7) + "The source.";
  assert.equal(written, "A claim[^1].\n\n[^1]: The source.");
  const { html } = await renderPalette(written);
  const definition = findElement(html, (element) =>
    element.tagName === "li" && attribute(element, "id") === "user-content-fn-1");
  assert.ok(definition, "the footnote definition was not rendered");
  assert.match(textContent(definition), /The source\./u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-017
test("a Mermaid fence inserted by the edition palette renders a diagram container", async () => {
  const { html } = await renderPalette(paletteInsert("mermaid", "Intro", 5));
  const diagram = findElement(html, (element) => hasClass(element, "myst-mermaid-diagram"));
  assert.ok(diagram, "no Mermaid diagram node");
  assert.match(textContent(diagram), /flowchart TD/u);
});

test("a column aligned by the edition palette renders with that alignment only", async () => {
  const source = "| Name | Qty |\n| --- | --- |\n| a | 1 |";
  const at = source.indexOf("Qty");
  const edit = createEditActions([], createMarkdownTableTools()).byId.get("columnAlign")!.apply({
    value: source, selectionStart: at, selectionEnd: at, scope: "block", arg: "right" })!;
  const written = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  const { html } = await renderPalette(written);
  const cells = findElements(html, (element) => element.tagName === "th" || element.tagName === "td");
  assert.equal(cells.length, 4);
  const aligned = cells.map((cell) => /right/u.test((attribute(cell, "align") ?? "") + (attribute(cell, "style") ?? "") + (attribute(cell, "class") ?? "")));
  assert.deepEqual(aligned, [false, true, false, true]);
});

test("a kbd element written by the edition palette is kept in the preview", async () => {
  const edit = createEditActions([], createMarkdownTableTools()).byId.get("kbd")!.apply({
    value: "Press Ctrl now", selectionStart: 6, selectionEnd: 10, scope: "block" })!;
  const written = "Press Ctrl now".slice(0, edit.start) + edit.text + "Press Ctrl now".slice(edit.end);
  assert.equal(written, "Press <kbd>Ctrl</kbd> now");
  const { html } = await renderPalette(written);
  const key = findElement(html, isTag("kbd"));
  assert.ok(key, "the kbd element was stripped");
  assert.equal(textContent(key), "Ctrl");
});

// T27: amsmath environments, figure size and alignment, and label anchors.
test("an amsmath align environment in a dollar block and in a math directive renders with KaTeX", async () => {
  const environment = "\\begin{align}a&=b\\\\c&=d\\end{align}";
  for (const written of [`$$\n${environment}\n$$`, "```{math}\n" + environment + "\n```"]) {
    const { raw } = await renderPalette(written);
    const typeset = parseHtml(renderMathHtml(raw, "katex.css", "nonce"));
    const math = findElement(typeset, (element) => hasClass(element, "math-display"));
    assert.ok(math, `no display math block for ${written}`);
    assert.equal(attribute(math, "data-studio-math-error"), undefined, "the environment was rejected by KaTeX");
    assert.equal(findElements(math, isTag("mtr")).length, 2, "the two aligned rows were not typeset");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-031
test("a figure keeps its width and alignment as data attributes and classes", async () => {
  const { html } = await renderPalette(":::{figure} img/a.png\n:width: 60%\n:align: center\n:alt: A\n\nCaption\n:::");
  const figure = findElement(html, isTag("figure"))!;
  const image = findElement(figure, isTag("img"))!;
  assert.equal(attribute(image, "data-okf-width"), "60%");
  assert.equal(attribute(image, "width"), undefined, "the legacy width attribute must not be left behind");
  assert.ok(hasClass(image, "align-center"), "the image has no align-center class");
  assert.ok(hasClass(figure, "align-center"), "the figure has no align-center class");
  assert.equal(attribute(figure, "style"), undefined);
});

test("an image directive keeps its width and alignment", async () => {
  const { html } = await renderPalette("```{image} img/a.png\n:width: 12.5em\n:align: right\n```");
  const image = findElement(html, isTag("img"))!;
  assert.equal(attribute(image, "data-okf-width"), "12.5em");
  assert.ok(hasClass(image, "align-right"));
});

test("an invalid figure width or alignment is ignored", async () => {
  const { html, raw } = await renderPalette(
    ":::{figure} img/a.png\n:width: 60%;position:fixed\n:align: sideways\n\nCaption\n:::");
  const image = findElement(html, isTag("img"))!;
  assert.equal(attribute(image, "data-okf-width"), undefined);
  assert.equal(attribute(image, "width"), undefined);
  assert.doesNotMatch(raw, /align-sideways|position:fixed/u);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-019
// @tests_req SwRS-MDOKFSTUDIO-MYST-036
test("a label before a paragraph renders an anchor icon span that is the link target", async () => {
  const { html } = await renderPalette("(intro)=\nA paragraph.\n\nSee {ref}`intro` and {ref}`Title <intro>`.");
  const anchors = findElements(html, (element) => hasClass(element, "okf-anchor"));
  assert.equal(anchors.length, 1);
  assert.equal(attribute(anchors[0], "id"), "intro");
  assert.equal(attribute(anchors[0], "data-okf-label"), "intro");
  assert.equal(attribute(anchors[0], "title"), "Anchor: intro");
  assert.equal(attribute(anchors[0], "data-line"), undefined);
  assert.equal(attribute(anchors[0], "data-okf-label-line"), "1");
  const paragraph = findElement(html, isTag("p"))!;
  assert.equal((paragraph.childNodes[0] as HtmlElement), anchors[0], "the anchor is not the first child");
  assert.match(textContent(paragraph), /^A paragraph\./u);
  const links = findElements(html, (element) => element.tagName === "a" && attribute(element, "href") === "#intro");
  assert.deepEqual(links.map((link) => textContent(link)), ["intro", "Title"]);
});

test("a label before a heading keeps one element with the id and adds the icon inside it", async () => {
  const { html, raw } = await renderPalette("(intro)=\n# Heading\n\nSee {ref}`intro`.");
  const heading = findElement(html, isTag("h1"))!;
  assert.equal(attribute(heading, "id"), "intro");
  const anchor = findElement(heading, (element) => hasClass(element, "okf-anchor"))!;
  assert.ok(anchor, "no anchor in the heading");
  assert.equal(attribute(anchor, "data-okf-label"), "intro");
  assert.equal(attribute(anchor, "title"), "Anchor: intro");
  assert.equal((raw.match(/id="intro"/gu) ?? []).length, 1, "the label id is duplicated");
  assert.equal(textContent(heading).trim(), "Heading");
});

test("a label before a list or at the end of the document renders its own anchor row", async () => {
  const { html } = await renderPalette("(items)=\n- a\n- b\n\n(last)=");
  const anchors = findElements(html, (element) => hasClass(element, "okf-anchor"));
  assert.deepEqual(anchors.map((anchor) => attribute(anchor, "id")), ["items", "last"]);
  assert.equal(findElements(html, isTag("ul")).length, 1);
  assert.deepEqual(anchors.map((anchor) => attribute(anchor, "data-okf-label-line")), ["1", "5"]);
  assert.equal(findElement(html, isTag("ul"))!.childNodes.some((node) => "attrs" in node && hasClass(node as HtmlElement, "okf-anchor")), false);
});

test("an anchor icon is not a mapped block or Tab stop, while the labelled blocks keep their mapping", async () => {
  const document = inlineDocument("(intro)=\nA paragraph.\n\n(sec)=\n# Heading\n\n(items)=\n- a\n");
  const result = await renderPreviewDocument({ document, workspaceRoot, requestId: 1,
    documentIdentity: document.uri.fsPath, isWorkspaceTrusted: () => true });
  const rewritten = rewriteSphinxHtml(result.html, {
    outputRoot: workspaceRoot,
    policy: new ResourcePolicy([]),
    nonce: "unit-nonce",
    sourceMapping: { sourceFile: document.uri.fsPath, documentId: "preview-1" },
    resolveResource: () => undefined,
    resolveNavigation: () => ({ kind: "blocked" }),
  });
  const html = parseHtml(rewritten.html);
  const anchors = findElements(html, (element) => hasClass(element, "okf-anchor"));
  assert.equal(anchors.length, 3);
  for (const anchor of anchors) {
    assert.equal(attribute(anchor, "tabindex"), undefined);
    assert.equal(attribute(anchor, "data-sphinx-preview-block"), undefined);
    assert.equal(attribute(anchor, "data-line"), undefined);
    assert.equal(attribute(anchor, "data-sphinx-source-line"), undefined);
  }
  assert.deepEqual(anchors.map((anchor) => attribute(anchor, "data-okf-label-line")), ["1", "4", "7"]);
  const paragraph = findElement(html, isTag("p"))!;
  const heading = findElement(html, isTag("h1"))!;
  for (const block of [paragraph, heading]) {
    assert.ok(attribute(block, "data-sphinx-preview-block"), "labelled block lost its mapping");
    assert.equal(attribute(block, "tabindex"), "0");
  }
});

// T28: what the MyST group of the palette writes renders.
function paletteWrite(id: string, value: string, selection: [number, number], arg?: string): string {
  const edit = createEditActions([], createMarkdownTableTools()).byId.get(id)!.apply({
    value, selectionStart: selection[0], selectionEnd: selection[1], scope: "block",
    ...(arg === undefined ? {} : { arg }),
  })!;
  return value.slice(0, edit.start) + edit.text + value.slice(edit.end);
}

test("an admonition of every palette type renders with its title, empty or wrapped", async () => {
  for (const type of ["note", "tip", "important", "warning", "caution", "danger", "attention", "error", "hint", "seealso"]) {
    for (const written of [paletteWrite("admonition", "Body text", [0, 9], type), paletteWrite("admonition", "Intro", [5, 5], type)]) {
      const { html } = await renderPalette(written);
      const admonition = findElement(html, (element) => hasClass(element, "admonition") && hasClass(element, type));
      assert.ok(admonition, `${type} was not rendered as an admonition: ${written}`);
      assert.ok(findElement(admonition, (e) => hasClass(e, "admonition-title")), `${type} has no title`);
    }
  }
  const nested = paletteWrite("admonition", ":::{note}\nInner\n:::", [0, 19], "warning");
  const { html } = await renderPalette(nested);
  const outer = findElement(html, (e) => hasClass(e, "admonition") && hasClass(e, "warning"))!;
  assert.ok(outer, "outer admonition missing");
  assert.ok(findElement(outer, (e) => hasClass(e, "admonition") && hasClass(e, "note")), "nested note missing");
});

test("a custom admonition from the palette renders its title and class", async () => {
  const written = paletteWrite("admonition", "Body text", [0, 9], "custom").replace("Title", "My title");
  const { html } = await renderPalette(written);
  const admonition = findElement(html, (e) => hasClass(e, "admonition") && hasClass(e, "note"));
  assert.ok(admonition, "no custom admonition");
  assert.equal(textContent(findElement(admonition, (e) => hasClass(e, "admonition-title"))!).trim(), "My title");
  assert.match(textContent(admonition), /Body text/u);
});

test("a definition list from the palette renders a dl with its term and definition", async () => {
  const { html } = await renderPalette(paletteWrite("deflist", "Alpha", [0, 5]));
  const list = findElement(html, isTag("dl"))!;
  assert.ok(list, "no dl");
  assert.equal(textContent(findElement(list, isTag("dt"))!).trim(), "Alpha");
  assert.equal(textContent(findElement(list, isTag("dd"))!).trim(), "Definition");
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-024
test("inline, display and aligned math from the palette typeset with KaTeX", async () => {
  const inline = paletteWrite("math", "Value x here", [6, 7], "inline");
  const display = paletteWrite("math", "Intro", [5, 5], "display");
  const aligned = paletteWrite("math", "Intro", [5, 5], "aligned");
  for (const [written, selector] of [[inline, "math-inline"], [display, "math-display"], [aligned, "math-display"]] as const) {
    const { raw } = await renderPalette(written);
    const typeset = parseHtml(renderMathHtml(raw, "katex.css", "nonce"));
    const math = findElement(typeset, (element) => hasClass(element, selector));
    assert.ok(math, `no ${selector} for ${written}`);
    assert.equal(attribute(math, "data-studio-math-error"), undefined, `KaTeX rejected ${written}`);
  }
  const { raw } = await renderPalette(aligned);
  const rows = findElements(parseHtml(renderMathHtml(raw, "katex.css", "nonce")), isTag("mtr"));
  assert.equal(rows.length, 1);
});

test("sub and sup written by the palette render sub and sup elements", async () => {
  const { html } = await renderPalette(
    paletteWrite("sub", "H2O", [1, 2]) + " and " + paletteWrite("sup", "x2", [1, 2]));
  assert.equal(textContent(findElement(html, isTag("sub"))!), "2");
  assert.equal(textContent(findElement(html, isTag("sup"))!), "2");
});

test("a label written by the palette renders an anchor icon for the block", async () => {
  const { html } = await renderPalette(paletteWrite("label", "A paragraph.", [0, 0]).replace("label-name", "my-label"));
  const anchor = findElement(html, (e) => hasClass(e, "okf-anchor"))!;
  assert.ok(anchor, "no anchor icon");
  assert.equal(attribute(anchor, "id"), "my-label");
});

test("the anchor carries the source line of its label in a document with frontmatter", async () => {
  const text = "---\ntitle: T\n---\n\n# Head\n\n(intro)=\nA paragraph.\n";
  const { html } = await renderPalette(text);
  const anchor = findElement(html, (element) => hasClass(element, "okf-anchor"))!;
  assert.equal(text.split("\n")[Number(attribute(anchor, "data-okf-label-line")) - 1], "(intro)=");
});

// T30: what the reference, citation, dropdown, captioned table and key actions write renders.
test("T30: a {ref} inserted by the edition palette renders as a link to the label", async () => {
  const edit = createEditActions([], createMarkdownTableTools()).byId.get("ref")!.apply({
    value: "See ", selectionStart: 4, selectionEnd: 4, scope: "block", arg: "intro" })!;
  const written = "(intro)=\n# Introduction\n\n" + "See ".slice(0, edit.start) + edit.text;
  assert.match(written, /\{ref\}`intro`/u);
  const { html } = await renderPalette(written);
  const link = findElement(html, (element) => element.tagName === "a" && attribute(element, "href") === "#intro");
  assert.ok(link, "the reference was not rendered as a link");
  assert.match(textContent(link), /Introduction/u);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-022
test("T30: a {cite} inserted by the edition palette renders the citation placeholder", async () => {
  const edit = createEditActions([], createMarkdownTableTools()).byId.get("cite")!.apply({
    value: "Claim ", selectionStart: 6, selectionEnd: 6, scope: "block", arg: "smith2024" })!;
  const { html } = await renderPalette("Claim " + edit.text);
  const citation = findElement(html, (element) => hasClass(element, "myst-cite"));
  assert.ok(citation, "no citation placeholder");
  assert.equal(textContent(citation), "[smith2024]");
});

test("T30: a dropdown inserted by the edition palette renders as details with the title", async () => {
  const edit = createEditActions([], createMarkdownTableTools()).byId.get("dropdown")!.apply({
    value: "", selectionStart: 0, selectionEnd: 0, scope: "block" })!;
  const { html } = await renderPalette(edit.text);
  const details = findElement(html, isTag("details"));
  assert.ok(details, "the dropdown was not rendered as details");
  assert.equal(textContent(findElement(details, isTag("summary"))!).trim(), "Title");
  assert.match(textContent(details), /Content/u);
});

test("T30: a captioned table inserted by the edition palette renders a caption", async () => {
  const edit = createEditActions([], createMarkdownTableTools()).byId.get("tableCaption")!.apply({
    value: "", selectionStart: 0, selectionEnd: 0, scope: "block" })!;
  const { html } = await renderPalette(edit.text);
  const table = findElement(html, isTag("table"));
  assert.ok(table, "no table");
  assert.match(textContent(findElement(html, (element) =>
    element.tagName === "figcaption" || element.tagName === "caption") ?? table), /Caption/u);
  assert.equal(findElements(html, (element) => element.tagName === "th").length, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-017
test("T30: a {kbd} role inserted by the edition palette renders a kbd element", async () => {
  const edit = createEditActions([], createMarkdownTableTools()).byId.get("roleKbd")!.apply({
    value: "Press ", selectionStart: 6, selectionEnd: 6, scope: "block" })!;
  const { html } = await renderPalette("Press " + edit.text + " now");
  const key = findElement(html, isTag("kbd"));
  assert.ok(key, "the {kbd} role was not rendered as a kbd element");
  assert.equal(textContent(key), "Ctrl+K");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-034
test("a span with a colour style renders as data attributes, anything else is dropped", async () => {
  const document = inlineDocument(
    "A <span style=\"color: #c00; background-color: rgb(1, 2, 3)\">red **bold**</span> and "
    + "<span style=\"color: red; position: fixed\">named</span> and "
    + "<span style=\"color: url(x)\">bad</span>.\n",
  );
  const result = await renderPreviewDocument({ document, workspaceRoot, requestId: 1,
    documentIdentity: document.uri.fsPath, isWorkspaceTrusted: () => true });
  const rewritten = rewriteSphinxHtml(result.html, {
    outputRoot: workspaceRoot,
    policy: new ResourcePolicy([]),
    nonce: "unit-nonce",
    resolveResource: () => undefined,
    resolveNavigation: () => ({ kind: "blocked" }),
  });
  const spans = findElements(parseHtml(rewritten.html), isTag("span"));
  assert.deepEqual(spans.map((span) => [attribute(span, "data-okf-color"), attribute(span, "data-okf-background")]),
    [["#c00", "rgb(1, 2, 3)"], [undefined, undefined], [undefined, undefined]]);
  assert.doesNotMatch(rewritten.html, /\sstyle="color|position|url\(x\)/u);
  assert.match(textContent(spans[0]!), /red bold/u);
});

// T34: what the colour picker writes renders coloured, in a paragraph and in a table cell.
async function colouredSpans(markdown: string): Promise<HtmlElement[]> {
  const { raw } = await renderPalette(markdown);
  const rewritten = rewriteSphinxHtml(raw, {
    outputRoot: workspaceRoot,
    policy: new ResourcePolicy([]),
    nonce: "unit-nonce",
    resolveResource: () => undefined,
    resolveNavigation: () => ({ kind: "blocked" }),
  });
  return findElements(parseHtml(rewritten.html), (element) =>
    element.tagName === "span" && (attribute(element, "data-okf-color") !== undefined
      || attribute(element, "data-okf-background") !== undefined));
}

function colourWrite(value: string, start: number, end: number, arg: string): string {
  const edit = createEditActions([], createMarkdownTableTools(), isSafeOkfColor).byId.get("color")!.apply({
    value, selectionStart: start, selectionEnd: end, scope: "block", arg })!;
  return value.slice(0, edit.start) + edit.text + value.slice(edit.end);
}

test("T34: text and background colours written by the picker render as data attributes", async () => {
  const first = colourWrite("Say foo now", 4, 7, "text:#c00");
  const both = colourWrite(first, first.indexOf("foo"), first.indexOf("foo") + 3, "background:rgb(1, 2, 3)");
  assert.equal(both, 'Say <span style="color:#c00; background-color:rgb(1, 2, 3)">foo</span> now');
  const spans = await colouredSpans(both);
  assert.equal(spans.length, 1);
  assert.equal(attribute(spans[0]!, "data-okf-color"), "#c00");
  assert.equal(attribute(spans[0]!, "data-okf-background"), "rgb(1, 2, 3)");
  assert.equal(textContent(spans[0]!), "foo");
});

test("T34: a colour span inside a pipe-table cell renders coloured", async () => {
  const cell = colourWrite("beta", 0, 4, "text:#0a0");
  const spans = await colouredSpans(`| Name | Note |\n| --- | --- |\n| alpha | ${cell} |\n| **x** | <span style="background-color:#ff0">y</span> z |`);
  assert.deepEqual(spans.map((span) => [textContent(span), attribute(span, "data-okf-color"), attribute(span, "data-okf-background")]),
    [["beta", "#0a0", undefined], ["y", undefined, "#ff0"]]);
});
