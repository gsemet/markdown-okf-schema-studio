import * as assert from "node:assert/strict";
import { test } from "node:test";

import { setCellInline } from "../../src/page/modules/cellInlineMarkdown";

class FakeNode {
  readonly children: FakeNode[] = [];
  readonly attributes = new Map<string, string>();
  text = "";
  constructor(readonly tagName: string) {}
  get firstChild(): FakeNode | undefined { return this.children[0]; }
  set textContent(value: string) { this.text = value; }
  appendChild(child: FakeNode): FakeNode { this.children.push(child); return child; }
  removeChild(child: FakeNode): FakeNode { this.children.splice(this.children.indexOf(child), 1); return child; }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
}

/** A compact serialisation: `<tag>` for elements, `[href]` on links, plain text as is. */
function html(node: FakeNode): string {
  if (node.tagName === "span") return node.text;
  if (node.tagName === "br") return "<br>";
  const href = node.attributes.has("href") ? `[${node.attributes.get("href")}]` : "";
  const inner = node.tagName === "code" ? node.text : node.children.map(html).join("");
  return `<${node.tagName}${href}>${inner}</${node.tagName}>`;
}

function render(text: string): string {
  const document = { createElement: (tag: string) => new FakeNode(tag) };
  const root = new FakeNode("div");
  root.appendChild(new FakeNode("span"));
  setCellInline(document as never, root as never, text);
  return root.children.map(html).join("");
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-035
test("inline marks become elements and the previous content is replaced", () => {
  assert.equal(render("a **b** *c* ~~d~~ `e`"), "a <strong>b</strong> <em>c</em> <del>d</del> <code>e</code>");
  assert.equal(render("__b__ _c_"), "<strong>b</strong> <em>c</em>");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-035
test("a link keeps its href only for https, http, mailto, fragment and relative targets", () => {
  for (const href of ["https://a.b/c", "http://a.b", "mailto:x@y.z", "#part", "/abs/path", "./rel", "../up"]) {
    assert.equal(render(`[t](${href})`), `<a[${href}]>t</a>`, href);
  }
  for (const href of ["javascript:alert", "JavaScript:alert", "data:text/html,x", "//evil.example/x", "vbscript:x"]) {
    assert.equal(render(`[t](${href})`), "<a>t</a>", href);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-035
test("backslash escapes give the literal character and <br> gives a line break", () => {
  assert.equal(render("\\*not\\* \\_x\\_ \\\\"), "*not* _x_ \\");
  assert.equal(render("a\\qb"), "a\\qb");
  assert.equal(render("a<br>b<BR/>c<br />d"), "a<br>b<br>c<br>d");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-035
test("markup characters inside words or around spaces stay plain text", () => {
  assert.equal(render("snake_case_name"), "snake_case_name");
  assert.equal(render("2 * 3 * 4"), "2 * 3 * 4");
  assert.equal(render("a__b__c"), "a__b__c");
  assert.equal(render("_a_b"), "_a_b");
  assert.equal(render("x*y*z"), "x<em>y</em>z");
  assert.equal(render("(_em_)"), "(<em>em</em>)");
});

// @tests_req SwRS-MDOKFSTUDIO-TABLE-035
test("HTML in the text is never parsed", () => {
  assert.equal(render("<img src=x onerror=alert(1)>"), "<img src=x onerror=alert(1)>");
});
