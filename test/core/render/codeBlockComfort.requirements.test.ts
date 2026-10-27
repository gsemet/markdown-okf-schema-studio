/**
 * Requirement tests of the reading comfort of code blocks (CR 131): the line wrapper of every block
 * of two lines or more, the MyST options that number a block whatever the setting says, the text
 * of a wrapped block, and the Shiki highlighter (no WebAssembly, no inline style, strict page policy).
 */

import * as assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as path from "node:path";
import { test } from "node:test";

import { createContentSecurityPolicy } from "../../../src/core/security/csp";
import { highlightCodeBlocks } from "../../../src/core/render/highlight";
import { renderPreviewDocument } from "../../../src/core/render/renderPipeline";
import { attribute, findElement, findElements, hasClass, parseHtml, textContent } from "./dom";
import { inlineDocument, workspaceRoot } from "./mystFeaturesSupport";

const block = (attributes: string, body: string): string => `<pre><code ${attributes}>${body}</code></pre>`;

async function render(markdown: string): Promise<string> {
  const result = await renderPreviewDocument({
    document: inlineDocument(markdown),
    workspaceRoot,
    requestId: 1,
    isWorkspaceTrusted: () => true,
  });
  return result.html;
}

// @tests_req SwRS-MDOKFSTUDIO-CODE-039
test("a block of two lines or more is wrapped into numbered lines and marked for the setting; one line is not", () => {
  const many = highlightCodeBlocks(block('class="language-python"', "a = 1\nb = 2\nc = 3\n"));
  assert.match(many, /<code class="shiki language-python" data-myst-auto-numbers="true">/u);
  assert.deepEqual(
    [...many.matchAll(/data-line-number="(\d+)"/gu)].map((match) => match[1]),
    ["1", "2", "3"],
  );

  const one = highlightCodeBlocks(block('class="language-python"', "a = 1\n"));
  assert.doesNotMatch(one, /myst-code-line|data-myst-auto-numbers/u, "a single line is never numbered");

  const unknown = highlightCodeBlocks(block('class="language-wobblescript"', "one\ntwo\n"));
  assert.match(unknown, /data-myst-auto-numbers="true"/u, "an unknown language is numbered too");
  assert.doesNotMatch(unknown, /shiki/u);
  assert.equal((unknown.match(/class="myst-code-line"/gu) ?? []).length, 2);

  const nolanguage = highlightCodeBlocks(block("", "one\ntwo\n"));
  assert.equal((nolanguage.match(/class="myst-code-line"/gu) ?? []).length, 2, "a block without a label too");
});

// @tests_req SwRS-MDOKFSTUDIO-CODE-039
test("the text of a wrapped block is the source text, empty lines included, and the numbers are not text", () => {
  const source = "first\n\nthird\n";
  for (const attributes of ['class="language-python"', 'class="language-wobblescript"', 'class="language-python" data-myst-line-numbers="true"']) {
    const html = highlightCodeBlocks(block(attributes, source));
    assert.equal(textContent(parseHtml(html)), source, `${attributes} keeps its text`);
    assert.doesNotMatch(textContent(parseHtml(html)), /\b[123]\b/u, "no line number in the text");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-CODE-039
test("a MyST code-block numbers and emphasizes lines whatever the setting says: the options reach the markup", async () => {
  const html = parseHtml(await render(
    "```{code-block} python\n:linenos:\n:lineno-start: 10\n:emphasize-lines: 11\nx = 1\ny = 2\nz = 3\n```\n\n"
    + "```python\na = 1\nb = 2\n```\n",
  ));
  const [explicit, automatic] = findElements(html, (element) => element.tagName === "code" && hasClass(element, "shiki"));
  assert.ok(explicit && automatic);
  assert.equal(attribute(explicit, "data-myst-line-numbers"), "true", ":linenos: is an explicit number request");
  assert.equal(attribute(explicit, "data-myst-auto-numbers"), undefined, "an explicit block is not left to the setting");
  assert.equal(attribute(automatic, "data-myst-line-numbers"), undefined);
  assert.equal(attribute(automatic, "data-myst-auto-numbers"), "true", "a plain block is left to the setting");
  const lines = findElements(explicit, (element) => hasClass(element, "myst-code-line"));
  assert.deepEqual(lines.map((line) => attribute(line, "data-line-number")), ["10", "11", "12"]);
  assert.deepEqual(lines.map((line) => hasClass(line, "myst-code-line-emphasized")), [false, true, false]);
});

// @tests_req SwRS-MDOKFSTUDIO-CODE-001
test("the page policy allows neither WebAssembly nor inline styles, and the highlighted markup needs neither", async () => {
  const policy = createContentSecurityPolicy("vscode-webview:", "nonce");
  assert.doesNotMatch(policy, /wasm-unsafe-eval|unsafe-eval|unsafe-inline/u);
  const html = await render("```python\ndef f():\n    return 'x'\n```\n");
  assert.match(html, /<span class="sd-569cd6 sl-0000ff">def<\/span>/u);
  assert.doesNotMatch(html, /style=/u, "a token carries a colour class, never a style attribute");
});

// @tests_req SwRS-MDOKFSTUDIO-CODE-001
test("the highlighter runs without WebAssembly (strict CSP) and writes no inline style", () => {
  const module = path.resolve(__dirname, "../../../src/core/render/highlight.js");
  const script = `
    delete globalThis.WebAssembly;
    const { highlightCodeBlocks } = require(${JSON.stringify(module)});
    const html = highlightCodeBlocks('<pre><code class="language-yaml">a: 1\\nb: [x]\\n</code></pre>');
    process.stdout.write(JSON.stringify({ wasm: typeof WebAssembly, html }));
  `;
  const result = JSON.parse(execFileSync(process.execPath, ["-e", script], { encoding: "utf8" })) as { wasm: string; html: string };
  assert.equal(result.wasm, "undefined");
  assert.match(result.html, /class="[^"]*sd-[0-9a-f]{6}/u, "tokens are coloured without WebAssembly");
  assert.doesNotMatch(result.html, /style=/u);
});
