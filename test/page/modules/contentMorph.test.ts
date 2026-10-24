import * as assert from "node:assert/strict";
import { test } from "node:test";

import { morphKey, planKeyedMorph } from "../../../src/page/modules/contentMorph";

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
