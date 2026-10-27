import * as assert from "node:assert/strict";
import { test } from "node:test";

import { highlightCodeBlocks, highlightLanguageNames } from "../../../src/core/render/highlight";

const renderedText = (html: string): string => html.replace(/<[^>]*>/gu, "");
const unescaped = (html: string): string =>
  renderedText(html).replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");

// @tests_req SwRS-MDOKFSTUDIO-CODE-001
test("colours tokens for a registered grammar", () => {
  const html = highlightCodeBlocks(
    '<pre><code class="language-rust">fn main() { let x = 1; }\n</code></pre>',
  );
  assert.match(html, /<code class="shiki language-rust">/u);
  // `fn` and `let` are keywords: the Dark+ keyword blue (#569cd6) with its Light+ twin.
  assert.match(html, /<span class="sd-569cd6 sl-0000ff">fn<\/span>/u);
  assert.match(html, /<span class="sd-b5cea8 sl-08764d">1<\/span>/u);
});

test("resolves the fence label through aliases", () => {
  const html = highlightCodeBlocks('<pre><code class="language-py">x = "value"\n</code></pre>');
  assert.match(html, /<span class="sd-ce9178 sl-a31515">"value"<\/span>/u);
});

// @tests_req SwRS-MDOKFSTUDIO-CODE-001
test("every bundled language colours its tokens, and a token never carries an inline style", () => {
  const samples: Record<string, string> = {
    python: 'def f(x):\n    return "a"\n',
    typescript: "const a: number = 1;\n",
    javascript: "const a = () => 1;\n",
    json: '{"a": [1, true]}\n',
    yaml: "key: value\nlist:\n  - 1\n",
    bash: 'echo "hi" && ls -la\n',
    c: "int main(void) { return 0; }\n",
    cpp: "#include <vector>\nint main() { return 0; }\n",
    rust: "fn main() { let x = 1; }\n",
    go: "package main\nfunc main() {}\n",
    java: "class A { int x = 1; }\n",
    sql: "SELECT a FROM b WHERE c = 1;\n",
    toml: '[a]\nb = "c"\n',
    diff: "-old\n+new\n",
    markdown: "# Title\n\n**bold** text\n",
    html: '<div class="a">x</div>\n',
    css: "a { color: red; }\n",
    xml: '<a b="c"/>\n',
    ini: "[a]\nb=c\n",
    dockerfile: "FROM alpine\nRUN echo hi\n",
    powershell: 'Get-ChildItem -Path "x"\n',
  };
  for (const [language, code] of Object.entries(samples)) {
    const escaped = code.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    const html = highlightCodeBlocks(`<pre><code class="language-${language}">${escaped}</code></pre>`);
    assert.match(html, /<span class="[^"]*\bs[dl]-[0-9a-f]{6}/u, `${language} has coloured tokens`);
    assert.doesNotMatch(html, /style=/u, `${language} has no inline style (CSP)`);
    assert.equal(unescaped(html), code, `${language} keeps its text`);
  }
});

test("the palette languages are the bundled grammars and their aliases", () => {
  const names = highlightLanguageNames();
  for (const name of ["python", "typescript", "yaml", "shellscript", "console", "sh", "py", "ipython3"]) {
    assert.ok(names.includes(name), `${name} is offered`);
  }
  assert.deepEqual(names, [...names].sort());
  assert.equal(new Set(names).size, names.length);
});

// @tests_req SwRS-MDOKFSTUDIO-CODE-008
test("renders diff and patch fences with signed-line treatments", () => {
  const source = "--- a/settings.ini\n+++ b/settings.ini\n@@ -1 +1 @@\n value=true\n-old=true\n+old=false\n\n";

  for (const label of ["diff", "patch"]) {
    const html = highlightCodeBlocks(
      `<pre><code class="language-${label}">${source}</code></pre>`,
    );

    assert.match(html, /<pre class="myst-code-block-diff"><code/u);
    assert.match(html, new RegExp(`<code class="shiki language-${label}"`, "u"));
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
  // The string token is split by the line wrapper, never carried across two lines.
  assert.equal((html.match(/<span class="sd-ce9178 sl-a31515">/gu) ?? []).length, 2);
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
  assert.match(html, /&lt;&amp;/u);
  assert.equal(renderedText(html), "let a: Option&lt;&amp;str&gt; = None;\n");
});
