import * as assert from "node:assert/strict";
import { test } from "node:test";

import { detectMystSyntax } from "../../../src/core/render/mystSyntaxDetect";
import { parseMystSource } from "../../../src/core/render/mystRenderer";

async function detect(source: string): Promise<Array<{ ext: string; line: number }>> {
  const ast = await parseMystSource(source);
  return detectMystSyntax(ast, source).map(({ ext, line }) => ({ ext, line }));
}

const cases: Array<[string, string, string, number]> = [
  ["colon_fence", "Intro\n\n:::{note}\nhi\n:::\n", "colon_fence", 3],
  ["dollarmath inline", "Intro\n\nvalue $x^2$ here\n", "dollarmath", 3],
  ["dollarmath display", "Intro\n\n$$\na=b\n$$\n", "dollarmath", 3],
  ["amsmath", "Intro\n\n\\begin{align}\na&=b\n\\end{align}\n", "amsmath", 3],
  ["deflist", "Intro\n\nTerm\n: Definition\n", "deflist", 3],
  ["fieldlist", "Intro\n\n:name: value\n:other: more\n", "fieldlist", 3],
  ["tasklist", "Intro\n\n- [ ] a\n- [x] b\n", "tasklist", 3],
  ["strikethrough", "Intro\n\nsome ~~gone~~ text\n", "strikethrough", 3],
  ["substitution", "Intro\n\nHello {{ name }} there\n", "substitution", 3],
  ["attrs_inline", "Intro\n\nsee [text]{.cls} here\n", "attrs_inline", 3],
  ["html_image", "Intro\n\n<img src=\"a.png\" width=\"3\">\n", "html_image", 3],
  ["html_admonition", "Intro\n\n<div class=\"admonition note\"><p>x</p></div>\n", "html_admonition", 3],
];

for (const [name, source, ext, line] of cases) {
  // @tests_req SwRS-MDOKFSTUDIO-MYST-072
  test(`detects ${name}`, async () => {
    const found = await detect(source);
    assert.deepEqual(found.filter((entry) => entry.ext === ext), [{ ext, line }]);
  });
}

test("the line is the line of the syntax inside a long paragraph and counts the frontmatter", async () => {
  const found = await detect("---\ntitle: T\n---\n\nfirst\nsecond\nhas ~~gone~~ here\n");
  assert.deepEqual(found, [{ ext: "strikethrough", line: 7 }]);
});

test("only the first use per extension is reported", async () => {
  const found = await detect("a ~~b~~\n\nc ~~d~~\n\n:::{note}\nx\n:::\n\n:::{tip}\ny\n:::\n");
  assert.deepEqual(found, [
    { ext: "strikethrough", line: 1 },
    { ext: "colon_fence", line: 5 },
  ]);
});

test("nothing is detected inside code fences or inline code", async () => {
  const source = [
    "````",
    ":::{note}",
    "$$ x $$ {{ a }} ~~b~~ [t]{.c}",
    "- [ ] task",
    "<img src=\"a.png\">",
    "````",
    "",
    "Inline `$x$ ~~y~~ {{ z }} [t]{.c}` code.",
    "",
    "    :::{note}",
    "    indented code",
    "",
  ].join("\n");
  assert.deepEqual(await detect(source), []);
});

test("prices and ordinary braces are not math or substitutions", async () => {
  assert.deepEqual(await detect("It costs $5 and $6 in total.\n"), []);
  assert.deepEqual(await detect("Use {braces} and {% not %} here.\n"), []);
});

test("the {math} role and directive are not dollarmath, backtick directives are not colon_fence", async () => {
  const source = "Role {math}`x^2` here.\n\n```{math}\ny\n```\n\n```{note}\nhi\n```\n";
  assert.deepEqual(await detect(source), []);
});

test("a $$ block holding an environment is dollarmath, not amsmath", async () => {
  const found = await detect("$$\n\\begin{align}\na\n\\end{align}\n$$\n");
  assert.deepEqual(found.map((entry) => entry.ext), ["dollarmath"]);
});

test("currency amounts from the white paper are not dollarmath, real math still is", async () => {
  assert.deepEqual(await detect("The plan combines a **$19 base subscription** with credits\n(up to ($200) a month).\n"), []);
  assert.deepEqual(await detect("A day can reach $100\u2013$380 in token spend.\n"), []);
  assert.deepEqual(await detect("Costs $ 5 and $ 6 here.\n"), []);
  assert.deepEqual(await detect("Both $x$ and $y$ and $$z$$ here.\n"), [{ ext: "dollarmath", line: 1 }]);
});
