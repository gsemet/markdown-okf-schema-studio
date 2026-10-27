import * as assert from "node:assert/strict";
import { test } from "node:test";

import { renderPreviewDocument } from "../../../src/core/render/renderPipeline";
import { rewriteSphinxHtml } from "../../../src/core/security/html-sanitizer";
import { ResourcePolicy } from "../../../src/core/security/resource-policy";
import { attribute, findElement, findElements, hasClass, parseHtml, textContent } from "./dom";
import { inlineDocument, isTag, workspaceRoot } from "./mystFeaturesSupport";

const README = [
  "<div align=\"center\">",
  "",
  "<img src=\"app-icon.svg\" alt=\"App\" width=\"96\" height=\"96\">",
  "",
  "# Title",
  "",
  "[![Build](https://img.shields.io/a.svg)](https://example.com) **bold** text",
  "",
  "</div>",
  "",
  "After.",
  "",
].join("\n");

/** Renders the text and passes the page through the preview sanitizer, as the webview does. */
async function render(text: string, requestId = 1): Promise<ReturnType<typeof parseHtml>> {
  const result = await renderPreviewDocument({
    document: inlineDocument(text), workspaceRoot, requestId, isWorkspaceTrusted: () => true,
  });
  const rewritten = rewriteSphinxHtml(result.html, {
    outputRoot: workspaceRoot,
    policy: new ResourcePolicy([]),
    nonce: "unit-nonce",
    sourceMapping: { sourceFile: "inline.md", documentId: "doc" },
    resolveResource: (request) => ({ path: request, uri: `vscode-resource:${request}` }),
    resolveNavigation: (request) => (/^https?:/u.test(request)
      ? { kind: "external", value: request } : { kind: "blocked", reason: "blocked" }),
  });
  return parseHtml(rewritten.html);
}

// @tests_req SwRS-MDOKFSTUDIO-CORE-071
test("a centred README header renders as a div with the image at its size and the Markdown inside", async () => {
  const html = await render(README);
  const div = findElement(html, (element) => element.tagName === "div" && attribute(element, "align") === "center");
  assert.ok(div, "the centred div was dropped");
  const image = findElement(div, isTag("img"));
  assert.equal(attribute(image!, "alt"), "App");
  assert.equal(attribute(image!, "width"), "96");
  assert.equal(attribute(image!, "height"), "96");
  // Markdown after a blank line inside the HTML block is rendered.
  assert.equal(textContent(findElement(div, isTag("h1"))!), "Title");
  assert.equal(attribute(findElement(div, isTag("a"))!, "href"), "https://example.com");
  assert.equal(textContent(findElement(div, isTag("strong"))!), "bold");
  assert.doesNotMatch(textContent(div), /\*\*|\[!\[/u);
  // The block maps to its source lines; the text after it stays its own block.
  assert.equal(attribute(div, "data-line"), "1");
  assert.equal(attribute(div, "data-end-line"), "9");
  assert.equal(attribute(div, "data-sphinx-source-line"), "1");
  assert.equal(textContent(findElement(html, (e) => e.tagName === "p" && textContent(e) === "After.")!), "After.");
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-071
test("an HTML block carries its literal opening tag as the edit-mode title", async () => {
  const html = await render(`${README}\n<p align="right" class="x">\n  <img src="a.png">\n</p>\n`);
  const blocks = findElements(html, (element) => hasClass(element, "okf-html-block"));
  assert.deepEqual(blocks.map((block) => attribute(block, "data-okf-tag")), [
    "<div align=\"center\">", "<p align=\"right\" class=\"x\">",
  ]);
  assert.equal(attribute(blocks[1], "align"), "right");
  // The title is the literal source, as data; the class attribute itself is not kept.
  assert.equal(attribute(blocks[1], "class"), "okf-html-block");
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-071
test("a picture with colour-scheme sources renders one image per theme, not per system", async () => {
  const html = await render([
    "<p align=\"center\">",
    "  <picture>",
    "    <source media=\"(prefers-color-scheme: dark)\" srcset=\"logo-dark.png\">",
    "    <source media=\"(prefers-color-scheme: light)\" srcset=\"logo-light.png\">",
    "    <img src=\"logo.png\" alt=\"Logo\" width=\"120\">",
    "  </picture>",
    "</p>",
    "",
  ].join("\n"));
  const picture = findElement(html, isTag("picture"))!;
  assert.equal(attribute(picture, "data-okf-themes"), "dark light");
  const images = findElements(picture, isTag("img"));
  assert.deepEqual(images.map((image) => attribute(image, "src")?.replace(/^vscode-resource:/u, "")),
    ["logo-dark.png", "logo-light.png", "logo.png"]);
  assert.deepEqual(images.map((image) => attribute(image, "class")),
    ["okf-theme-dark", "okf-theme-light", "okf-theme-fallback"]);
  assert.equal(attribute(images[0], "alt"), "Logo");
  assert.equal(attribute(images[0], "width"), "120");
  assert.equal(findElements(picture, isTag("source")).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-071
test("br, sub, sup, kbd, an image link and details render like on GitHub", async () => {
  const html = await render([
    "Line one<br>line two H<sub>2</sub>O x<sup>2</sup> press <kbd>Ctrl</kbd>.",
    "",
    "<a href=\"https://example.com\"><img src=\"badge.svg\" alt=\"Badge\" width=\"80\"></a>",
    "",
    "<details>",
    "<summary>More</summary>",
    "",
    "Hidden *text*.",
    "",
    "</details>",
    "",
  ].join("\n"));
  for (const tag of ["br", "sub", "sup", "kbd"]) assert.ok(findElement(html, isTag(tag)), `no ${tag}`);
  const link = findElement(html, isTag("a"))!;
  assert.equal(attribute(findElement(link, isTag("img"))!, "width"), "80");
  const details = findElement(html, isTag("details"))!;
  assert.equal(textContent(findElement(details, isTag("summary"))!), "More");
  assert.equal(textContent(findElement(details, isTag("em"))!), "text");
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-071
test("raw HTML keeps no script, event handler, style, class or script URL", async () => {
  const html = await render([
    "<div align=\"center\" onclick=\"steal()\" style=\"position:fixed\" class=\"evil\" id=\"x\">",
    "",
    "<img src=\"a.png\" onerror=\"steal()\" onload=\"steal()\" width=\"9999999\" height=\"1;x\">",
    "",
    "<a href=\"javascript:steal()\">js</a> <a href=\" JaVaScRiPt:steal()\">js2</a>",
    "",
    "<script>steal()</script>",
    "",
    "<iframe src=\"https://evil.example\">frame text</iframe>",
    "",
    "<unknown-tag>kept text</unknown-tag>",
    "",
    "</div>",
    "",
  ].join("\n"));
  const serialized = JSON.stringify(findElements(html, () => true).map((element) =>
    [element.tagName, element.attrs.filter((a) => a.name !== "data-okf-tag").map((a) => `${a.name}=${a.value}`)]));
  assert.doesNotMatch(serialized, /onclick|onerror|onload|steal|position:fixed|evil|javascript/iu);
  assert.equal(findElements(html, (e) => e.tagName === "script" && e.attrs.length === 0).length, 0);
  assert.equal(findElements(html, isTag("iframe")).length, 0);
  const div = findElement(html, (e) => e.tagName === "div" && attribute(e, "align") === "center")!;
  assert.equal(attribute(div, "style"), undefined);
  assert.equal(attribute(div, "id"), undefined);
  const image = findElement(div, isTag("img"))!;
  assert.equal(attribute(image, "width"), undefined);
  assert.equal(attribute(image, "height"), undefined);
  assert.doesNotMatch(textContent(div), /steal|frame text/u);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-071
test("raw HTML that holds none of the README elements is not turned into elements", async () => {
  const html = await render("<model_allocation>token</model_allocation>\n\n<custom-tag>\n\nAfter.\n");
  assert.equal(findElements(html, (e) => hasClass(e, "okf-html-block")).length, 0);
  assert.equal(findElements(html, (e) => e.tagName === "model_allocation" || e.tagName === "custom-tag").length, 0);
  assert.match(textContent(html), /After\./u);
});
