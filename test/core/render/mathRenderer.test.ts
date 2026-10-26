import * as assert from "node:assert/strict";
import { test } from "node:test";

import { renderMathHtml } from "../../../src/core/render/mathRenderer";
import { renderPreviewDocument } from "../../../src/core/render/renderPipeline";
import { attribute, findElements, hasClass, parseHtml, textContent } from "./dom";
import { inlineDocument, workspaceRoot } from "./mystFeaturesSupport";

// @tests_req SwRS-MDOKFSTUDIO-MYST-024
test("typesets inline and display math with local assets and CSP-compatible styles", () => {
  const result = renderMathHtml('<main><span class="math-inline">b</span>'
    + '<div class="math-display" data-sphinx-source-line="80">H = b \\times s \\times \\frac{m}{60}</div></main>',
  "vscode-webview://local/katex/katex.min.css", "math-nonce");
  const document = parseHtml(result);
  assert.equal(findElements(document, (element) => hasClass(element, "katex")).length, 2);
  assert.equal(findElements(document, (element) => element.tagName === "math").length, 2);
  assert.equal(findElements(document, (element) => attribute(element, "style") !== undefined).length, 0);
  assert.match(result, /nonce="math-nonce"/u);
  assert.match(result, /href="vscode-webview:\/\/local\/katex\/katex.min.css"/u);
  assert.match(result, /data-sphinx-source-line="80"/u);
  assert.match(result, /\.studio-math-style-\d+\{/u);
  assert.doesNotMatch(result, /<script/u);
});

test("supports Sphinx math delimiters and leaves ordinary text and code alone", () => {
  const result = renderMathHtml('<p>$not math$</p><code>\\frac{x}{y}</code>'
    + '<span class="math notranslate">\\(x^2\\)</span>'
    + '<div class="math notranslate">\\[\\frac{x}{y}\\]</div>', "local.css", "nonce");
  const document = parseHtml(result);
  assert.equal(findElements(document, (element) => hasClass(element, "katex")).length, 2);
  assert.match(result, /\$not math\$/u);
  assert.match(result, /<code>\\frac\{x\}\{y\}<\/code>/u);
  assert.equal(renderMathHtml(result, "local.css", "nonce"), result);
});

test("invalid LaTeX stays readable without breaking valid equations", () => {
  const document = parseHtml(renderMathHtml('<span class="math-inline">\\notARealCommand{x}</span>'
    + '<span class="math-inline">y^2</span>', "local.css", "nonce"));
  const failures = findElements(document, (element) => attribute(element, "data-studio-math-error") === "true");
  assert.equal(failures.length, 1);
  assert.equal(textContent(failures[0]), "\\notARealCommand{x}");
  assert.equal(findElements(document, (element) => hasClass(element, "katex")).length, 1);
});

test("math cannot inject trusted HTML commands or external links", () => {
  const result = renderMathHtml('<span class="math-inline">\\href{https://example.com}{x}</span>'
    + '<span class="math-inline">\\htmlStyle{background:url(https://example.com)}{x}</span>', "local.css", "nonce");
  assert.doesNotMatch(result, /<a\b|href="https:|style="/u);
  const styles = findElements(parseHtml(result), (element) => element.tagName === "style");
  assert.doesNotMatch(styles.map(textContent).join(""), /background:url/u);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-024
test("dollar amounts stay text while a real dollar span is maths", async () => {
  const source = "Plans: $19 base ($200), $5 and $6, $100\u2013$380, and $x$, $x^2$, and $a + b$ typeset.\n";
  const document = inlineDocument(source);
  const result = await renderPreviewDocument({ document, workspaceRoot, requestId: 1,
    documentIdentity: document.uri.fsPath, isWorkspaceTrusted: () => true });
  const page = parseHtml(renderMathHtml(result.html, "katex.css", "nonce"));
  const paragraph = findElements(page, (element) => element.tagName === "p")[0];
  assert.equal(findElements(paragraph, (element) => hasClass(element, "katex")).length, 3);
  assert.match(textContent(paragraph), /\$19 base \(\$200\), \$5 and \$6, \$100\u2013\$380/u);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-024
test("bold dollar prices do not consume the surrounding emphasis markers", async () => {
  const source = "**$671** cache reads + **$402** 5-min cache writes + **$85** 1-h cache writes + **$216** output\n";
  const document = inlineDocument(source);
  const result = await renderPreviewDocument({ document, workspaceRoot, requestId: 2,
    documentIdentity: document.uri.fsPath, isWorkspaceTrusted: () => true });
  const paragraph = findElements(parseHtml(result.html), (element) => element.tagName === "p")[0];
  const bold = findElements(paragraph, (element) => element.tagName === "strong");

  assert.deepEqual(bold.map(textContent), ["$671", "$402", "$85", "$216"]);
  assert.equal(bold.length, 4);
  assert.doesNotMatch(textContent(paragraph), /\*\*/u);
  assert.doesNotMatch(result.html, /\*\*/u);
});
