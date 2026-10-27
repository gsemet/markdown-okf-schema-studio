import assert from "node:assert/strict";
import test from "node:test";
import { htmlToMarkdown } from "../../../src/core/paste/htmlToMarkdown";

// T1 (CR 036): rich clipboard HTML becomes Markdown. Each row is a clipboard seen in the wild.
const CASES: Array<{ name: string; html: string; markdown: string }> = [
  {
    name: "Google Docs: wrapper bold at normal weight, styled spans, heading, nested lists in the parent list",
    html: '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1">'
      + '<h2 dir="ltr"><span style="font-size:17pt;font-weight:700;">Plan</span></h2>'
      + '<p dir="ltr"><span style="font-weight:400;">Some </span><span style="font-weight:700;">bold</span>'
      + '<span style="font-style:italic;"> and italic</span><span style="text-decoration:line-through;"> gone</span></p>'
      + '<ul><li dir="ltr"><p><span>One</span></p></li><ul><li><p><span>Nested</span></p></li></ul><li><p><span>Two</span></p></li></ul>'
      + '</b>',
    markdown: "## Plan\n\nSome **bold** *and italic* ~~gone~~\n\n- One\n  - Nested\n- Two",
  },
  {
    name: "Word: comments and o:p dropped, list paragraphs through mso-list",
    html: '<html><head><style>p.MsoNormal{margin:0}</style></head><body><!--StartFragment-->'
      + '<p class="MsoNormal">Intro <b>text</b><o:p></o:p></p>'
      + '<p class="MsoListParagraph" style="mso-list:l0 level1 lfo1"><!--[if !supportLists]--><span>·<span>&nbsp;&nbsp;</span></span><!--[endif]-->First</p>'
      + '<p class="MsoListParagraph" style="mso-list:l0 level2 lfo1"><!--[if !supportLists]--><span>o<span>&nbsp;&nbsp;</span></span><!--[endif]-->Second</p>'
      + '<!--EndFragment--></body></html>',
    markdown: "Intro **text**\n\n- First\n   - Second",
  },
  {
    name: "web page: link, inline code, image as link, blockquote, script and onclick dropped",
    html: '<div><script>alert(1)</script><style>.a{}</style><p onclick="x()">See <a href="https://example.com/a(b)" title="t">the <em>docs</em></a> and <code>npm i</code>.</p>'
      + '<blockquote><p>Quoted</p><p>Twice</p></blockquote><p><img src="https://example.com/i.png" alt="Logo"></p></div>',
    markdown: "See [the *docs*](https://example.com/a%28b%29) and `npm i`.\n\n> Quoted\n>\n> Twice\n\n[Logo](https://example.com/i.png)",
  },
  {
    name: "web page: code block with the language from its class",
    html: '<pre class="lang"><code class="language-ts">const a = 1;\nconst b = `x`;\n</code></pre>',
    markdown: "```ts\nconst a = 1;\nconst b = `x`;\n```",
  },
  {
    name: "web page: simple table becomes a GFM table, a pipe in a cell is escaped",
    html: "<table><thead><tr><th>Name</th><th>Note</th></tr></thead><tbody><tr><td>a|b</td><td><b>x</b></td></tr><tr><td>c</td></tr></tbody></table>",
    markdown: "| Name | Note |\n| --- | --- |\n| a\\|b | **x** |\n| c |  |",
  },
  {
    name: "web page: a table with a colspan is not a table, only its text stays",
    html: '<table><tr><td colspan="2">Wide</td></tr><tr><td>a</td><td>b</td></tr></table>',
    markdown: "Wide\n\na b",
  },
  {
    name: "VS Code copy: several lines stay raw text, never wrapped in a fence",
    html: '<meta charset="utf-8"><div style="color: #ccc;font-family: Menlo, monospace;white-space: pre;">'
      + "<div><span>function f() {</span></div><div><span>  return 1;</span></div><div><span>}</span></div></div>",
    markdown: "function f() {\n  return 1;\n}",
  },
  {
    name: "VS Code copy of a document with code fences and blank lines is returned as copied",
    html: '<meta charset="utf-8"><div style="font-family: Menlo, monospace;white-space: pre;">'
      + "<div><span>---</span></div><div><span>title: T</span></div><div><span>---</span></div><div><span></span></div>"
      + "<div><span></span></div><div><span>```ts</span></div><div><span>const a = 1;</span></div><div><span>```</span></div></div>",
    markdown: "---\ntitle: T\n---\n\n\n```ts\nconst a = 1;\n```",
  },
  {
    name: "VS Code copy: one line stays plain text",
    html: '<meta charset="utf-8"><div style="font-family: Menlo, monospace;white-space: pre;"><div><span>const a_b = 1;</span></div></div>',
    markdown: "const a_b = 1;",
  },
  {
    name: "ordered list, task item and horizontal rule",
    html: '<ol start="3"><li>Three</li><li>Four<ol><li>Inner</li></ol></li></ol><hr><ul><li><input type="checkbox" checked> Done</li></ul>',
    markdown: "3. Three\n4. Four\n   1. Inner\n\n---\n\n- [x] Done",
  },
  {
    name: "unsafe link and data image keep only their text, hidden content is dropped",
    html: '<p><a href="javascript:alert(1)">click</a> <img src="data:image/png;base64,AAAA" alt="pic"><span style="display:none">secret</span></p>',
    markdown: "click pic",
  },
  {
    name: "text that looks like Markdown is escaped",
    html: "<p>2 * 3 [x] `y`</p><p># not a heading</p>",
    markdown: "2 \\* 3 \\[x\\] \\`y\\`\n\n\\# not a heading",
  },
  { name: "nothing readable", html: "<style>p{}</style><!-- c --><script>x</script>", markdown: "" },
];

for (const { name, html, markdown } of CASES) {
  // @tests_req SwRS-MDOKFSTUDIO-PALETTE-217
  // @tests_req SwRS-MDOKFSTUDIO-PALETTE-229
  test("T1: htmlToMarkdown, " + name, () => {
    assert.equal(htmlToMarkdown(html), markdown);
  });
}
