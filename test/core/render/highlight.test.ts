import * as assert from "node:assert/strict";
import { test } from "node:test";

import { highlightCodeBlocks } from "../../../src/core/render/highlight";

// @tests_req SwRS-MDOKFSTUDIO-CODE-001
test("colours tokens for a registered grammar", () => {
  const html = highlightCodeBlocks(
    '<pre><code class="language-rust">fn main() { let x = 1; }\n</code></pre>',
  );
  assert.match(html, /<code class="hljs language-rust">/u);
  assert.match(html, /hljs-keyword/u);
});

test("resolves the fence label through aliases", () => {
  const html = highlightCodeBlocks('<pre><code class="language-py">x = "value"\n</code></pre>');
  assert.match(html, /hljs-string/u);
});

// @tests_req SwRS-MDOKFSTUDIO-CODE-008
test("renders diff and patch fences with signed-line treatments", () => {
  const source = "--- a/settings.ini\n+++ b/settings.ini\n@@ -1 +1 @@\n value=true\n-old=true\n+old=false\n\n";
  const renderedText = (html: string): string => html.replace(/<[^>]*>/gu, "");

  for (const label of ["diff", "patch"]) {
    const html = highlightCodeBlocks(
      `<pre><code class="language-${label}">${source}</code></pre>`,
    );

    assert.match(html, /<pre class="myst-code-block-diff"><code/u);
    assert.match(html, new RegExp(`<code class="hljs language-${label}">`, "u"));
    assert.equal((html.match(/class="myst-code-line myst-diff-line-deletion"/gu) ?? []).length, 2);
    assert.equal((html.match(/class="myst-code-line myst-diff-line-addition"/gu) ?? []).length, 2);
    assert.equal((html.match(/class="myst-code-line"/gu) ?? []).length, 3);
    for (const line of source.trimEnd().split("\n")) {
      assert.ok(renderedText(html).includes(line), `missing literal line: ${line}`);
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-CODE-005
test("wraps numbered lines without breaking multiline highlighted spans", () => {
  const html = highlightCodeBlocks(
    '<pre><code class="language-python" data-myst-line-numbers="true"'
    + ' data-myst-line-start="4" data-myst-emphasize-lines="4,5">value = """first\nsecond"""\n</code></pre>',
  );

  assert.match(html, /data-line-number="4"/u);
  assert.match(html, /data-line-number="5"/u);
  assert.equal((html.match(/myst-code-line-emphasized/gu) ?? []).length, 2);
  assert.equal((html.match(/<span class="hljs-string">/gu) ?? []).length, 2);
  assert.equal((html.match(/<\/span>/gu) ?? []).length, (html.match(/<span\b/gu) ?? []).length);
});

test("leaves an unregistered grammar as plain text", () => {
  const source = '<pre><code class="language-wobblescript">depot :: promote\n</code></pre>';
  assert.equal(highlightCodeBlocks(source), source);
});

test("decodes numeric references before highlighting and does not double-escape", () => {
  const html = highlightCodeBlocks(
    '<pre><code class="language-rust">let a: Option&#x3C;&#x26;str> = None;\n</code></pre>',
  );
  assert.ok(!html.includes("&#x26;amp;"), "the ampersand was escaped twice");
  assert.match(html, /&lt;&amp;<span class="hljs-type">str<\/span>&gt;/u);
});
