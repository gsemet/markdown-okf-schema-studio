/**
 * Requirement tests of the code blocks (`highlight.ts`): the fence label, the line wrapper, the
 * fallback of a failing grammar, inline code and the literal text of a fenced block. Each test
 * asserts the behaviour of the current code.
 */

import * as assert from "node:assert/strict";
import { mock, test } from "node:test";

import hljs from "highlight.js/lib/core";

import { highlightCodeBlocks } from "../../../src/core/render/highlight";
import { renderPreviewDocument } from "../../../src/core/render/renderPipeline";
import { findElement, findElements, hasClass, parseHtml, textContent } from "./dom";
import { inlineDocument, isTag, workspaceRoot } from "./mystFeaturesSupport";

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

// @tests_req SwRS-MDOKFSTUDIO-CODE-001
test("the leading word of the fence label, lower-cased, selects the grammar; an empty word selects none", async () => {
  for (const label of ["Python", "PYTHON", "python,linenos", "python{linenos}", "Py"]) {
    const html = highlightCodeBlocks(block(`class="language-${label}"`, "x = &quot;a&quot;\n"));
    assert.match(html, /<code class="hljs language-/u, `label ${label} selects Python`);
    assert.match(html, /hljs-string/u, `label ${label} colours the string`);
  }
  const empty = block('class="language-,python"', "x = 1\n");
  assert.equal(highlightCodeBlocks(empty), empty, "an empty leading word selects no grammar");

  const rendered = await render("```Python {linenos}\nx = \"a\"\n```\n\n```, python\nx = 1\n```\n");
  assert.match(rendered, /<code class="hljs language-Python"[^>]*>x = <span class="hljs-string">/u);
  assert.match(rendered, /<code class="language-,"[^>]*>x = 1\n<\/code>/u, "the block stays plain");
});

// @tests_req SwRS-MDOKFSTUDIO-CODE-005
test("numbered, emphasized and diff blocks are wrapped into lines, and an unknown language gets no hljs class", () => {
  const numbered = highlightCodeBlocks(
    block('class="language-wobblescript" data-myst-line-numbers="true"', "one\ntwo\n"),
  );
  assert.doesNotMatch(numbered, /hljs/u);
  assert.equal((numbered.match(/<span class="myst-code-line" data-line-number="\d">/gu) ?? []).length, 2);

  const emphasized = highlightCodeBlocks(
    block('class="language-wobblescript" data-myst-emphasize-lines="2"', "one\ntwo\n"),
  );
  assert.doesNotMatch(emphasized, /hljs/u);
  assert.equal((emphasized.match(/myst-code-line-emphasized/gu) ?? []).length, 1);

  // A diff block is wrapped and classified; diff is a registered grammar, so the class stays.
  const diff = highlightCodeBlocks(block('class="language-diff"', "-old\n+new\n same\n"));
  assert.equal((diff.match(/myst-diff-line-deletion/gu) ?? []).length, 1);
  assert.equal((diff.match(/myst-diff-line-addition/gu) ?? []).length, 1);
  assert.match(diff, /<code class="hljs language-diff">/u);

  const plain = block('class="language-wobblescript"', "one\n");
  assert.equal(highlightCodeBlocks(plain), plain, "a plain unknown block is not wrapped");
});

test("inline code is never highlighted; only pre and code pairs are processed", () => {
  const inline = '<p>Use <code class="language-python">x = 1</code> here.</p>';
  assert.equal(highlightCodeBlocks(inline), inline);

  const mixed = inline + block('class="language-python"', "y = 2\n");
  const html = highlightCodeBlocks(mixed);
  assert.ok(html.startsWith(inline), "the inline code stays as written");
  assert.match(html.slice(inline.length), /<code class="hljs language-python">/u);
  assert.doesNotMatch(html.slice(0, inline.length), /hljs/u, "the inline code has no token spans");
});

test("a grammar that throws falls back to escaped lines for a wrapped block and to the original otherwise", () => {
  const failing = mock.method(hljs, "highlight", () => {
    throw new Error("grammar failure");
  });
  try {
    const numbered = highlightCodeBlocks(
      block('class="language-python" data-myst-line-numbers="true"', "a &lt; b\nc &amp;&amp; d\n"),
    );
    assert.match(numbered, /<span class="myst-code-line" data-line-number="1">a &lt; b<\/span>/u);
    assert.match(numbered, /<span class="myst-code-line" data-line-number="2">c &amp;&amp; d<\/span>/u);
    assert.doesNotMatch(numbered, /hljs-/u);

    const unwrapped = block('class="language-python"', "a &lt; b\n");
    assert.equal(highlightCodeBlocks(unwrapped), unwrapped);
    assert.ok(failing.mock.callCount() >= 2);
  } finally {
    failing.mock.restore();
  }
});

test("a markdown fence shows its table, link and inner fence as literal text", async () => {
  const source = [
    "| a | b |",
    "| - | - |",
    "| 1 | 2 |",
    "",
    "[link](https://example.com/x)",
    "",
    "```python",
    "print('inner')",
    "```",
    "",
    "``",
  ].join("\n");
  const html = parseHtml(await render(`\`\`\`\`markdown\n${source}\n\`\`\`\`\n\nAfter the block.\n`));
  const code = findElement(html, (element) => element.tagName === "code" && hasClass(element, "language-markdown"));
  assert.ok(code, "the markdown fence is a code element");
  assert.equal(textContent(code).trimEnd(), source, "the code text equals the source text");
  assert.equal(findElements(html, isTag("table")).length, 0, "no table element is created");
  assert.equal(
    findElements(html, (element) => element.tagName === "a" && textContent(element) === "link").length, 0,
    "no anchor element is created inside the block",
  );
  assert.equal(findElements(html, isTag("pre")).length, 1, "the shorter inner fence does not close the block");
});
