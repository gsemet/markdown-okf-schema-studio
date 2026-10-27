import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  hashKey,
  installContentMorph,
  morphKey,
  planKeyedMorph,
  positionSignature,
} from "../../../src/page/modules/contentMorph";

// @tests_req SwRS-MDOKFSTUDIO-LIFE-069
test("PERF-05: unchanged blocks are kept in place, changed and new ones come from the patch", () => {
  assert.deepEqual(planKeyedMorph(["<p>a</p>", "<p>b</p>", "<p>c</p>"], ["<p>a</p>", "<p>B</p>", "<p>c</p>"]), [0, -1, 2]);
  assert.deepEqual(planKeyedMorph(["<p>a</p>"], ["<h1>t</h1>", "<p>a</p>"]), [-1, 0], "an insertion before shifts nothing else");
  assert.deepEqual(planKeyedMorph(["<p>a</p>", "<p>b</p>"], ["<p>b</p>"]), [1], "a removed block is dropped");
});

test("PERF-05: equal blocks pair in document order and each kept node is used once", () => {
  assert.deepEqual(planKeyedMorph(["<hr>", "<p>x</p>", "<hr>"], ["<hr>", "<hr>", "<hr>"]), [0, 2, -1]);
});

test("PERF-05: nodes without a recorded key (text, nodes the page added) are never kept", () => {
  assert.deepEqual(planKeyedMorph([undefined, "<p>a</p>"], [undefined, "<p>a</p>"]), [-1, 1]);
});

test("PERF-05: the first page and a patch give a block with a link the same key", () => {
  // VS Code's webview loader gives every link without a title its href as title when it loads the
  // first page; a content patch does not go through the loader. The keys must still match, or the
  // block (a drawn Mermaid diagram with a captioned link) is rebuilt once on the first patch.
  const fromPatch = '<figure class="myst-mermaid-figure"><div class="myst-mermaid-diagram">graph TD</div>'
    + '<figcaption>See <a class="reference internal" href="#flow">the flow</a>.</figcaption></figure>';
  const loadedByVsCode = fromPatch.replace('href="#flow">', 'href="#flow" title="#flow">');
  assert.equal(morphKey(loadedByVsCode), morphKey(fromPatch));
  assert.deepEqual(planKeyedMorph([morphKey(loadedByVsCode)], [morphKey(fromPatch)]), [0]);
});

test("PERF-05: a link title the host wrote itself stays part of the key", () => {
  const titled = '<p><a href="other.md" title="Other note">x</a></p>';
  assert.equal(morphKey(titled), titled);
  assert.notEqual(morphKey(titled), morphKey('<p><a href="other.md" title="Renamed note">x</a></p>'));
  assert.equal(morphKey('<p><abbr title="t">t</abbr></p>'), '<p><abbr title="t">t</abbr></p>', "only links are touched");
  assert.equal(morphKey('<p><a data-title="x" href="x">x</a></p>'), '<p><a data-title="x" href="x">x</a></p>');
  assert.equal(morphKey('<p><a href="a" title="a">1</a><a title="b" href="b">2</a></p>'), '<p><a href="a">1</a><a href="b">2</a></p>');
});

// A minimal DOM for the top-level blocks of a content patch: enough for the morph, which parses
// the incoming HTML in a template, reads `outerHTML` and writes attributes.
class FakeNode {
  readonly nodeType = 1;
  readonly children: FakeNode[] = [];
  className = "";
  constructor(readonly tag: string, readonly attributes: Map<string, string>, readonly inner: string) {}
  getAttribute(name: string): string | null { return this.attributes.get(name) ?? null; }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); this.writes += 1; }
  removeAttribute(name: string): void { this.attributes.delete(name); this.writes += 1; }
  writes = 0;
  get outerHTML(): string {
    const attributes = Array.from(this.attributes, ([name, value]) => ` ${name}="${value}"`).join("");
    return `<${this.tag}${attributes}>${this.inner}</${this.tag}>`;
  }
}

function parseBlocks(html: string): FakeNode[] {
  return Array.from(html.matchAll(/<(\w+)((?: [\w-]+="[^"]*")*)>([^<]*)<\/\1>/gu), (match) => {
    const attributes = new Map<string, string>();
    for (const attribute of (match[2] ?? "").matchAll(/ ([\w-]+)="([^"]*)"/gu)) attributes.set(attribute[1]!, attribute[2]!);
    const node = new FakeNode(match[1]!, attributes, match[3] ?? "");
    node.className = attributes.get("class") ?? "";
    return node;
  });
}

function fakeDocument(): Document {
  return {
    createElement: () => {
      const template: { content: { childNodes: FakeNode[] }; innerHTML: string } = {
        content: { childNodes: [] },
        set innerHTML(html: string) { template.content.childNodes = parseBlocks(html); },
        get innerHTML() { return ""; },
      };
      return template;
    },
  } as unknown as Document;
}

class FakeContainer {
  childNodes: FakeNode[] = [];
  get children(): FakeNode[] { return this.childNodes; }
  innerHTML = "";
  replaceChildren(...nodes: FakeNode[]): void { this.childNodes = nodes; }
  set(html: string): void { this.childNodes = parseBlocks(html); }
}

const block = (line: number, end: number, id: number, text: string): string =>
  `<p data-line="${line}" data-sphinx-source-line="${line}" data-sphinx-source-end-line="${end}" `
  + `data-sphinx-preview-block="source-block-${id}">${text}</p>`;

// @tests_req SwRS-MDOKFSTUDIO-LIFE-069
test("P-07: the key leaves out the source-position attributes and a hash replaces the HTML", () => {
  assert.equal(morphKey(block(3, 4, 2, "x")), "<p>x</p>");
  assert.equal(morphKey(block(10, 11, 7, "x")), morphKey(block(3, 4, 2, "x")));
  assert.notEqual(morphKey(block(3, 4, 2, "x")), morphKey(block(3, 4, 2, "y")));
  assert.equal(morphKey('<p data-line-count="3">x</p>'), '<p data-line-count="3">x</p>', "other data attributes stay");
  assert.equal(positionSignature(block(3, 4, 2, "x")).includes('data-sphinx-source-line="3"'), true);
  assert.equal(hashKey("<p>x</p>"), hashKey("<p>x</p>"));
  assert.notEqual(hashKey("<p>x</p>"), hashKey("<p>y</p>"));
  assert.ok(hashKey(block(1, 1, 1, "x".repeat(10_000))).length < 30, "the key does not grow with the block");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-069
test("P-07: a line inserted above keeps every block below it and moves its line attributes in place", () => {
  const blocks = 200;
  const before = Array.from({ length: blocks }, (_, index) => block(index * 2 + 1, index * 2 + 1, index + 1, `block ${index}`)).join("");
  const container = new FakeContainer();
  container.set(before);
  const morph = installContentMorph(fakeDocument(), planKeyedMorph, morphKey);
  morph.record(container as unknown as Element);
  const original = [...container.childNodes];
  // A new paragraph (and its blank line) at the top: every block below moves down by two lines.
  const after = block(1, 1, 1, "new") + Array.from({ length: blocks }, (_, index) =>
    block(index * 2 + 3, index * 2 + 3, index + 2, `block ${index}`)).join("");
  const result = morph.replace(container as unknown as Element, after);
  assert.equal(result.kept, blocks, "all blocks below the inserted line are kept");
  assert.equal(result.inserted, 1, "only the new block comes from the patch");
  assert.equal(container.childNodes.length, blocks + 1);
  original.forEach((node, index) => {
    assert.equal(container.childNodes[index + 1], node, `block ${index} is the same node`);
    assert.equal(node.getAttribute("data-sphinx-source-line"), String(index * 2 + 3));
    assert.equal(node.getAttribute("data-sphinx-source-end-line"), String(index * 2 + 3));
    assert.equal(node.getAttribute("data-line"), String(index * 2 + 3));
    assert.equal(node.getAttribute("data-sphinx-preview-block"), `source-block-${index + 2}`);
  });
  // The patch is recorded: the same content again changes nothing, not even an attribute.
  const writes = original.reduce((sum, node) => sum + node.writes, 0);
  const again = morph.replace(container as unknown as Element, after);
  assert.equal(again.kept, blocks + 1);
  assert.equal(original.reduce((sum, node) => sum + node.writes, 0), writes, "unchanged positions are not rewritten");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-069
test("P-07: the insertion bars of kept blocks stay with them and bars of dropped blocks go", () => {
  const container = new FakeContainer();
  container.set(block(1, 1, 1, "a") + block(3, 3, 2, "b"));
  const morph = installContentMorph(fakeDocument(), planKeyedMorph, morphKey);
  morph.record(container as unknown as Element);
  const [a, b] = container.childNodes as [FakeNode, FakeNode];
  const barA = new FakeNode("div", new Map(), "");
  barA.className = "sphinx-preview-insert-point";
  const barB = new FakeNode("div", new Map(), "");
  barB.className = "sphinx-preview-insert-point";
  container.childNodes = [a, barA, b, barB];
  morph.replace(container as unknown as Element, block(1, 1, 1, "a") + block(3, 3, 2, "B changed"));
  assert.equal(container.childNodes[0], a);
  assert.equal(container.childNodes[1], barA, "the bar after a kept block stays");
  assert.notEqual(container.childNodes[2], b);
  assert.equal(container.childNodes.includes(barB), false, "the bar after a replaced block goes");
});
