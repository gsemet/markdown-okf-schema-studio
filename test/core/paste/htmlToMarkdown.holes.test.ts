import assert from "node:assert/strict";
import test from "node:test";
import { htmlToMarkdown } from "../../../src/core/paste/htmlToMarkdown";

// Tests added by the mutation campaign of src/core (CR-450): they pin the survivors of the first run.

const weighted = (weight: string) => htmlToMarkdown(`<p>a <span style="font-weight:${weight}">x</span> b</p>`);
const linked = (url: string) => htmlToMarkdown(`<p><a href="${url}">t</a></p>`);
const pictured = (url: string) => htmlToMarkdown(`<p><img src="${url}" alt="i"></p>`);

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-217
test("a span is bold from a numeric weight of 600 up, or the words bold and bolder, and no other weight", () => {
  for (const weight of ["600", "601", "900", "bold", "bolder"]) assert.equal(weighted(weight), "a **x** b", weight);
  for (const weight of ["599", "400", "lighter", "normal", "abc"]) assert.equal(weighted(weight), "a x b", weight);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-217
test("a block is code only when it is both white-space preserving and set in a monospace font", () => {
  assert.equal(htmlToMarkdown('<div style="white-space:pre;font-family:monospace">a\nb</div>'), "a\nb");
  assert.equal(htmlToMarkdown('<p>x</p><div style="white-space:pre;font-family:menlo">a\nb</div>'), "x\n\na\nb");
  assert.equal(htmlToMarkdown('<div style="white-space:pre">a\nb</div>'), "a b", "no monospace font");
  assert.equal(htmlToMarkdown('<div style="font-family:monospace">a b</div>'), "a b", "no preserved white space");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-229
test("a link or image target is trimmed, and an empty, blank or control-character one is dropped", () => {
  assert.equal(linked(" https://a.b/x "), "[t](https://a.b/x)");
  assert.equal(pictured(" https://a.b/x "), "[i](https://a.b/x)");
  for (const url of ["", "  ", "a\tb", "x\u0001y", "javascript:alert(1)"]) {
    assert.equal(linked(url), "t", JSON.stringify(url));
    assert.equal(pictured(url), "i", JSON.stringify(url));
  }
  assert.equal(linked("a.md"), "[t](a.md)");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-217
test("a target with a space or an angle bracket is wrapped in angle brackets and escaped, otherwise its parentheses are", () => {
  assert.equal(linked("https://a.b/c d"), "[t](<https://a.b/c%20d>)");
  assert.equal(linked("https://a.b/<x>"), "[t](<https://a.b/%3Cx%3E>)");
  assert.equal(linked("a b(c).md"), "[t](<a%20b(c).md>)", "parentheses stay inside angle brackets");
  assert.equal(linked("a(b).md"), "[t](a%28b%29.md)");
  assert.equal(linked("a\u00a0b.md"), "[t](<a%20b.md>)", "any white space counts");
});
